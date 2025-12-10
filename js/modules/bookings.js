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
      
      // Property ID - usa default se non specificato
      propertyId: data.propertyId || (PropertiesModule && PropertiesModule.getDefault ? PropertiesModule.getDefault().id : null),
      
      // Link a contatto (opzionale)
      contactId: data.contactId || null,
      
      // Snapshot dati ospite (fallback se contatto eliminato)
      guestFirstName: data.guestFirstName?.trim() || '',
      guestLastName: data.guestLastName?.trim() || '',
      guestEmail: data.guestEmail?.trim() || '',
      guestPhone: data.guestPhone?.trim() || '',
      guestPrivateAddress: data.guestPrivateAddress || {
        street: '',
        zip: '',
        city: '',
        country: ''
      },
      guestBusinessAddress: data.guestBusinessAddress || null,
      
      // Retrocompatibilità (deprecato)
      guestName: data.guestName?.trim() || `${data.guestFirstName || ''} ${data.guestLastName || ''}`.trim(),
      
      // Dati prenotazione
      checkIn: data.checkIn,
      checkOut: data.checkOut,
      guests: parseInt(data.guests) || 1,
      totalAmount: parseFloat(data.totalAmount) || 0,
      deposit: parseFloat(data.deposit) || 0,
      isPaid: data.isPaid || false,
      channel: data.channel || this.CHANNELS.DIRECT,
      status: data.status || this.STATUS.CONFIRMED,
      notes: data.notes?.trim() || '',
      
      // Metadata
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
    
    // Crea transazione automatica se prenotazione pagata
    if (booking.isPaid && booking.totalAmount > 0) {
      const transactionData = {
        type: 'income',
        category: 'booking',
        amount: booking.totalAmount,
        date: booking.checkIn,
        description: `Prenotazione: ${booking.guestName}`,
        paymentMethod: 'bank_transfer',
        bookingId: booking.id,
        notes: `Check-in: ${booking.checkIn}, Check-out: ${booking.checkOut}`
      };
      
      if (typeof AccountingModule !== 'undefined') {
        AccountingModule.create(transactionData);
      }
    }
    
    // 🔔 Smart notification via NotificationRouter (property-aware, role-based)
    if (typeof NotificationRouter !== 'undefined' && booking.propertyId) {
      try {
        const guestInfo = this.getGuestInfo(booking);
        
        NotificationRouter.send({
          event: 'booking_created',
          propertyId: booking.propertyId,
          targetRoles: ['owner'],
          channels: ['telegram', 'email'],
          data: {
            bookingId: booking.id,
            guestName: guestInfo.fullName,
            guestEmail: guestInfo.email,
            guestPhone: guestInfo.phone,
            checkIn: booking.checkIn,
            checkOut: booking.checkOut,
            guests: booking.guests,
            totalAmount: booking.totalAmount,
            status: booking.status,
            channel: booking.channel
          }
        });
      } catch (error) {
        console.error('Errore NotificationRouter:', error);
      }
    }
    
    // Auto-crea cleaning task per giorno checkout
    if (typeof CleaningModule !== 'undefined' && booking.status === this.STATUS.CONFIRMED) {
      try {
        const guestInfo = this.getGuestInfo(booking);
        const cleaningData = {
          bookingId: booking.id,
          guestName: guestInfo.fullName,
          scheduledDate: booking.checkOut,
          scheduledTime: '14:00',
          priority: 'normal',
          estimatedDuration: 120,
          cost: 25, // Costo standard pulizia
          notes: `Pulizia post check-out - Prenotazione #${booking.id}`
        };
        
        const cleaning = CleaningModule.create(cleaningData);
        
        // Salva riferimento cleaning in booking
        booking.cleaningId = cleaning.id;
        const bookings = this.getAll();
        const index = bookings.findIndex(b => b.id === booking.id);
        if (index !== -1) {
          bookings[index].cleaningId = cleaning.id;
          StorageManager.save(CONFIG.STORAGE_KEYS.BOOKINGS, bookings);
        }
      } catch (error) {
        console.error('Errore auto-creazione cleaning:', error);
        // Non bloccare creazione booking se cleaning fallisce
      }
    }
    
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
    const oldBooking = { ...bookings[index] };
    
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
    
    // Se cambia checkout e ha cleaning associato, aggiorna data cleaning
    if (updates.checkOut && oldBooking.checkOut !== bookings[index].checkOut) {
      if (bookings[index].cleaningId && typeof CleaningModule !== 'undefined') {
        const cleaning = CleaningModule.getById(bookings[index].cleaningId);
        if (cleaning && cleaning.status === 'scheduled') {
          CleaningModule.update(cleaning.id, {
            scheduledDate: bookings[index].checkOut
          });
        }
      }
    }
    
    // Se isPaid passa da false a true, crea transazione
    if (!oldBooking.isPaid && bookings[index].isPaid && bookings[index].totalAmount > 0) {
      const guestInfo = this.getGuestInfo(bookings[index]);
      const transactionData = {
        type: 'income',
        category: 'booking',
        amount: bookings[index].totalAmount,
        date: bookings[index].checkIn,
        description: `Prenotazione: ${guestInfo.fullName}`,
        paymentMethod: 'bank_transfer',
        bookingId: bookings[index].id,
        notes: `Check-in: ${bookings[index].checkIn}, Check-out: ${bookings[index].checkOut}`
      };
      
      if (typeof AccountingModule !== 'undefined') {
        AccountingModule.create(transactionData);
      }
    }
    
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
    
    // Se ha cleaning associato, chiedi conferma per rimuoverlo
    if (booking.cleaningId && typeof CleaningModule !== 'undefined') {
      const cleaning = CleaningModule.getById(booking.cleaningId);
      if (cleaning && cleaning.status === 'scheduled') {
        const shouldDeleteCleaning = confirm(
          `Questa prenotazione ha una pulizia programmata per il ${cleaning.scheduledDate}.\n\n` +
          `Vuoi eliminare anche la pulizia associata?`
        );
        
        if (shouldDeleteCleaning) {
          CleaningModule.delete(cleaning.id);
        }
      }
    }

    const filtered = bookings.filter(b => b.id !== id);
    StorageManager.save(CONFIG.STORAGE_KEYS.BOOKINGS, filtered);

    const guestInfo = this.getGuestInfo(booking);
    ActivityLog.log(CONFIG.ACTION_TYPES.DELETE, 'booking', id, {
      guestName: guestInfo.fullName
    });

    EventBus.emit(EVENTS.BOOKING_DELETED, { id, guestName: guestInfo.fullName });
    NotificationService.success(`Prenotazione di "${guestInfo.fullName}" eliminata`);

    return { success: true, message: 'Prenotazione eliminata' };
  },

  /**
   * Cambia stato prenotazione
   * @param {number} id
   * @param {string} status
   * @returns {object}
   */
  changeStatus(id, status) {
    const booking = this.getById(id);
    if (!booking) {
      return { success: false, message: 'Prenotazione non trovata' };
    }
    
    const oldStatus = booking.status;
    const result = this.update(id, { status });
    
    // 🔔 Notifica se cancellazione (importante per staff pulizie)
    if (result.success && oldStatus !== this.STATUS.CANCELLED && status === this.STATUS.CANCELLED) {
      if (typeof NotificationRouter !== 'undefined' && booking.propertyId) {
        try {
          const guestInfo = this.getGuestInfo(booking);
          
          NotificationRouter.send({
            event: 'booking_cancelled',
            propertyId: booking.propertyId,
            targetRoles: ['owner', 'cleaning'], // Notifica owner e staff pulizie
            channels: ['telegram', 'email'],
            data: {
              bookingId: booking.id,
              guestName: guestInfo.fullName,
              checkIn: booking.checkIn,
              checkOut: booking.checkOut,
              cancelledAt: new Date().toISOString()
            }
          }).catch(err => {
            console.error('Errore notifica cancellazione:', err);
          });
        } catch (error) {
          console.error('Errore NotificationRouter:', error);
        }
      }
    }
    
    return result;
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
   * @param {number} propertyId - ID property da verificare (opzionale)
   * @returns {boolean}
   */
  isAvailable(checkIn, checkOut, excludeId = null, propertyId = null) {
    const bookings = this.getAll();
    const start = new Date(checkIn);
    const end = new Date(checkOut);

    for (const booking of bookings) {
      if (excludeId && booking.id === excludeId) continue;
      if (booking.status === this.STATUS.CANCELLED) continue;
      
      // Filtra per property se specificata
      if (propertyId && booking.propertyId !== propertyId) continue;

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
   * Filtra bookings per property specifica (opzionale)
   * @param {Array} bookings - Array di bookings da filtrare
   * @param {number} propertyId - ID property (null = tutte)
   * @returns {Array}
   */
  filterByProperty(bookings, propertyId = null) {
    if (!propertyId) return bookings; // null = mostra tutte
    return bookings.filter(b => b.propertyId === propertyId);
  },

  /**
   * Prossimi check-in
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

        // FIX BUG: Calcolo corretto delle notti.
        let nights = 0;
        let dayCursor = new Date(effectiveStart);
        
        // La prenotazione termina il giorno di checkOut, quindi l'ultima notte è quella prima del checkOut.
        while (dayCursor < checkOut) {
            // Controlla se il giorno è all'interno del mese corrente
            if (dayCursor.getFullYear() === year && dayCursor.getMonth() === month) {
                nights++;
            }
            dayCursor.setDate(dayCursor.getDate() + 1);
        }
        
        occupiedDays += nights;
      }
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
   * Ottiene informazioni ospite (da contact linkato o snapshot)
   * @param {object} booking
   * @returns {object}
   */
  getGuestInfo(booking) {
    // Prova a recuperare da contact linkato
    if (booking.contactId && typeof ContactsModule !== 'undefined') {
      const contact = ContactsModule.getById(booking.contactId);
      if (contact) {
        return {
          firstName: contact.firstName || '',
          lastName: contact.lastName || '',
          email: contact.emails?.[0]?.value || '',
          phone: contact.phones?.[0]?.value || '',
          privateAddress: contact.address || null,
          businessAddress: contact.businessAddress || null,
          fullName: `${contact.firstName} ${contact.lastName}`.trim()
        };
      }
    }
    
    // Fallback a snapshot
    return {
      firstName: booking.guestFirstName || '',
      lastName: booking.guestLastName || '',
      email: booking.guestEmail || '',
      phone: booking.guestPhone || '',
      privateAddress: booking.guestPrivateAddress || null,
      businessAddress: booking.guestBusinessAddress || null,
      fullName: booking.guestName || `${booking.guestFirstName} ${booking.guestLastName}`.trim()
    };
  },

  /**
   * Cerca o crea contatto per ospite prenotazione
   * @param {object} guestData - {firstName, lastName, email, phone, privateAddress, businessAddress}
   * @returns {number|null} - contactId o null
   */
  getOrCreateContact(guestData) {
    if (typeof ContactsModule === 'undefined') return null;
    
    const { firstName, lastName, email, phone, privateAddress, businessAddress } = guestData;
    
    // Cerca contatto esistente by email (priorità) o phone
    let existingContact = null;
    if (email) {
      const contacts = ContactsModule.getAll();
      existingContact = contacts.find(c => 
        c.emails?.some(e => e.value.toLowerCase() === email.toLowerCase())
      );
    }
    if (!existingContact && phone) {
      const contacts = ContactsModule.getAll();
      existingContact = contacts.find(c => 
        c.phones?.some(p => p.value.replace(/\s/g, '') === phone.replace(/\s/g, ''))
      );
    }
    
    if (existingContact) {
      return existingContact.id;
    }
    
    // Crea nuovo contatto
    const newContactData = {
      firstName: firstName || '',
      lastName: lastName || '',
      emails: email ? [{ value: email, label: 'Principale' }] : [],
      phones: phone ? [{ value: phone, label: 'Principale' }] : [],
      address: privateAddress || { street: '', city: '', zip: '', province: '', country: '' },
      businessAddress: businessAddress || null,
      category: 'cliente',
      notes: 'Creato automaticamente da prenotazione'
    };
    
    const result = ContactsModule.create(newContactData);
    return result.success ? result.contact.id : null;
  },

  /**
   * Valida dati prenotazione
   * @param {object} data
   * @returns {object}
   */
  validateBooking(data) {
    // Supporta sia vecchio formato (guestName) che nuovo (firstName/lastName)
    const hasOldFormat = data.guestName && data.guestName.trim().length >= 2;
    const hasNewFormat = (data.guestFirstName?.trim().length >= 1) || (data.guestLastName?.trim().length >= 1);
    
    if (!hasOldFormat && !hasNewFormat) {
      return { valid: false, message: 'Nome o cognome ospite richiesto' };
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
  },
  
  /**
   * Migra vecchie prenotazioni da guestName a firstName/lastName
   * Tenta di collegare a contatti esistenti tramite email
   */
  migrateOldBookings() {
    const bookings = this.getAll();
    let migrated = 0;
    let linked = 0;
    
    bookings.forEach(booking => {
      // Skip se già migrata (ha firstName/lastName)
      if (booking.guestFirstName && booking.guestLastName) return;
      
      // Split guestName in firstName/lastName
      if (booking.guestName) {
        const parts = booking.guestName.trim().split(/\s+/);
        const firstName = parts[0] || '';
        const lastName = parts.slice(1).join(' ') || '';
        
        booking.guestFirstName = firstName;
        booking.guestLastName = lastName;
        
        // Mantieni guestName per backward compatibility
        // (validateBooking già lo gestisce)
        
        // Preserva dati snapshot esistenti
        if (!booking.guestEmail) booking.guestEmail = '';
        if (!booking.guestPhone) booking.guestPhone = '';
        
        migrated++;
        
        // Tenta di collegare a contatto esistente tramite email
        if (booking.guestEmail && typeof ContactsModule !== 'undefined') {
          const contacts = ContactsModule.getAll();
          const match = contacts.find(c => 
            c.emails && c.emails.some(e => 
              e.value.toLowerCase() === booking.guestEmail.toLowerCase()
            )
          );
          
          if (match) {
            booking.contactId = match.id;
            linked++;
          }
        }
      }
    });
    
    if (migrated > 0) {
      StorageManager.save(CONFIG.STORAGE_KEYS.BOOKINGS, bookings);
      console.log(`[BookingsModule] Migrated ${migrated} bookings, linked ${linked} to contacts`);
    }
    
    return { migrated, linked };
  },
  
  /**
   * Invia notifiche automatiche per check-in/check-out di oggi
   * Può essere chiamato da scheduler/cron (es. ogni mattina alle 8:00)
   * @returns {object} - {checkInsSent, checkOutsSent}
   */
  sendDailyNotifications() {
    if (typeof NotificationRouter === 'undefined') {
      console.warn('[BookingsModule] NotificationRouter non disponibile');
      return { checkInsSent: 0, checkOutsSent: 0 };
    }
    
    let checkInsSent = 0;
    let checkOutsSent = 0;
    
    try {
      // Notifica check-in di oggi
      const todayCheckIns = this.getTodayCheckIns();
      todayCheckIns.forEach(booking => {
        if (!booking.propertyId) return;
        
        const guestInfo = this.getGuestInfo(booking);
        
        NotificationRouter.send({
          event: 'checkin_today',
          propertyId: booking.propertyId,
          targetRoles: ['owner', 'cleaning'], // Notifica owner e staff pulizie
          channels: ['telegram', 'email'],
          data: {
            bookingId: booking.id,
            guestName: guestInfo.fullName,
            guestEmail: guestInfo.email,
            guestPhone: guestInfo.phone,
            checkIn: booking.checkIn,
            checkOut: booking.checkOut,
            guests: booking.guests
          }
        }).catch(err => {
          console.error('Errore notifica check-in:', err);
        });
        
        checkInsSent++;
      });
      
      // Notifica check-out di oggi
      const todayCheckOuts = this.getTodayCheckOuts();
      todayCheckOuts.forEach(booking => {
        if (!booking.propertyId) return;
        
        const guestInfo = this.getGuestInfo(booking);
        
        NotificationRouter.send({
          event: 'checkout_today',
          propertyId: booking.propertyId,
          targetRoles: ['cleaning'], // Notifica staff pulizie (reminder)
          channels: ['telegram'],
          data: {
            bookingId: booking.id,
            guestName: guestInfo.fullName,
            checkOut: booking.checkOut
          }
        }).catch(err => {
          console.error('Errore notifica check-out:', err);
        });
        
        checkOutsSent++;
      });
      
      if (checkInsSent > 0 || checkOutsSent > 0) {
        console.log(`[BookingsModule] Notifiche giornaliere inviate: ${checkInsSent} check-in, ${checkOutsSent} check-out`);
      }
      
    } catch (error) {
      console.error('[BookingsModule] Errore sendDailyNotifications:', error);
    }
    
    return { checkInsSent, checkOutsSent };
  }
};

window.BookingsModule = BookingsModule;
