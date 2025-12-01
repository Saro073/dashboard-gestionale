// ==================== USERS MANAGEMENT MODULE ====================
/**
 * UsersManagementModule - Gestione utenti (solo admin)
 * Permette creazione, modifica, eliminazione e gestione ruoli
 */

const UsersManagementModule = {
  
  /**
   * Ottiene tutti gli utenti
   * @returns {Array} - Array di utenti (senza password)
   */
  getAll() {
    const users = StorageManager.load(CONFIG.STORAGE_KEYS.USERS, []);
    // Rimuovi password per sicurezza
    return users.map(user => ({
      ...user,
      password: undefined
    }));
  },
  
  /**
   * Ottiene utente per ID
   * @param {number} id - ID utente
   * @returns {object|null} - Utente o null
   */
  getById(id) {
    const users = StorageManager.load(CONFIG.STORAGE_KEYS.USERS, []);
    const user = users.find(u => u.id === id);
    if (user) {
      return { ...user, password: undefined };
    }
    return null;
  },
  
  /**
   * Crea nuovo utente
   * @param {object} userData - Dati utente
   * @returns {object} - { success: boolean, user: object|null, message: string }
   */
  create(userData) {
    const currentUser = AuthManager.getCurrentUser();
    
    // Verifica permessi
    if (!PermissionsManager.canCreateUsers()) {
      NotificationService.error('Non hai i permessi per creare utenti');
      return { success: false, user: null, message: 'Non autorizzato' };
    }
    
    // Validazione
    const validation = this.validateUserData(userData);
    if (!validation.valid) {
      NotificationService.error(validation.message);
      return { success: false, user: null, message: validation.message };
    }
    
    // Verifica username univoco
    const users = StorageManager.load(CONFIG.STORAGE_KEYS.USERS, []);
    if (users.find(u => u.username === userData.username)) {
      NotificationService.error('Username già esistente');
      return { success: false, user: null, message: 'Username duplicato' };
    }
    
    // Verifica email univoca
    if (userData.email && users.find(u => u.email === userData.email)) {
      NotificationService.error('Email già esistente');
      return { success: false, user: null, message: 'Email duplicata' };
    }
    
    // Crea utente
    const newUser = {
      id: Utils.generateId(),
      username: userData.username.trim(),
      password: userData.password, // In produzione: hash con bcrypt
      fullName: userData.fullName?.trim() || '',
      email: userData.email?.trim() || '',
      role: userData.role || CONFIG.ROLES.USER,
      active: true,
      createdBy: currentUser.id,
      createdByUsername: currentUser.username,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Salva
    users.push(newUser);
    StorageManager.save(CONFIG.STORAGE_KEYS.USERS, users);
    
    // Log attività
    ActivityLog.log(CONFIG.ACTION_TYPES.CREATE, CONFIG.ENTITY_TYPES.USER, newUser.id, {
      username: newUser.username,
      role: newUser.role
    });
    
    // Emetti evento
    EventBus.emit(EVENTS.USER_CREATED, { ...newUser, password: undefined });
    
    // Notifica
    NotificationService.success(`Utente "${newUser.username}" creato!`);
    
    return { 
      success: true, 
      user: { ...newUser, password: undefined }, 
      message: 'Utente creato' 
    };
  },
  
  /**
   * Aggiorna utente
   * @param {number} id - ID utente
   * @param {object} updates - Dati da aggiornare
   * @returns {object} - { success: boolean, user: object|null, message: string }
   */
  update(id, updates) {
    const currentUser = AuthManager.getCurrentUser();
    const users = StorageManager.load(CONFIG.STORAGE_KEYS.USERS, []);
    const index = users.findIndex(u => u.id === id);
    
    if (index === -1) {
      return { success: false, user: null, message: 'Utente non trovato' };
    }
    
    const user = users[index];
    
    // Verifica permessi
    if (!PermissionsManager.canEditUsers() && currentUser.id !== id) {
      NotificationService.error('Non hai i permessi per modificare altri utenti');
      return { success: false, user: null, message: 'Non autorizzato' };
    }
    
    // Non permettere cambio proprio ruolo
    if (currentUser.id === id && updates.role && updates.role !== user.role) {
      NotificationService.error('Non puoi cambiare il tuo ruolo');
      return { success: false, user: null, message: 'Non puoi cambiare il tuo ruolo' };
    }
    
    // Validazione parziale
    if (updates.username) {
      if (updates.username.length < CONFIG.VALIDATION.MIN_USERNAME_LENGTH) {
        NotificationService.error(`Username minimo ${CONFIG.VALIDATION.MIN_USERNAME_LENGTH} caratteri`);
        return { success: false, user: null, message: 'Username troppo corto' };
      }
      
      // Verifica univocità username
      if (users.find(u => u.username === updates.username && u.id !== id)) {
        NotificationService.error('Username già esistente');
        return { success: false, user: null, message: 'Username duplicato' };
      }
    }
    
    if (updates.email && !CONFIG.VALIDATION.EMAIL_REGEX.test(updates.email)) {
      NotificationService.error('Email non valida');
      return { success: false, user: null, message: 'Email non valida' };
    }
    
    if (updates.password && updates.password.length < CONFIG.VALIDATION.MIN_PASSWORD_LENGTH) {
      NotificationService.error(`Password minimo ${CONFIG.VALIDATION.MIN_PASSWORD_LENGTH} caratteri`);
      return { success: false, user: null, message: 'Password troppo corta' };
    }
    
    // Aggiorna
    users[index] = {
      ...user,
      ...updates,
      password: updates.password || user.password, // Se non fornita, mantieni vecchia
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser.id,
      updatedByUsername: currentUser.username
    };
    
    StorageManager.save(CONFIG.STORAGE_KEYS.USERS, users);
    
    // Log attività
    ActivityLog.log(CONFIG.ACTION_TYPES.UPDATE, CONFIG.ENTITY_TYPES.USER, id, {
      username: users[index].username
    });
    
    // Emetti evento
    EventBus.emit(EVENTS.USER_UPDATED, { ...users[index], password: undefined });
    
    // Notifica
    NotificationService.success('Utente aggiornato!');
    
    // Se ha modificato se stesso, aggiorna sessione
    if (currentUser.id === id) {
      const updatedUser = { ...users[index] };
      StorageManager.save(CONFIG.STORAGE_KEYS.CURRENT_USER, updatedUser);
    }
    
    return { 
      success: true, 
      user: { ...users[index], password: undefined }, 
      message: 'Utente aggiornato' 
    };
  },
  
  /**
   * Elimina utente
   * @param {number} id - ID utente
   * @returns {object} - { success: boolean, message: string }
   */
  delete(id) {
    const currentUser = AuthManager.getCurrentUser();
    
    // Verifica permessi
    if (!PermissionsManager.canDeleteUsers()) {
      NotificationService.error('Non hai i permessi per eliminare utenti');
      return { success: false, message: 'Non autorizzato' };
    }
    
    // Non permettere eliminazione di se stesso
    if (currentUser.id === id) {
      NotificationService.error('Non puoi eliminare il tuo account');
      return { success: false, message: 'Non puoi eliminare te stesso' };
    }
    
    const users = StorageManager.load(CONFIG.STORAGE_KEYS.USERS, []);
    const user = users.find(u => u.id === id);
    
    if (!user) {
      return { success: false, message: 'Utente non trovato' };
    }
    
    // Non permettere eliminazione ultimo admin
    if (user.role === CONFIG.ROLES.ADMIN) {
      const admins = users.filter(u => u.role === CONFIG.ROLES.ADMIN);
      if (admins.length === 1) {
        NotificationService.error('Non puoi eliminare l\'ultimo amministratore');
        return { success: false, message: 'Ultimo admin' };
      }
    }
    
    const filtered = users.filter(u => u.id !== id);
    StorageManager.save(CONFIG.STORAGE_KEYS.USERS, filtered);
    
    // Log attività
    ActivityLog.log(CONFIG.ACTION_TYPES.DELETE, CONFIG.ENTITY_TYPES.USER, id, {
      username: user.username
    });
    
    // Emitti evento
    EventBus.emit(EVENTS.USER_DELETED, { id, username: user.username });
    
    // Notifica
    NotificationService.success(`Utente "${user.username}" eliminato`);
    
    return { success: true, message: 'Utente eliminato' };
  },
  
  /**
   * Toggle attivo/disattivo
   * @param {number} id - ID utente
   * @returns {object} - { success: boolean, active: boolean }
   */
  toggleActive(id) {
    const currentUser = AuthManager.getCurrentUser();
    
    if (!PermissionsManager.canEditUsers()) {
      NotificationService.error('Non hai i permessi per modificare utenti');
      return { success: false, active: false };
    }
    
    if (currentUser.id === id) {
      NotificationService.error('Non puoi disattivare il tuo account');
      return { success: false, active: true };
    }
    
    const users = StorageManager.load(CONFIG.STORAGE_KEYS.USERS, []);
    const index = users.findIndex(u => u.id === id);
    
    if (index === -1) {
      return { success: false, active: false };
    }
    
    users[index].isActive = !users[index].isActive;
    users[index].updatedAt = new Date().toISOString();
    
    StorageManager.save(CONFIG.STORAGE_KEYS.USERS, users);
    
    EventBus.emit(EVENTS.USER_UPDATED, { ...users[index], password: undefined });
    
    NotificationService.info(
      users[index].isActive ? 
      `Utente "${users[index].username}" attivato` : 
      `Utente "${users[index].username}" disattivato`
    );
    
    return { success: true, active: users[index].isActive };
  },
  
  /**
   * Cerca utenti
   * @param {string} searchTerm - Termine di ricerca
   * @returns {Array} - Array filtrato
   */
  search(searchTerm) {
    const users = this.getAll();
    return Utils.filterBySearch(users, searchTerm, ['username', 'fullName', 'email']);
  },
  
  /**
   * Filtra per ruolo
   * @param {string} role - Ruolo
   * @returns {Array} - Array filtrato
   */
  filterByRole(role) {
    if (role === 'all') return this.getAll();
    const users = this.getAll();
    return users.filter(u => u.role === role);
  },
  
  /**
   * Filtra per stato
   * @param {boolean} active - Stato
   * @returns {Array} - Array filtrato
   */
  filterByStatus(active) {
    const users = this.getAll();
    return users.filter(u => u.isActive === active);
  },
  
  /**
   * Statistiche utenti
   * @returns {object} - Statistiche
   */
  getStats() {
    const users = this.getAll();
    
    return {
      total: users.length,
      active: users.filter(u => u.isActive).length,
      inactive: users.filter(u => !u.isActive).length,
      byRole: {
        admin: users.filter(u => u.role === CONFIG.ROLES.ADMIN).length,
        user: users.filter(u => u.role === CONFIG.ROLES.USER).length
      }
    };
  },
  
  /**
   * Valida dati utente
   * @param {object} userData - Dati da validare
   * @returns {object} - { valid: boolean, message: string }
   */
  validateUserData(userData) {
    if (!userData.username || userData.username.trim().length < CONFIG.VALIDATION.MIN_USERNAME_LENGTH) {
      return { 
        valid: false, 
        message: `Username minimo ${CONFIG.VALIDATION.MIN_USERNAME_LENGTH} caratteri` 
      };
    }
    
    if (userData.username.length > CONFIG.VALIDATION.MAX_USERNAME_LENGTH) {
      return { 
        valid: false, 
        message: `Username massimo ${CONFIG.VALIDATION.MAX_USERNAME_LENGTH} caratteri` 
      };
    }
    
    if (!userData.password || userData.password.length < CONFIG.VALIDATION.MIN_PASSWORD_LENGTH) {
      return { 
        valid: false, 
        message: `Password minimo ${CONFIG.VALIDATION.MIN_PASSWORD_LENGTH} caratteri` 
      };
    }
    
    if (userData.password.length > CONFIG.VALIDATION.MAX_PASSWORD_LENGTH) {
      return { 
        valid: false, 
        message: `Password massimo ${CONFIG.VALIDATION.MAX_PASSWORD_LENGTH} caratteri` 
      };
    }
    
    if (userData.email && !CONFIG.VALIDATION.EMAIL_REGEX.test(userData.email)) {
      return { valid: false, message: 'Email non valida' };
    }
    
    return { valid: true, message: 'OK' };
  },
  
  /**
   * Reset password utente
   * @param {number} id - ID utente
   * @param {string} newPassword - Nuova password
   * @returns {object} - { success: boolean, message: string }
   */
  resetPassword(id, newPassword) {
    if (!PermissionsManager.canEditUsers()) {
      NotificationService.error('Non hai i permessi');
      return { success: false, message: 'Non autorizzato' };
    }
    
    if (newPassword.length < CONFIG.VALIDATION.MIN_PASSWORD_LENGTH) {
      NotificationService.error(`Password minimo ${CONFIG.VALIDATION.MIN_PASSWORD_LENGTH} caratteri`);
      return { success: false, message: 'Password troppo corta' };
    }
    
    const result = this.update(id, { password: newPassword });
    
    if (result.success) {
      NotificationService.success('Password resettata!');
    }
    
    return result;
  }
};
