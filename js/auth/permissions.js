// ==================== PERMISSIONS SYSTEM ====================

const PermissionsManager = {
  
  /**
   * Verifica se utente può creare utenti
   * @returns {boolean}
   */
  canCreateUsers() {
    return AuthManager.hasPermission('canCreateUsers');
  },
  
  /**
   * Verifica se utente può eliminare utenti
   * @returns {boolean}
   */
  canDeleteUsers() {
    return AuthManager.hasPermission('canDeleteUsers');
  },
  
  /**
   * Verifica se utente può modificare utenti
   * @returns {boolean}
   */
  canEditUsers() {
    return AuthManager.hasPermission('canEditUsers');
  },
  
  /**
   * Verifica se utente può vedere tutti i dati
   * @returns {boolean}
   */
  canViewAllData() {
    return AuthManager.hasPermission('canViewAllData');
  },
  
  /**
   * Verifica se utente può esportare dati
   * @returns {boolean}
   */
  canExportData() {
    return AuthManager.hasPermission('canExportData');
  },
  
  /**
   * Verifica se utente può vedere i log
   * @returns {boolean}
   */
  canViewLogs() {
    return AuthManager.hasPermission('canViewLogs');
  },
  
  /**
   * Verifica se utente può gestire impostazioni
   * @returns {boolean}
   */
  canManageSettings() {
    return AuthManager.hasPermission('canManageSettings');
  },
  
  /**
   * Verifica se utente può modificare un contatto
   * @param {object} contact - Contatto
   * @returns {boolean}
   */
  canEditContact(contact) {
    // Admin può modificare tutto
    if (this.canViewAllData()) return true;
    
    // I contatti sono condivisi - tutti possono modificare
    return true;
  },
  
  /**
   * Verifica se utente può eliminare un contatto
   * @param {object} contact - Contatto
   * @returns {boolean}
   */
  canDeleteContact(contact) {
    // Admin può eliminare tutto
    if (this.canViewAllData()) return true;
    
    // I contatti sono condivisi - solo chi l'ha creato o admin
    const currentUser = AuthManager.getCurrentUser();
    return contact.createdBy === currentUser.id;
  },
  
  /**
   * Verifica se utente può modificare un task
   * @param {object} task - Task
   * @returns {boolean}
   */
  canEditTask(task) {
    // Admin può modificare tutto
    if (this.canViewAllData()) return true;
    
    const currentUser = AuthManager.getCurrentUser();
    
    // Può modificare se è il creatore o l'assegnatario
    return task.createdBy === currentUser.id || task.assignedTo === currentUser.id;
  },
  
  /**
   * Verifica se utente può eliminare un task
   * @param {object} task - Task
   * @returns {boolean}
   */
  canDeleteTask(task) {
    // Admin può eliminare tutto
    if (this.canViewAllData()) return true;
    
    const currentUser = AuthManager.getCurrentUser();
    
    // Solo il creatore può eliminare
    return task.createdBy === currentUser.id;
  },
  
  /**
   * Verifica se utente può vedere un task
   * @param {object} task - Task
   * @returns {boolean}
   */
  canViewTask(task) {
    // Admin può vedere tutto
    if (this.canViewAllData()) return true;
    
    const currentUser = AuthManager.getCurrentUser();
    
    // Può vedere se è il creatore o l'assegnatario
    return task.createdBy === currentUser.id || task.assignedTo === currentUser.id;
  },
  
  /**
   * Verifica se utente può modificare una nota
   * @param {object} note - Nota
   * @returns {boolean}
   */
  canEditNote(note) {
    const currentUser = AuthManager.getCurrentUser();
    
    // Le note sono private - solo il creatore
    return note.createdBy === currentUser.id;
  },
  
  /**
   * Verifica se utente può eliminare una nota
   * @param {object} note - Nota
   * @returns {boolean}
   */
  canDeleteNote(note) {
    const currentUser = AuthManager.getCurrentUser();
    
    // Le note sono private - solo il creatore
    return note.createdBy === currentUser.id;
  },
  
  /**
   * Verifica se utente può vedere una nota
   * @param {object} note - Nota
   * @returns {boolean}
   */
  canViewNote(note) {
    // Admin può vedere tutto
    if (this.canViewAllData()) return true;
    
    const currentUser = AuthManager.getCurrentUser();
    
    // Le note sono private - solo il creatore
    return note.createdBy === currentUser.id;
  },
  
  /**
   * Verifica se utente può modificare un documento
   * @param {object} document - Documento
   * @returns {boolean}
   */
  canEditDocument(document) {
    // Admin può modificare tutto
    if (this.canViewAllData()) return true;
    
    const currentUser = AuthManager.getCurrentUser();
    
    // Solo il creatore può modificare
    return document.createdBy === currentUser.id;
  },
  
  /**
   * Verifica se utente può eliminare un documento
   * @param {object} document - Documento
   * @returns {boolean}
   */
  canDeleteDocument(document) {
    // Admin può eliminare tutto
    if (this.canViewAllData()) return true;
    
    const currentUser = AuthManager.getCurrentUser();
    
    // Solo il creatore può eliminare
    return document.createdBy === currentUser.id;
  },
  
  /**
   * Filtra array rimuovendo elementi non visibili
   * @param {Array} items - Array di elementi
   * @param {string} type - Tipo entità ('task', 'note', 'document')
   * @returns {Array} - Array filtrato
   */
  filterViewable(items, type) {
    // Admin vede tutto
    if (this.canViewAllData()) return items;
    
    const currentUser = AuthManager.getCurrentUser();
    
    switch (type) {
      case 'task':
        return items.filter(item => 
          item.createdBy === currentUser.id || item.assignedTo === currentUser.id
        );
      
      case 'note':
        return items.filter(item => item.createdBy === currentUser.id);
      
      case 'document':
        // Documenti visibili a tutti
        return items;
      
      default:
        return items;
    }
  }
};
