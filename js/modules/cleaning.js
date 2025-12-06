// ==================== CLEANING MODULE ====================
// Modulo per gestione pulizie automatiche

const CleaningModule = {
  /**
   * Template checklist pulizie standard
   */
  defaultChecklist: [
    { id: 1, category: 'bedroom', item: 'Cambio lenzuola e federe', completed: false },
    { id: 2, category: 'bedroom', item: 'Aspirare e lavare pavimenti', completed: false },
    { id: 3, category: 'bedroom', item: 'Spolverare mobili e superfici', completed: false },
    { id: 4, category: 'bedroom', item: 'Pulire specchi', completed: false },
    { id: 5, category: 'bathroom', item: 'Sanitari (WC, bidet, lavandino)', completed: false },
    { id: 6, category: 'bathroom', item: 'Doccia/vasca e box', completed: false },
    { id: 7, category: 'bathroom', item: 'Pavimento bagno', completed: false },
    { id: 8, category: 'bathroom', item: 'Specchio e rubinetteria', completed: false },
    { id: 9, category: 'bathroom', item: 'Rifornire asciugamani puliti', completed: false },
    { id: 10, category: 'kitchen', item: 'Piano cottura e forno', completed: false },
    { id: 11, category: 'kitchen', item: 'Frigorifero interno', completed: false },
    { id: 12, category: 'kitchen', item: 'Lavello e rubinetto', completed: false },
    { id: 13, category: 'kitchen', item: 'Stoviglie pulite', completed: false },
    { id: 14, category: 'kitchen', item: 'Pavimento cucina', completed: false },
    { id: 15, category: 'living', item: 'Aspirare divani e tappeti', completed: false },
    { id: 16, category: 'living', item: 'Spolverare TV e mobili', completed: false },
    { id: 17, category: 'living', item: 'Svuotare cestini', completed: false },
    { id: 18, category: 'general', item: 'Finestre e davanzali', completed: false },
    { id: 19, category: 'general', item: 'Balcone/terrazzo', completed: false },
    { id: 20, category: 'general', item: 'Controllo luci e elettrodomestici', completed: false }
  ],

  /**
   * Ottieni tutte le pulizie
   * @returns {Array} - Array di cleaning tasks
   */
  getAll() {
    return StorageManager.load('dashboard_cleanings', []);
  },

  /**
   * Ottieni pulizia per ID
   * @param {number} id - ID pulizia
   * @returns {object|null} - Pulizia o null
   */
  getById(id) {
    const cleanings = this.getAll();
    return cleanings.find(c => c.id === id) || null;
  },

  /**
   * Crea nuova pulizia
   * @param {object} cleaningData - Dati pulizia
   * @returns {object} - Pulizia creata
   */
  create(cleaningData) {
    try {
      const cleanings = this.getAll();
      
      const cleaning = {
        id: Utils.generateId(),
        bookingId: cleaningData.bookingId || null,
        guestName: cleaningData.guestName || '',
        scheduledDate: cleaningData.scheduledDate,
        scheduledTime: cleaningData.scheduledTime || '14:00',
        assignedTo: cleaningData.assignedTo || null,
        status: 'scheduled', // scheduled, in-progress, completed
        priority: cleaningData.priority || 'normal', // high, normal, low
        estimatedDuration: cleaningData.estimatedDuration || 120, // minuti
        actualDuration: null,
        cost: cleaningData.cost || 0,
        checklist: cleaningData.checklist || JSON.parse(JSON.stringify(this.defaultChecklist)),
        notes: cleaningData.notes || '',
        photos: cleaningData.photos || [],
        startedAt: null,
        completedAt: null,
        createdAt: new Date().toISOString(),
        createdBy: AuthManager.getCurrentUser()?.username || 'system'
      };
      
      cleanings.push(cleaning);
      StorageManager.save('dashboard_cleanings', cleanings);
      
      // Log attività
      ActivityLog.log('create', 'cleaning', cleaning.id, {
        date: cleaning.scheduledDate,
        guest: cleaning.guestName
      });
      
      // Emetti evento
      EventBus.emit('CLEANING_CREATED', cleaning);
      
      // Invia notifica Telegram se configurato
      if (typeof TelegramService !== 'undefined' && TelegramService.isConfigured()) {
        TelegramService.notifyNewCleaning(cleaning).catch(err => {
          console.error('Errore invio notifica Telegram:', err);
        });
      }
      
      return cleaning;
    } catch (error) {
      ErrorHandler.handle(error, 'CleaningModule.create');
      throw error;
    }
  },

  /**
   * Aggiorna pulizia
   * @param {number} id - ID pulizia
   * @param {object} updates - Modifiche
   * @returns {object} - Pulizia aggiornata
   */
  update(id, updates) {
    try {
      const cleanings = this.getAll();
      const index = cleanings.findIndex(c => c.id === id);
      
      if (index === -1) {
        throw new Error('Pulizia non trovata');
      }
      
      const cleaning = cleanings[index];
      const updatedCleaning = { ...cleaning, ...updates };
      cleanings[index] = updatedCleaning;
      
      StorageManager.save('dashboard_cleanings', cleanings);
      
      // Log attività
      ActivityLog.log('update', 'cleaning', id, updates);
      
      // Emetti evento
      EventBus.emit('CLEANING_UPDATED', updatedCleaning);
      
      return updatedCleaning;
    } catch (error) {
      ErrorHandler.handle(error, 'CleaningModule.update');
      throw error;
    }
  },

  /**
   * Elimina pulizia
   * @param {number} id - ID pulizia
   * @returns {boolean} - Success
   */
  delete(id) {
    try {
      const cleanings = this.getAll();
      const filtered = cleanings.filter(c => c.id !== id);
      
      StorageManager.save('dashboard_cleanings', filtered);
      
      // Log attività
      ActivityLog.log('delete', 'cleaning', id);
      
      // Emetti evento
      EventBus.emit('CLEANING_DELETED', id);
      
      return true;
    } catch (error) {
      ErrorHandler.handle(error, 'CleaningModule.delete');
      return false;
    }
  },

  /**
   * Filtra per stato
   * @param {string} status - Stato
   * @returns {Array} - Pulizie filtrate
   */
  filterByStatus(status) {
    const cleanings = this.getAll();
    if (status === 'all') return cleanings;
    return cleanings.filter(c => c.status === status);
  },

  /**
   * Filtra per data
   * @param {string} date - Data YYYY-MM-DD
   * @returns {Array} - Pulizie del giorno
   */
  getByDate(date) {
    const cleanings = this.getAll();
    return cleanings.filter(c => c.scheduledDate === date);
  },

  /**
   * Ottieni pulizie per settimana
   * @param {Date} startDate - Inizio settimana
   * @returns {Array} - Pulizie della settimana
   */
  getByWeek(startDate) {
    const cleanings = this.getAll();
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 7);
    
    return cleanings.filter(c => {
      const cleaningDate = new Date(c.scheduledDate);
      return cleaningDate >= startDate && cleaningDate < endDate;
    });
  },

  /**
   * Ottieni pulizie per assegnatario
   * @param {string} assignedTo - Username assegnatario
   * @returns {Array} - Pulizie assegnate
   */
  getByAssignedTo(assignedTo) {
    const cleanings = this.getAll();
    return cleanings.filter(c => c.assignedTo === assignedTo);
  },

  /**
   * Inizia pulizia
   * @param {number} id - ID pulizia
   * @returns {object} - Pulizia aggiornata
   */
  start(id) {
    const cleaning = this.getById(id);
    
    // Log attività
    ActivityLog.log('update', 'cleaning', id, { action: 'started' });
    
    const result = this.update(id, {
      status: 'in-progress',
      startedAt: new Date().toISOString()
    });
    
    return result;
  },

  /**
   * Completa pulizia
   * @param {number} id - ID pulizia
   * @param {number} actualDuration - Durata effettiva (minuti)
   * @returns {object} - Pulizia completata
   */
  complete(id, actualDuration = null) {
    const cleaning = this.getById(id);
    
    if (!cleaning) {
      throw new Error('Pulizia non trovata');
    }
    
    // Calcola durata se non fornita
    if (!actualDuration && cleaning.startedAt) {
      const start = new Date(cleaning.startedAt);
      const end = new Date();
      actualDuration = Math.round((end - start) / 60000); // minuti
    }
    
    // Crea transazione spesa se c'è un costo
    if (cleaning.cost > 0) {
      try {
        AccountingModule.create({
          type: 'expense',
          category: 'cleaning',
          amount: cleaning.cost,
          date: new Date().toISOString().split('T')[0],
          description: `Pulizia - ${cleaning.guestName || 'Standard'}`,
          paymentMethod: 'cash',
          notes: `Pulizia ID: ${id}, Durata: ${actualDuration || cleaning.estimatedDuration} min`
        });
      } catch (error) {
        ErrorHandler.handle(error, 'CleaningModule.complete - accounting');
      }
    }
    
    // Log attività
    ActivityLog.log('update', 'cleaning', id, { action: 'completed', duration: actualDuration });
    
    const result = this.update(id, {
      status: 'completed',
      actualDuration: actualDuration || cleaning.estimatedDuration,
      completedAt: new Date().toISOString()
    });
    
    // Invia notifica Telegram se configurato
    if (typeof TelegramService !== 'undefined' && TelegramService.isConfigured()) {
      TelegramService.notifyCleaningCompleted(result, actualDuration || cleaning.estimatedDuration).catch(err => {
        console.error('Errore invio notifica Telegram completamento:', err);
      });
    }
    
    return result;
  },

  /**
   * Aggiorna checklist item
   * @param {number} cleaningId - ID pulizia
   * @param {number} itemId - ID item checklist
   * @param {boolean} completed - Stato completamento
   * @returns {object} - Pulizia aggiornata
   */
  updateChecklistItem(cleaningId, itemId, completed) {
    const cleaning = this.getById(cleaningId);
    
    if (!cleaning) {
      throw new Error('Pulizia non trovata');
    }
    
    const checklist = cleaning.checklist.map(item => {
      if (item.id === itemId) {
        return { ...item, completed };
      }
      return item;
    });
    
    return this.update(cleaningId, { checklist });
  },

  /**
   * Calcola progresso checklist
   * @param {object} cleaning - Pulizia
   * @returns {number} - Percentuale completamento (0-100)
   */
  getChecklistProgress(cleaning) {
    if (!cleaning || !cleaning.checklist || cleaning.checklist.length === 0) {
      return 0;
    }
    
    const completed = cleaning.checklist.filter(item => item.completed).length;
    return Math.round((completed / cleaning.checklist.length) * 100);
  },

  /**
   * Auto-genera pulizia da prenotazione
   * @param {object} booking - Prenotazione
   * @returns {object|null} - Pulizia creata o null
   */
  createFromBooking(booking) {
    try {
      // Crea pulizia per il giorno del check-out
      const cleaningDate = booking.checkOut;
      
      // Calcola costo base (può essere personalizzato)
      const baseCost = 40; // €40 pulizia standard
      
      const cleaning = this.create({
        bookingId: booking.id,
        guestName: booking.guestName,
        scheduledDate: cleaningDate,
        scheduledTime: '14:00', // Dopo check-out standard
        priority: 'normal',
        estimatedDuration: 120, // 2 ore
        cost: baseCost,
        notes: `Auto-generata da prenotazione #${booking.id}`
      });
      
      NotificationService.info(`Pulizia programmata per ${Utils.formatDate(new Date(cleaningDate))}`);
      
      return cleaning;
    } catch (error) {
      ErrorHandler.handle(error, 'CleaningModule.createFromBooking');
      return null;
    }
  },

  /**
   * Ottieni statistiche pulizie
   * @param {number} days - Numero di giorni da analizzare
   * @returns {object} - Statistiche
   */
  getStats(days = 30) {
    try {
      const cleanings = this.getAll();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      
      const recentCleanings = cleanings.filter(c => 
        new Date(c.createdAt) >= cutoffDate
      );
      
      const completed = recentCleanings.filter(c => c.status === 'completed');
      const avgDuration = completed.length > 0
        ? completed.reduce((sum, c) => sum + (c.actualDuration || c.estimatedDuration), 0) / completed.length
        : 0;
      
      const totalCost = completed.reduce((sum, c) => sum + (c.cost || 0), 0);
      
      return {
        total: recentCleanings.length,
        completed: completed.length,
        inProgress: recentCleanings.filter(c => c.status === 'in-progress').length,
        scheduled: recentCleanings.filter(c => c.status === 'scheduled').length,
        avgDuration: Math.round(avgDuration),
        totalCost: totalCost,
        completionRate: recentCleanings.length > 0 
          ? Math.round((completed.length / recentCleanings.length) * 100) 
          : 0
      };
    } catch (error) {
      ErrorHandler.handle(error, 'CleaningModule.getStats');
      return {
        total: 0,
        completed: 0,
        inProgress: 0,
        scheduled: 0,
        avgDuration: 0,
        totalCost: 0,
        completionRate: 0
      };
    }
  }
};
