// ==================== CALENDAR SYNC SERVICE ====================
/**
 * CalendarSyncService - Sincronizzazione calendario online via feed ICS/ICAL
 * Importa eventi esterni come prenotazioni bloccate, aggiornandoli automaticamente.
 */

const CalendarSyncService = {
  config: {
    enabled: false,
    refreshIntervalMinutes: 60,
    sources: [],
    lastSyncAt: null,
    lastSyncResult: null
  },

  apiBaseUrl: 'http://localhost:3000',

  _intervalId: null,

  async init() {
    await this.loadConfig();
    this.startAutoSync();
    return this.config;
  },

  async loadConfig() {
    try {
      const savedConfig = await StorageManager.loadAsync(CONFIG.STORAGE_KEYS.CALENDAR_SYNC, null);
      if (savedConfig) {
        this.config = this.normalizeConfig(savedConfig);
      }
    } catch (error) {
      console.error('Errore caricamento config sync calendario:', error);
    }
  },

  normalizeConfig(config = {}) {
    const sources = Array.isArray(config.sources)
      ? config.sources.map(source => ({
          id: source.id || Utils.generateId(),
          name: source.name || 'Calendario esterno',
          url: source.url || '',
          propertyId: source.propertyId || null,
          active: source.active !== false,
          format: source.format || 'ics'
        })).filter(source => !!source.url)
      : [];

    return {
      enabled: !!config.enabled,
      refreshIntervalMinutes: Math.max(5, parseInt(config.refreshIntervalMinutes, 10) || 60),
      sources,
      lastSyncAt: config.lastSyncAt || null,
      lastSyncResult: config.lastSyncResult || null
    };
  },

  async saveConfig(config) {
    this.config = this.normalizeConfig({ ...this.config, ...config });
    await StorageManager.saveAsync(CONFIG.STORAGE_KEYS.CALENDAR_SYNC, this.config);
    this.startAutoSync();
    return this.config;
  },

  isConfigured() {
    return this.config.enabled && this.config.sources.length > 0;
  },

  startAutoSync() {
    this.stopAutoSync();

    if (!this.isConfigured()) {
      return;
    }

    const delay = this.config.refreshIntervalMinutes * 60 * 1000;
    this._intervalId = setInterval(() => {
      this.syncNow({ silent: true }).catch(error => {
        console.error('Errore sync automatico calendario:', error);
      });
    }, delay);

    setTimeout(() => {
      this.syncNow({ silent: true }).catch(error => {
        console.error('Errore primo sync calendario:', error);
      });
    }, 3000);
  },

  stopAutoSync() {
    if (this._intervalId) {
      clearInterval(this._intervalId);
      this._intervalId = null;
    }
  },

  async syncNow(options = {}) {
    if (!this.isConfigured()) {
      return { success: false, message: 'Sincronizzazione calendario disattivata' };
    }

    const silent = !!options.silent;
    const currentBookings = StorageManager.load(CONFIG.STORAGE_KEYS.BOOKINGS, []);
    const internalBookings = currentBookings.filter(booking => booking.source !== 'external-calendar' && !booking.isExternal);
    const importedBookings = [];
    const errors = [];

    for (const source of this.config.sources.filter(source => source.active && source.url)) {
      try {
        const feedText = await this.fetchFeed(source.url);
        const events = this.parseIcsFeed(feedText);
        const sourceBookings = events.map(event => this.eventToBooking(event, source));
        importedBookings.push(...sourceBookings);
      } catch (error) {
        errors.push({ source: source.name, error: error.message });
      }
    }

    const mergedBookings = [...internalBookings, ...importedBookings].sort((a, b) => {
      return new Date(a.checkIn) - new Date(b.checkIn);
    });

    await StorageManager.saveAsync(CONFIG.STORAGE_KEYS.BOOKINGS, mergedBookings);

    const summary = {
      sources: this.config.sources.length,
      imported: importedBookings.length,
      errors,
      syncedAt: new Date().toISOString()
    };

    this.config.lastSyncAt = summary.syncedAt;
    this.config.lastSyncResult = summary;
    await StorageManager.saveAsync(CONFIG.STORAGE_KEYS.CALENDAR_SYNC, this.config);

    if (typeof ActivityLog !== 'undefined') {
      ActivityLog.log(CONFIG.ACTION_TYPES.UPDATE, CONFIG.ENTITY_TYPES.BOOKING, 0, {
        source: 'calendar-sync',
        summary
      });
    }

    EventBus.emit(EVENTS.BOOKING_UPDATED, { source: 'calendar-sync', summary });

    if (!silent) {
      if (errors.length > 0) {
        NotificationService.warning(
          `Sync calendario completato con ${importedBookings.length} eventi importati e ${errors.length} errori.`
        );
      } else {
        NotificationService.success(`Sync calendario completato: ${importedBookings.length} eventi importati.`);
      }
    }

    return { success: true, summary };
  },

  async fetchFeed(url) {
    const response = await fetch(`${this.apiBaseUrl}/api/calendar/fetch?url=${encodeURIComponent(url)}`);
    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Impossibile leggere il feed calendario');
    }

    return result.text || '';
  },

  parseIcsFeed(feedText) {
    if (!feedText || typeof feedText !== 'string') {
      return [];
    }

    const lines = feedText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
    const unfoldedLines = [];

    for (const line of lines) {
      if (/^[ \t]/.test(line) && unfoldedLines.length > 0) {
        unfoldedLines[unfoldedLines.length - 1] += line.trim();
      } else {
        unfoldedLines.push(line.trim());
      }
    }

    const events = [];
    let currentEvent = null;

    for (const line of unfoldedLines) {
      if (line === 'BEGIN:VEVENT') {
        currentEvent = {};
        continue;
      }

      if (line === 'END:VEVENT') {
        if (currentEvent) {
          events.push(this.normalizeEvent(currentEvent));
        }
        currentEvent = null;
        continue;
      }

      if (!currentEvent || !line.includes(':')) {
        continue;
      }

      const separatorIndex = line.indexOf(':');
      const rawKey = line.slice(0, separatorIndex);
      const value = line.slice(separatorIndex + 1);
      const key = rawKey.split(';')[0].toUpperCase();
      currentEvent[key] = value;
      currentEvent[`${key}_META`] = rawKey;
    }

    return events;
  },

  normalizeEvent(event) {
    const start = this.parseIcsDate(event.DTSTART, event.DTSTART_META);
    const end = this.parseIcsDate(event.DTEND, event.DTEND_META);
    const summary = (event.SUMMARY || 'Calendario esterno').trim();
    const description = (event.DESCRIPTION || '').trim();
    const uid = (event.UID || `${summary}-${start}-${end}`).trim();

    return {
      uid,
      summary,
      description,
      start,
      end: end || this.addDays(start, 1),
      allDay: this.isAllDayMeta(event.DTSTART_META),
      raw: event
    };
  },

  isAllDayMeta(meta = '') {
    return /VALUE=DATE/i.test(meta);
  },

  parseIcsDate(value, meta = '') {
    if (!value) return null;

    if (/VALUE=DATE/i.test(meta) || /^\d{8}$/.test(value)) {
      const year = value.slice(0, 4);
      const month = value.slice(4, 6);
      const day = value.slice(6, 8);
      return `${year}-${month}-${day}`;
    }

    const normalizedValue = value.endsWith('Z') ? value : `${value}Z`;
    const date = new Date(normalizedValue);
    if (Number.isNaN(date.getTime())) {
      return null;
    }

    return date.toISOString().split('T')[0];
  },

  addDays(dateStr, days = 1) {
    const date = new Date(`${dateStr}T00:00:00Z`);
    if (Number.isNaN(date.getTime())) return dateStr;
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().split('T')[0];
  },

  eventToBooking(event, source) {
    const propertyId = source.propertyId || null;
    const checkIn = event.start;
    const checkOut = this.normalizeCheckout(checkIn, event.end);
    const title = event.summary || source.name || 'Calendario esterno';
    const notes = [
      source.name ? `Fonte: ${source.name}` : '',
      event.description ? `Descrizione: ${event.description}` : '',
      event.uid ? `UID: ${event.uid}` : ''
    ].filter(Boolean).join('\n');

    return {
      id: Utils.generateId(),
      propertyId,
      contactId: null,
      guestFirstName: title,
      guestLastName: '',
      guestEmail: '',
      guestPhone: '',
      guestPrivateAddress: { street: '', city: '', zip: '', province: '', country: '' },
      guestBusinessAddress: null,
      guestName: title,
      checkIn,
      checkOut,
      guests: 1,
      totalAmount: 0,
      deposit: 0,
      isPaid: false,
      channel: 'other',
      status: 'blocked',
      notes,
      source: 'external-calendar',
      isExternal: true,
      externalSourceId: source.id,
      externalSourceName: source.name,
      externalEventId: event.uid,
      externalSyncUrl: source.url,
      createdBy: 0,
      createdByUsername: 'calendar-sync',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  },

  normalizeCheckout(start, end) {
    if (!start) return end;
    if (!end) return this.addDays(start, 1);

    const startDate = new Date(`${start}T00:00:00Z`);
    const endDate = new Date(`${end}T00:00:00Z`);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return end;
    }

    if (endDate <= startDate) {
      return this.addDays(start, 1);
    }

    return end;
  }
};

window.CalendarSyncService = CalendarSyncService;