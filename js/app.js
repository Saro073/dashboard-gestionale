// ==================== APP ORCHESTRATOR ====================
// Orchestratore modulare con nuova architettura

class DashboardApp {
  constructor() {
    this.currentEditingTaskId = null; // Per gestire edit task
    this.currentEditingNoteId = null; // Per gestire edit note
    this.currentEditingContactId = null; // Contatti
    this.currentEditingTransactionId = null; // Transazioni
    
    // Stato selezione multipla
    this.selectedTasks = new Set();
    this.selectedContacts = new Set();
    this.selectedNotes = new Set();
    this.selectedDocuments = new Set();
    
    // Stato quick contact form
    this.quickContactRole = null; // 'cleaning', 'maintenance', 'owner', 'emergency'
    
    // Salva reference globale per accesso da HTML onclick
    DashboardApp.instance = this;
    
    // Avvia inizializzazione async (salva la promise se serve attendere altrove)
    this.ready = this.init();
  }
  
  /**
   * Inizializzazione applicazione
   */
  async init() {
    // Inizializza servizi core
    NotificationService.init();

    // Assicura che lo storage backend sia inizializzato e cache popolata
    try {
      await StorageManager.loadAsync(CONFIG.STORAGE_KEYS.USERS, []);
      await StorageManager.loadAsync(CONFIG.STORAGE_KEYS.CURRENT_USER, null);
    } catch (error) {
      ErrorHandler.handle(error, 'DashboardApp.init.loadStorage');
    }
    
    // Inizializza autenticazione
    AuthManager.init();
    
    // Inizializza properties e migrazione dati
    if (PropertiesModule && typeof PropertiesModule.migrateExistingData === 'function') {
      PropertiesModule.migrateExistingData();
    }
    
    // Inizializza categorie con defaults e migrazione
    if (CategoryManager && typeof CategoryManager.initializeDefaults === 'function') {
      CategoryManager.initializeDefaults();
    }
    
    // Migra vecchi contatti se necessario
    if (ContactsModule && typeof ContactsModule.migrateOldContacts === 'function') {
      ContactsModule.migrateOldContacts();
    }
    
    // Migra vecchie prenotazioni (guestName → firstName/lastName + link contatti)
    if (BookingsModule && typeof BookingsModule.migrateOldBookings === 'function') {
      BookingsModule.migrateOldBookings();
    }
    
    // Migra categorie dai contatti esistenti
    if (CategoryManager && typeof CategoryManager.migrateFromContacts === 'function') {
      CategoryManager.migrateFromContacts();
    }
    
    // Verifica se nessun utente esiste (primo accesso) - mostra setup form
    const users = UserManager.getAll();
    if (users.length === 0) {
      this.showSetup();
    } else if (AuthManager.isAuthenticated()) {
      this.showDashboard();
    } else {
      this.showLogin();
    }
    
    // Setup event listeners
    this.setupEventListeners();
    
    // Setup EventBus listeners
    this.setupEventBusListeners();
  }
  
  /**
   * Setup EventBus listeners per aggiornamenti reattivi
   */
  setupEventBusListeners() {
    // Ricarica statistiche quando cambiano i dati
    EventBus.on(EVENTS.CONTACT_CREATED, () => this.updateStats());
    EventBus.on(EVENTS.CONTACT_DELETED, () => this.updateStats());
    EventBus.on(EVENTS.TASK_CREATED, () => this.updateStats());
    EventBus.on(EVENTS.TASK_DELETED, () => this.updateStats());
    EventBus.on(EVENTS.TASK_COMPLETED, () => this.updateStats());
    EventBus.on(EVENTS.NOTE_CREATED, () => this.updateStats());
    EventBus.on(EVENTS.NOTE_DELETED, () => this.updateStats());
    EventBus.on(EVENTS.DOCUMENT_UPLOADED, () => this.updateStats());
    EventBus.on(EVENTS.DOCUMENT_DELETED, () => this.updateStats());
    EventBus.on(EVENTS.BOOKING_CREATED, () => this.updateStats());
    EventBus.on(EVENTS.BOOKING_DELETED, () => this.updateStats());
    EventBus.on(EVENTS.USER_CREATED, () => this.renderUsers());
    EventBus.on(EVENTS.USER_UPDATED, () => this.renderUsers());
    EventBus.on(EVENTS.USER_DELETED, () => this.renderUsers());
    
    // Category admin updates
    EventBus.on(EVENTS.CATEGORY_CREATED, () => {
      this.renderCategoryAdmin();
      this.populateContactFilter();
    });
    EventBus.on(EVENTS.CATEGORY_DELETED, () => {
      this.renderCategoryAdmin();
      this.populateContactFilter();
    });
    EventBus.on(EVENTS.CONTACT_CREATED, () => this.renderCategoryAdmin());
    EventBus.on(EVENTS.CONTACT_UPDATED, () => this.renderCategoryAdmin());
    EventBus.on(EVENTS.CONTACT_DELETED, () => this.renderCategoryAdmin());
    
    // Aggiorna attività recenti E registro completo
    EventBus.on(EVENTS.CONTACT_CREATED, () => this.renderRecentActivity());
    EventBus.on(EVENTS.TASK_CREATED, () => this.renderRecentActivity());
    EventBus.on(EVENTS.NOTE_CREATED, () => this.renderRecentActivity());
    EventBus.on(EVENTS.DOCUMENT_UPLOADED, () => this.renderRecentActivity());
    EventBus.on(EVENTS.BOOKING_CREATED, () => this.renderRecentActivity());
    EventBus.on(EVENTS.USER_CREATED, () => this.renderRecentActivity());
    
    // Aggiorna anche activity log completo
    EventBus.on(EVENTS.CONTACT_CREATED, () => this.renderActivityLog());
    EventBus.on(EVENTS.CONTACT_DELETED, () => this.renderActivityLog());
    EventBus.on(EVENTS.TASK_CREATED, () => this.renderActivityLog());
    EventBus.on(EVENTS.TASK_DELETED, () => this.renderActivityLog());
    EventBus.on(EVENTS.TASK_COMPLETED, () => this.renderActivityLog());
    EventBus.on(EVENTS.NOTE_CREATED, () => this.renderActivityLog());
    EventBus.on(EVENTS.NOTE_DELETED, () => this.renderActivityLog());
    EventBus.on(EVENTS.DOCUMENT_UPLOADED, () => this.renderActivityLog());
    EventBus.on(EVENTS.DOCUMENT_DELETED, () => this.renderActivityLog());
    EventBus.on(EVENTS.BOOKING_CREATED, () => this.renderActivityLog());
    EventBus.on(EVENTS.BOOKING_DELETED, () => this.renderActivityLog());
    EventBus.on(EVENTS.USER_CREATED, () => this.renderActivityLog());
    EventBus.on(EVENTS.USER_UPDATED, () => this.renderActivityLog());
    EventBus.on(EVENTS.USER_DELETED, () => this.renderActivityLog());
    
    // Accounting - aggiorna stats e rendering
    EventBus.on(EVENTS.TRANSACTION_CREATED, () => {
      this.updateStats();
      this.renderAccounting();
    });
    EventBus.on(EVENTS.TRANSACTION_UPDATED, () => this.renderAccounting());
    EventBus.on(EVENTS.TRANSACTION_DELETED, () => {
      this.updateStats();
      this.renderAccounting();
    });

    // Properties - ricarica liste quando cambiano
    EventBus.on(EVENTS.PROPERTY_CREATED, () => {
      this.updatePropertyFilter();
      this.renderProperties();
      this.updateStats();
    });
    EventBus.on(EVENTS.PROPERTY_UPDATED, () => {
      this.updatePropertyFilter();
      this.renderProperties();
    });
    EventBus.on(EVENTS.PROPERTY_DELETED, () => {
      this.updatePropertyFilter();
      this.renderProperties();
      this.updateStats();
    });
  }
  
  /**
   * Mostra schermata login
   */
  showLogin() {
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('dashboard').style.display = 'none';
  }
  
  /**
   * Mostra dashboard
   */
  showDashboard() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('setupScreen').style.display = 'none';
    document.getElementById('dashboard').style.display = 'flex';
    
    const user = AuthManager.getCurrentUser();
    document.getElementById('userDisplay').textContent = user.fullName || user.username;
    
    // Inizializza router
    Router.init();
    
    // Inizializza property filter
    this.initializePropertyFilter();
    
    // Carica dati e render
    this.loadData();
    this.renderAll();
    
    // Aggiorna UI basata su permessi
    this.updateUIPermissions();
    
    // Mostra notifica di benvenuto
    NotificationService.success(`Benvenuto, ${user.fullName || user.username}!`);
  }

  /**
   * Mostra setup form (first-user creation)
   */
  showSetup() {
    document.getElementById('setupScreen').style.display = 'flex';
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('dashboard').style.display = 'none';
    // Clear any previous form data and errors
    document.getElementById('setupForm').reset();
    document.getElementById('setupError').style.display = 'none';
    document.getElementById('setupSuccess').style.display = 'none';
  }
  
  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Login
    document.getElementById('loginForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleLogin();
    });
    
    // Setup (First-user creation)
    const setupForm = document.getElementById('setupForm');
    if (setupForm) {
      setupForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleSetup();
      });
    }
    
    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        this.handleLogout();
      });
    }
    
    // Theme toggle
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
      themeToggle.addEventListener('click', () => {
        this.toggleTheme();
      });
    }
    
    // Backup button
    const backupBtn = document.getElementById('backupBtn');
    if (backupBtn) {
      backupBtn.addEventListener('click', () => {
        const backupModal = document.getElementById('backupModal');
        if (backupModal) {
          backupModal.classList.add('active');
        }
      });
    }
    
    // Mobile menu toggle
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.querySelector('.sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    
    if (menuToggle && sidebar && sidebarOverlay) {
      // Toggle sidebar
      menuToggle.addEventListener('click', () => {
        sidebar.classList.toggle('mobile-open');
        sidebarOverlay.classList.toggle('active');
      });
      
      // Close sidebar when clicking overlay
      sidebarOverlay.addEventListener('click', () => {
        sidebar.classList.remove('mobile-open');
        sidebarOverlay.classList.remove('active');
      });
      
      // Close sidebar when navigating on mobile
      document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
          if (window.innerWidth <= 1024) {
            sidebar.classList.remove('mobile-open');
            sidebarOverlay.classList.remove('active');
          }
        });
      });
    }
    
    // Navigation - usa Router invece di switchSection manuale
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const section = item.dataset.section;
        Router.navigate(section);
      });
    });
    
    // Contacts
    this.setupContactsListeners();
    
    // Tasks
    this.setupTasksListeners();
    
    // Notes
    this.setupNotesListeners();
    
    // Documents
    this.setupDocumentsListeners();
    
    // Bookings
    BookingsHandlers.setupBookingsListeners();
    
    // Cleaning
    this.setupCleaningListeners();
    
    // Maintenance
    this.setupMaintenanceListeners();
    
    // Accounting
    this.setupAccountingListeners();
    
    // Analytics
    this.setupAnalyticsListeners();
    
    // Settings
    this.setupSettingsListeners();
    
    // Properties
    this.setupPropertiesListeners();
    
    // Activity Log
    this.setupActivityLogListeners();
    
    // Users (solo se admin)
    if (PermissionsManager.canCreateUsers()) {
      this.setupUsersListeners();
      this.setupCategoryAdminListeners();
    }
    
    // Backup/Restore
    this.setupBackupListeners();

    // Modal close handlers: ensure editing states reset when modal closed
    document.querySelectorAll('.modal-close').forEach(btn => {
      btn.addEventListener('click', () => {
        const modal = btn.closest('.modal');
        if (!modal) return;
        switch (modal.id) {
          case 'taskModal': this.currentEditingTaskId = null; break;
          case 'noteModal': this.currentEditingNoteId = null; break;
          case 'contactModal': this.currentEditingContactId = null; break;
          default: break;
        }
        modal.classList.remove('active');
        EventBus.emit(EVENTS.MODAL_CLOSED, { modal: modal.id });
      });
    });

    // Close modal on outside click and reset editing states
    document.querySelectorAll('.modal').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          switch (modal.id) {
            case 'taskModal': this.currentEditingTaskId = null; break;
            case 'noteModal': this.currentEditingNoteId = null; break;
            case 'contactModal': this.currentEditingContactId = null; break;
            default: break;
          }
          modal.classList.remove('active');
          EventBus.emit(EVENTS.MODAL_CLOSED, { modal: modal.id });
        }
      });
    });
  }
  
  /**
   * Handle login
   */
  handleLogin() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('loginError');
    
    // Verifica rate limiting PRIMA di tentare il login
    const rateLimitCheck = AuthManager._checkRateLimit(username);
    if (rateLimitCheck.isLocked) {
      const minutes = Math.ceil(rateLimitCheck.remainingTime / 60);
      const message = `Account temporaneamente bloccato. Riprova tra ${minutes} minuto${minutes !== 1 ? 'i' : ''}.`;
      errorDiv.textContent = message;
      errorDiv.style.display = 'block';
      NotificationService.error(message);
      return;
    }
    
    const result = AuthManager.login(username, password);
    
    if (result.success) {
      errorDiv.style.display = 'none';
      this.showDashboard();
    } else {
      errorDiv.textContent = result.message;
      errorDiv.style.display = 'block';
      NotificationService.error(result.message);
      
      // Mostra numero di tentativi rimanenti se login fallito
      const attempts = AuthManager.loginAttempts[username];
      if (attempts && attempts.count < AuthManager.MAX_ATTEMPTS) {
        const remaining = AuthManager.MAX_ATTEMPTS - attempts.count;
        const attemptsMsg = `Tentativi rimasti: ${remaining}/${AuthManager.MAX_ATTEMPTS}`;
        const notice = document.createElement('div');
        notice.className = 'login-warning';
        notice.textContent = attemptsMsg;
        errorDiv.appendChild(document.createElement('br'));
        errorDiv.appendChild(notice);
      }
    }
  }
  
  /**
   * Handle logout
   */
  handleLogout() {
    AuthManager.logout();
    NotificationService.info('Logout effettuato');
    this.showLogin();
  }

  /**
   * Handle first-user setup
   */
  handleSetup() {
    const username = document.getElementById('setupUsername').value.trim();
    const fullName = document.getElementById('setupFullName').value.trim();
    const email = document.getElementById('setupEmail').value.trim();
    const password = document.getElementById('setupPassword').value;
    const passwordConfirm = document.getElementById('setupPasswordConfirm').value;
    const errorDiv = document.getElementById('setupError');
    const successDiv = document.getElementById('setupSuccess');

    // Reset messages
    errorDiv.style.display = 'none';
    successDiv.style.display = 'none';
    errorDiv.textContent = '';

    // Validation: Username
    if (!username || username.length < 3) {
      errorDiv.textContent = 'Nome utente deve avere almeno 3 caratteri';
      errorDiv.style.display = 'block';
      NotificationService.error(errorDiv.textContent);
      return;
    }

    // Validation: Full Name
    if (!fullName) {
      errorDiv.textContent = 'Nome completo è obbligatorio';
      errorDiv.style.display = 'block';
      NotificationService.error(errorDiv.textContent);
      return;
    }

    // Validation: Email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      errorDiv.textContent = 'Email non valida';
      errorDiv.style.display = 'block';
      NotificationService.error(errorDiv.textContent);
      return;
    }

    // Validation: Password requirements
    if (!password || password.length < 8) {
      errorDiv.textContent = 'Password deve avere almeno 8 caratteri';
      errorDiv.style.display = 'block';
      NotificationService.error(errorDiv.textContent);
      return;
    }

    if (!/[A-Z]/.test(password)) {
      errorDiv.textContent = 'Password deve contenere almeno una lettera maiuscola';
      errorDiv.style.display = 'block';
      NotificationService.error(errorDiv.textContent);
      return;
    }

    if (!/\d/.test(password)) {
      errorDiv.textContent = 'Password deve contenere almeno un numero';
      errorDiv.style.display = 'block';
      NotificationService.error(errorDiv.textContent);
      return;
    }

    // Validation: Password confirmation
    if (password !== passwordConfirm) {
      errorDiv.textContent = 'Le password non corrispondono';
      errorDiv.style.display = 'block';
      NotificationService.error(errorDiv.textContent);
      return;
    }

    // Check if username already exists
    const existingUser = UserManager.getByUsername(username);
    if (existingUser) {
      errorDiv.textContent = 'Nome utente già in uso';
      errorDiv.style.display = 'block';
      NotificationService.error(errorDiv.textContent);
      return;
    }

    // Create admin user
    try {
      const result = UserManager.create({
        username,
        fullName,
        email,
        password,
        role: CONFIG.ROLES.ADMIN
      });

      if (!result.success) {
        errorDiv.textContent = result.message || 'Errore durante la creazione dell\'utente';
        errorDiv.style.display = 'block';
        NotificationService.error(errorDiv.textContent);
        return;
      }

      // Clear any previous login attempts for this username
      AuthManager._resetAttempts(username);

      // Auto-login with the new admin user
      const loginResult = AuthManager.login(username, password);
      
      if (loginResult.success) {
        // Show success message
        successDiv.textContent = 'Account amministratore creato con successo! Accesso in corso...';
        successDiv.style.display = 'block';
        
        // Clear form
        document.getElementById('setupForm').reset();
        
        // Redirect to dashboard after brief delay
        setTimeout(() => {
          this.showDashboard();
        }, 1500);
      } else {
        errorDiv.textContent = 'Account creato ma login fallito: ' + loginResult.message;
        errorDiv.style.display = 'block';
        NotificationService.error(errorDiv.textContent);
      }
    } catch (error) {
      ErrorHandler.handle(error, 'DashboardApp.handleSetup', true);
      errorDiv.textContent = 'Errore durante la creazione dell\'account: ' + error.message;
      errorDiv.style.display = 'block';
    }
  }
  
  /**
   * Carica dati
   */
  loadData() {
    // I dati vengono caricati dai moduli quando necessario
  }
  
  /**
   * Render all sections
   */
  renderAll() {
    this.updateStats();
    this.populateContactFilter();
    
    // Initialize contacts view preference
    const viewType = localStorage.getItem('contacts_view_preference') || 'grid';
    const container = document.getElementById('contactsList');
    if (viewType === 'list') {
      container.classList.add('list-view');
      container.classList.remove('items-grid');
      document.getElementById('contactViewList').classList.add('active');
      document.getElementById('contactViewGrid').classList.remove('active');
    } else {
      container.classList.add('items-grid');
      container.classList.remove('list-view');
      document.getElementById('contactViewGrid').classList.add('active');
      document.getElementById('contactViewList').classList.remove('active');
    }
    
    this.renderContacts();
    this.renderTasks();
    this.renderNotes();
    this.renderDocuments();
    this.renderCleaning();
    this.renderMaintenance();
    this.renderAccounting();
    this.renderAnalytics();
    this.renderSettings();
    this.renderProperties();
    this.renderRecentActivity();
    this.renderActivityLog();
    
    // Render users solo se admin
    if (PermissionsManager.canCreateUsers()) {
      this.renderUsers();
      this.renderCategoryAdmin();
    }
  }
  
  /**
   * Aggiorna statistiche
   */
  updateStats() {
    const contactsStats = ContactsModule.getStats();
    const tasksStats = TasksModule.getStats();
    const notesStats = NotesModule.getStats();
    const documentsStats = DocumentsModule.getStats();
    
    // Statistiche bookings
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const bookingsStats = BookingsModule.getStats(currentYear, currentMonth);
    const todayCheckIns = BookingsModule.getTodayCheckIns();
    const todayCheckOuts = BookingsModule.getTodayCheckOuts();
    
    document.getElementById('contactsCount').textContent = contactsStats.total;
    document.getElementById('tasksCount').textContent = tasksStats.active;
    document.getElementById('notesCount').textContent = notesStats.total;
    document.getElementById('documentsCount').textContent = documentsStats.total;
    document.getElementById('bookingsCount').textContent = bookingsStats.totalBookings;
    document.getElementById('todayCheckIns').textContent = todayCheckIns.length;
    document.getElementById('todayCheckOuts').textContent = todayCheckOuts.length;
    
    // Update previews
    this.updateStatsPreview();
    
    // Update properties stats
    this.updatePropertiesStats();
  }
  
  /**
   * Aggiorna statistiche per properties
   */
  updatePropertiesStats() {
    if (!PropertiesModule) return;
    
    const properties = PropertiesModule.getAll();
    const section = document.getElementById('propertiesStatsSection');
    const grid = document.getElementById('propertiesStatsGrid');
    
    if (!section || !grid) return;
    
    // Nascondi se nessuna property
    if (properties.length === 0) {
      section.style.display = 'none';
      return;
    }
    
    section.style.display = 'block';
    
    // Calcola stats globali
    const allBookings = BookingsModule.getAll();
    const totalRevenue = allBookings
      .filter(b => b.status !== BookingsModule.STATUS.BLOCKED)
      .reduce((sum, b) => sum + (b.totalAmount || 0), 0);
    
    // Card totali
    let html = `
      <div class="stat-card">
        <div class="stat-icon">🏠</div>
        <div class="stat-info">
          <h3>${properties.length}</h3>
          <p>Proprietà Totali</p>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">📅</div>
        <div class="stat-info">
          <h3>${allBookings.length}</h3>
          <p>Prenotazioni Totali</p>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">💰</div>
        <div class="stat-info">
          <h3>€${totalRevenue.toLocaleString()}</h3>
          <p>Revenue Totale</p>
        </div>
      </div>
    `;
    
    // Card per ogni property
    properties.forEach(property => {
      const stats = PropertiesModule.getStats(property.id);
      html += `
        <div class="stat-card" style="border-left: 4px solid ${property.color}">
          <div class="stat-icon" style="background: ${property.color}20; color: ${property.color}">🏠</div>
          <div class="stat-info">
            <h3>${Utils.escapeHtml(property.name)}</h3>
            <p>${stats.totalBookings} prenotazioni | €${stats.totalRevenue.toLocaleString()}</p>
            <small style="color: #6b7280; font-size: 0.75rem;">${property.address?.city || 'Indirizzo non specificato'}</small>
          </div>
        </div>
      `;
    });
    
    grid.innerHTML = html;
  }
  
  /**
   * Aggiorna preview nelle stat card dell'overview
   */
  updateStatsPreview() {
    // Tasks preview - mostra top 3 per priorità
    const tasksPreview = document.getElementById('tasksPreview');
    if (tasksPreview) {
      const tasks = TasksModule.getAll()
        .filter(t => !t.completed)
        .sort((a, b) => {
          const priorities = { critical: 4, alta: 3, media: 2, bassa: 1 };
          return (priorities[b.priority] || 0) - (priorities[a.priority] || 0);
        })
        .slice(0, 3);
      
      if (tasks.length > 0) {
        tasksPreview.innerHTML = tasks.map(task => `
          <div class="stat-preview-item">
            <span class="priority-badge ${task.priority}">${task.priority}</span>
            <span>${Utils.escapeHtml(task.title)}</span>
          </div>
        `).join('');
      } else {
        tasksPreview.innerHTML = '';
      }
    }
    
    // Notes preview - mostra 3 note più recenti
    const notesPreview = document.getElementById('notesPreview');
    if (notesPreview) {
      const notes = NotesModule.getAll()
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 3);
      
      if (notes.length > 0) {
        notesPreview.innerHTML = notes.map(note => `
          <div class="stat-preview-item">
            <span>• ${Utils.escapeHtml(note.title).substring(0, 30)}${note.title.length > 30 ? '...' : ''}</span>
          </div>
        `).join('');
      } else {
        notesPreview.innerHTML = '';
      }
    }
    
    // Bookings preview - prossimi check-in
    const bookingsPreview = document.getElementById('bookingsPreview');
    if (bookingsPreview) {
      const upcoming = BookingsModule.getAll()
        .filter(b => b.status === 'confirmed' && new Date(b.checkIn) > new Date())
        .sort((a, b) => new Date(a.checkIn) - new Date(b.checkIn))
        .slice(0, 3);
      
      if (upcoming.length > 0) {
        bookingsPreview.innerHTML = upcoming.map(booking => `
          <div class="stat-preview-item">
            <span>${new Date(booking.checkIn).toLocaleDateString('it-IT', {day: 'numeric', month: 'short'})} - ${Utils.escapeHtml(booking.guestName)}</span>
          </div>
        `).join('');
      } else {
        bookingsPreview.innerHTML = '';
      }
    }
  }
  
  /**
   * Popola il filtro categorie nella toolbar contatti
   */
  populateContactFilter() {
    const filterSelect = document.getElementById('contactFilter');
    if (!filterSelect) return;
    
    const currentValue = filterSelect.value; // Salva selezione corrente
    const categories = CategoryManager.getAll();
    
    // Mantieni solo l'opzione "Tutti"
    filterSelect.innerHTML = '<option value="all">Tutti</option>';
    
    // Aggiungi le categorie dinamiche
    categories.forEach(cat => {
      const option = document.createElement('option');
      option.value = cat.toLowerCase();
      option.textContent = cat;
      filterSelect.appendChild(option);
    });
    
    // Ripristina selezione se ancora valida
    if (currentValue && currentValue !== 'all') {
      filterSelect.value = currentValue;
    }
  }

  /**
   * Switch between grid and list view for contacts
   */
  switchContactsView(viewType) {
    const gridBtn = document.getElementById('contactViewGrid');
    const listBtn = document.getElementById('contactViewList');
    const container = document.getElementById('contactsList');
    
    if (viewType === 'grid') {
      gridBtn.classList.add('active');
      listBtn.classList.remove('active');
      container.classList.remove('list-view');
      container.classList.add('items-grid');
    } else {
      listBtn.classList.add('active');
      gridBtn.classList.remove('active');
      container.classList.remove('items-grid');
      container.classList.add('list-view');
    }
    
    // Save preference
    localStorage.setItem('contacts_view_preference', viewType);
    this.renderContacts();
  }

  /**
   * Render contatti
   */
  renderContacts() {
    const container = document.getElementById('contactsList');
    const filter = document.getElementById('contactFilter').value;
    const search = document.getElementById('contactSearch').value;
    const sortValue = document.getElementById('contactSort').value;
    const viewType = localStorage.getItem('contacts_view_preference') || 'grid';
    
    // Apply category filter first
    let filtered = ContactsModule.filterByCategory(filter);
    
    // Then apply search on already filtered results
    if (search) {
      const term = search.toLowerCase();
      filtered = filtered.filter(contact => {
        // Cerca in firstName e lastName
        if (contact.firstName && contact.firstName.toLowerCase().includes(term)) return true;
        if (contact.lastName && contact.lastName.toLowerCase().includes(term)) return true;
        // Cerca anche nel campo legacy name
        if (contact.name && contact.name.toLowerCase().includes(term)) return true;
        // Cerca nelle emails
        if (contact.emails && contact.emails.some(
          e => e.value.toLowerCase().includes(term) || e.label.toLowerCase().includes(term)
        )) return true;
        // Cerca nei telefoni
        if (contact.phones && contact.phones.some(
          p => p.value.toLowerCase().includes(term) || p.label.toLowerCase().includes(term)
        )) return true;
        // Cerca in company e notes
        if (contact.company && contact.company.toLowerCase().includes(term)) return true;
        if (contact.notes && contact.notes.toLowerCase().includes(term)) return true;
        // Cerca negli indirizzi
        if (contact.address) {
          if (contact.address.city && contact.address.city.toLowerCase().includes(term)) return true;
          if (contact.address.street && contact.address.street.toLowerCase().includes(term)) return true;
        }
        if (contact.businessAddress) {
          if (contact.businessAddress.city && contact.businessAddress.city.toLowerCase().includes(term)) return true;
          if (contact.businessAddress.street && contact.businessAddress.street.toLowerCase().includes(term)) return true;
        }
        return false;
      });
    }
    
    // Apply sorting
    const [sortField, sortDir] = sortValue.split('-');
    filtered.sort((a, b) => {
      let aVal, bVal;
      
      switch(sortField) {
        case 'firstName':
          aVal = (a.firstName || '').toLowerCase();
          bVal = (b.firstName || '').toLowerCase();
          break;
        case 'lastName':
          aVal = (a.lastName || '').toLowerCase();
          bVal = (b.lastName || '').toLowerCase();
          break;
        case 'city':
          aVal = (a.address?.city || '').toLowerCase();
          bVal = (b.address?.city || '').toLowerCase();
          break;
        case 'company':
          aVal = (a.company || '').toLowerCase();
          bVal = (b.company || '').toLowerCase();
          break;
        case 'date':
          aVal = new Date(a.createdAt || 0);
          bVal = new Date(b.createdAt || 0);
          break;
        default:
          aVal = (a.name || '').toLowerCase();
          bVal = (b.name || '').toLowerCase();
      }
      
      if (sortField === 'date') {
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
      } else {
        if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
        return 0;
      }
    });
    
    if (filtered.length === 0) {
      container.innerHTML = '<p class="empty-state">Nessun contatto trovato</p>';
      return;
    }
    
    // Render based on view type
    if (viewType === 'list') {
      container.innerHTML = this.renderContactsListView(filtered);
    } else {
      container.innerHTML = this.renderContactsGridView(filtered);
    }
  }
  
  /**
   * Render grid view for contacts
   */
  renderContactsGridView(contacts) {
    return contacts.map(contact => `
      <div class="item-card">
        <h3>${Utils.escapeHtml(contact.firstName)} ${Utils.escapeHtml(contact.lastName || '')}</h3>

        ${contact.emails && contact.emails.length > 0
          ? contact.emails.map(e => `<p>📧 ${Utils.escapeHtml(e.value)} <span class="field-label">(${Utils.escapeHtml(e.label)})</span></p>`).join('')
          : ''
        }

        ${contact.phones && contact.phones.length > 0
          ? contact.phones.map(p => `<p>📞 ${Utils.escapeHtml(p.value)} <span class="field-label">(${Utils.escapeHtml(p.label)})</span></p>`).join('')
          : ''
        }

        ${contact.address?.city ? `<p>📍 ${Utils.escapeHtml(contact.address.city)}</p>` : ''}
        ${contact.company ? `<p>🏢 ${Utils.escapeHtml(contact.company)}</p>` : ''}
        ${contact.notes ? `<p class="contact-notes">📝 ${Utils.escapeHtml(contact.notes)}</p>` : ''}
        <div class="item-meta">
          <span class="item-badge badge-${contact.category}">${contact.category}</span>
          <span class="activity-time">by ${contact.createdByUsername}</span>
        </div>
        <div class="item-actions">
          ${PermissionsManager.canEditContact(contact) ? 
            `<button class="btn btn-sm btn-secondary" onclick="app.editContact(${contact.id})">Modifica</button>` : ''}
          ${PermissionsManager.canDeleteContact(contact) ?
            `<button class="btn btn-sm btn-danger" onclick="app.deleteContact(${contact.id})">Elimina</button>` : ''}
        </div>
      </div>
    `).join('');
  }
  
  /**
   * Render list view for contacts
   */
  renderContactsListView(contacts) {
    return `
      <table class="contacts-table">
        <thead>
          <tr>
            <th>Nome</th>
            <th>Cognome</th>
            <th>Email</th>
            <th>Telefono</th>
            <th>Città</th>
            <th>Categoria</th>
            <th>Azioni</th>
          </tr>
        </thead>
        <tbody>
          ${contacts.map(contact => `
            <tr>
              <td>${Utils.escapeHtml(contact.firstName || '')}</td>
              <td>${Utils.escapeHtml(contact.lastName || '')}</td>
              <td>${contact.emails && contact.emails[0] ? Utils.escapeHtml(contact.emails[0].value) : '-'}</td>
              <td>${contact.phones && contact.phones[0] ? Utils.escapeHtml(contact.phones[0].value) : '-'}</td>
              <td>${contact.address?.city ? Utils.escapeHtml(contact.address.city) : '-'}</td>
              <td><span class="item-badge badge-${contact.category}">${contact.category}</span></td>
              <td class="table-actions">
                ${PermissionsManager.canEditContact(contact) ? 
                  `<button class="btn btn-sm btn-secondary" onclick="app.editContact(${contact.id})" title="Modifica">✏️</button>` : ''}
                ${PermissionsManager.canDeleteContact(contact) ?
                  `<button class="btn btn-sm btn-danger" onclick="app.deleteContact(${contact.id})" title="Elimina">🗑️</button>` : ''}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }
  
  /**
   * Render task
   */
  renderTasks() {
    const container = document.getElementById('tasksList');
    const filter = document.getElementById('taskFilter').value;
    const tasks = TasksModule.filterByStatus(filter);
    
    if (tasks.length === 0) {
      container.innerHTML = '<p class="empty-state">Nessun task trovato</p>';
      this.updateTaskBulkActionsBar();
      this.updateTaskSelectAllCheckbox();
      return;
    }
    
    container.innerHTML = tasks.map(task => {
      // Mappa stato → label e classe CSS
      const statusLabels = {
        'todo': 'Da fare',
        'in-progress': 'In corso',
        'paused': 'In pausa',
        'completed': 'Completato',
        'cancelled': 'Annullato'
      };
      const statusLabel = statusLabels[task.status] || 'Da fare';
      const statusClass = task.status || 'todo';
      
      const isSelected = this.selectedTasks.has(task.id);
      
      return `
      <div class="task-item ${task.completed ? 'completed' : ''} ${isSelected ? 'selected' : ''}">
        <input type="checkbox" class="task-select-checkbox" ${isSelected ? 'checked' : ''}
               onchange="app.toggleTaskSelection(${task.id}, this.checked)">
        <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''}
               onchange="app.toggleTask(${task.id})" 
               ${PermissionsManager.canEditTask(task) ? '' : 'disabled'}>
        <div class="task-content">
          <h4>${Utils.escapeHtml(task.title)}</h4>
          ${task.description ? `<p>${Utils.escapeHtml(task.description)}</p>` : ''}
          <div class="item-meta">
            <span class="item-badge badge-${task.priority}">${task.priority}</span>
            <span class="item-badge badge-status status-${statusClass}">${statusLabel}</span>
            ${task.dueDate ? `<span>📅 ${Utils.formatDate(task.dueDate)}</span>` : ''}
            <span>Assegnato a: ${task.assignedToUsername}</span>
          </div>
        </div>
        <div class="item-actions">
          ${PermissionsManager.canEditTask(task) ? 
            `<button class="btn btn-sm btn-secondary" onclick="app.editTask(${task.id})">Modifica</button>` : ''}
          ${PermissionsManager.canDeleteTask(task) ?
            `<button class="btn btn-sm btn-danger" onclick="app.deleteTask(${task.id})">Elimina</button>` : ''}
        </div>
      </div>
      `;
    }).join('');
    
    this.updateTaskBulkActionsBar();
    this.updateTaskSelectAllCheckbox();
  }
  
  /**
   * Render note
   */
  renderNotes() {
    const container = document.getElementById('notesList');
    const filter = document.getElementById('noteFilter').value;
    const search = document.getElementById('noteSearch').value;
    
    let filtered = NotesModule.filterByCategory(filter);
    if (search) {
      filtered = NotesModule.search(search);
    }
    
    // Filtra per permessi
    filtered = PermissionsManager.filterViewable(filtered, 'note');
    
    if (filtered.length === 0) {
      container.innerHTML = '<p class="empty-state">Nessuna nota trovata</p>';
      return;
    }
    
    container.innerHTML = filtered.map(note => `
      <div class="item-card note-card">
        <h3>${Utils.escapeHtml(note.title)}</h3>
        <p class="note-content">${Utils.escapeHtml(note.content.substring(0, 150))}${note.content.length > 150 ? '...' : ''}</p>
        <div class="item-meta">
          <span class="item-badge badge-${note.category}">${note.category}</span>
          ${note.pinned ? '<span>📌 Pinned</span>' : ''}
          <span class="activity-time">${Utils.formatDate(note.createdAt)}</span>
        </div>
        <div class="item-actions">
          <button class="btn btn-sm btn-secondary" onclick="app.togglePinNote(${note.id})">
            ${note.pinned ? 'Unpin' : 'Pin'}
          </button>
          ${PermissionsManager.canEditNote(note) ? 
            `<button class="btn btn-sm btn-secondary" onclick="app.editNote(${note.id})">Modifica</button>` : ''}
          ${PermissionsManager.canDeleteNote(note) ?
            `<button class="btn btn-sm btn-danger" onclick="app.deleteNote(${note.id})">Elimina</button>` : ''}
        </div>
      </div>
    `).join('');
  }
  
  /**
   * Render documenti
   */
  renderDocuments() {
    const container = document.getElementById('documentsList');
    const filter = document.getElementById('documentFilter').value;
    const search = document.getElementById('documentSearch').value;
    
    let filtered = DocumentsModule.filterByCategory(filter);
    if (search) {
      filtered = DocumentsModule.search(search);
    }
    
    if (filtered.length === 0) {
      container.innerHTML = '<p class="empty-state">Nessun documento trovato</p>';
      return;
    }
    
    container.innerHTML = filtered.map(doc => `
      <div class="document-item">
        <div class="document-icon">${DocumentsModule.getFileIcon(doc.extension)}</div>
        <div class="document-content">
          <h4>${Utils.escapeHtml(doc.name)}</h4>
          <p>${doc.description ? Utils.escapeHtml(doc.description) : ''}</p>
          <div class="item-meta">
            <span class="item-badge badge-${doc.category}">${doc.category}</span>
            <span>${doc.sizeFormatted}</span>
            <span class="activity-time">${Utils.formatDate(doc.uploadedAt)}</span>
          </div>
        </div>
        <div class="item-actions">
          <button class="btn btn-sm btn-primary" onclick="app.downloadDocument(${doc.id})">Download</button>
          ${PermissionsManager.canDeleteDocument(doc) ?
            `<button class="btn btn-sm btn-danger" onclick="app.deleteDocument(${doc.id})">Elimina</button>` : ''}
        </div>
      </div>
    `).join(''); 
  }
  
  /**
   * Render utenti (solo admin)
   */
  renderUsers() {
    if (!PermissionsManager.canCreateUsers()) return;
    
    const container = document.getElementById('usersList');
    const roleFilter = document.getElementById('userRoleFilter')?.value || 'all';
    const statusFilter = document.getElementById('userStatusFilter')?.value || 'all';
    const search = document.getElementById('userSearch')?.value || '';
    
    let filtered = UsersManagementModule.getAll();
    
    // Filtra per ruolo
    if (roleFilter !== 'all') {
      filtered = UsersManagementModule.filterByRole(roleFilter);
    }
    
    // Filtra per stato
    if (statusFilter !== 'all') {
      filtered = UsersManagementModule.filterByStatus(statusFilter === 'true');
    }
    
    // Cerca
    if (search) {
      filtered = UsersManagementModule.search(search);
    }
    
    if (filtered.length === 0) {
      container.innerHTML = '<p class="empty-state">Nessun utente trovato</p>';
      return;
    }
    
    container.innerHTML = filtered.map(user => `
      <div class="user-item">
        <div class="user-avatar">
          <span class="user-initial">${user.username.charAt(0).toUpperCase()}</span>
        </div>
        <div class="user-content">
          <h4>${Utils.escapeHtml(user.username)}</h4>
          ${user.fullName ? `<p>👤 ${Utils.escapeHtml(user.fullName)}</p>` : ''}
          ${user.email ? `<p>📧 ${Utils.escapeHtml(user.email)}</p>` : ''}
          <div class="item-meta">
            <span class="item-badge badge-${user.role}">${user.role === 'admin' ? 'Amministratore' : 'Utente'}</span>
            <span class="item-badge badge-${user.isActive ? 'active' : 'inactive'}">${user.isActive ? 'Attivo' : 'Disattivato'}</span>
            <span class="activity-time">${Utils.formatDate(user.createdAt)}</span>
          </div>
        </div>
        <div class="item-actions">
          <button class="btn btn-sm btn-secondary" onclick="app.toggleUserActive(${user.id})">
            ${user.isActive ? 'Disattiva' : 'Attiva'}
          </button>
          <button class="btn btn-sm btn-secondary" onclick="app.editUser(${user.id})">Modifica</button>
          <button class="btn btn-sm btn-danger" onclick="app.deleteUser(${user.id})">Elimina</button>
        </div>
      </div>
    `).join('');
  }
  
  /**
   * Render attività recenti (widget overview)
   */
  renderRecentActivity() {
    if (!PermissionsManager.canViewLogs()) return;
    
    const container = document.getElementById('recentActivity');
    if (!container) return;
    
    const activities = ActivityLog.getRecent(5);
    
    if (activities.length === 0) {
      container.innerHTML = '<p class="empty-state">Nessuna attività recente</p>';
      return;
    }
    
    container.innerHTML = activities.map(entry => {
      const formatted = ActivityLog.formatEntry(entry);
      return `
        <div class="activity-item">
          <div class="activity-icon">${formatted.icon}</div>
          <div class="activity-content">
            <p>${formatted.text}</p>
            <span class="activity-time">${formatted.time}</span>
          </div>
        </div>
      `;
    }).join('');
  }
  
  /**
   * Render activity log completo (sezione dedicata)
   */
  renderActivityLog() {
    if (!PermissionsManager.canViewLogs()) {
      const container = document.getElementById('activityLogList');
      if (container) {
        container.innerHTML = '<p class="empty-state">Non hai i permessi per visualizzare il registro</p>';
      }
      return;
    }
    
    const container = document.getElementById('activityLogList');
    if (!container) return;
    
    const actionFilter = document.getElementById('activityLogFilter')?.value || 'all';
    const entityFilter = document.getElementById('activityLogEntityFilter')?.value || 'all';
    const search = document.getElementById('activityLogSearch')?.value || '';
    
    let activities = ActivityLog.getAll();
    
    // Filtra per azione
    if (actionFilter !== 'all') {
      activities = ActivityLog.getByAction(actionFilter, 1000);
    }
    
    // Filtra per tipo entità
    if (entityFilter !== 'all') {
      activities = ActivityLog.getByEntityType(entityFilter, 1000);
    }
    
    // Cerca
    if (search) {
      const searchLower = search.toLowerCase();
      activities = activities.filter(entry => {
        const formatted = ActivityLog.formatEntry(entry);
        return formatted.text.toLowerCase().includes(searchLower) ||
               entry.username.toLowerCase().includes(searchLower);
      });
    }
    
    if (activities.length === 0) {
      container.innerHTML = '<p class="empty-state">Nessuna attività trovata</p>';
      return;
    }
    
    container.innerHTML = activities.map(entry => {
      const formatted = ActivityLog.formatEntry(entry);
      return `
        <div class="activity-item">
          <div class="activity-icon">${formatted.icon}</div>
          <div class="activity-content">
            <p>${formatted.text}</p>
            <span class="activity-time">${formatted.time}</span>
          </div>
        </div>
      `;
    }).join('');
  }
  
  // ==================== ACTIVITY LOG LISTENERS ====================
  
  setupActivityLogListeners() {
    const activityLogSearch = document.getElementById('activityLogSearch');
    if (activityLogSearch) {
      activityLogSearch.addEventListener('input', 
        Utils.debounce(() => this.renderActivityLog(), 300)
      );
    }

    const activityLogFilter = document.getElementById('activityLogFilter');
    if (activityLogFilter) {
      activityLogFilter.addEventListener('change', () => {
        this.renderActivityLog();
      });
    }

    const activityLogEntityFilter = document.getElementById('activityLogEntityFilter');
    if (activityLogEntityFilter) {
      activityLogEntityFilter.addEventListener('change', () => {
        this.renderActivityLog();
      });
    }
  }
  
  // ==================== BACKUP & RESTORE ====================
  
  setupBackupListeners() {
    // Download backup button
    const downloadBtn = document.getElementById('downloadBackupBtn');
    if (downloadBtn) {
      downloadBtn.addEventListener('click', () => {
        BackupModule.downloadBackup();
      });
    }
    
    // Select backup file button
    const selectBtn = document.getElementById('selectBackupFileBtn');
    const fileInput = document.getElementById('backupFileInput');
    
    if (selectBtn && fileInput) {
      selectBtn.addEventListener('click', () => {
        fileInput.click();
      });
      
      fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
          const result = await BackupModule.handleFileUpload(file);
          
          // Reset input
          fileInput.value = '';
          
          // Close modal if successful
          if (result.success) {
            document.getElementById('backupModal').classList.remove('active');
          }
        }
      });
    }
  }
  
  // ==================== ACCOUNTING ====================
  
  /**
   * Render accounting dashboard and transactions
   */
  renderAccounting() {
    // Render financial stats
    this.renderFinancialStats();
    
    // Render transactions list
    const container = document.getElementById('accountingList');
    if (!container) return;
    
    const typeFilter = document.getElementById('accountingTypeFilter')?.value || 'all';
    const categoryFilter = document.getElementById('accountingCategoryFilter')?.value || 'all';
    const monthFilter = document.getElementById('accountingMonthFilter')?.value || 'all';
    const search = document.getElementById('accountingSearch')?.value || '';
    
    let transactions = AccountingModule.getAll();
    
    // Apply filters
    if (typeFilter !== 'all') {
      transactions = AccountingModule.filterByType(typeFilter);
    }
    
    if (categoryFilter !== 'all') {
      transactions = AccountingModule.filterByCategory(categoryFilter);
    }
    
    if (monthFilter !== 'all') {
      const now = new Date();
      const year = now.getFullYear();
      const month = monthFilter === 'current' ? now.getMonth() : parseInt(monthFilter);
      transactions = transactions.filter(t => {
        const tDate = new Date(t.date);
        return tDate.getFullYear() === year && tDate.getMonth() === month;
      });
    }
    
    if (search) {
      const term = search.toLowerCase();
      transactions = transactions.filter(t => {
        return (
          t.description.toLowerCase().includes(term) ||
          AccountingModule.formatCategory(t.category).toLowerCase().includes(term) ||
          t.receiptNumber.toLowerCase().includes(term) ||
          t.amount.toString().includes(term)
        );
      });
    }
    
    // Sort by date (most recent first)
    transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    if (transactions.length === 0) {
      container.innerHTML = '<p class="empty-state">Nessuna transazione trovata</p>';
      return;
    }
    
    container.innerHTML = `
      <table class="accounting-table">
        <thead>
          <tr>
            <th>Data</th>
            <th>Tipo</th>
            <th>Categoria</th>
            <th>Descrizione</th>
            <th>Importo</th>
            <th>Metodo</th>
            <th>Azioni</th>
          </tr>
        </thead>
        <tbody>
          ${transactions.map(transaction => `
            <tr class="transaction-row ${transaction.type}">
              <td>${Utils.formatDate(new Date(transaction.date))}</td>
              <td>
                <span class="transaction-badge ${transaction.type}">
                  ${transaction.type === 'income' ? '📈 Entrata' : '📉 Uscita'}
                </span>
              </td>
              <td>${Utils.escapeHtml(AccountingModule.formatCategory(transaction.category))}</td>
              <td>
                <strong>${Utils.escapeHtml(transaction.description)}</strong>
                ${transaction.receiptNumber ? `<br><small>N° ${Utils.escapeHtml(transaction.receiptNumber)}</small>` : ''}
              </td>
              <td class="amount ${transaction.type}">
                ${transaction.type === 'income' ? '+' : '-'}€${transaction.amount.toFixed(2)}
              </td>
              <td>${Utils.escapeHtml(AccountingModule.formatPaymentMethod(transaction.paymentMethod))}</td>
              <td>
                <button class="btn btn-sm btn-secondary" onclick="app.editTransaction(${transaction.id})">✏️</button>
                <button class="btn btn-sm btn-danger" onclick="app.deleteTransaction(${transaction.id})">🗑️</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }
  
  /**
   * Render financial statistics dashboard
   */
  renderFinancialStats() {
    const monthFilter = document.getElementById('accountingMonthFilter')?.value || 'all';
    
    let stats;
    if (monthFilter === 'all') {
      stats = AccountingModule.getStats();
    } else if (monthFilter === 'current') {
      const now = new Date();
      stats = AccountingModule.getStats(now.getFullYear(), now.getMonth());
    } else {
      const now = new Date();
      const month = parseInt(monthFilter);
      stats = AccountingModule.getStats(now.getFullYear(), month);
    }
    
    // Update dashboard cards
    const totalIncomeEl = document.getElementById('totalIncome');
    const totalExpensesEl = document.getElementById('totalExpenses');
    const balanceEl = document.getElementById('balance');
    const transactionCountEl = document.getElementById('transactionCount');
    
    if (totalIncomeEl) totalIncomeEl.textContent = `€${stats.totalIncome.toFixed(2)}`;
    if (totalExpensesEl) totalExpensesEl.textContent = `€${stats.totalExpenses.toFixed(2)}`;
    if (transactionCountEl) transactionCountEl.textContent = stats.transactionCount;
    
    if (balanceEl) {
      balanceEl.textContent = `€${stats.balance.toFixed(2)}`;
      // Update color based on balance
      const balanceCard = balanceEl.closest('.financial-stat-card');
      if (balanceCard) {
        balanceCard.classList.remove('positive', 'negative');
        if (stats.balance > 0) {
          balanceCard.classList.add('positive');
        } else if (stats.balance < 0) {
          balanceCard.classList.add('negative');
        }
      }
    }
  }
  
  /**
   * Open transaction modal (create or edit)
   */
  openTransactionModal(transactionId = null) {
    const modal = document.getElementById('transactionModal');
    const title = document.getElementById('transactionModalTitle');
    const form = document.getElementById('transactionForm');
    
    form.reset();
    this.currentEditingTransactionId = transactionId;
    
    if (transactionId) {
      // Edit mode
      title.textContent = 'Modifica Transazione';
      const transaction = AccountingModule.getById(transactionId);
      
      if (transaction) {
        document.getElementById('transactionType').value = transaction.type;
        document.getElementById('transactionAmount').value = transaction.amount;
        document.getElementById('transactionCategory').value = transaction.category;
        document.getElementById('transactionDate').value = transaction.date;
        document.getElementById('transactionDescription').value = transaction.description;
        document.getElementById('transactionPaymentMethod').value = transaction.paymentMethod;
        document.getElementById('transactionReceiptNumber').value = transaction.receiptNumber || '';
        document.getElementById('transactionNotes').value = transaction.notes || '';
        
        // Update categories dropdown based on type
        this.updateTransactionCategories(transaction.type);
      }
    } else {
      // Create mode
      title.textContent = 'Nuova Transazione';
      document.getElementById('transactionDate').valueAsDate = new Date();
      this.updateTransactionCategories('income');
    }
    
    modal.classList.add('active');
  }
  
  /**
   * Edit transaction
   */
  editTransaction(id) {
    this.openTransactionModal(id);
  }
  
  /**
   * Save transaction (create or update)
   */
  saveTransaction(e) {
    e.preventDefault();
    
    const amount = parseFloat(document.getElementById('transactionAmount').value);
    const category = document.getElementById('transactionCategory').value;
    const date = document.getElementById('transactionDate').value;
    const description = document.getElementById('transactionDescription').value.trim();

    // ✅ VALIDATION: Required fields
    if (!date) {
      NotificationService.error('Data transazione è obbligatoria');
      return;
    }
    if (!category) {
      NotificationService.error('Categoria è obbligatoria');
      return;
    }
    if (!description) {
      NotificationService.error('Descrizione è obbligatoria');
      return;
    }
    if (isNaN(amount) || amount <= 0) {
      NotificationService.error('Importo deve essere maggiore di zero');
      return;
    }
    
    const transactionData = {
      type: document.getElementById('transactionType').value,
      amount,
      category,
      date,
      description,
      paymentMethod: document.getElementById('transactionPaymentMethod').value,
      receiptNumber: document.getElementById('transactionReceiptNumber').value.trim(),
      notes: document.getElementById('transactionNotes').value.trim()
    };
    
    let result;
    if (this.currentEditingTransactionId) {
      // Update
      result = AccountingModule.update(this.currentEditingTransactionId, transactionData);
    } else {
      // Create
      result = AccountingModule.create(transactionData);
    }
    
    if (result.success) {
      document.getElementById('transactionModal').classList.remove('active');
      this.currentEditingTransactionId = null;
    }
  }
  
  /**
   * Delete transaction
   */
  deleteTransaction(id) {
    if (!confirm('Sei sicuro di voler eliminare questa transazione?')) {
      return;
    }
    
    const result = AccountingModule.delete(id);
    if (!result.success) {
      NotificationService.error(result.message);
    }
  }
  
  /**
   * Update category dropdown based on transaction type
   */
  updateTransactionCategories(type) {
    const incomeGroup = document.getElementById('incomeCategoriesGroup');
    const expenseGroup = document.getElementById('expenseCategoriesGroup');
    
    if (type === 'income') {
      incomeGroup.style.display = '';
      expenseGroup.style.display = 'none';
      // Select first income category
      document.getElementById('transactionCategory').value = 'booking';
    } else {
      incomeGroup.style.display = 'none';
      expenseGroup.style.display = '';
      // Select first expense category
      document.getElementById('transactionCategory').value = 'cleaning';
    }
  }
  
  // ==================== ACCOUNTING LISTENERS ====================
  
  setupAccountingListeners() {
    // Add transaction button
    const addBtn = document.getElementById('addTransactionBtn');
    if (addBtn) {
      addBtn.addEventListener('click', () => this.openTransactionModal());
    }
    
    // Export CSV button
    const exportCSVBtn = document.getElementById('exportAccountingCSV');
    if (exportCSVBtn) {
      exportCSVBtn.addEventListener('click', () => {
        const monthFilter = document.getElementById('accountingMonthFilter').value;
        const currentYear = new Date().getFullYear();
        
        if (monthFilter === 'all') {
          AccountingModule.exportToCSV(currentYear);
        } else if (monthFilter === 'current') {
          const currentMonth = new Date().getMonth();
          AccountingModule.exportToCSV(currentYear, currentMonth);
        } else {
          AccountingModule.exportToCSV(currentYear, parseInt(monthFilter));
        }
      });
    }
    
    // Export Summary button
    const exportSummaryBtn = document.getElementById('exportAccountingSummary');
    if (exportSummaryBtn) {
      exportSummaryBtn.addEventListener('click', () => {
        const currentYear = new Date().getFullYear();
        AccountingModule.exportSummary(currentYear);
      });
    }
    
    // Transaction form submit
    const form = document.getElementById('transactionForm');
    if (form) {
      form.addEventListener('submit', (e) => this.saveTransaction(e));
    }
    
    // Type change - update categories
    const typeSelect = document.getElementById('transactionType');
    if (typeSelect) {
      typeSelect.addEventListener('change', (e) => {
        this.updateTransactionCategories(e.target.value);
      });
    }
    
    // Filters
    const typeFilter = document.getElementById('accountingTypeFilter');
    if (typeFilter) {
      typeFilter.addEventListener('change', () => this.renderAccounting());
    }
    
    const categoryFilter = document.getElementById('accountingCategoryFilter');
    if (categoryFilter) {
      categoryFilter.addEventListener('change', () => this.renderAccounting());
    }
    
    const monthFilter = document.getElementById('accountingMonthFilter');
    if (monthFilter) {
      monthFilter.addEventListener('change', () => this.renderAccounting());
    }
    
    // Search
    const search = document.getElementById('accountingSearch');
    if (search) {
      search.addEventListener('input', 
        Utils.debounce(() => this.renderAccounting(), 300)
      );
    }
  }
  
  // ==================== ANALYTICS ====================
  
  /**
   * Render analytics dashboard with charts
   */
  renderAnalytics() {
    const months = parseInt(document.getElementById('analyticsPeriod')?.value) || 12;
    
    // Render KPIs
    this.renderKPIs(months);
    
    // Render charts
    this.renderRevenueTrendChart(months);
    this.renderExpenseCategoriesChart(months);
    this.renderOccupancyChart(months);
    this.renderBookingChannelsChart(months);
  }
  
  /**
   * Render KPI cards
   */
  renderKPIs(months) {
    try {
      const kpis = AnalyticsModule.getKPIs(months);
      
      // Revenue
      document.getElementById('kpiRevenue').textContent = kpis.revenue.formatted;
      this.updateKPIChange('kpiRevenueChange', kpis.revenue.change);
      
      // Occupancy
      document.getElementById('kpiOccupancy').textContent = kpis.occupancy.formatted;
      this.updateKPIChange('kpiOccupancyChange', kpis.occupancy.change);
      
      // Bookings
      document.getElementById('kpiBookings').textContent = kpis.bookings.formatted;
      this.updateKPIChange('kpiBookingsChange', kpis.bookings.change);
      
      // Avg Revenue
      document.getElementById('kpiAvgRevenue').textContent = kpis.avgRevenue.formatted;
      this.updateKPIChange('kpiAvgRevenueChange', kpis.avgRevenue.change);
    } catch (error) {
      ErrorHandler.handle(error, 'App.renderKPIs');
    }
  }
  
  /**
   * Update KPI change indicator
   */
  updateKPIChange(elementId, change) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    const absChange = Math.abs(change);
    const sign = change >= 0 ? '+' : '-';
    const icon = change >= 0 ? '📈' : '📉';
    
    element.textContent = `${icon} ${sign}${absChange.toFixed(1)}%`;
    element.className = 'kpi-change';
    if (change > 0) {
      element.classList.add('positive');
    } else if (change < 0) {
      element.classList.add('negative');
    }
  }
  
  /**
   * Render revenue trend chart
   */
  renderRevenueTrendChart(months) {
    try {
      const data = AnalyticsModule.getRevenueTrend(months);
      const ctx = document.getElementById('revenueTrendChart');
      if (!ctx) return;
      
      // Destroy existing chart
      if (this.revenueTrendChart) {
        this.revenueTrendChart.destroy();
      }
      
      this.revenueTrendChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: data.labels,
          datasets: [
            {
              label: 'Entrate',
              data: data.income,
              borderColor: '#10b981',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              tension: 0.4,
              fill: true
            },
            {
              label: 'Uscite',
              data: data.expenses,
              borderColor: '#ef4444',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              tension: 0.4,
              fill: true
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: true,
              position: 'top'
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  return `${context.dataset.label}: €${context.parsed.y.toLocaleString('it-IT')}`;
                }
              }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                callback: function(value) {
                  return '€' + value.toLocaleString('it-IT');
                }
              }
            }
          }
        }
      });
    } catch (error) {
      ErrorHandler.handle(error, 'App.renderRevenueTrendChart');
    }
  }
  
  /**
   * Render expense categories chart
   */
  renderExpenseCategoriesChart(months) {
    try {
      const data = AnalyticsModule.getExpensesByCategory(months);
      const ctx = document.getElementById('expenseCategoriesChart');
      if (!ctx) return;
      
      // Destroy existing chart
      if (this.expenseCategoriesChart) {
        this.expenseCategoriesChart.destroy();
      }
      
      this.expenseCategoriesChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: data.labels,
          datasets: [{
            data: data.data,
            backgroundColor: data.colors,
            borderWidth: 2,
            borderColor: '#ffffff'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: true,
              position: 'right'
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  const total = context.dataset.data.reduce((a, b) => a + b, 0);
                  const percentage = ((context.parsed / total) * 100).toFixed(1);
                  return `${context.label}: €${context.parsed.toLocaleString('it-IT')} (${percentage}%)`;
                }
              }
            }
          }
        }
      });
    } catch (error) {
      ErrorHandler.handle(error, 'App.renderExpenseCategoriesChart');
    }
  }
  
  /**
   * Render occupancy rate chart
   */
  renderOccupancyChart(months) {
    try {
      const data = AnalyticsModule.getOccupancyRate(months);
      const ctx = document.getElementById('occupancyChart');
      if (!ctx) return;
      
      // Destroy existing chart
      if (this.occupancyChart) {
        this.occupancyChart.destroy();
      }
      
      this.occupancyChart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: data.labels,
          datasets: [{
            label: 'Tasso di Occupazione',
            data: data.occupancyRate,
            backgroundColor: '#3b82f6',
            borderRadius: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  return `Occupazione: ${context.parsed.y.toFixed(1)}%`;
                }
              }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              max: 100,
              ticks: {
                callback: function(value) {
                  return value + '%';
                }
              }
            }
          }
        }
      });
    } catch (error) {
      ErrorHandler.handle(error, 'App.renderOccupancyChart');
    }
  }
  
  /**
   * Render booking channels chart
   */
  renderBookingChannelsChart(months) {
    try {
      const data = AnalyticsModule.getBookingsByChannel(months);
      const ctx = document.getElementById('bookingChannelsChart');
      if (!ctx) return;
      
      // Destroy existing chart
      if (this.bookingChannelsChart) {
        this.bookingChannelsChart.destroy();
      }
      
      this.bookingChannelsChart = new Chart(ctx, {
        type: 'pie',
        data: {
          labels: data.labels,
          datasets: [{
            data: data.data,
            backgroundColor: data.colors,
            borderWidth: 2,
            borderColor: '#ffffff'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: true,
              position: 'bottom'
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  const total = context.dataset.data.reduce((a, b) => a + b, 0);
                  const percentage = ((context.parsed / total) * 100).toFixed(1);
                  return `${context.label}: ${context.parsed} (${percentage}%)`;
                }
              }
            }
          }
        }
      });
    } catch (error) {
      ErrorHandler.handle(error, 'App.renderBookingChannelsChart');
    }
  }
  
  /**
   * Setup analytics listeners
   */
  setupAnalyticsListeners() {
    // Period selector
    const periodSelect = document.getElementById('analyticsPeriod');
    if (periodSelect) {
      periodSelect.addEventListener('change', () => this.renderAnalytics());
    }
    
    // Refresh button
    const refreshBtn = document.getElementById('refreshAnalyticsBtn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.renderAnalytics());
    }
    
    // Export charts button
    const exportBtn = document.getElementById('exportChartsBtn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => this.exportCharts());
    }
  }
  
  /**
   * Export all charts as images
   */
  exportCharts() {
    try {
      const charts = [
        { chart: this.revenueTrendChart, name: 'revenue_trend' },
        { chart: this.expenseCategoriesChart, name: 'expense_categories' },
        { chart: this.occupancyChart, name: 'occupancy_rate' },
        { chart: this.bookingChannelsChart, name: 'booking_channels' }
      ];
      
      charts.forEach(({ chart, name }) => {
        if (chart) {
          const url = chart.toBase64Image();
          const link = document.createElement('a');
          link.download = `${name}_${new Date().toISOString().split('T')[0]}.png`;
          link.href = url;
          link.click();
        }
      });
      
      NotificationService.success('Grafici esportati con successo!');
    } catch (error) {
      ErrorHandler.handle(error, 'App.exportCharts', true);
    }
  }
  
  // ==================== CLEANING ====================
  
  renderCleaning() {
    const statusFilter = document.getElementById('cleaningStatusFilter')?.value || 'all';
    const dateFilter = document.getElementById('cleaningDateFilter')?.value || '';
    const search = document.getElementById('cleaningSearch')?.value.toLowerCase() || '';
    
    let cleanings = CleaningModule.filterByStatus(statusFilter);
    
    // Applica filtro property
    if (CleaningModule.filterByProperty) {
      cleanings = CleaningModule.filterByProperty(cleanings, this.currentPropertyFilter);
    }
    
    if (dateFilter) {
      cleanings = cleanings.filter(c => c.scheduledDate === dateFilter);
    }
    
    if (search) {
      cleanings = cleanings.filter(c => 
        c.guestName?.toLowerCase().includes(search) ||
        c.notes?.toLowerCase().includes(search)
      );
    }
    
    // Update stats
    const stats = CleaningModule.getStats();
    document.getElementById('cleaningScheduled').textContent = CleaningModule.filterByStatus('scheduled').length;
    document.getElementById('cleaningInProgress').textContent = CleaningModule.filterByStatus('in-progress').length;
    document.getElementById('cleaningCompleted').textContent = stats.completed;
    document.getElementById('cleaningAvgDuration').textContent = `${stats.avgDuration} min`;
    
    // Render list
    const container = document.getElementById('cleaningList');
    if (!container) return;
    
    if (cleanings.length === 0) {
      container.innerHTML = '<p class="empty-state">Nessuna pulizia trovata</p>';
      return;
    }
    
    cleanings.sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate));
    
    container.innerHTML = cleanings.map(c => this.renderCleaningCard(c)).join('');
  }
  
  renderCleaningCard(cleaning) {
    const statusLabels = { scheduled: 'Programmata', 'in-progress': 'In Corso', completed: 'Completata' };
    const statusColors = { scheduled: '#3b82f6', 'in-progress': '#f59e0b', completed: '#10b981' };
    const progress = CleaningModule.getChecklistProgress(cleaning);
    
    return `
      <div class="item-card">
        <div class="item-header">
          <div style="display: flex; align-items: center; gap: 1rem;">
            <input type="checkbox" class="cleaning-checkbox" data-id="${cleaning.id}" style="width: 20px; height: 20px; cursor: pointer;">
            <h3 style="margin: 0;">${cleaning.guestName || 'Pulizia Standard'}</h3>
          </div>
          <div class="item-actions">
            <button class="btn-icon" onclick="app.openChecklistModal(${cleaning.id})" title="Checklist">📋</button>
            <button class="btn-icon" onclick="app.editCleaning(${cleaning.id})" title="Modifica">✏️</button>
            <button class="btn-icon" onclick="app.deleteCleaning(${cleaning.id})" title="Elimina">🗑️</button>
          </div>
        </div>
        <div class="item-body">
          <p><strong>📅 Data:</strong> ${Utils.formatDate(new Date(cleaning.scheduledDate))} alle ${cleaning.scheduledTime}</p>
          <p><strong>👤 Assegnata a:</strong> ${cleaning.assignedTo || 'Non assegnata'}</p>
          <p><strong>⏱️ Durata stimata:</strong> ${cleaning.estimatedDuration} min</p>
          <p><strong>💰 Costo:</strong> €${cleaning.cost}</p>
          <p><strong>📊 Progresso:</strong> ${progress}%</p>
          ${cleaning.notes ? `<p><strong>Note:</strong> ${Utils.escapeHtml(cleaning.notes)}</p>` : ''}
        </div>
        <div class="item-footer">
          <span class="badge" style="background: ${statusColors[cleaning.status]}; color: white;">
            ${statusLabels[cleaning.status]}
          </span>
          ${cleaning.status === 'scheduled' ? 
            `<button class="btn btn-sm btn-success" onclick="app.startCleaning(${cleaning.id})">▶️ Inizia</button>` : ''}
          ${cleaning.status === 'in-progress' ? 
            `<button class="btn btn-sm btn-primary" onclick="app.completeCleaning(${cleaning.id})">✅ Completa</button>` : ''}
        </div>
      </div>
    `;
  }
  
  setupCleaningListeners() {
    const addBtn = document.getElementById('addCleaningBtn');
    if (addBtn) {
      addBtn.addEventListener('click', () => this.openCleaningModal());
    }
    
    // Seleziona tutto
    const selectAllBtn = document.getElementById('selectAllCleanings');
    if (selectAllBtn) {
      selectAllBtn.addEventListener('change', (e) => {
        document.querySelectorAll('.cleaning-checkbox').forEach(cb => cb.checked = e.target.checked);
        this.updateDeleteSelectedButton();
      });
    }
    
    // Elimina selezionate
    const deleteSelectedBtn = document.getElementById('deleteSelectedCleanings');
    if (deleteSelectedBtn) {
      deleteSelectedBtn.addEventListener('click', () => this.deleteSelectedCleanings());
    }
    
    // Update button quando cambiano le checkbox
    document.addEventListener('change', (e) => {
      if (e.target.classList.contains('cleaning-checkbox')) {
        this.updateDeleteSelectedButton();
      }
    });
    
    const form = document.getElementById('cleaningForm');
    if (form) {
      form.addEventListener('submit', (e) => this.saveCleaning(e));
    }
    
    const statusFilter = document.getElementById('cleaningStatusFilter');
    if (statusFilter) {
      statusFilter.addEventListener('change', () => this.renderCleaning());
    }
    
    const dateFilter = document.getElementById('cleaningDateFilter');
    if (dateFilter) {
      dateFilter.addEventListener('change', () => this.renderCleaning());
    }
    
    const search = document.getElementById('cleaningSearch');
    if (search) {
      search.addEventListener('input', Utils.debounce(() => this.renderCleaning(), 300));
    }
    
    // Checklist actions
    const startBtn = document.getElementById('startCleaningBtn');
    if (startBtn) {
      startBtn.addEventListener('click', () => {
        if (this.currentCleaningId) {
          this.startCleaning(this.currentCleaningId);
        }
      });
    }
    
    const completeBtn = document.getElementById('completeCleaningBtn');
    if (completeBtn) {
      completeBtn.addEventListener('click', () => {
        if (this.currentCleaningId) {
          this.completeCleaning(this.currentCleaningId);
        }
      });
    }
  }
  
  openCleaningModal(cleaningId = null) {
    this.currentEditingCleaningId = cleaningId;
    const modal = document.getElementById('cleaningModal');
    const title = document.getElementById('cleaningModalTitle');
    
    if (cleaningId) {
      const cleaning = CleaningModule.getById(cleaningId);
      if (!cleaning) return;
      
      title.textContent = 'Modifica Pulizia';
      document.getElementById('cleaningDate').value = cleaning.scheduledDate;
      document.getElementById('cleaningTime').value = cleaning.scheduledTime;
      document.getElementById('cleaningGuestName').value = cleaning.guestName || '';
      document.getElementById('cleaningBookingId').value = cleaning.bookingId || '';
      document.getElementById('cleaningAssignedTo').value = cleaning.assignedTo || '';
      document.getElementById('cleaningPriority').value = cleaning.priority;
      document.getElementById('cleaningDuration').value = cleaning.estimatedDuration;
      document.getElementById('cleaningCost').value = cleaning.cost;
      document.getElementById('cleaningNotes').value = cleaning.notes || '';
    } else {
      title.textContent = 'Nuova Pulizia';
      document.getElementById('cleaningForm').reset();
      document.getElementById('cleaningTime').value = '14:00';
      document.getElementById('cleaningDuration').value = '120';
      document.getElementById('cleaningCost').value = '40';
    }
    
    // Populate assigned to select
    this.populateCleaningStaff();
    
    modal.classList.add('active');
  }
  
  populateCleaningStaff() {
    const select = document.getElementById('cleaningAssignedTo');
    if (!select) return;
    
    const users = UsersManagementModule ? UsersManagementModule.getAll() : [];
    const staffOptions = users.map(u => 
      `<option value="${u.username}">${u.username}</option>`
    ).join('');
    
    select.innerHTML = '<option value="">Non assegnata</option>' + staffOptions;
  }
  
  saveCleaning(e) {
    e.preventDefault();
    
    const scheduledDate = document.getElementById('cleaningDate').value;
    const cost = parseFloat(document.getElementById('cleaningCost').value);

    // ✅ VALIDATION: Required fields
    if (!scheduledDate) {
      NotificationService.error('Data pulizia è obbligatoria');
      return;
    }
    if (isNaN(cost) || cost < 0) {
      NotificationService.error('Costo non valido (deve essere >= 0)');
      return;
    }
    
    const cleaningData = {
      scheduledDate,
      scheduledTime: document.getElementById('cleaningTime').value,
      guestName: document.getElementById('cleaningGuestName').value.trim(),
      bookingId: document.getElementById('cleaningBookingId').value || null,
      assignedTo: document.getElementById('cleaningAssignedTo').value || null,
      priority: document.getElementById('cleaningPriority').value,
      estimatedDuration: parseInt(document.getElementById('cleaningDuration').value),
      cost,
      notes: document.getElementById('cleaningNotes').value.trim()
    };
    
    try {
      if (this.currentEditingCleaningId) {
        CleaningModule.update(this.currentEditingCleaningId, cleaningData);
        NotificationService.success('Pulizia aggiornata!');
      } else {
        CleaningModule.create(cleaningData);
        NotificationService.success('Pulizia creata!');
      }
      
      document.getElementById('cleaningModal').classList.remove('active');
      this.currentEditingCleaningId = null;
      this.renderCleaning();
    } catch (error) {
      ErrorHandler.handle(error, 'App.saveCleaning', true);
    }
  }
  
  editCleaning(id) {
    this.openCleaningModal(id);
  }
  
  deleteCleaning(id) {
    if (!confirm('Eliminare questa pulizia?')) return;
    
    CleaningModule.delete(id);
    NotificationService.success('Pulizia eliminata');
    this.renderCleaning();
  }
  
  updateDeleteSelectedButton() {
    const selected = document.querySelectorAll('.cleaning-checkbox:checked');
    const btn = document.getElementById('deleteSelectedCleanings');
    if (btn) {
      btn.style.display = selected.length > 0 ? 'block' : 'none';
      btn.textContent = `🗑️ Elimina selezionate (${selected.length})`;
    }
  }
  
  deleteSelectedCleanings() {
    const selected = Array.from(document.querySelectorAll('.cleaning-checkbox:checked'));
    const count = selected.length;
    
    if (count === 0) return;
    if (!confirm(`Eliminare ${count} pulizie selezionate?`)) return;
    
    selected.forEach(cb => {
      const id = parseInt(cb.dataset.id);
      CleaningModule.delete(id);
    });
    
    NotificationService.success(`${count} pulizie eliminate`);
    document.getElementById('selectAllCleanings').checked = false;
    this.renderCleaning();
    this.updateDeleteSelectedButton();
  }
  
  startCleaning(id) {
    CleaningModule.start(id);
    NotificationService.success('Pulizia iniziata!');
    this.renderCleaning();
    document.getElementById('checklistModal')?.classList.remove('active');
  }
  
  completeCleaning(id) {
    if (!confirm('Completare questa pulizia?')) return;
    
    CleaningModule.complete(id);
    NotificationService.success('Pulizia completata!');
    this.renderCleaning();
    document.getElementById('checklistModal')?.classList.remove('active');
  }
  
  openChecklistModal(cleaningId) {
    this.currentCleaningId = cleaningId;
    const cleaning = CleaningModule.getById(cleaningId);
    if (!cleaning) return;
    
    const modal = document.getElementById('checklistModal');
    const title = document.getElementById('checklistModalTitle');
    title.textContent = `Checklist - ${cleaning.guestName || 'Pulizia Standard'}`;
    
    this.renderChecklist(cleaning);
    modal.classList.add('active');
  }
  
  renderChecklist(cleaning) {
    const progress = CleaningModule.getChecklistProgress(cleaning);
    document.getElementById('checklistProgressBar').style.width = `${progress}%`;
    document.getElementById('checklistProgressText').textContent = `${progress}% Completato`;
    
    const categories = {
      bedroom: '🛏️ Camera',
      bathroom: '🚿 Bagno',
      kitchen: '🍳 Cucina',
      living: '🛋️ Soggiorno',
      general: '🏠 Generale'
    };
    
    const groupedItems = {};
    cleaning.checklist.forEach(item => {
      if (!groupedItems[item.category]) {
        groupedItems[item.category] = [];
      }
      groupedItems[item.category].push(item);
    });
    
    const container = document.getElementById('checklistItems');
    container.innerHTML = Object.entries(groupedItems).map(([category, items]) => `
      <div class="checklist-category">
        <h3>${categories[category] || category}</h3>
        ${items.map(item => `
          <label class="checklist-item">
            <input type="checkbox" 
              ${item.completed ? 'checked' : ''} 
              onchange="app.toggleChecklistItem(${cleaning.id}, ${item.id}, this.checked)">
            <span>${item.item}</span>
          </label>
        `).join('')}
      </div>
    `).join('');
    
    // Update button states
    const startBtn = document.getElementById('startCleaningBtn');
    const completeBtn = document.getElementById('completeCleaningBtn');
    
    if (startBtn && completeBtn) {
      startBtn.disabled = cleaning.status !== 'scheduled';
      completeBtn.disabled = cleaning.status === 'completed';
    }
  }
  
  toggleChecklistItem(cleaningId, itemId, completed) {
    CleaningModule.updateChecklistItem(cleaningId, itemId, completed);
    const cleaning = CleaningModule.getById(cleaningId);
    if (cleaning) {
      this.renderChecklist(cleaning);
    }
  }
  
  // ==================== MAINTENANCE ====================
  
  renderMaintenance() {
    const categoryFilter = document.getElementById('maintenanceCategoryFilter')?.value || 'all';
    const statusFilter = document.getElementById('maintenanceStatusFilter')?.value || 'all';
    const priorityFilter = document.getElementById('maintenancePriorityFilter')?.value || 'all';
    const search = document.getElementById('maintenanceSearch')?.value.toLowerCase() || '';
    
    let maintenances = MaintenanceModule.getAll();
    
    // Aplica filtro property
    if (MaintenanceModule.filterByProperty) {
      maintenances = MaintenanceModule.filterByProperty(maintenances, this.currentPropertyFilter);
    }
    
    // Apply filters
    if (categoryFilter !== 'all') {
      maintenances = maintenances.filter(m => m.category === categoryFilter);
    }
    if (statusFilter !== 'all') {
      maintenances = maintenances.filter(m => m.status === statusFilter);
    }
    if (priorityFilter !== 'all') {
      maintenances = maintenances.filter(m => m.priority === priorityFilter);
    }
    if (search) {
      maintenances = maintenances.filter(m => 
        m.description?.toLowerCase().includes(search) ||
        m.assignedTo?.toLowerCase().includes(search) ||
        m.notes?.toLowerCase().includes(search)
      );
    }
    
    // Update stats
    const stats = MaintenanceModule.getStats();
    document.getElementById('maintenancePending').textContent = stats.pending;
    document.getElementById('maintenanceInProgress').textContent = stats.inProgress;
    document.getElementById('maintenanceUrgent').textContent = stats.urgent;
    document.getElementById('maintenanceTotalCost').textContent = `€${stats.totalCost.toFixed(2)}`;
    
    // Render list
    const container = document.getElementById('maintenanceList');
    if (!container) return;
    
    if (maintenances.length === 0) {
      container.innerHTML = '<p class="empty-state">Nessun intervento trovato</p>';
      return;
    }
    
    maintenances.sort((a, b) => {
      const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
    
    container.innerHTML = maintenances.map(m => this.renderMaintenanceCard(m)).join('');
  }
  
  renderMaintenanceCard(maintenance) {
    const statusLabels = { pending: 'Da Programmare', 'in-progress': 'In Corso', completed: 'Completato', cancelled: 'Annullato' };
    const statusColors = { pending: '#3b82f6', 'in-progress': '#f59e0b', completed: '#10b981', cancelled: '#6b7280' };
    const priorityColors = { low: '#6b7280', medium: '#3b82f6', high: '#f59e0b', urgent: '#ef4444' };
    const priorityLabels = { low: 'Bassa', medium: 'Media', high: 'Alta', urgent: 'Urgente' };
    
    return `
      <div class="item-card">
        <div class="item-header">
          <h3>${MaintenanceModule.categories[maintenance.category] || maintenance.category}</h3>
          <div class="item-actions">
            <button class="btn-icon" onclick="app.editMaintenance(${maintenance.id})" title="Modifica">✏️</button>
            <button class="btn-icon" onclick="app.deleteMaintenance(${maintenance.id})" title="Elimina">🗑️</button>
          </div>
        </div>
        <div class="item-body">
          <p><strong>Descrizione:</strong> ${Utils.escapeHtml(maintenance.description)}</p>
          <p><strong>📅 Richiesta:</strong> ${Utils.formatDate(new Date(maintenance.requestDate))}</p>
          ${maintenance.scheduledDate ? `<p><strong>🗓️ Programmata:</strong> ${Utils.formatDate(new Date(maintenance.scheduledDate))}</p>` : ''}
          ${maintenance.assignedTo ? `<p><strong>👤 Assegnato a:</strong> ${maintenance.assignedTo}</p>` : ''}
          <p><strong>💰 Costo:</strong> €${(maintenance.finalCost || maintenance.estimatedCost || 0).toFixed(2)}</p>
          ${maintenance.notes ? `<p><strong>Note:</strong> ${Utils.escapeHtml(maintenance.notes)}</p>` : ''}
        </div>
        <div class="item-footer">
          <span class="badge" style="background: ${priorityColors[maintenance.priority]}; color: white;">
            ${priorityLabels[maintenance.priority]}
          </span>
          <span class="badge" style="background: ${statusColors[maintenance.status]}; color: white;">
            ${statusLabels[maintenance.status]}
          </span>
          ${maintenance.status === 'pending' ? 
            `<button class="btn btn-sm btn-success" onclick="app.startMaintenance(${maintenance.id})">▶️ Inizia</button>` : ''}
          ${maintenance.status === 'in-progress' ? 
            `<button class="btn btn-sm btn-primary" onclick="app.completeMaintenance(${maintenance.id})">✅ Completa</button>` : ''}
        </div>
      </div>
    `;
  }
  
  setupMaintenanceListeners() {
    const addBtn = document.getElementById('addMaintenanceBtn');
    if (addBtn) {
      addBtn.addEventListener('click', () => this.openMaintenanceModal());
    }
    
    const form = document.getElementById('maintenanceForm');
    if (form) {
      form.addEventListener('submit', (e) => this.saveMaintenance(e));
    }
    
    const categoryFilter = document.getElementById('maintenanceCategoryFilter');
    if (categoryFilter) {
      categoryFilter.addEventListener('change', () => this.renderMaintenance());
    }
    
    const statusFilter = document.getElementById('maintenanceStatusFilter');
    if (statusFilter) {
      statusFilter.addEventListener('change', () => this.renderMaintenance());
    }
    
    const priorityFilter = document.getElementById('maintenancePriorityFilter');
    if (priorityFilter) {
      priorityFilter.addEventListener('change', () => this.renderMaintenance());
    }
    
    const search = document.getElementById('maintenanceSearch');
    if (search) {
      search.addEventListener('input', Utils.debounce(() => this.renderMaintenance(), 300));
    }
  }
  
  openMaintenanceModal(maintenanceId = null) {
    this.currentEditingMaintenanceId = maintenanceId;
    const modal = document.getElementById('maintenanceModal');
    const title = document.getElementById('maintenanceModalTitle');
    
    if (maintenanceId) {
      const maintenance = MaintenanceModule.getById(maintenanceId);
      if (!maintenance) return;
      
      title.textContent = 'Modifica Intervento';
      document.getElementById('maintenanceCategory').value = maintenance.category;
      document.getElementById('maintenancePriority').value = maintenance.priority;
      document.getElementById('maintenanceDescription').value = maintenance.description;
      document.getElementById('maintenanceRequestDate').value = maintenance.requestDate;
      document.getElementById('maintenanceScheduledDate').value = maintenance.scheduledDate || '';
      document.getElementById('maintenanceAssignedTo').value = maintenance.assignedTo || '';
      document.getElementById('maintenanceEstimatedCost').value = maintenance.estimatedCost || 0;
      document.getElementById('maintenanceNotes').value = maintenance.notes || '';
    } else {
      title.textContent = 'Nuovo Intervento';
      document.getElementById('maintenanceForm').reset();
      document.getElementById('maintenanceRequestDate').value = new Date().toISOString().split('T')[0];
      document.getElementById('maintenancePriority').value = 'medium';
    }
    
    modal.classList.add('active');
  }
  
  async saveMaintenance(e) {
    e.preventDefault();
    
    const description = document.getElementById('maintenanceDescription').value.trim();
    const requestDate = document.getElementById('maintenanceRequestDate').value;
    const estimatedCost = parseFloat(document.getElementById('maintenanceEstimatedCost').value) || 0;

    // ✅ VALIDATION: Required fields
    if (!description) {
      NotificationService.error('Descrizione intervento è obbligatoria');
      return;
    }
    if (!requestDate) {
      NotificationService.error('Data richiesta è obbligatoria');
      return;
    }
    if (estimatedCost < 0) {
      NotificationService.error('Costo stimato non valido');
      return;
    }
    
    const maintenanceData = {
      category: document.getElementById('maintenanceCategory').value,
      priority: document.getElementById('maintenancePriority').value,
      description,
      requestDate,
      scheduledDate: document.getElementById('maintenanceScheduledDate').value || null,
      assignedTo: document.getElementById('maintenanceAssignedTo').value || null,
      estimatedCost,
      notes: document.getElementById('maintenanceNotes').value.trim()
    };
    
    try {
      if (this.currentEditingMaintenanceId) {
        await MaintenanceModule.update(this.currentEditingMaintenanceId, maintenanceData);
        NotificationService.success('Intervento aggiornato!');
      } else {
        await MaintenanceModule.create(maintenanceData);
        NotificationService.success('Intervento creato!');
      }
      
      document.getElementById('maintenanceModal').classList.remove('active');
      this.currentEditingMaintenanceId = null;
      this.renderMaintenance();
    } catch (error) {
      ErrorHandler.handle(error, 'App.saveMaintenance', true);
    }
  }
  
  editMaintenance(id) {
    this.openMaintenanceModal(id);
  }
  
  deleteMaintenance(id) {
    if (!confirm('Eliminare questo intervento?')) return;
    
    MaintenanceModule.delete(id);
    NotificationService.success('Intervento eliminato');
    this.renderMaintenance();
  }
  
  async startMaintenance(id) {
    try {
      await MaintenanceModule.start(id);
      NotificationService.success('Intervento iniziato!');
      this.renderMaintenance();
    } catch (error) {
      ErrorHandler.handle(error, 'App.startMaintenance', true);
    }
  }
  
  completeMaintenance(id) {
    const cost = prompt('Inserisci il costo finale (€):');
    if (cost === null) return;
    
    const finalCost = parseFloat(cost) || 0;
    
    MaintenanceModule.complete(id, finalCost);
    NotificationService.success('Intervento completato!');
    this.renderMaintenance();
  }
  
  // ==================== SETTINGS ====================
  
  renderSettings() {
    // Load Telegram config
    if (TelegramService.config.botToken) {
      document.getElementById('telegramBotToken').value = TelegramService.config.botToken || '';
      document.getElementById('telegramCleaningChatId').value = TelegramService.config.chatIds.cleaning || '';
      document.getElementById('telegramMaintenanceChatId').value = TelegramService.config.chatIds.maintenance || '';
      document.getElementById('telegramAdminChatId').value = TelegramService.config.chatIds.admin || '';
    }
    
    // Load Email config
    if (EmailService.config.serviceId || EmailService.config.publicKey) {
      document.getElementById('emailServiceId').value = EmailService.config.serviceId || '';
      document.getElementById('emailTemplateId').value = EmailService.config.templateId || '';
      document.getElementById('emailPublicKey').value = EmailService.config.publicKey || '';
    }
    
    // Load Auto-Backup config
    document.getElementById('autoBackupEnabled').checked = AutoBackupService.config.enabled || false;
    document.getElementById('autoBackupFrequency').value = AutoBackupService.config.frequency || 'daily';
    this.renderAutoBackupStats();
    this.renderAutoBackupList();
    
    // Load notification rules
    const rules = JSON.parse(localStorage.getItem('notification_rules') || '{}');
    document.getElementById('notifyCleaningCreated').checked = rules.cleaningCreated !== false;
    document.getElementById('notifyCleaningReminder').checked = rules.cleaningReminder !== false;
    document.getElementById('notifyMaintenanceCreated').checked = rules.maintenanceCreated !== false;
    document.getElementById('notifyMaintenanceUrgent').checked = rules.maintenanceUrgent !== false;
    document.getElementById('notifyBookingConfirmation').checked = rules.bookingConfirmation !== false;
  }
  
  setupSettingsListeners() {
    // Telegram save
    const saveTelegramBtn = document.getElementById('saveTelegramBtn');
    if (saveTelegramBtn) {
      saveTelegramBtn.addEventListener('click', () => this.saveTelegramConfig());
    }
    
    // Telegram test
    const testTelegramBtn = document.getElementById('testTelegramBtn');
    if (testTelegramBtn) {
      testTelegramBtn.addEventListener('click', () => this.testTelegramConnection());
    }
    
    // Email save
    const saveEmailBtn = document.getElementById('saveEmailBtn');
    if (saveEmailBtn) {
      saveEmailBtn.addEventListener('click', () => this.saveEmailConfig());
    }
    
    // Email test
    const testEmailBtn = document.getElementById('testEmailBtn');
    if (testEmailBtn) {
      testEmailBtn.addEventListener('click', () => this.testEmailConnection());
    }
    
    // Notification rules save
    const saveRulesBtn = document.getElementById('saveNotificationRulesBtn');
    if (saveRulesBtn) {
      saveRulesBtn.addEventListener('click', () => this.saveNotificationRules());
    }
    
    // Auto-Backup save
    const saveAutoBackupBtn = document.getElementById('saveAutoBackupBtn');
    if (saveAutoBackupBtn) {
      saveAutoBackupBtn.addEventListener('click', () => this.saveAutoBackupConfig());
    }
    
    // Auto-Backup run now
    const runBackupNowBtn = document.getElementById('runBackupNowBtn');
    if (runBackupNowBtn) {
      runBackupNowBtn.addEventListener('click', () => this.runBackupNow());
    }
  }
  
  saveTelegramConfig() {
    const botToken = document.getElementById('telegramBotToken').value.trim();
    const chatIds = {
      cleaning: parseInt(document.getElementById('telegramCleaningChatId').value.trim()) || null,
      maintenance: parseInt(document.getElementById('telegramMaintenanceChatId').value.trim()) || null,
      admin: parseInt(document.getElementById('telegramAdminChatId').value.trim()) || null
    };
    
    if (!botToken) {
      NotificationService.error('Inserisci il Bot Token');
      return;
    }
    
    TelegramService.saveConfig(botToken, chatIds);
    NotificationService.success('Configurazione Telegram salvata!');
  }
  
  async testTelegramConnection() {
    const result = await TelegramService.testConnection();
    
    if (result.success) {
      NotificationService.success(`✅ Connesso! Bot: @${result.botInfo.username}`);
    } else {
      NotificationService.error(`❌ Errore: ${result.error}`);
    }
  }
  
  saveEmailConfig() {
    const serviceId = document.getElementById('emailServiceId').value.trim();
    const templateId = document.getElementById('emailTemplateId').value.trim();
    const publicKey = document.getElementById('emailPublicKey').value.trim();
    
    if (!serviceId || !templateId || !publicKey) {
      NotificationService.error('Compila tutti i campi Email');
      return;
    }
    
    EmailService.saveConfig(serviceId, templateId, publicKey);
    NotificationService.success('Configurazione Email salvata!');
  }
  
  async testEmailConnection() {
    if (!EmailService.isConfigured()) {
      NotificationService.error('Configura prima Email');
      return;
    }
    
    const currentUser = AuthManager.getCurrentUser();
    const testEmail = prompt('Inserisci email per test:', currentUser.email || '');
    
    if (!testEmail) return;
    
    NotificationService.info('Invio email di test...');
    
    const result = await EmailService.sendEmail(
      testEmail,
      'Test Dashboard - Configurazione Email',
      '<h2>Test riuscito! ✅</h2><p>La configurazione EmailJS funziona correttamente.</p>',
      { test: true }
    );
    
    if (result.success) {
      NotificationService.success(`✅ Email di test inviata a ${testEmail}!`);
    } else {
      NotificationService.error(`❌ Errore: ${result.error}`);
    }
  }
  
  saveNotificationRules() {
    const rules = {
      cleaningCreated: document.getElementById('notifyCleaningCreated').checked,
      cleaningReminder: document.getElementById('notifyCleaningReminder').checked,
      maintenanceCreated: document.getElementById('notifyMaintenanceCreated').checked,
      maintenanceUrgent: document.getElementById('notifyMaintenanceUrgent').checked,
      bookingConfirmation: document.getElementById('notifyBookingConfirmation').checked
    };
    
    localStorage.setItem('notification_rules', JSON.stringify(rules));
    NotificationService.success('Regole notifiche salvate!');
  }
  
  // ==================== CONTACTS LISTENERS ====================
  
  setupContactsListeners() {
    document.getElementById('addContactBtn').addEventListener('click', () => {
      this.openContactModal();
    });
    
    document.getElementById('contactFilter').addEventListener('change', () => {
      this.renderContacts();
    });
    
    document.getElementById('contactSort').addEventListener('change', () => {
      this.renderContacts();
    });
    
    document.getElementById('contactSearch').addEventListener('input', 
      Utils.debounce(() => this.renderContacts(), 300)
    );
    
    // View toggle listeners
    document.getElementById('contactViewGrid').addEventListener('click', () => {
      this.switchContactsView('grid');
    });
    
    document.getElementById('contactViewList').addEventListener('click', () => {
      this.switchContactsView('list');
    });
    
    document.getElementById('contactForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveContact();
    });
  }
  
  openContactModal() { 
    this.currentEditingContactId = null;
    document.getElementById('contactModalTitle').textContent = 'Aggiungi Contatto';
    document.getElementById('contactForm').reset();
    // Reset dynamic email/phone inputs to one row
    const emailsContainer = document.getElementById('emailsContainer');
    const phonesContainer = document.getElementById('phonesContainer');
    emailsContainer.innerHTML = '';
    phonesContainer.innerHTML = '';
    this.addEmailField();
    this.addPhoneField();
    // Reset address fields
    document.getElementById('contactAddressStreet').value = '';
    document.getElementById('contactAddressCity').value = '';
    document.getElementById('contactAddressZip').value = '';
    document.getElementById('contactAddressProvince').value = '';
    document.getElementById('contactAddressCountry').value = '';
    // Reset business address fields
    document.getElementById('contactBusinessAddressStreet').value = '';
    document.getElementById('contactBusinessAddressCity').value = '';
    document.getElementById('contactBusinessAddressZip').value = '';
    document.getElementById('contactBusinessAddressProvince').value = '';
    document.getElementById('contactBusinessAddressCountry').value = '';
    this.populateCategoryDatalist();
    document.getElementById('contactModal').classList.add('active');
    EventBus.emit(EVENTS.MODAL_OPENED, { modal: 'contact' });
  }
  
  editContact(id) {
    const contact = ContactsModule.getById(id);
    if (!contact) return;

    // Set editing mode: build multi input fields
    this.currentEditingContactId = id;
    document.getElementById('contactModalTitle').textContent = 'Modifica Contatto';
    document.getElementById('contactForm').reset();

    document.getElementById('contactFirstName').value = contact.firstName || contact.name || '';
    document.getElementById('contactLastName').value = contact.lastName || '';
    document.getElementById('contactCompany').value = contact.company || '';
    document.getElementById('contactCategory').value = contact.category || 'cliente';
    document.getElementById('contactNotes').value = contact.notes || '';
    
    // Popola indirizzo
    if (contact.address) {
      document.getElementById('contactAddressStreet').value = contact.address.street || '';
      document.getElementById('contactAddressCity').value = contact.address.city || '';
      document.getElementById('contactAddressZip').value = contact.address.zip || '';
      document.getElementById('contactAddressProvince').value = contact.address.province || '';
      document.getElementById('contactAddressCountry').value = contact.address.country || '';
    }
    
    // Popola indirizzo aziendale
    if (contact.businessAddress) {
      document.getElementById('contactBusinessAddressStreet').value = contact.businessAddress.street || '';
      document.getElementById('contactBusinessAddressCity').value = contact.businessAddress.city || '';
      document.getElementById('contactBusinessAddressZip').value = contact.businessAddress.zip || '';
      document.getElementById('contactBusinessAddressProvince').value = contact.businessAddress.province || '';
      document.getElementById('contactBusinessAddressCountry').value = contact.businessAddress.country || '';
    }

    const emailsContainer = document.getElementById('emailsContainer');
    const phonesContainer = document.getElementById('phonesContainer');
    emailsContainer.innerHTML = '';
    phonesContainer.innerHTML = '';

    const emails = contact.emails && contact.emails.length ? contact.emails : [{ value: '', label: 'Principale' }];
    emails.forEach(e => {
      const row = document.createElement('div');
      row.className = 'multi-input-row';
      row.innerHTML = `
        <input type="email" class="email-value" placeholder="email@esempio.com" value="${Utils.escapeHtml(e.value)}">
        <input type="text" class="email-label" placeholder="Etichetta (es: Lavoro)" value="${Utils.escapeHtml(e.label)}">
        <button type="button" class="btn-remove-field" onclick="app.removeEmailField(this)">✕</button>
      `;
      emailsContainer.appendChild(row);
    });

    const phones = contact.phones && contact.phones.length ? contact.phones : [{ value: '', label: 'Principale' }];
    phones.forEach(p => {
      const row = document.createElement('div');
      row.className = 'multi-input-row';
      row.innerHTML = `
        <input type="tel" class="phone-value" placeholder="+39 123 456 789" value="${Utils.escapeHtml(p.value)}">
        <input type="text" class="phone-label" placeholder="Etichetta (es: Ufficio)" value="${Utils.escapeHtml(p.label)}">
        <button type="button" class="btn-remove-field" onclick="app.removePhoneField(this)">✕</button>
      `;
      phonesContainer.appendChild(row);
    });

    // Popola notification preferences
    if (contact.notificationPreferences) {
      // Telegram
      document.getElementById('contactNotifyTelegram').checked = contact.notificationPreferences.telegram?.enabled || false;
      document.getElementById('contactTelegramChatId').value = contact.notificationPreferences.telegram?.chatId || '';
      
      // Email
      document.getElementById('contactNotifyEmail').checked = contact.notificationPreferences.email?.enabled || false;
      document.getElementById('contactEmailAddress').value = contact.notificationPreferences.email?.address || '';
      
      // SMS (disabled for now)
      document.getElementById('contactNotifySMS').checked = contact.notificationPreferences.sms?.enabled || false;
      document.getElementById('contactSMSPhone').value = contact.notificationPreferences.sms?.phone || '';
    }

    this.populateCategoryDatalist();
    document.getElementById('contactModal').classList.add('active');
    EventBus.emit(EVENTS.MODAL_OPENED, { modal: 'contact', id });
  }
  
  deleteContact(id) {
    if (confirm('Elimina questo contatto?')) {
      ContactsModule.delete(id);
      this.renderContacts();
    }
  }
  
  saveContact() {
    const firstName = document.getElementById('contactFirstName').value.trim();
    const lastName = document.getElementById('contactLastName').value.trim();
    const company = document.getElementById('contactCompany').value.trim();
    const category = document.getElementById('contactCategory').value.trim();
    const notes = document.getElementById('contactNotes').value.trim();

    // ✅ VALIDATION: Required fields
    if (!firstName) {
      NotificationService.error('Nome è obbligatorio');
      return;
    }

    const emails = Array.from(document.querySelectorAll('#emailsContainer .multi-input-row')).map(row => ({
      value: row.querySelector('.email-value').value.trim(),
      label: row.querySelector('.email-label').value.trim()
    })).filter(e => e.value || e.label);

    // ✅ VALIDATION: Email format
    for (const email of emails) {
      if (email.value && !Utils.validateEmail(email.value)) {
        NotificationService.error(`Email non valida: ${email.value}`);
        return;
      }
    }

    const phones = Array.from(document.querySelectorAll('#phonesContainer .multi-input-row')).map(row => ({
      value: row.querySelector('.phone-value').value.trim(),
      label: row.querySelector('.phone-label').value.trim()
    })).filter(p => p.value || p.label);

    // Aggiungi nuova categoria se non esiste
    if (category && !CategoryManager.exists(category)) {
      CategoryManager.add(category);
    }

    const address = {
      street: document.getElementById('contactAddressStreet').value.trim(),
      city: document.getElementById('contactAddressCity').value.trim(),
      zip: document.getElementById('contactAddressZip').value.trim(),
      province: document.getElementById('contactAddressProvince').value.trim(),
      country: document.getElementById('contactAddressCountry').value.trim()
    };
    
    const businessAddress = {
      street: document.getElementById('contactBusinessAddressStreet').value.trim(),
      city: document.getElementById('contactBusinessAddressCity').value.trim(),
      zip: document.getElementById('contactBusinessAddressZip').value.trim(),
      province: document.getElementById('contactBusinessAddressProvince').value.trim(),
      country: document.getElementById('contactBusinessAddressCountry').value.trim()
    };

    // Raccogli notification preferences
    const notificationPreferences = {
      telegram: {
        enabled: document.getElementById('contactNotifyTelegram').checked,
        chatId: document.getElementById('contactTelegramChatId').value.trim()
      },
      email: {
        enabled: document.getElementById('contactNotifyEmail').checked,
        address: document.getElementById('contactEmailAddress').value.trim()
      },
      sms: {
        enabled: document.getElementById('contactNotifySMS').checked,
        phone: document.getElementById('contactSMSPhone').value.trim()
      }
    };

    const payload = { 
      firstName, 
      lastName, 
      emails, 
      phones, 
      address, 
      businessAddress, 
      company, 
      category, 
      notes,
      notificationPreferences
    };
    let result;
    if (this.currentEditingContactId) {
      result = ContactsModule.update(this.currentEditingContactId, payload);
      this.currentEditingContactId = null;
    } else {
      result = ContactsModule.create(payload);
    }
    if (result.success) {
      document.getElementById('contactModal').classList.remove('active');
      document.getElementById('contactForm').reset();
      this.renderContacts();
    }
  }

  addEmailField() {
    const container = document.getElementById('emailsContainer');
    const row = document.createElement('div');
    row.className = 'multi-input-row';
    row.innerHTML = `
      <input type="email" class="email-value" placeholder="email@esempio.com">
      <input type="text" class="email-label" placeholder="Etichetta (es: Lavoro)">
      <button type="button" class="btn-remove-field" onclick="app.removeEmailField(this)">✕</button>
    `;
    container.appendChild(row);
  }

  removeEmailField(btn) {
    const container = document.getElementById('emailsContainer');
    if (container.children.length > 0) {
      btn.closest('.multi-input-row').remove();
    }
  }

  addPhoneField() {
    const container = document.getElementById('phonesContainer');
    const row = document.createElement('div');
    row.className = 'multi-input-row';
    row.innerHTML = `
      <input type="tel" class="phone-value" placeholder="+39 123 456 789">
      <input type="text" class="phone-label" placeholder="Etichetta (es: Ufficio)">
      <button type="button" class="btn-remove-field" onclick="app.removePhoneField(this)">✕</button>
    `;
    container.appendChild(row);
  }

  removePhoneField(btn) {
    const container = document.getElementById('phonesContainer');
    if (container.children.length > 0) {
      btn.closest('.multi-input-row').remove();
    }
  }

  populateCategoryDatalist() {
    const datalist = document.getElementById('contactCategoryList');
    const categories = CategoryManager.getAll();
    
    datalist.innerHTML = categories.map(cat => 
      `<option value="${Utils.escapeHtml(cat)}">`
    ).join('');
  }
  
  // ==================== TASKS LISTENERS ====================
  
  setupTasksListeners() {
    document.getElementById('addTaskBtn').addEventListener('click', () => {
      this.openTaskModal();
    });
    
    document.getElementById('importTasksBtn').addEventListener('click', () => {
      this.openImportCSVModal();
    });
    
    document.getElementById('taskFilter').addEventListener('change', () => {
      this.renderTasks();
    });
    
    document.getElementById('taskForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveTask();
    });
    
    // CSV Import listeners
    document.getElementById('csvFileInput').addEventListener('change', (e) => {
      this.handleCSVFileSelect(e);
    });
    
    document.getElementById('confirmImportBtn').addEventListener('click', () => {
      this.handleImportConfirm();
    });
    
    // Bulk selection listeners
    document.getElementById('taskSelectAll').addEventListener('change', (e) => {
      this.toggleSelectAllTasks(e.target.checked);
    });
    
    document.getElementById('taskBulkDelete').addEventListener('click', () => {
      this.bulkDeleteTasks();
    });
    
    document.getElementById('taskBulkCancel').addEventListener('click', () => {
      this.cancelTaskSelection();
    });
  }
  
  openImportCSVModal() {
    // Reset modal state
    document.getElementById('csvFileInput').value = '';
    document.getElementById('importMergeMode').checked = true;
    document.getElementById('importAssignToMe').checked = true;
    document.getElementById('importPreviewContainer').style.display = 'none';
    document.getElementById('confirmImportBtn').disabled = true;
    this.parsedTasksCache = null;
    
    document.getElementById('importCSVModal').classList.add('active');
  }
  
  async handleCSVFileSelect(event) {
    const file = event.target.files[0];
    
    if (!file) {
      return;
    }
    
    // Verifica tipo file
    if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
      NotificationService.error('Seleziona un file CSV valido');
      return;
    }
    
    try {
      // Leggi contenuto file
      const content = await this.readFileAsText(file);
      
      // Parsa CSV
      const parsedTasks = CSVImportModule.parseCSV(content);
      
      if (parsedTasks.length === 0) {
        NotificationService.warning('Nessun task valido trovato nel CSV');
        return;
      }
      
      // Salva in cache per import
      this.parsedTasksCache = parsedTasks;
      
      // Mostra preview
      const previewHTML = CSVImportModule.generatePreview(parsedTasks);
      document.getElementById('importPreview').innerHTML = previewHTML;
      document.getElementById('importPreviewContainer').style.display = 'block';
      
      // Abilita pulsante conferma
      document.getElementById('confirmImportBtn').disabled = false;
      
      NotificationService.success(`${parsedTasks.length} task pronti per l'import`);
      
    } catch (error) {
      ErrorHandler.handle(error, 'DashboardApp.handleCSVFileSelect', true);
      NotificationService.error('Errore durante la lettura del file CSV');
    }
  }
  
  readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(e);
      reader.readAsText(file, 'UTF-8');
    });
  }
  
  handleImportConfirm() {
    if (!this.parsedTasksCache || this.parsedTasksCache.length === 0) {
      NotificationService.error('Nessun task da importare');
      return;
    }
    
    const mergeMode = document.getElementById('importMergeMode').checked;
    const assignToMe = document.getElementById('importAssignToMe').checked;
    
    // Esegui import
    const result = CSVImportModule.importTasks(this.parsedTasksCache, {
      merge: mergeMode,
      assignToCurrentUser: assignToMe
    });
    
    if (result.success) {
      // Chiudi modal
      document.getElementById('importCSVModal').classList.remove('active');
      
      // Aggiorna UI
      this.renderTasks();
      
      // Reset cache
      this.parsedTasksCache = null;
      
      // Mostra riepilogo
      if (result.skipped > 0) {
        NotificationService.info(
          `Import completato: ${result.imported} importati, ${result.skipped} saltati (duplicati)`
        );
      } else {
        NotificationService.success(`${result.imported} task importati con successo!`);
      }
    }
  }
  
  openTaskModal() {
    this.currentEditingTaskId = null;
    document.getElementById('taskModalTitle').textContent = 'Aggiungi Task';
    document.getElementById('taskForm').reset();
    document.getElementById('taskModal').classList.add('active');
    EventBus.emit(EVENTS.MODAL_OPENED, { modal: 'task', mode: 'create' });
  }
  
  editTask(id) {
    const task = TasksModule.getById(id);
    if (!task) return;
    
    // Imposta modalità edit
    this.currentEditingTaskId = id;
    
    document.getElementById('taskModalTitle').textContent = 'Modifica Task';
    document.getElementById('taskTitle').value = task.title;
    document.getElementById('taskDescription').value = task.description || '';
    document.getElementById('taskPriority').value = task.priority;
    document.getElementById('taskStatus').value = task.status || 'todo';
    document.getElementById('taskDueDate').value = task.dueDate || '';
    
    document.getElementById('taskModal').classList.add('active');
    EventBus.emit(EVENTS.MODAL_OPENED, { modal: 'task', mode: 'edit', id });
  }
  
  toggleTask(id) {
    TasksModule.toggleComplete(id);
    this.renderTasks();
  }
  
  deleteTask(id) {
    if (confirm('Elimina questo task?')) {
      TasksModule.delete(id);
      this.renderTasks();
    }
  }
  
  saveTask() {
    const data = {
      title: document.getElementById('taskTitle').value,
      description: document.getElementById('taskDescription').value,
      priority: document.getElementById('taskPriority').value,
      status: document.getElementById('taskStatus').value,
      dueDate: document.getElementById('taskDueDate').value
    };
    
    let result;
    
    if (this.currentEditingTaskId) {
      // Update task esistente
      result = TasksModule.update(this.currentEditingTaskId, data);
      this.currentEditingTaskId = null;
    } else {
      // Create nuovo task
      result = TasksModule.create(data);
    }
    
    if (result.success) {
      document.getElementById('taskModal').classList.remove('active');
      document.getElementById('taskForm').reset();
      document.getElementById('taskModalTitle').textContent = 'Aggiungi Task';
      this.renderTasks();
    }
  }
  
  // ==================== NOTES LISTENERS ====================
  
  setupNotesListeners() {
    document.getElementById('addNoteBtn').addEventListener('click', () => {
      this.openNoteModal();
    });
    
    document.getElementById('noteFilter').addEventListener('change', () => {
      this.renderNotes();
    });
    
    document.getElementById('noteSearch').addEventListener('input', 
      Utils.debounce(() => this.renderNotes(), 300)
    );
    
    document.getElementById('noteForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveNote();
    });
  }
  
  openNoteModal() { 
    this.currentEditingNoteId = null;
    document.getElementById('noteForm').reset();
    document.getElementById('noteModalTitle').textContent = 'Nuova Nota';
    document.getElementById('noteModal').classList.add('active');
    EventBus.emit(EVENTS.MODAL_OPENED, { modal: 'note' });
  }
  
  togglePinNote(id) {
    NotesModule.togglePin(id);
    this.renderNotes();
  }
  
  editNote(id) {
    const note = NotesModule.getById(id);
    if (!note) return;

    // Set editing state
    this.currentEditingNoteId = id;

    document.getElementById('noteModalTitle').textContent = 'Modifica Nota';
    document.getElementById('noteTitle').value = note.title || '';
    document.getElementById('noteContent').value = note.content || '';
    document.getElementById('noteCategory').value = note.category || CONFIG.NOTE_CATEGORIES.GENERALE;
    document.getElementById('noteUrgent').checked = note.isUrgent || false;
    document.getElementById('noteModal').classList.add('active');
    EventBus.emit(EVENTS.MODAL_OPENED, { modal: 'note', mode: 'edit', id });
  }
  
  deleteNote(id) {
    if (confirm('Elimina questa nota?')) {
      NotesModule.delete(id);
      this.renderNotes();
    }
  }
  
  saveNote() {
    const data = {
      title: document.getElementById('noteTitle').value,
      content: document.getElementById('noteContent').value,
      category: document.getElementById('noteCategory').value,
      isUrgent: document.getElementById('noteUrgent').checked
    };

    let result;
    if (this.currentEditingNoteId) {
      result = NotesModule.update(this.currentEditingNoteId, data);
      this.currentEditingNoteId = null;
    } else {
      result = NotesModule.create(data);
    }

    if (result.success) {
      document.getElementById('noteModal').classList.remove('active');
      document.getElementById('noteForm').reset();
      document.getElementById('noteModalTitle').textContent = 'Nuova Nota';
      this.renderNotes();
    }
  }
  
  // ==================== DOCUMENTS LISTENERS ====================
  
  setupDocumentsListeners() {
    document.getElementById('addDocumentBtn').addEventListener('click', () => {
      this.openDocumentModal();
    });
    
    document.getElementById('documentFilter').addEventListener('change', () => {
      this.renderDocuments();
    });
    
    document.getElementById('documentSearch').addEventListener('input', 
      Utils.debounce(() => this.renderDocuments(), 300)
    );
    
    document.getElementById('documentForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveDocument();
    });
  }
  
  openDocumentModal() { 
    document.getElementById('documentModal').classList.add('active');
    EventBus.emit(EVENTS.MODAL_OPENED, { modal: 'document' });
  }
  
  async saveDocument() {
    const fileInput = document.getElementById('documentFile');
    const file = fileInput.files[0];
    
    if (!file) {
      NotificationService.error('Seleziona un file');
      return;
    }
    
    const metadata = {
      category: document.getElementById('documentCategory').value,
      description: document.getElementById('documentDescription').value
    };
    
    NotificationService.info('Caricamento in corso...');
    
    const result = await DocumentsModule.upload(file, metadata);
    if (result.success) {
      document.getElementById('documentModal').classList.remove('active');
      document.getElementById('documentForm').reset();
      this.renderDocuments();
    }
  }
  
  downloadDocument(id) {
    DocumentsModule.download(id);
  }
  
  deleteDocument(id) {
    if (confirm('Elimina questo documento?')) {
      DocumentsModule.delete(id);
      this.renderDocuments();
    }
  }
  
  // ==================== CATEGORY ADMIN ====================
  
  setupCategoryAdminListeners() {
    // Event delegation sul document per gestire elementi dinamici
    document.addEventListener('click', (e) => {
      // Verifica se il click è su un pulsante delete categoria o su un suo figlio
      const btn = e.target.closest('.btn-delete-category');
      if (btn && !btn.disabled) {
        const categoryName = btn.dataset.category;
        if (categoryName) {
          this.deleteCategoryWithConfirmation(categoryName);
        }
      }
    });

    // Add category button
    const addCategoryBtn = document.getElementById('addCategoryBtn');
    const newCategoryInput = document.getElementById('newCategoryInput');
    
    if (addCategoryBtn && newCategoryInput) {
      addCategoryBtn.addEventListener('click', () => {
        this.handleAddCategory(newCategoryInput);
      });
      
      // Enter key support
      newCategoryInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.handleAddCategory(newCategoryInput);
        }
      });
    }
  }
  
  handleAddCategory(inputElement) {
    const categoryName = inputElement.value.trim();
    
    if (!categoryName) {
      this.notificationService.show('Inserisci un nome per la categoria', 'error');
      return;
    }
    
    if (CategoryManager.exists(categoryName)) {
      this.notificationService.show('Questa categoria esiste già', 'error');
      return;
    }
    
    try {
      CategoryManager.add(categoryName);
      inputElement.value = '';
      inputElement.focus();
      this.notificationService.show(`Categoria "${categoryName}" creata con successo`, 'success');
      this.renderCategoryAdmin();
      this.populateContactFilter();
    } catch (error) {
      ErrorHandler.handle(error, 'App.addCategory', true);
    }
  }
  
  renderCategoryAdmin() {
    const container = document.getElementById('categoryAdminList');
    if (!container) return;
    
    const categoriesWithUsage = CategoryManager.getAllWithUsage();
    
    if (categoriesWithUsage.length === 0) {
      container.innerHTML = '<p class="empty-state">Nessuna categoria presente</p>';
      return;
    }
    
    container.innerHTML = categoriesWithUsage.map(cat => `
      <div class="category-admin-item">
        <div class="category-info">
          <h3 class="category-name">${Utils.escapeHtml(cat.name)}</h3>
          <div class="category-usage">
            <span class="category-usage-badge ${cat.count === 0 ? 'unused' : 'in-use'}">
              ${cat.count} ${cat.count === 1 ? 'contatto' : 'contatti'}
            </span>
          </div>
        </div>
        <div class="category-actions">
          <button 
            class="btn-delete-category" 
            data-category="${Utils.escapeHtml(cat.name)}"
            ${cat.canDelete ? '' : 'disabled'}
            title="${cat.canDelete ? 'Elimina categoria' : 'Impossibile eliminare: categoria in uso'}"
          >
            ${cat.canDelete ? '🗑️ Elimina' : '🔒 In uso'}
          </button>
        </div>
      </div>
    `).join('');
  }
  
  deleteCategoryWithConfirmation(categoryName) {
    const usageCount = CategoryManager.getUsageCount(categoryName);
    
    if (usageCount > 0) {
      NotificationService.error(`Impossibile eliminare "${categoryName}": categoria utilizzata da ${usageCount} contatti`);
      return;
    }
    
    const confirmed = confirm(
      `Sei sicuro di voler eliminare la categoria "${categoryName}"?\n\nQuesta azione è irreversibile.`
    );
    
    if (confirmed) {
      const result = CategoryManager.remove(categoryName);
      if (result.success) {
        this.renderCategoryAdmin();
        NotificationService.success(`Categoria "${categoryName}" eliminata con successo`);
      }
    }
  }
  
  // ==================== USERS LISTENERS ====================
  
  setupUsersListeners() {
    const addBtn = document.getElementById('addUserBtn');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        this.openUserModal();
      });
    }
    
    const roleFilter = document.getElementById('userRoleFilter');
    if (roleFilter) {
      roleFilter.addEventListener('change', () => {
        this.renderUsers();
      });
    }
    
    const statusFilter = document.getElementById('userStatusFilter');
    if (statusFilter) {
      statusFilter.addEventListener('change', () => {
        this.renderUsers();
      });
    }
    
    const search = document.getElementById('userSearch');
    if (search) {
      search.addEventListener('input', 
        Utils.debounce(() => this.renderUsers(), 300)
      );
    }
    
    const form = document.getElementById('userForm');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.saveUser();
      });
    }
  }
  
  openUserModal() { 
    document.getElementById('userModal').classList.add('active');
    document.getElementById('userModalTitle').textContent = 'Nuovo Utente';
    document.getElementById('userForm').reset();
    EventBus.emit(EVENTS.MODAL_OPENED, { modal: 'user' });
  }
  
  saveUser() {
    const data = {
      username: document.getElementById('userUsername').value,
      password: document.getElementById('userPassword').value,
      fullName: document.getElementById('userFullName').value,
      email: document.getElementById('userEmail').value,
      role: document.getElementById('userRole').value
    };
    
    const result = UsersManagementModule.create(data);
    if (result.success) {
      document.getElementById('userModal').classList.remove('active');
      document.getElementById('userForm').reset();
      this.renderUsers();
    }
  }
  
  editUser(id) {
    const user = UsersManagementModule.getById(id);
    if (!user) return;
    
    document.getElementById('userModalTitle').textContent = 'Modifica Utente';
    document.getElementById('userUsername').value = user.username;
    document.getElementById('userFullName').value = user.fullName || '';
    document.getElementById('userEmail').value = user.email || '';
    document.getElementById('userRole').value = user.role;
    document.getElementById('userPassword').value = '';
    document.getElementById('userPassword').placeholder = 'Lascia vuoto per non modificare';
    document.getElementById('userPassword').required = false;
    
    document.getElementById('userModal').classList.add('active');
    
    // Cambia form submit per update
    const form = document.getElementById('userForm');
    form.onsubmit = (e) => {
      e.preventDefault();
      const updates = {
        username: document.getElementById('userUsername').value,
        fullName: document.getElementById('userFullName').value,
        email: document.getElementById('userEmail').value,
        role: document.getElementById('userRole').value
      };
      
      const pwd = document.getElementById('userPassword').value;
      if (pwd) updates.password = pwd;
      
      const result = UsersManagementModule.update(id, updates);
      if (result.success) {
        document.getElementById('userModal').classList.remove('active');
        document.getElementById('userForm').reset();
        document.getElementById('userPassword').required = true;
        document.getElementById('userPassword').placeholder = '';
        form.onsubmit = null;
        this.renderUsers();
      }
    };
  }
  
  deleteUser(id) {
    if (confirm('Elimina questo utente? L\'operazione è irreversibile.')) {
      UsersManagementModule.delete(id);
      this.renderUsers();
    }
  }
  
  toggleUserActive(id) {
    UsersManagementModule.toggleActive(id);
    this.renderUsers();
  }
  
  // ==================== UI UTILITIES ====================
  
  /**
   * Aggiorna UI basata su permessi
   */
  updateUIPermissions() {
    // Nascondi activity log se non hai permessi
    if (!PermissionsManager.canViewLogs()) {
      const activitySection = document.querySelector('.recent-activity');
      if (activitySection) activitySection.style.display = 'none';
      
      const activityLogNavItem = document.getElementById('activityLogNavItem');
      if (activityLogNavItem) activityLogNavItem.style.display = 'none';
    } else {
      // Mostra activity log nav-item se hai permessi
      const activityLogNavItem = document.getElementById('activityLogNavItem');
      if (activityLogNavItem) activityLogNavItem.style.display = 'block';
    }
    
    // Mostra sezione utenti solo ad admin
    if (PermissionsManager.canCreateUsers()) {
      const usersNavItem = document.getElementById('usersNavItem');
      if (usersNavItem) usersNavItem.style.display = 'block';
    }
  }
  
  // ==================== BULK SELECTION METHODS ====================
  
  /**
   * Toggle select all tasks
   */
  toggleSelectAllTasks(checked) {
    const tasks = TasksModule.getAll();
    const filter = document.getElementById('taskFilter').value;
    
    let filteredTasks = tasks;
    if (filter === 'active') {
      filteredTasks = tasks.filter(t => !t.completed);
    } else if (filter === 'completed') {
      filteredTasks = tasks.filter(t => t.completed);
    }
    
    if (checked) {
      filteredTasks.forEach(task => this.selectedTasks.add(task.id));
    } else {
      this.selectedTasks.clear();
    }
    
    this.renderTasks();
    this.updateTaskBulkActionsBar();
  }
  
  /**
   * Toggle individual task selection
   */
  toggleTaskSelection(taskId, checked) {
    if (checked) {
      this.selectedTasks.add(taskId);
    } else {
      this.selectedTasks.delete(taskId);
    }
    
    this.updateTaskBulkActionsBar();
    this.updateTaskSelectAllCheckbox();
  }
  
  /**
   * Update bulk actions bar visibility and count
   */
  updateTaskBulkActionsBar() {
    const bulkActionsBar = document.getElementById('taskBulkActions');
    const selectedCount = document.getElementById('taskSelectedCount');
    
    if (this.selectedTasks.size > 0) {
      bulkActionsBar.style.display = 'flex';
      selectedCount.textContent = `${this.selectedTasks.size} task selezionati`;
    } else {
      bulkActionsBar.style.display = 'none';
    }
  }
  
  /**
   * Update select all checkbox state
   */
  updateTaskSelectAllCheckbox() {
    const selectAllCheckbox = document.getElementById('taskSelectAll');
    const tasks = TasksModule.getAll();
    const filter = document.getElementById('taskFilter').value;
    
    let filteredTasks = tasks;
    if (filter === 'active') {
      filteredTasks = tasks.filter(t => !t.completed);
    } else if (filter === 'completed') {
      filteredTasks = tasks.filter(t => t.completed);
    }
    
    if (filteredTasks.length === 0) {
      selectAllCheckbox.checked = false;
      selectAllCheckbox.indeterminate = false;
    } else {
      const allSelected = filteredTasks.every(t => this.selectedTasks.has(t.id));
      const someSelected = filteredTasks.some(t => this.selectedTasks.has(t.id));
      
      selectAllCheckbox.checked = allSelected;
      selectAllCheckbox.indeterminate = someSelected && !allSelected;
    }
  }
  
  /**
   * Bulk delete selected tasks
   */
  bulkDeleteTasks() {
    if (this.selectedTasks.size === 0) {
      NotificationService.warning('Nessun task selezionato');
      return;
    }
    
    const count = this.selectedTasks.size;
    const confirmed = confirm(`Vuoi davvero eliminare ${count} task selezionati?`);
    
    if (!confirmed) return;
    
    const ids = Array.from(this.selectedTasks);
    const result = TasksModule.bulkDelete(ids);
    
    if (result.success) {
      this.selectedTasks.clear();
      this.renderTasks();
      this.updateTaskBulkActionsBar();
      this.updateTaskSelectAllCheckbox();
      this.updateStats();
    }
  }
  
  /**
   * Cancel task selection
   */
  cancelTaskSelection() {
    this.selectedTasks.clear();
    this.renderTasks();
    this.updateTaskBulkActionsBar();
    this.updateTaskSelectAllCheckbox();
  }
  
  /**
   * Toggle theme
   */
  toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const newTheme = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    StorageManager.save(CONFIG.STORAGE_KEYS.THEME, newTheme);
    document.getElementById('themeToggle').textContent = newTheme === 'dark' ? '☀️' : '🌓';
    
    EventBus.emit(EVENTS.THEME_CHANGED, { theme: newTheme });
    NotificationService.info(`Tema ${newTheme === 'dark' ? 'scuro' : 'chiaro'} attivato`);
  }
  
  /**
   * Save auto-backup configuration
   */
  saveAutoBackupConfig() {
    const enabled = document.getElementById('autoBackupEnabled').checked;
    const frequency = document.getElementById('autoBackupFrequency').value;
    
    AutoBackupService.saveConfig(enabled, frequency);
    
    this.renderAutoBackupStats();
    NotificationService.success('Configurazione auto-backup salvata!');
  }
  
  /**
   * Run backup now
   */
  runBackupNow() {
    AutoBackupService.performBackup();
    this.renderAutoBackupStats();
    this.renderAutoBackupList();
  }
  
  /**
   * Render auto-backup stats
   */
  renderAutoBackupStats() {
    const stats = AutoBackupService.getStats();
    const container = document.getElementById('autoBackupStats');
    
    if (!container) return;
    
    const statusBadge = stats.enabled 
      ? '<span style="color: #10b981; font-weight: bold;">✅ Attivo</span>'
      : '<span style="color: #ef4444; font-weight: bold;">⏸️ Disabilitato</span>';
    
    const lastBackup = stats.lastBackup 
      ? Utils.formatDate(new Date(stats.lastBackup), true)
      : 'Mai';
    
    const nextBackup = stats.nextBackup && stats.enabled
      ? Utils.formatDate(new Date(stats.nextBackup), true)
      : 'N/A';
    
    container.innerHTML = `
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.5rem; font-size: 0.9rem;">
        <div><strong>Stato:</strong> ${statusBadge}</div>
        <div><strong>Frequenza:</strong> ${stats.frequency === 'daily' ? 'Giornaliero' : 'Settimanale'}</div>
        <div><strong>Ultimo backup:</strong> ${lastBackup}</div>
        <div><strong>Prossimo backup:</strong> ${nextBackup}</div>
        <div><strong>Backup salvati:</strong> ${stats.totalBackups} / ${stats.maxBackups}</div>
        <div><strong>Spazio usato:</strong> ${stats.storageUsed}</div>
      </div>
    `;
  }
  
  /**
   * Render auto-backup list
   */
  renderAutoBackupList() {
    const backups = AutoBackupService.getAllAutoBackups();
    const container = document.getElementById('autoBackupListContent');
    
    if (!container) return;
    
    if (backups.length === 0) {
      container.innerHTML = '<p style="color: #6b7280; font-style: italic;">Nessun backup automatico disponibile</p>';
      return;
    }
    
    // Ordina per data (più recente prima)
    backups.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    container.innerHTML = backups.map(backup => `
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; background: white; border: 1px solid #e5e7eb; border-radius: 6px; margin-bottom: 0.5rem;">
        <div>
          <strong>${Utils.formatDate(new Date(backup.timestamp), true)}</strong>
          <br>
          <small style="color: #6b7280;">
            ${backup.data.stats.totalContacts} contatti, 
            ${backup.data.stats.totalBookings} prenotazioni, 
            ${backup.data.stats.totalTransactions} transazioni
          </small>
        </div>
        <div style="display: flex; gap: 0.5rem;">
          <button class="btn btn-sm btn-secondary" onclick="app.downloadAutoBackup(${backup.id})">⬇️ Scarica</button>
          <button class="btn btn-sm btn-primary" onclick="app.restoreAutoBackup(${backup.id})">🔄 Ripristina</button>
          <button class="btn btn-sm btn-danger" onclick="app.deleteAutoBackup(${backup.id})">🗑️</button>
        </div>
      </div>
    `).join('');
  }
  
  /**
   * Download auto-backup
   */
  downloadAutoBackup(id) {
    AutoBackupService.downloadAutoBackup(id);
  }
  
  /**
   * Restore auto-backup
   */
  async restoreAutoBackup(id) {
    await AutoBackupService.restoreAutoBackup(id);
  }
  
  /**
   * Delete auto-backup
   */
  deleteAutoBackup(id) {
    if (confirm('Eliminare questo backup automatico?')) {
      AutoBackupService.deleteAutoBackup(id);
      this.renderAutoBackupList();
      this.renderAutoBackupStats();
    }
  }

  // ==================== PROPERTIES ====================

  /**
   * Inizializza property filter (dropdown opzionale)
   */
  initializePropertyFilter() {
    this.currentPropertyFilter = null; // null = tutte le properties
    this.updatePropertyFilter();
    
    // Listener per cambio filtro
    const selector = document.getElementById('propertySelector');
    if (selector) {
      selector.addEventListener('change', (e) => {
        const value = e.target.value;
        this.currentPropertyFilter = value === 'all' ? null : parseInt(value);
        
        // Ricarica viste filtrate
        this.renderBookings();
        this.renderCleaning();
        this.renderMaintenance();
      });
    }
  }

  /**
   * Aggiorna property filter dropdown
   */
  updatePropertyFilter() {
    const selector = document.getElementById('propertySelector');
    if (!selector || !PropertiesModule) return;
    
    const properties = PropertiesModule.getAll();
    
    let html = '<option value="all">📊 Tutte le Proprietà</option>';
    properties.forEach(p => {
      const selected = this.currentPropertyFilter === p.id ? 'selected' : '';
      html += `<option value="${p.id}" ${selected}>${p.name}</option>`;
    });
    
    selector.innerHTML = html;
  }

  /**
   * Setup properties listeners
   */
  setupPropertiesListeners() {
    // Add property button
    document.getElementById('addPropertyBtn')?.addEventListener('click', () => {
      this.openPropertyModal();
    });
    
    // Property form submit
    document.getElementById('propertyForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveProperty();
    });
  }

  /**
   * Render properties list
   */
  renderProperties() {
    const container = document.getElementById('propertiesList');
    if (!container || !PropertiesModule) return;
    
    const properties = PropertiesModule.getAll();
    
    if (properties.length === 0) {
      container.innerHTML = '<p class="text-secondary">Nessuna proprietà. Creane una per iniziare.</p>';
      return;
    }
    
    container.innerHTML = properties.map(property => {
      const stats = PropertiesModule.getStats(property.id);
      
      return `
        <div class="property-card">
          <div class="property-info">
            <div class="property-color-badge" style="background-color: ${property.color}"></div>
            <div class="property-details">
              <h3>${Utils.escapeHtml(property.name)}</h3>
              <p>${property.address.city || 'Indirizzo non specificato'}</p>
            </div>
          </div>
          <div class="property-stats">
            <div class="property-stat">
              <span class="property-stat-value">${stats.totalBookings}</span>
              <span class="property-stat-label">Prenotazioni</span>
            </div>
            <div class="property-stat">
              <span class="property-stat-value">€${stats.totalRevenue.toLocaleString()}</span>
              <span class="property-stat-label">Revenue</span>
            </div>
          </div>
          <div class="property-actions">
            <button class="btn btn-secondary btn-sm" onclick="app.editProperty(${property.id})">✏️ Modifica</button>
            <button class="btn btn-danger btn-sm" onclick="app.deleteProperty(${property.id})">🗑️ Elimina</button>
          </div>
        </div>
      `;
    }).join('');
  }

  /**
   * Open property modal
   */
  openPropertyModal(propertyId = null) {
    const modal = document.getElementById('propertyModal');
    const title = document.getElementById('propertyModalTitle');
    const form = document.getElementById('propertyForm');
    
    if (!modal || !form) return;
    
    form.reset();
    
    // Popola dropdown contatti
    this.populatePropertyContactsDropdowns();
    
    if (propertyId) {
      // Edit mode
      const property = PropertiesModule.getById(propertyId);
      if (!property) return;
      
      title.textContent = 'Modifica Proprietà';
      document.getElementById('propertyName').value = property.name;
      document.getElementById('propertyDescription').value = property.description || '';
      document.getElementById('propertyStreet').value = property.address?.street || '';
      document.getElementById('propertyCity').value = property.address?.city || '';
      document.getElementById('propertyZip').value = property.address?.zip || '';
      document.getElementById('propertyCountry').value = property.address?.country || 'Italia';
      document.getElementById('propertyColor').value = property.color || '#3b82f6';
      
      // Preseleziona contatti assegnati
      if (property.contacts) {
        // Cleaning
        const cleaningSelect = document.getElementById('propertyContactsCleaning');
        if (cleaningSelect && property.contacts.cleaning) {
          Array.from(cleaningSelect.options).forEach(opt => {
            opt.selected = property.contacts.cleaning.includes(parseInt(opt.value));
          });
        }
        
        // Maintenance
        const maintenanceSelect = document.getElementById('propertyContactsMaintenance');
        if (maintenanceSelect && property.contacts.maintenance) {
          Array.from(maintenanceSelect.options).forEach(opt => {
            opt.selected = property.contacts.maintenance.includes(parseInt(opt.value));
          });
        }
        
        // Owner
        const ownerSelect = document.getElementById('propertyContactsOwner');
        if (ownerSelect && property.contacts.owner) {
          ownerSelect.value = property.contacts.owner;
        }
        
        // Emergency
        const emergencySelect = document.getElementById('propertyContactsEmergency');
        if (emergencySelect && property.contacts.emergency) {
          Array.from(emergencySelect.options).forEach(opt => {
            opt.selected = property.contacts.emergency.includes(parseInt(opt.value));
          });
        }
      }
      
      form.dataset.editId = propertyId;
    } else {
      // Create mode
      title.textContent = 'Nuova Proprietà';
      delete form.dataset.editId;
    }
    
    modal.classList.add('active');
  }

  /**
   * Popola dropdown contatti per property modal
   */
  populatePropertyContactsDropdowns() {
    if (!ContactsModule) return;
    
    const contacts = ContactsModule.getAll();
    
    // Cleaning
    const cleaningSelect = document.getElementById('propertyContactsCleaning');
    if (cleaningSelect) {
      cleaningSelect.innerHTML = contacts.map(c => 
        `<option value="${c.id}">${c.firstName} ${c.lastName} ${c.company ? '(' + c.company + ')' : ''}</option>`
      ).join('');
    }
    
    // Maintenance
    const maintenanceSelect = document.getElementById('propertyContactsMaintenance');
    if (maintenanceSelect) {
      maintenanceSelect.innerHTML = contacts.map(c => 
        `<option value="${c.id}">${c.firstName} ${c.lastName} ${c.company ? '(' + c.company + ')' : ''}</option>`
      ).join('');
    }
    
    // Owner
    const ownerSelect = document.getElementById('propertyContactsOwner');
    if (ownerSelect) {
      ownerSelect.innerHTML = '<option value="">Nessuno</option>' + contacts.map(c => 
        `<option value="${c.id}">${c.firstName} ${c.lastName} ${c.company ? '(' + c.company + ')' : ''}</option>`
      ).join('');
    }
    
    // Emergency
    const emergencySelect = document.getElementById('propertyContactsEmergency');
    if (emergencySelect) {
      emergencySelect.innerHTML = contacts.map(c => 
        `<option value="${c.id}">${c.firstName} ${c.lastName} ${c.company ? '(' + c.company + ')' : ''}</option>`
      ).join('');
    }
  }

  /**
   * Save property
   */
  saveProperty() {
    const form = document.getElementById('propertyForm');
    if (!form || !PropertiesModule) return;
    
    // Raccogli contatti selezionati
    const cleaningSelect = document.getElementById('propertyContactsCleaning');
    const maintenanceSelect = document.getElementById('propertyContactsMaintenance');
    const ownerSelect = document.getElementById('propertyContactsOwner');
    const emergencySelect = document.getElementById('propertyContactsEmergency');
    
    const contacts = {
      cleaning: cleaningSelect ? Array.from(cleaningSelect.selectedOptions).map(opt => parseInt(opt.value)) : [],
      maintenance: maintenanceSelect ? Array.from(maintenanceSelect.selectedOptions).map(opt => parseInt(opt.value)) : [],
      owner: ownerSelect && ownerSelect.value ? parseInt(ownerSelect.value) : null,
      emergency: emergencySelect ? Array.from(emergencySelect.selectedOptions).map(opt => parseInt(opt.value)) : []
    };
    
    const data = {
      name: document.getElementById('propertyName').value,
      description: document.getElementById('propertyDescription').value,
      address: {
        street: document.getElementById('propertyStreet').value,
        city: document.getElementById('propertyCity').value,
        zip: document.getElementById('propertyZip').value,
        country: document.getElementById('propertyCountry').value
      },
      color: document.getElementById('propertyColor').value,
      contacts: contacts
    };
    
    let result;
    if (form.dataset.editId) {
      // Update
      result = PropertiesModule.update(parseInt(form.dataset.editId), data);
    } else {
      // Create
      result = PropertiesModule.create(data);
    }
    
    if (result.success) {
      document.getElementById('propertyModal').classList.remove('active');
      this.renderProperties();
      this.updatePropertyFilter();
    }
  }

  /**
   * Edit property
   */
  editProperty(id) {
    this.openPropertyModal(id);
  }

  /**
   * Delete property
   */
  deleteProperty(id) {
    if (!PropertiesModule) return;
    
    const property = PropertiesModule.getById(id);
    if (!property) return;
    
    if (confirm(`Eliminare la proprietà "${property.name}"? Questa azione eliminerà anche tutte le prenotazioni associate.`)) {
      const result = PropertiesModule.delete(id);
      if (result.success) {
        this.renderProperties();
        this.updatePropertyFilter();
      }
    }
  }

  /**
   * Toggle quick contact form nel modale proprietà
   * @param {string|null} role - 'cleaning', 'maintenance', 'owner', 'emergency', o null per chiudere
   */
  toggleQuickContactForm(role) {
    const form = document.getElementById('quickContactForm');
    if (!form) return;

    if (role) {
      this.quickContactRole = role;
      form.style.display = 'block';
      document.getElementById('quickContactFirstName').focus();
    } else {
      this.quickContactRole = null;
      form.style.display = 'none';
      // Pulisci i campi
      document.getElementById('quickContactFirstName').value = '';
      document.getElementById('quickContactLastName').value = '';
      document.getElementById('quickContactEmail').value = '';
      document.getElementById('quickContactPhone').value = '';
    }
  }

  /**
   * Salva contatto veloce dal modale proprietà
   */
  saveQuickContact() {
    const firstName = document.getElementById('quickContactFirstName').value.trim();
    const lastName = document.getElementById('quickContactLastName').value.trim();
    const email = document.getElementById('quickContactEmail').value.trim();
    const phone = document.getElementById('quickContactPhone').value.trim();

    // Validazione minima
    if (!firstName || !lastName) {
      NotificationService.error('Nome e cognome sono obbligatori');
      return;
    }

    // Crea il contatto
    const result = ContactsModule.create({
      firstName: firstName,
      lastName: lastName,
      emails: email ? [{ value: email, label: 'Principale' }] : [],
      phones: phone ? [{ value: phone, label: 'Principale' }] : [],
      category: 'operativo' // Default category per staff operativo
    });

    if (!result.success) {
      NotificationService.error(result.message || 'Errore creazione contatto');
      return;
    }

    // Contatto creato, assegnalo al ruolo
    const contact = result.contact;
    const roleMap = {
      'cleaning': 'propertyContactsCleaning',
      'maintenance': 'propertyContactsMaintenance',
      'owner': 'propertyContactsOwner',
      'emergency': 'propertyContactsEmergency'
    };

    const selectId = roleMap[this.quickContactRole];
    if (selectId) {
      const select = document.getElementById(selectId);
      if (select) {
        // Aggiungi opzione al select se non esiste
        const optionId = `contact-${contact.id}`;
        if (!select.querySelector(`option[value="${contact.id}"]`)) {
          const option = document.createElement('option');
          option.value = contact.id;
          option.text = `${contact.firstName} ${contact.lastName}`;
          option.id = optionId;
          select.appendChild(option);
        }

        // Seleziona il contatto appena creato
        select.value = contact.id;
        
        // Se è un multi-select, aggiungi alla selezione
        if (select.multiple) {
          select.querySelector(`option[value="${contact.id}"]`).selected = true;
        }
      }
    }

    // Notifica successo e chiudi form
    NotificationService.success(`${firstName} ${lastName} creato/a e assegnato/a!`);
    this.toggleQuickContactForm(null);
  }
} // Fine classe DashboardApp

// Inizializza app
const app = new DashboardApp();
// Rendilo disponibile globalmente per i handler inline
window.app = app;