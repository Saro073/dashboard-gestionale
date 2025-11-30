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
   * Verifica se utente può modificare tutti i dati
   * @returns {boolean}
   */
  canEditAllData() {
    return AuthManager.hasPermission('canEditAllData');
  },
  
  /**
   * Verifica se utente può eliminare tutti i dati
   * @returns {boolean}
   */
  canDeleteAllData() {
    return AuthManager.hasPermission('canDeleteAllData');
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
    // Admin e Supervisor possono modificare tutto
    if (this.canEditAllData()) return true;
    
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
    if (this.canDeleteAllData()) return true;
    
    // Supervisor e User: solo chi l'ha creato
    const currentUser = AuthManager.getCurrentUser();
    return contact.createdBy === currentUser.id;
  },
  
  /**
   * Verifica se utente può modificare un task
   * @param {object} task - Task
   * @returns {boolean}
   */
  canEditTask(task) {
    // Admin e Supervisor possono modificare tutto
    if (this.canEditAllData()) return true;
    
    const currentUser = AuthManager.getCurrentUser();
    
    // User: può modificare se è il creatore o l'assegnatario
    return task.createdBy === currentUser.id || task.assignedTo === currentUser.id;
  },
  
  /**
   * Verifica se utente può eliminare un task
   * @param {object} task - Task
   * @returns {boolean}
   */
  canDeleteTask(task) {
    // Admin può eliminare tutto
    if (this.canDeleteAllData()) return true;
    
    const currentUser = AuthManager.getCurrentUser();
    
    // Supervisor e User: solo il creatore può eliminare
    return task.createdBy === currentUser.id;
  },
  
  /**
   * Verifica se utente può vedere un task
   * @param {object} task - Task
   * @returns {boolean}
   */
  canViewTask(task) {
    // Admin e Supervisor possono vedere tutto
    if (this.canViewAllData()) return true;
    
    const currentUser = AuthManager.getCurrentUser();
    
    // User: può vedere se è il creatore o l'assegnatario
    return task.createdBy === currentUser.id || task.assignedTo === currentUser.id;
  },
  
  /**
   * Verifica se utente può modificare una nota
   * @param {object} note - Nota
   * @returns {boolean}
   */
  canEditNote(note) {
    // Admin e Supervisor possono modificare tutto
    if (this.canEditAllData()) return true;
    
    const currentUser = AuthManager.getCurrentUser();
    
    // User: le note sono private - solo il creatore
    return note.createdBy === currentUser.id;
  },
  
  /**
   * Verifica se utente può eliminare una nota
   * @param {object} note - Nota
   * @returns {boolean}
   */
  canDeleteNote(note) {
    // Admin può eliminare tutto
    if (this.canDeleteAllData()) return true;
    
    const currentUser = AuthManager.getCurrentUser();
    
    // Supervisor e User: le note sono private - solo il creatore
    return note.createdBy === currentUser.id;
  },
  
  /**
   * Verifica se utente può vedere una nota
   * @param {object} note - Nota
   * @returns {boolean}
   */
  canViewNote(note) {
    // Admin e Supervisor possono vedere tutto
    if (this.canViewAllData()) return true;
    
    const currentUser = AuthManager.getCurrentUser();
    
    // User: le note sono private - solo il creatore
    return note.createdBy === currentUser.id;
  },
  
  /**
   * Verifica se utente può modificare un documento
   * @param {object} document - Documento
   * @returns {boolean}
   */
  canEditDocument(document) {
    // Admin e Supervisor possono modificare tutto
    if (this.canEditAllData()) return true;
    
    const currentUser = AuthManager.getCurrentUser();
    
    // User: solo il creatore può modificare
    return document.uploadedBy === currentUser.id;
  },
  
  /**
   * Verifica se utente può eliminare un documento
   * @param {object} document - Documento
   * @returns {boolean}
   */
  canDeleteDocument(document) {
    // Admin può eliminare tutto
    if (this.canDeleteAllData()) return true;
    
    const currentUser = AuthManager.getCurrentUser();
    
    // Supervisor e User: solo il creatore può eliminare
    return document.uploadedBy === currentUser.id;
  },
  
  /**
   * Filtra array rimuovendo elementi non visibili
   * @param {Array} items - Array di elementi
   * @param {string} type - Tipo entità ('task', 'note', 'document')
   * @returns {Array} - Array filtrato
   */
  filterViewable(items, type) {
    // Admin e Supervisor vedono tutto
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