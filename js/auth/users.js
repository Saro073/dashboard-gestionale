// ==================== USER MANAGEMENT ====================

const UserManager = {
  
  /**
   * Inizializza sistema utenti con admin di default
   */
  init() {
    const users = this.getAll();
    
    // Crea admin di default se non esistono utenti
    if (users.length === 0) {
      this.create({
        username: 'admin',
        password: 'admin123',
        fullName: 'Amministratore',
        email: 'admin@ferienwohnung.com',
        role: CONFIG.ROLES.ADMIN
      });
    }
  },
  
  /**
   * Ottiene tutti gli utenti
   * @returns {Array} - Array di utenti
   */
  getAll() {
    return StorageManager.load(CONFIG.STORAGE_KEYS.USERS, []);
  },
  
  /**
   * Ottiene utente per ID
   * @param {number} id - ID utente
   * @returns {object|null} - Utente o null
   */
  getById(id) {
    const users = this.getAll();
    return users.find(u => u.id === id) || null;
  },
  
  /**
   * Ottiene utente per username
   * @param {string} username - Username
   * @returns {object|null} - Utente o null
   */
  getByUsername(username) {
    const users = this.getAll();
    return users.find(u => u.username === username) || null;
  },
  
  /**
   * Crea nuovo utente
   * @param {object} userData - Dati utente
   * @returns {object} - { success: boolean, user: object|null, message: string }
   */
  create(userData) {
    // Validazione username
    const usernameValidation = Utils.validateUsername(userData.username);
    if (!usernameValidation.valid) {
      return { success: false, user: null, message: usernameValidation.message };
    }
    
    // Validazione password
    const passwordValidation = Utils.validatePassword(userData.password);
    if (!passwordValidation.valid) {
      return { success: false, user: null, message: passwordValidation.message };
    }
    
    // Verifica username univoco
    if (this.getByUsername(userData.username)) {
      return { success: false, user: null, message: 'Username già esistente' };
    }
    
    // Validazione email (opzionale)
    if (userData.email && !Utils.validateEmail(userData.email)) {
      return { success: false, user: null, message: 'Email non valida' };
    }
    
    // Crea utente
    const user = {
      id: Utils.generateId(),
      username: userData.username,
      password: userData.password, // In produzione: hashare!
      fullName: userData.fullName || userData.username,
      email: userData.email || '',
      phone: userData.phone || '',
      role: userData.role || CONFIG.ROLES.USER,
      avatar: userData.avatar || '',
      createdAt: new Date().toISOString(),
      lastLogin: null,
      isActive: true
    };
    
    // Salva
    const users = this.getAll();
    users.push(user);
    StorageManager.save(CONFIG.STORAGE_KEYS.USERS, users);
    
    // Log attività
    if (window.ActivityLog) {
      ActivityLog.log(CONFIG.ACTION_TYPES.CREATE, CONFIG.ENTITY_TYPES.USER, user.id, {
        username: user.username,
        role: user.role
      });
    }
    
    return { success: true, user, message: 'Utente creato con successo' };
  },
  
  /**
   * Aggiorna utente
   * @param {number} id - ID utente
   * @param {object} updates - Dati da aggiornare
   * @returns {object} - { success: boolean, user: object|null, message: string }
   */
  update(id, updates) {
    const users = this.getAll();
    const index = users.findIndex(u => u.id === id);
    
    if (index === -1) {
      return { success: false, user: null, message: 'Utente non trovato' };
    }
    
    // Validazioni
    if (updates.username && updates.username !== users[index].username) {
      const usernameValidation = Utils.validateUsername(updates.username);
      if (!usernameValidation.valid) {
        return { success: false, user: null, message: usernameValidation.message };
      }
      if (this.getByUsername(updates.username)) {
        return { success: false, user: null, message: 'Username già esistente' };
      }
    }
    
    if (updates.password) {
      const passwordValidation = Utils.validatePassword(updates.password);
      if (!passwordValidation.valid) {
        return { success: false, user: null, message: passwordValidation.message };
      }
    }
    
    if (updates.email && !Utils.validateEmail(updates.email)) {
      return { success: false, user: null, message: 'Email non valida' };
    }
    
    // Aggiorna
    users[index] = { ...users[index], ...updates };
    StorageManager.save(CONFIG.STORAGE_KEYS.USERS, users);
    
    // Log attività
    if (window.ActivityLog) {
      ActivityLog.log(CONFIG.ACTION_TYPES.UPDATE, CONFIG.ENTITY_TYPES.USER, id, updates);
    }
    
    return { success: true, user: users[index], message: 'Utente aggiornato' };
  },
  
  /**
   * Elimina utente
   * @param {number} id - ID utente
   * @returns {object} - { success: boolean, message: string }
   */
  delete(id) {
    const users = this.getAll();
    const user = users.find(u => u.id === id);
    
    if (!user) {
      return { success: false, message: 'Utente non trovato' };
    }
    
    // Impedisci eliminazione ultimo admin
    const admins = users.filter(u => u.role === CONFIG.ROLES.ADMIN);
    if (user.role === CONFIG.ROLES.ADMIN && admins.length === 1) {
      return { success: false, message: 'Impossibile eliminare l\'ultimo amministratore' };
    }
    
    const filtered = users.filter(u => u.id !== id);
    StorageManager.save(CONFIG.STORAGE_KEYS.USERS, filtered);
    
    // Log attività
    if (window.ActivityLog) {
      ActivityLog.log(CONFIG.ACTION_TYPES.DELETE, CONFIG.ENTITY_TYPES.USER, id, {
        username: user.username
      });
    }
    
    return { success: true, message: 'Utente eliminato' };
  },
  
  /**
   * Aggiorna ultimo login
   * @param {number} id - ID utente
   */
  updateLastLogin(id) {
    this.update(id, { lastLogin: new Date().toISOString() });
  },
  
  /**
   * Cambia stato attivo/inattivo
   * @param {number} id - ID utente
   * @param {boolean} isActive - Nuovo stato
   * @returns {object} - Risultato operazione
   */
  setActive(id, isActive) {
    return this.update(id, { isActive });
  },
  
  /**
   * Cambia password utente
   * @param {number} id - ID utente
   * @param {string} oldPassword - Password attuale
   * @param {string} newPassword - Nuova password
   * @returns {object} - { success: boolean, message: string }
   */
  changePassword(id, oldPassword, newPassword) {
    const user = this.getById(id);
    
    if (!user) {
      return { success: false, message: 'Utente non trovato' };
    }
    
    if (user.password !== oldPassword) {
      return { success: false, message: 'Password attuale errata' };
    }
    
    const passwordValidation = Utils.validatePassword(newPassword);
    if (!passwordValidation.valid) {
      return { success: false, message: passwordValidation.message };
    }
    
    return this.update(id, { password: newPassword });
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
      admins: users.filter(u => u.role === CONFIG.ROLES.ADMIN).length,
      users: users.filter(u => u.role === CONFIG.ROLES.USER).length
    };
  }
};
