// ==================== AUTO BACKUP SERVICE ====================
/**
 * Servizio per backup automatici programmati
 * Salva backup in localStorage con retention policy
 */

const AutoBackupService = {
  config: {
    enabled: false,
    frequency: 'daily', // 'daily' | 'weekly'
    maxBackups: 7, // Numero massimo backup automatici da mantenere
    lastBackup: null
  },

  timerId: null,

  /**
   * Inizializza servizio auto-backup
   */
  init() {
    const savedConfig = localStorage.getItem('autobackup_config');
    if (savedConfig) {
      try {
        this.config = JSON.parse(savedConfig);
        if (this.config.enabled) {
          this.start();
        }
      } catch (error) {
        console.error('Errore caricamento config auto-backup:', error);
      }
    }
  },

  /**
   * Salva configurazione
   */
  saveConfig(enabled, frequency) {
    this.config.enabled = enabled;
    this.config.frequency = frequency;
    localStorage.setItem('autobackup_config', JSON.stringify(this.config));
    
    if (enabled) {
      this.start();
    } else {
      this.stop();
    }
  },

  /**
   * Avvia scheduler backup automatici
   */
  start() {
    this.stop(); // Pulisci timer esistenti
    
    const interval = this.config.frequency === 'daily' 
      ? 24 * 60 * 60 * 1000  // 24 ore
      : 7 * 24 * 60 * 60 * 1000; // 7 giorni
    
    // Esegui backup immediato se non fatto di recente
    const now = Date.now();
    const lastBackup = this.config.lastBackup ? new Date(this.config.lastBackup).getTime() : 0;
    const timeSinceLastBackup = now - lastBackup;
    
    if (timeSinceLastBackup > interval) {
      this.performBackup();
    }
    
    // Scheduler periodico
    this.timerId = setInterval(() => {
      this.performBackup();
    }, interval);
    
    console.log(`[AutoBackup] Avviato - Frequenza: ${this.config.frequency}`);
  },

  /**
   * Ferma scheduler
   */
  stop() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
      console.log('[AutoBackup] Fermato');
    }
  },

  /**
   * Esegue backup automatico
   */
  performBackup() {
    try {
      console.log('[AutoBackup] Creazione backup automatico...');
      
      // Crea backup usando BackupModule
      const backup = BackupModule.createBackup();
      
      // Aggiungi metadata auto-backup
      backup.autoBackup = true;
      backup.frequency = this.config.frequency;
      
      // Salva in localStorage
      this.saveAutoBackup(backup);
      
      // Aggiorna lastBackup
      this.config.lastBackup = backup.timestamp;
      localStorage.setItem('autobackup_config', JSON.stringify(this.config));
      
      // Pulisci backup vecchi
      this.cleanOldBackups();
      
      console.log('[AutoBackup] Backup automatico completato:', backup.timestamp);
      
      // Notifica solo se utente attivo (opzionale)
      if (document.visibilityState === 'visible') {
        NotificationService.info('Backup automatico completato');
      }
    } catch (error) {
      console.error('[AutoBackup] Errore durante backup automatico:', error);
    }
  },

  /**
   * Salva backup automatico in localStorage
   */
  saveAutoBackup(backup) {
    const backups = this.getAllAutoBackups();
    backups.push({
      id: Date.now(),
      timestamp: backup.timestamp,
      data: backup
    });
    
    localStorage.setItem('autobackup_list', JSON.stringify(backups));
  },

  /**
   * Ottiene tutti i backup automatici
   */
  getAllAutoBackups() {
    const saved = localStorage.getItem('autobackup_list');
    return saved ? JSON.parse(saved) : [];
  },

  /**
   * Pulisce backup vecchi (mantiene solo ultimi N)
   */
  cleanOldBackups() {
    const backups = this.getAllAutoBackups();
    
    if (backups.length > this.config.maxBackups) {
      // Ordina per timestamp (più recente prima)
      backups.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      // Mantieni solo ultimi maxBackups
      const toKeep = backups.slice(0, this.config.maxBackups);
      localStorage.setItem('autobackup_list', JSON.stringify(toKeep));
      
      console.log(`[AutoBackup] Pulizia: ${backups.length - toKeep.length} backup vecchi rimossi`);
    }
  },

  /**
   * Scarica backup automatico specifico
   */
  downloadAutoBackup(id) {
    const backups = this.getAllAutoBackups();
    const backup = backups.find(b => b.id === id);
    
    if (!backup) {
      NotificationService.error('Backup non trovato');
      return;
    }
    
    const filename = `autobackup_${new Date(backup.timestamp).toISOString().split('T')[0]}.json`;
    Utils.downloadJSON(backup.data, filename);
    NotificationService.success('Backup automatico scaricato');
  },

  /**
   * Ripristina da backup automatico
   */
  async restoreAutoBackup(id) {
    const backups = this.getAllAutoBackups();
    const backup = backups.find(b => b.id === id);
    
    if (!backup) {
      NotificationService.error('Backup non trovato');
      return { success: false };
    }
    
    return await BackupModule.restoreBackup(backup.data);
  },

  /**
   * Elimina backup automatico
   */
  deleteAutoBackup(id) {
    const backups = this.getAllAutoBackups();
    const filtered = backups.filter(b => b.id !== id);
    localStorage.setItem('autobackup_list', JSON.stringify(filtered));
    NotificationService.success('Backup eliminato');
  },

  /**
   * Ottiene statistiche auto-backup
   */
  getStats() {
    const backups = this.getAllAutoBackups();
    const totalSize = JSON.stringify(backups).length;
    
    return {
      enabled: this.config.enabled,
      frequency: this.config.frequency,
      lastBackup: this.config.lastBackup,
      totalBackups: backups.length,
      maxBackups: this.config.maxBackups,
      storageUsed: (totalSize / 1024).toFixed(2) + ' KB',
      nextBackup: this.getNextBackupTime()
    };
  },

  /**
   * Calcola prossimo backup
   */
  getNextBackupTime() {
    if (!this.config.enabled || !this.config.lastBackup) {
      return null;
    }
    
    const lastBackup = new Date(this.config.lastBackup);
    const interval = this.config.frequency === 'daily' 
      ? 24 * 60 * 60 * 1000 
      : 7 * 24 * 60 * 60 * 1000;
    
    const nextBackup = new Date(lastBackup.getTime() + interval);
    return nextBackup.toISOString();
  }
};

// Inizializza al caricamento pagina
if (typeof window !== 'undefined') {
  window.AutoBackupService = AutoBackupService;
  
  // Auto-init quando DOM pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => AutoBackupService.init());
  } else {
    AutoBackupService.init();
  }
}
