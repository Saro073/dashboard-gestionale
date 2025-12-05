// ==================== BACKUP & RESTORE MODULE ====================
// Sistema per backup e ripristino completo dei dati

const BackupModule = {
  /**
   * Crea backup completo di tutti i dati
   * @returns {object} - Oggetto backup
   */
  createBackup() {
    try {
      const backup = {
        version: CONFIG.APP_VERSION,
        timestamp: new Date().toISOString(),
        data: {
          users: StorageManager.load(CONFIG.STORAGE_KEYS.USERS, []),
          contacts: StorageManager.load(CONFIG.STORAGE_KEYS.CONTACTS, []),
          contactCategories: StorageManager.load(CONFIG.STORAGE_KEYS.CONTACT_CATEGORIES, []),
          tasks: StorageManager.load(CONFIG.STORAGE_KEYS.TASKS, []),
          notes: StorageManager.load(CONFIG.STORAGE_KEYS.NOTES, []),
          documents: StorageManager.load(CONFIG.STORAGE_KEYS.DOCUMENTS, []),
          bookings: StorageManager.load(CONFIG.STORAGE_KEYS.BOOKINGS, []),
          accounting: StorageManager.load(CONFIG.STORAGE_KEYS.ACCOUNTING, []),
          activityLog: StorageManager.load(CONFIG.STORAGE_KEYS.ACTIVITY_LOG, [])
        },
        stats: {
          totalContacts: StorageManager.load(CONFIG.STORAGE_KEYS.CONTACTS, []).length,
          totalTasks: StorageManager.load(CONFIG.STORAGE_KEYS.TASKS, []).length,
          totalNotes: StorageManager.load(CONFIG.STORAGE_KEYS.NOTES, []).length,
          totalBookings: StorageManager.load(CONFIG.STORAGE_KEYS.BOOKINGS, []).length,
          totalTransactions: StorageManager.load(CONFIG.STORAGE_KEYS.ACCOUNTING, []).length
        }
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
      // Validazione backup
      if (!backupData || !backupData.version || !backupData.data) {
        return { 
          success: false, 
          message: 'File backup non valido o corrotto' 
        };
      }

      // Verifica versione compatibilità (opzionale, per ora accetta tutti)
      if (backupData.version !== CONFIG.APP_VERSION) {
        console.warn(`Backup da versione diversa: ${backupData.version} vs ${CONFIG.APP_VERSION}`);
      }

      // Conferma dall'utente
      const confirmed = confirm(
        `Ripristinare il backup del ${Utils.formatDate(new Date(backupData.timestamp), true)}?\n\n` +
        `Questo sovrascriverà TUTTI i dati attuali!\n\n` +
        `Contatti: ${backupData.stats.totalContacts}\n` +
        `Tasks: ${backupData.stats.totalTasks}\n` +
        `Note: ${backupData.stats.totalNotes}\n` +
        `Prenotazioni: ${backupData.stats.totalBookings}\n` +
        `Transazioni: ${backupData.stats.totalTransactions}`
      );

      if (!confirmed) {
        return { success: false, message: 'Ripristino annullato' };
      }

      // Crea backup di sicurezza prima di sovrascrivere
      const currentBackup = this.createBackup();
      const emergencyBackupKey = 'dashboard_emergency_backup';
      localStorage.setItem(emergencyBackupKey, JSON.stringify(currentBackup));

      // Ripristina tutti i dati
      StorageManager.save(CONFIG.STORAGE_KEYS.USERS, backupData.data.users || []);
      StorageManager.save(CONFIG.STORAGE_KEYS.CONTACTS, backupData.data.contacts || []);
      StorageManager.save(CONFIG.STORAGE_KEYS.CONTACT_CATEGORIES, backupData.data.contactCategories || []);
      StorageManager.save(CONFIG.STORAGE_KEYS.TASKS, backupData.data.tasks || []);
      StorageManager.save(CONFIG.STORAGE_KEYS.NOTES, backupData.data.notes || []);
      StorageManager.save(CONFIG.STORAGE_KEYS.DOCUMENTS, backupData.data.documents || []);
      StorageManager.save(CONFIG.STORAGE_KEYS.BOOKINGS, backupData.data.bookings || []);
      StorageManager.save(CONFIG.STORAGE_KEYS.ACCOUNTING, backupData.data.accounting || []);
      StorageManager.save(CONFIG.STORAGE_KEYS.ACTIVITY_LOG, backupData.data.activityLog || []);

      // Log attività
      ActivityLog.log(
        CONFIG.ACTION_TYPES.UPLOAD,
        'backup',
        0,
        { restored: backupData.stats }
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
      if (!file || file.type !== 'application/json') {
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
