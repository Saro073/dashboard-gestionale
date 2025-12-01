// ==================== ACTIVITY LOG ====================
// Traccia tutte le azioni degli utenti

const ActivityLog = {
  
  /**
   * Registra un'attività
   * @param {string} action - Tipo azione (CONFIG.ACTION_TYPES)
   * @param {string} entityType - Tipo entità (CONFIG.ENTITY_TYPES)
   * @param {number} entityId - ID entità
   * @param {object} details - Dettagli aggiuntivi
   */
  log(action, entityType, entityId, details = {}) {
    const currentUser = AuthManager.getCurrentUser();
    
    if (!currentUser) return; // Nessun utente autenticato
    
    const entry = {
      id: Utils.generateId(),
      userId: currentUser.id,
      username: currentUser.username,
      action,
      entityType,
      entityId,
      details,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent
    };
    
    const logs = this.getAll();
    logs.unshift(entry); // Aggiungi in testa (più recente prima)
    
    // Mantieni solo gli ultimi 1000 log per performance
    const trimmedLogs = logs.slice(0, 1000);
    
    StorageManager.save(CONFIG.STORAGE_KEYS.ACTIVITY_LOG, trimmedLogs);
  },
  
  /**
   * Ottiene tutti i log
   * @returns {Array} - Array di log
   */
  getAll() {
    return StorageManager.load(CONFIG.STORAGE_KEYS.ACTIVITY_LOG, []);
  },
  
  /**
   * Ottiene log recenti
   * @param {number} limit - Numero massimo log
   * @returns {Array} - Array di log
   */
  getRecent(limit = CONFIG.UI.MAX_RECENT_ACTIVITIES) {
    const logs = this.getAll();
    return logs.slice(0, limit);
  },
  
  /**
   * Ottiene log per utente
   * @param {number} userId - ID utente
   * @param {number} limit - Numero massimo log
   * @returns {Array} - Array di log
   */
  getByUser(userId, limit = 100) {
    const logs = this.getAll();
    return logs.filter(log => log.userId === userId).slice(0, limit);
  },
  
  /**
   * Ottiene log per tipo entità
   * @param {string} entityType - Tipo entità
   * @param {number} limit - Numero massimo log
   * @returns {Array} - Array di log
   */
  getByEntityType(entityType, limit = 100) {
    const logs = this.getAll();
    return logs.filter(log => log.entityType === entityType).slice(0, limit);
  },
  
  /**
   * Ottiene log per specifica entità
   * @param {string} entityType - Tipo entità
   * @param {number} entityId - ID entità
   * @returns {Array} - Array di log
   */
  getByEntity(entityType, entityId) {
    const logs = this.getAll();
    return logs.filter(log => 
      log.entityType === entityType && log.entityId === entityId
    );
  },
  
  /**
   * Ottiene log per tipo azione
   * @param {string} action - Tipo azione
   * @param {number} limit - Numero massimo log
   * @returns {Array} - Array di log
   */
  getByAction(action, limit = 100) {
    const logs = this.getAll();
    return logs.filter(log => log.action === action).slice(0, limit);
  },
  
  /**
   * Ottiene log in un intervallo di date
   * @param {Date|string} startDate - Data inizio
   * @param {Date|string} endDate - Data fine
   * @returns {Array} - Array di log
   */
  getByDateRange(startDate, endDate) {
    const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
    const end = typeof endDate === 'string' ? new Date(endDate) : endDate;
    
    const logs = this.getAll();
    return logs.filter(log => {
      const logDate = new Date(log.timestamp);
      return logDate >= start && logDate <= end;
    });
  },
  
  /**
   * Formatta log entry per visualizzazione
   * @param {object} entry - Entry log
   * @returns {string} - Testo formattato
   */
  formatEntry(entry) {
    const actionLabels = {
      login: 'ha effettuato il login',
      logout: 'ha effettuato il logout',
      create: 'ha creato',
      update: 'ha modificato',
      delete: 'ha eliminato',
      view: 'ha visualizzato'
    };
    
    const entityLabels = {
      user: 'utente',
      contact: 'contatto',
      task: 'task',
      note: 'nota',
      document: 'documento'
    };
    
    const action = actionLabels[entry.action] || entry.action;
    const entity = entityLabels[entry.entityType] || entry.entityType;
    const time = Utils.getRelativeTime(entry.timestamp);
    
    let text = `${entry.username} ${action}`;
    
    if (entry.action !== 'login' && entry.action !== 'logout') {
      text += ` ${entity}`;
      
      if (entry.details.name || entry.details.title) {
        text += ` "${entry.details.name || entry.details.title}"`;
      }
    }
    
    return { text, time, icon: this.getActionIcon(entry.action) };
  },
  
  /**
   * Ottiene icona per tipo azione
   * @param {string} action - Tipo azione
   * @returns {string} - Emoji icona
   */
  getActionIcon(action) {
    const icons = {
      login: '🔓',
      logout: '🚪',
      create: '➕',
      update: '✏️',
      delete: '🗑️',
      view: '👁️'
    };
    return icons[action] || '📊';
  },
  
  /**
   * Statistiche log
   * @returns {object} - Statistiche
   */
  getStats() {
    const logs = this.getAll();
    
    return {
      total: logs.length,
      logins: logs.filter(l => l.action === CONFIG.ACTION_TYPES.LOGIN).length,
      creates: logs.filter(l => l.action === CONFIG.ACTION_TYPES.CREATE).length,
      updates: logs.filter(l => l.action === CONFIG.ACTION_TYPES.UPDATE).length,
      deletes: logs.filter(l => l.action === CONFIG.ACTION_TYPES.DELETE).length,
      byUser: this.getActivityByUser(),
      byEntityType: this.getActivityByEntityType()
    };
  },
  
  /**
   * Attività per utente
   * @returns {object} - Conteggi per utente
   */
  getActivityByUser() {
    const logs = this.getAll();
    const stats = {};
    
    logs.forEach(log => {
      if (!stats[log.username]) {
        stats[log.username] = 0;
      }
      stats[log.username]++;
    });
    
    return stats;
  },
  
  /**
   * Attività per tipo entità
   * @returns {object} - Conteggi per tipo entità
   */
  getActivityByEntityType() {
    const logs = this.getAll();
    const stats = {};
    
    logs.forEach(log => {
      if (!stats[log.entityType]) {
        stats[log.entityType] = 0;
      }
      stats[log.entityType]++;
    });
    
    return stats;
  },
  
  /**
   * Esporta log in CSV
   * @returns {string} - CSV string
   */
  exportCSV() {
    const logs = this.getAll();
    const headers = ['Timestamp', 'Utente', 'Azione', 'Tipo Entità', 'ID Entità', 'Dettagli'];
    const rows = logs.map(log => [
      log.timestamp,
      log.username,
      log.action,
      log.entityType,
      log.entityId,
      JSON.stringify(log.details)
    ]);
    
    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
    
    return csv;
  },
  
  /**
   * Pulisce log vecchi
   * @param {number} days - Giorni da mantenere
   */
  cleanOldLogs(days = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const logs = this.getAll();
    const filtered = logs.filter(log => new Date(log.timestamp) >= cutoffDate);
    
    StorageManager.save(CONFIG.STORAGE_KEYS.ACTIVITY_LOG, filtered);
  }
};
