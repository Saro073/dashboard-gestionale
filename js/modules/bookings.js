// ==================== BOOKINGS MODULE ====================
/**
 * BookingsModule - Gestione prenotazioni per casa vacanze
 * Permette creazione, modifica, cancellazione prenotazioni
 * con visualizzazione calendario
 */
const BookingsModule = {

  /**
   * Stati possibili prenotazione
   */
  STATUS: {
    CONFIRMED: 'confirmed',
    PENDING: 'pending',
    CANCELLED: 'cancelled',
    BLOCKED: 'blocked'
  },

  /**
   * Canali di provenienza
   */
  CHANNELS: {
    DIRECT: 'direct',
    BOOKING: 'booking',
    AIRBNB: 'airbnb',
    VRBO: 'vrbo',
    OTHER: 'other'
  },

  /**
   * Ottiene tutte le prenotazioni
   * @returns {Array}
   */
  getAll() {
    return StorageManager.load(CONFIG.STORAGE_KEYS.BOOKINGS, []);
  },

  /**
   * Ottiene prenotazione per ID
   * @param {number} id
   * @returns {object|null}
   */
  getById(id) {
    const bookings = this.getAll();
    return bookings.find(b => b.id === id) || null;
  },

  /**
   * Crea nuova prenotazione
   * @param {object} data
   * @returns {object}
   */
  create(data) {
    const currentUser = AuthManager.getCurrentUser();
    
    // Validazione
    const validation = this.validateBooking(data);
    if (!validation.valid) {
      NotificationService.error(validation.message);
      return { success: false, booking: null, message: validation.message };
    }

    // Verifica disponibilità
    if (!this.isAvailable(data.checkIn, data.checkOut)) {
      NotificationService.error('Date non disponibili');
      return { success: false, booking: null, message: 'Date non disponibili' };
    }

    const booking = {
      id: Utils.generateId(),
      guestName: data.guestName.trim(),
      guestEmail: data.guestEmail?.trim() || '',
      guestPhone: data.guestPhone?.trim() || '',
      checkIn: data.checkIn,
      checkOut: data.checkOut,
      guests: parseInt(data.guests) || 1,
      totalAmount: parseFloat(data.totalAmount) || 0,
      deposit: parseFloat(data.deposit) || 0,
      isPaid: data.isPaid || false,
      channel: data.channel || this.CHANNELS.DIRECT,
      status: data.status || this.STATUS.CONFIRMED,
      notes: data.notes?.trim() || '',
      createdBy: currentUser.id,
      createdByUsername: currentUser.username,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const bookings = this.getAll();
    bookings.push(booking);
    StorageManager.save(CONFIG.STORAGE_KEYS.BOOKINGS, bookings);

    ActivityLog.log(CONFIG.ACTION_TYPES.CREATE, 'booking', booking.id, {
      guestName: booking.guestName,
      checkIn: booking.checkIn,
      checkOut: booking.checkOut
    });

    EventBus.emit(EVENTS.BOOKING_CREATED, booking);
    NotificationService.success(`Prenotazione per "${booking.guestName}" creata!`);

    return { success: true, booking, message: 'Prenotazione creata' };
  },

  /**
   * Aggiorna prenotazione
   * @param {number} id
   * @param {object} updates
   * @returns {object}
   */
  update(id, updates) {
    const bookings = this.getAll();
    const index = bookings.findIndex(b => b.id === id);

    if (index === -1) {
      return { success: false, booking: null, message: 'Prenotazione non trovata' };
    }

    // Se cambiano le date, verifica disponibilità
    if (updates.checkIn || updates.checkOut) {
      const checkIn = updates.checkIn || bookings[index].checkIn;
      const checkOut = updates.checkOut || bookings[index].checkOut;
      if (!this.isAvailable(checkIn, checkOut, id)) {
        NotificationService.error('Date non disponibili');
        return { success: false, booking: null, message: 'Date non disponibili' };
      }
    }

    const currentUser = AuthManager.getCurrentUser();
    bookings[index] = {
      ...bookings[index],
      ...updates,
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser.id,
      updatedByUsername: currentUser.username
    };

    StorageManager.save(CONFIG.STORAGE_KEYS.BOOKINGS, bookings);

    ActivityLog.log(CONFIG.ACTION_TYPES.UPDATE, 'booking', id, updates);
    EventBus.emit(EVENTS.BOOKING_UPDATED, bookings[index]);
    NotificationService.success('Prenotazione aggiornata!');

    return { success: true, booking: bookings[index], message: 'Prenotazione aggiornata' };
  },

  /**
   * Elimina prenotazione
   * @param {number} id
   * @returns {object}
   */
  delete(id) {
    const bookings = this.getAll();
    const booking = bookings.find(b => b.id === id);

    if (!booking) {
      return { success: false, message: 'Prenotazione non trovata' };
    }

    const filtered = bookings.filter(b => b.id !== id);
    StorageManager.save(CONFIG.STORAGE_KEYS.BOOKINGS, filtered);

    ActivityLog.log(CONFIG.ACTION_TYPES.DELETE, 'booking', id, {
      guestName: booking.guestName
    });

    EventBus.emit(EVENTS.BOOKING_DELETED, { id, guestName: booking.guestName });
    NotificationService.success(`Prenotazione di "${booking.guestName}" eliminata`);

    return { success: true, message: 'Prenotazione eliminata' };
  },

  /**
   * Cambia stato prenotazione
   * @param {number} id
   * @param {string} status
   * @returns {object}
   */
  changeStatus(id, status) {
    return this.update(id, { status });
  },

  /**
   * Blocca date (manutenzione, uso personale)
   * @param {string} startDate
   * @param {string} endDate
   * @param {string} reason
   * @returns {object}
   */
  blockDates(startDate, endDate, reason = '') {
    return this.create({
      guestName: 'BLOCCATO',
      checkIn: startDate,
      checkOut: endDate,
      guests: 0,
      totalAmount: 0,
      status: this.STATUS.BLOCKED,
      notes: reason,
      channel: this.CHANNELS.DIRECT
    });
  },

  /**
   * Verifica disponibilità date
   * @param {string} checkIn
   * @param {string} checkOut
   * @param {number} excludeId - ID da escludere (per update)
   * @returns {boolean}
   */
  isAvailable(checkIn, checkOut, excludeId = null) {
    const bookings = this.getAll();
    const start = new Date(checkIn);
    const end = new Date(checkOut);

    for (const booking of bookings) {
      if (excludeId && booking.id === excludeId) continue;
      if (booking.status === this.STATUS.CANCELLED) continue;

      const bStart = new Date(booking.checkIn);
      const bEnd = new Date(booking.checkOut);

      // Controlla sovrapposizione
      if (start < bEnd && end > bStart) {
        return false;
      }
    }
    return true;
  },

  /**
   * Ottiene prenotazioni per mese
   * @param {number} year
   * @param {number} month (0-11)
   * @returns {Array}
   */
  getByMonth(year, month) {
    const bookings = this.getAll();
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0, 23, 59, 59);

    return bookings.filter(b => {
      if (b.status === this.STATUS.CANCELLED) return false;
      const checkIn = new Date(b.checkIn);
      const checkOut = new Date(b.checkOut);
      return checkIn <= monthEnd && checkOut >= monthStart;
    });
  },

  /**
   * Ottiene prenotazioni per data specifica
   * @param {string} date - YYYY-MM-DD
   * @returns {Array}
   */
  getByDate(date) {
    const bookings = this.getAll();
    const targetDate = new Date(date);

    return bookings.filter(b => {
      if (b.status === this.STATUS.CANCELLED) return false;
      const checkIn = new Date(b.checkIn);
      const checkOut = new Date(b.checkOut);
      return targetDate >= checkIn && targetDate < checkOut;
    });
  },

  /**
   * Ottiene prossimi check-in
   * @param {number} days
   * @returns {Array}
   */
  getUpcomingCheckIns(days = 7) {
    const bookings = this.getAll();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const futureDate = new Date(today);
    futureDate.setDate(futureDate.getDate() + days);

    return bookings.filter(b => {
      if (b.status === this.STATUS.CANCELLED) return false;
      const checkIn = new Date(b.checkIn);
      return checkIn >= today && checkIn <= futureDate;
    }).sort((a, b) => new Date(a.checkIn) - new Date(b.checkIn));
  },

  /**
   * Ottiene check-in di oggi
   * @returns {Array}
   */
  getTodayCheckIns() {
    const bookings = this.getAll();
    const today = new Date().toISOString().split('T')[0];

    return bookings.filter(b => {
      if (b.status === this.STATUS.CANCELLED) return false;
      if (b.status === this.STATUS.BLOCKED) return false;
      return b.checkIn === today;
    });
  },

  /**
   * Ottiene check-out di oggi
   * @returns {Array}
   */
  getTodayCheckOuts() {
    const bookings = this.getAll();
    const today = new Date().toISOString().split('T')[0];

    return bookings.filter(b => {
      if (b.status === this.STATUS.CANCELLED) return false;
      return b.checkOut === today;
    });
  },

  /**
   * Filtra per canale
   * @param {string} channel
   * @returns {Array}
   */
  filterByChannel(channel) {
    if (channel === 'all') return this.getAll();
    return this.getAll().filter(b => b.channel === channel);
  },

  /**
   * Filtra per stato
   * @param {string} status
   * @returns {Array}
   */
  filterByStatus(status) {
    if (status === 'all') return this.getAll();
    return this.getAll().filter(b => b.status === status);
  },

  /**
   * Cerca prenotazioni
   * @param {string} term
   * @returns {Array}
   */
  search(term) {
    const bookings = this.getAll();
    return Utils.filterBySearch(bookings, term, ['guestName', 'guestEmail', 'guestPhone', 'notes']);
  },

  /**
   * Calcola statistiche
   * @param {number} year
   * @param {number} month
   * @returns {object}
   */
  getStats(year, month) {
    const bookings = this.getByMonth(year, month);
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    let occupiedDays = 0;
    let totalRevenue = 0;

    bookings.forEach(b => {
      // Escludi completamente i blocchi dalle statistiche
      if (b.status !== this.STATUS.BLOCKED) {
        totalRevenue += b.totalAmount || 0;
        
        const checkIn = new Date(b.checkIn);
        const checkOut = new Date(b.checkOut);
        const monthStart = new Date(year, month, 1);
        const monthEnd = new Date(year, month + 1, 0);

      const effectiveStart = checkIn < monthStart ? monthStart : checkIn;
      const effectiveEnd = checkOut > monthEnd ? monthEnd : checkOut;

      const days = Math.ceil((effectiveEnd - effectiveStart) / (1000 * 60 * 60 * 24));
      occupiedDays += Math.max(0, days);
    });

    return {
      totalBookings: bookings.filter(b => b.status !== this.STATUS.BLOCKED).length,
      occupiedDays,
      occupancyRate: Math.round((occupiedDays / daysInMonth) * 100),
      totalRevenue,
      avgNightlyRate: occupiedDays > 0 ? Math.round(totalRevenue / occupiedDays) : 0
    };
  },

  /**
   * Valida dati prenotazione
   * @param {object} data
   * @returns {object}
   */
  validateBooking(data) {
    if (!data.guestName || data.guestName.trim().length < 2) {
      return { valid: false, message: 'Nome ospite richiesto (min 2 caratteri)' };
    }

    if (!data.checkIn || !data.checkOut) {
      return { valid: false, message: 'Date check-in e check-out richieste' };
    }

    const checkIn = new Date(data.checkIn);
    const checkOut = new Date(data.checkOut);

    if (checkOut <= checkIn) {
      return { valid: false, message: 'Check-out deve essere dopo check-in' };
    }

    if (data.guestEmail && !CONFIG.VALIDATION.EMAIL_REGEX.test(data.guestEmail)) {
      return { valid: false, message: 'Email non valida' };
    }

    return { valid: true, message: 'OK' };
  }
};
