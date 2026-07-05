// ==================== BACKUP & RESTORE MODULE ====================
// Sistema per backup e ripristino completo dei dati

const BackupModule = {
  /**
   * Garantisce che tutti i dataset previsti esistano
   * @param {object} data - Dati grezzi da normalizzare
   * @returns {object}
   */
  ensureDataShape(data = {}) {
    return {
      users: data.users || [],
      currentUser: data.currentUser || null,
      contacts: data.contacts || [],
      contactCategories: data.contactCategories || [],
      tasks: data.tasks || [],
      notes: data.notes || [],
      documents: data.documents || [],
      bookings: data.bookings || [],
      accounting: data.accounting || [],
      activityLog: data.activityLog || [],
      properties: data.properties || [],
      cleaning: data.cleaning || [],
      maintenance: data.maintenance || [],
      theme: data.theme || null,
      calendarSync: data.calendarSync || null
    };
  },

  /**
   * Calcola statistiche di riepilogo
   * @param {object} data - Dataset normalizzato
   * @returns {object}
   */
  computeStats(data = {}) {
    return {
      totalContacts: (data.contacts || []).length,
      totalTasks: (data.tasks || []).length,
      totalNotes: (data.notes || []).length,
      totalBookings: (data.bookings || []).length,
      totalTransactions: (data.accounting || []).length
    };
  },

  /**
   * Normalizza backup in formati legacy o correnti
   * @param {object} rawBackup - Dati caricati dal file
   * @returns {object|null}
   */
  normalizeBackupData(rawBackup) {
    if (!rawBackup) return null;

    // Formato corrente: contiene version + data
    if (rawBackup.version && rawBackup.data) {
      const normalizedData = this.ensureDataShape(rawBackup.data);
      const stats = rawBackup.stats || this.computeStats(normalizedData);

      return {
        ...rawBackup,
        version: rawBackup.version || CONFIG.APP_VERSION,
        timestamp: rawBackup.timestamp || new Date().toISOString(),
        data: normalizedData,
        stats
      };
    }

    // Formato legacy: dump diretto del localStorage
    const hasLegacyKeys = Object.values(CONFIG.STORAGE_KEYS).some(key => rawBackup[key] !== undefined);
    if (!hasLegacyKeys) {
      return null;
    }

    const normalizedData = this.ensureDataShape({
      users: rawBackup[CONFIG.STORAGE_KEYS.USERS],
      currentUser: rawBackup[CONFIG.STORAGE_KEYS.CURRENT_USER],
      contacts: rawBackup[CONFIG.STORAGE_KEYS.CONTACTS],
      contactCategories: rawBackup[CONFIG.STORAGE_KEYS.CONTACT_CATEGORIES],
      tasks: rawBackup[CONFIG.STORAGE_KEYS.TASKS],
      notes: rawBackup[CONFIG.STORAGE_KEYS.NOTES],
      documents: rawBackup[CONFIG.STORAGE_KEYS.DOCUMENTS],
      bookings: rawBackup[CONFIG.STORAGE_KEYS.BOOKINGS],
      accounting: rawBackup[CONFIG.STORAGE_KEYS.ACCOUNTING],
      activityLog: rawBackup[CONFIG.STORAGE_KEYS.ACTIVITY_LOG],
      properties: rawBackup[CONFIG.STORAGE_KEYS.PROPERTIES],
      cleaning: rawBackup[CONFIG.STORAGE_KEYS.CLEANING],
      maintenance: rawBackup[CONFIG.STORAGE_KEYS.MAINTENANCE],
      theme: rawBackup[CONFIG.STORAGE_KEYS.THEME]
    });

    return {
      version: CONFIG.APP_VERSION,
      timestamp: rawBackup.timestamp || new Date().toISOString(),
      data: normalizedData,
      stats: this.computeStats(normalizedData),
      legacy: true
    };
  },

  /**
   * Crea backup completo di tutti i dati
   * @returns {object} - Oggetto backup
   */
  createBackup() {
    try {
      const data = this.ensureDataShape({
        users: StorageManager.load(CONFIG.STORAGE_KEYS.USERS, []),
        currentUser: StorageManager.load(CONFIG.STORAGE_KEYS.CURRENT_USER, null),
        contacts: StorageManager.load(CONFIG.STORAGE_KEYS.CONTACTS, []),
        contactCategories: StorageManager.load(CONFIG.STORAGE_KEYS.CONTACT_CATEGORIES, []),
        tasks: StorageManager.load(CONFIG.STORAGE_KEYS.TASKS, []),
        notes: StorageManager.load(CONFIG.STORAGE_KEYS.NOTES, []),
        documents: StorageManager.load(CONFIG.STORAGE_KEYS.DOCUMENTS, []),
        bookings: StorageManager.load(CONFIG.STORAGE_KEYS.BOOKINGS, []),
        accounting: StorageManager.load(CONFIG.STORAGE_KEYS.ACCOUNTING, []),
        activityLog: StorageManager.load(CONFIG.STORAGE_KEYS.ACTIVITY_LOG, []),
        properties: StorageManager.load(CONFIG.STORAGE_KEYS.PROPERTIES, []),
        cleaning: StorageManager.load(CONFIG.STORAGE_KEYS.CLEANING, []),
        maintenance: StorageManager.load(CONFIG.STORAGE_KEYS.MAINTENANCE, []),
        theme: StorageManager.load(CONFIG.STORAGE_KEYS.THEME, null),
        calendarSync: StorageManager.load(CONFIG.STORAGE_KEYS.CALENDAR_SYNC, null)
      });

      const backup = {
        version: CONFIG.APP_VERSION,
        timestamp: new Date().toISOString(),
        data,
        stats: this.computeStats(data)
      };
      
      return backup;
    } catch (error) {
      ErrorHandler.handle(error, 'BackupModule.createBackup');
      throw error;
    }
  },

  /**
   * Scarica backup come file JSON
   * @returns {void}
   */
  downloadBackup() {
    try {
      const backup = this.createBackup();
      const filename = `backup_${new Date().toISOString().split('T')[0]}_${Date.now()}.json`;
      
      Utils.downloadJSON(backup, filename);
      
      NotificationService.success('Backup creato con successo!');
      
      // Log attività
      ActivityLog.log(
        CONFIG.ACTION_TYPES.DOWNLOAD,
        'backup',
        0,
        { filename, stats: backup.stats }
      );
    } catch (error) {
      ErrorHandler.handle(error, 'BackupModule.downloadBackup');
    }
  },

  /**
   * Ripristina dati da backup
   * @param {object} backupData - Dati del backup
   * @returns {object} - { success: boolean, message: string }
   */
  async restoreBackup(backupData) {
    try {
      const normalizedBackup = this.normalizeBackupData(backupData);
      if (!normalizedBackup) {
        return { 
          success: false, 
          message: 'File backup non valido o corrotto' 
        };
      }

      const { data, stats, version, timestamp, legacy } = normalizedBackup;
      const safeStats = stats || this.computeStats(data);
      const backupTimestamp = timestamp || new Date().toISOString();

      // Verifica versione compatibilità (opzionale, per ora accetta tutti)
      if (version && version !== CONFIG.APP_VERSION) {
        console.warn(`Backup da versione diversa: ${version} vs ${CONFIG.APP_VERSION}`);
      }

      if (legacy) {
        NotificationService.info('Backup legacy rilevato: i dati verranno convertiti automaticamente.');
      }

      // Conferma dall'utente
      const confirmed = confirm(
        `Ripristinare il backup del ${Utils.formatDate(new Date(backupTimestamp), true)}?\n\n` +
        `Questo sovrascriverà TUTTI i dati attuali!\n\n` +
        `Contatti: ${safeStats.totalContacts}\n` +
        `Tasks: ${safeStats.totalTasks}\n` +
        `Note: ${safeStats.totalNotes}\n` +
        `Prenotazioni: ${safeStats.totalBookings}\n` +
        `Transazioni: ${safeStats.totalTransactions}`
      );

      if (!confirmed) {
        return { success: false, message: 'Ripristino annullato' };
      }

      // Crea backup di sicurezza prima di sovrascrivere
      const currentBackup = this.createBackup();
      const emergencyBackupKey = 'dashboard_emergency_backup';
      localStorage.setItem(emergencyBackupKey, JSON.stringify(currentBackup));

      // Ripristina tutti i dati
      StorageManager.save(CONFIG.STORAGE_KEYS.USERS, data.users || []);
      StorageManager.save(CONFIG.STORAGE_KEYS.CURRENT_USER, data.currentUser || null);
      StorageManager.save(CONFIG.STORAGE_KEYS.CONTACTS, data.contacts || []);
      StorageManager.save(CONFIG.STORAGE_KEYS.CONTACT_CATEGORIES, data.contactCategories || []);
      StorageManager.save(CONFIG.STORAGE_KEYS.TASKS, data.tasks || []);
      StorageManager.save(CONFIG.STORAGE_KEYS.NOTES, data.notes || []);
      StorageManager.save(CONFIG.STORAGE_KEYS.DOCUMENTS, data.documents || []);
      StorageManager.save(CONFIG.STORAGE_KEYS.BOOKINGS, data.bookings || []);
      StorageManager.save(CONFIG.STORAGE_KEYS.ACCOUNTING, data.accounting || []);
      StorageManager.save(CONFIG.STORAGE_KEYS.ACTIVITY_LOG, data.activityLog || []);
      StorageManager.save(CONFIG.STORAGE_KEYS.PROPERTIES, data.properties || []);
      StorageManager.save(CONFIG.STORAGE_KEYS.CLEANING, data.cleaning || []);
      StorageManager.save(CONFIG.STORAGE_KEYS.MAINTENANCE, data.maintenance || []);
      StorageManager.save(CONFIG.STORAGE_KEYS.THEME, data.theme || null);
      StorageManager.save(CONFIG.STORAGE_KEYS.CALENDAR_SYNC, data.calendarSync || null);

      // Log attività
      ActivityLog.log(
        CONFIG.ACTION_TYPES.UPLOAD,
        'backup',
        0,
        { restored: safeStats, legacy }
      );

      NotificationService.success('Backup ripristinato con successo! Ricarica la pagina.');

      // Ricarica pagina dopo 2 secondi
      setTimeout(() => {
        window.location.reload();
      }, 2000);

      return { 
        success: true, 
        message: 'Backup ripristinato. La pagina verrà ricaricata.' 
      };
    } catch (error) {
      ErrorHandler.handle(error, 'BackupModule.restoreBackup');
      return { 
        success: false, 
        message: 'Errore durante il ripristino del backup' 
      };
    }
  },

  /**
   * Gestisce upload file backup
   * @param {File} file - File JSON del backup
   * @returns {Promise<object>} - Risultato ripristino
   */
  async handleFileUpload(file) {
    try {
      const isJsonFile = file && (file.type === 'application/json' || file.name.toLowerCase().endsWith('.json') || file.type === '');
      if (!file || !isJsonFile) {
        NotificationService.error('Seleziona un file JSON valido');
        return { success: false, message: 'File non valido' };
      }

      const content = await Utils.readFileAsText(file);
      const backupData = JSON.parse(content);
      
      return await this.restoreBackup(backupData);
    } catch (error) {
      ErrorHandler.handle(error, 'BackupModule.handleFileUpload');
      return { 
        success: false, 
        message: 'Errore lettura file backup' 
      };
    }
  },

  /**
   * Esporta backup automatico periodico (future feature)
   * @returns {void}
   */
  enableAutoBackup() {
    // TODO: Implementare backup automatico giornaliero/settimanale
    // salvato in localStorage o scaricato automaticamente
  }
};
