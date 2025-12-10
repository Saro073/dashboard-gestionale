// ==================== AUTHENTICATION SYSTEM ====================

const AuthManager = {
  currentUser: null,
  
  // Rate limiting per brute-force protection
  loginAttempts: {}, // { username: { count: 0, lockedUntil: null } }
  MAX_ATTEMPTS: 5,
  LOCKOUT_DURATION: 15 * 60 * 1000, // 15 minuti in millisecondi
  
  /**
   * Inizializza sistema autenticazione
   */
  init() {
    // Inizializza user manager
    UserManager.init();
    
    // Recupera sessione corrente
    this.loadSession();
    
    // Carica tentativi falliti da localStorage
    this._loadLoginAttempts();
  },
  
  /**
   * Carica tentativi login falliti da localStorage
   * @private
   */
  _loadLoginAttempts() {
    try {
      const stored = localStorage.getItem('auth_login_attempts');
      if (stored) {
        this.loginAttempts = JSON.parse(stored);
      }
    } catch (e) {
      console.error('Errore caricamento login attempts:', e);
    }
  },
  
  /**
   * Salva tentativi login falliti in localStorage
   * @private
   */
  _saveLoginAttempts() {
    try {
      localStorage.setItem('auth_login_attempts', JSON.stringify(this.loginAttempts));
    } catch (e) {
      console.error('Errore salvataggio login attempts:', e);
    }
  },
  
  /**
   * Verifica se account è bloccato per rate limiting
   * @param {string} username - Username da controllare
   * @returns {object} - { isLocked: boolean, remainingTime: number }
   * @private
   */
  _checkRateLimit(username) {
    const now = Date.now();
    const attempt = this.loginAttempts[username];
    
    if (!attempt) {
      return { isLocked: false, remainingTime: 0 };
    }
    
    // Se lockout è scaduto, resetta
    if (attempt.lockedUntil && now >= attempt.lockedUntil) {
      delete this.loginAttempts[username];
      this._saveLoginAttempts();
      return { isLocked: false, remainingTime: 0 };
    }
    
    // Se account è bloccato
    if (attempt.lockedUntil && now < attempt.lockedUntil) {
      const remainingTime = Math.ceil((attempt.lockedUntil - now) / 1000); // secondi
      return { isLocked: true, remainingTime };
    }
    
    return { isLocked: false, remainingTime: 0 };
  },
  
  /**
   * Registra tentativo login fallito
   * @param {string} username - Username
   * @private
   */
  _recordFailedAttempt(username) {
    if (!this.loginAttempts[username]) {
      this.loginAttempts[username] = { count: 0, lockedUntil: null };
    }
    
    this.loginAttempts[username].count++;
    
    // Se raggiunto limite, attiva lockout
    if (this.loginAttempts[username].count >= this.MAX_ATTEMPTS) {
      this.loginAttempts[username].lockedUntil = Date.now() + this.LOCKOUT_DURATION;
    }
    
    this._saveLoginAttempts();
  },
  
  /**
   * Resetta tentativi login falliti (dopo successo)
   * @param {string} username - Username
   * @private
   */
  _resetAttempts(username) {
    delete this.loginAttempts[username];
    this._saveLoginAttempts();
  },
  
  /**
   * Login utente (sicuro con PasswordHash + Rate Limiting)
   * @param {string} username - Username
   * @param {string} password - Password (plaintext)
   * @returns {object} - { success: boolean, user: object|null, message: string }
   */
  login(username, password) {
    // Validazione input
    if (!username || !password) {
      return { success: false, user: null, message: 'Username e password richiesti' };
    }
    
    // RATE LIMITING: Controlla se account è bloccato
    const rateLimitCheck = this._checkRateLimit(username);
    if (rateLimitCheck.isLocked) {
      const minutes = Math.ceil(rateLimitCheck.remainingTime / 60);
      return {
        success: false,
        user: null,
        message: `Account bloccato. Riprova tra ${minutes} minuto${minutes !== 1 ? 'i' : ''}.`
      };
    }
    
    // Cerca utente
    const user = UserManager.getByUsername(username);
    
    if (!user) {
      // RATE LIMITING: Registra tentativo fallito
      this._recordFailedAttempt(username);
      return { success: false, user: null, message: 'Credenziali non valide' };
    }
    
    // Verifica utente attivo
    if (!user.isActive) {
      // RATE LIMITING: Registra tentativo fallito
      this._recordFailedAttempt(username);
      return { success: false, user: null, message: 'Account disattivato' };
    }
    
    // Verifica password con PasswordHash (sicurezza timing-safe)
    if (!PasswordHash.verify(password, user.password)) {
      // RATE LIMITING: Registra tentativo fallito
      this._recordFailedAttempt(username);
      const attempts = this.loginAttempts[username];
      const remainingAttempts = this.MAX_ATTEMPTS - attempts.count;
      
      return {
        success: false,
        user: null,
        message: `Credenziali non valide (${remainingAttempts} tentativo${remainingAttempts !== 1 ? 'i' : ''} rimasto${remainingAttempts !== 1 ? 'i' : ''})`
      };
    }
    
    // RATE LIMITING: Reset tentativi dopo successo
    this._resetAttempts(username);
    
    // Login successful
    this.currentUser = user;
    this.saveSession();
    
    // Aggiorna ultimo login
    UserManager.updateLastLogin(user.id);
    
    // Log attività
    if (window.ActivityLog) {
      ActivityLog.log(CONFIG.ACTION_TYPES.LOGIN, CONFIG.ENTITY_TYPES.USER, user.id, {
        username: user.username
      });
    }
    
    return { success: true, user, message: 'Login effettuato' };
  },
  
  /**
   * Logout utente
   */
  logout() {
    // Log attività
    if (this.currentUser && window.ActivityLog) {
      ActivityLog.log(CONFIG.ACTION_TYPES.LOGOUT, CONFIG.ENTITY_TYPES.USER, this.currentUser.id, {
        username: this.currentUser.username
      });
    }
    
    this.currentUser = null;
    StorageManager.remove(CONFIG.STORAGE_KEYS.CURRENT_USER);
  },
  
  /**
   * Verifica se utente è autenticato
   * @returns {boolean} - True se autenticato
   */
  isAuthenticated() {
    return this.currentUser !== null;
  },
  
  /**
   * Ottiene utente corrente
   * @returns {object|null} - Utente corrente
   */
  getCurrentUser() {
    return this.currentUser;
  },
  
  /**
   * Verifica se utente è admin
   * @returns {boolean} - True se admin
   */
  isAdmin() {
    return this.currentUser && this.currentUser.role === CONFIG.ROLES.ADMIN;
  },
  
  /**
   * Verifica permesso
   * @param {string} permission - Nome permesso
   * @returns {boolean} - True se ha permesso
   */
  hasPermission(permission) {
    if (!this.currentUser) return false;
    const userPermissions = CONFIG.PERMISSIONS[this.currentUser.role];
    return userPermissions && userPermissions[permission] === true;
  },
  
  /**
   * Richiede permesso (lancia errore se non autorizzato)
   * @param {string} permission - Nome permesso
   * @throws {Error} - Se non autorizzato
   */
  requirePermission(permission) {
    if (!this.hasPermission(permission)) {
      throw new Error('Non autorizzato');
    }
  },
  
  /**
   * Salva sessione
   */
  saveSession() {
    if (this.currentUser) {
      // Salva solo dati necessari (non password)
      const sessionData = {
        id: this.currentUser.id,
        username: this.currentUser.username,
        fullName: this.currentUser.fullName,
        email: this.currentUser.email,
        role: this.currentUser.role,
        avatar: this.currentUser.avatar
      };
      StorageManager.save(CONFIG.STORAGE_KEYS.CURRENT_USER, sessionData);
    }
  },
  
  /**
   * Carica sessione
   */
  loadSession() {
    const sessionData = StorageManager.load(CONFIG.STORAGE_KEYS.CURRENT_USER);
    
    if (sessionData) {
      // Recupera utente completo dal database
      const user = UserManager.getById(sessionData.id);
      
      if (user && user.isActive) {
        this.currentUser = user;
      } else {
        // Sessione non valida
        this.logout();
      }
    }
  },
  
  /**
   * Aggiorna profilo utente corrente
   * @param {object} updates - Dati da aggiornare
   * @returns {object} - Risultato operazione
   */
  updateProfile(updates) {
    if (!this.currentUser) {
      return { success: false, message: 'Nessun utente autenticato' };
    }
    
    // Non permettere cambio ruolo dal profilo
    const safeUpdates = { ...updates };
    delete safeUpdates.role;
    delete safeUpdates.isActive;
    
    const result = UserManager.update(this.currentUser.id, safeUpdates);
    
    if (result.success) {
      this.currentUser = result.user;
      this.saveSession();
    }
    
    return result;
  },
  
  /**
   * Cambia password utente corrente
   * @param {string} oldPassword - Password attuale
   * @param {string} newPassword - Nuova password
   * @returns {object} - Risultato operazione
   */
  changePassword(oldPassword, newPassword) {
    if (!this.currentUser) {
      return { success: false, message: 'Nessun utente autenticato' };
    }
    
    return UserManager.changePassword(this.currentUser.id, oldPassword, newPassword);
  },
  
  /**
   * Registra nuovo utente (solo per admin)
   * @param {object} userData - Dati nuovo utente
   * @returns {object} - Risultato operazione
   */
  register(userData) {
    // Solo admin possono creare utenti
    if (!this.hasPermission('canCreateUsers')) {
      return { success: false, user: null, message: 'Non autorizzato' };
    }
    
    return UserManager.create(userData);
  }
};
