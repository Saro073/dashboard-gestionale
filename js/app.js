// ==================== APP ORCHESTRATOR ====================
// Orchestratore modulare con nuova architettura

class DashboardApp {
  constructor() {
    this.currentEditingTaskId = null; // Per gestire edit task
    this.currentEditingNoteId = null; // Per gestire edit note
    this.currentEditingContactId = null; // Contatti
    this.init();
  }
  
  /**
   * Inizializzazione applicazione
   */
  init() {
    // Inizializza servizi core
    NotificationService.init();
    
    // Inizializza autenticazione
    AuthManager.init();
    
    // Inizializza categorie con defaults e migrazione
    if (CategoryManager && typeof CategoryManager.initializeDefaults === 'function') {
      CategoryManager.initializeDefaults();
    }
    
    // Migra vecchi contatti se necessario
    if (ContactsModule && typeof ContactsModule.migrateOldContacts === 'function') {
      ContactsModule.migrateOldContacts();
    }
    
    // Migra categorie dai contatti esistenti
    if (CategoryManager && typeof CategoryManager.migrateFromContacts === 'function') {
      CategoryManager.migrateFromContacts();
    }
    
    // Verifica autenticazione
    if (AuthManager.isAuthenticated()) {
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
    document.getElementById('dashboard').style.display = 'flex';
    
    const user = AuthManager.getCurrentUser();
    document.getElementById('userDisplay').textContent = user.fullName || user.username;
    
    // Inizializza router
    Router.init();
    
    // Carica dati e render
    this.loadData();
    this.renderAll();
    
    // Aggiorna UI basata su permessi
    this.updateUIPermissions();
    
    // Mostra notifica di benvenuto
    NotificationService.success(`Benvenuto, ${user.fullName || user.username}!`);
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
    
    // Logout
    document.getElementById('logoutBtn').addEventListener('click', () => {
      this.handleLogout();
    });
    
    // Theme toggle
    document.getElementById('themeToggle').addEventListener('click', () => {
      this.toggleTheme();
    });
    
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
    
    // Activity Log
    this.setupActivityLogListeners();
    
    // Users (solo se admin)
    if (PermissionsManager.canCreateUsers()) {
      this.setupUsersListeners();
      this.setupCategoryAdminListeners();
    }

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
    
    const result = AuthManager.login(username, password);
    
    if (result.success) {
      this.showDashboard();
    } else {
      const errorDiv = document.getElementById('loginError');
      errorDiv.textContent = result.message;
      errorDiv.style.display = 'block';
      NotificationService.error(result.message);
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
    this.renderContacts();
    this.renderTasks();
    this.renderNotes();
    this.renderDocuments();
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
   * Render contatti
   */
  renderContacts() {
    const container = document.getElementById('contactsList');
    const filter = document.getElementById('contactFilter').value;
    const search = document.getElementById('contactSearch').value;
    
    let filtered = ContactsModule.filterByCategory(filter);
    if (search) {
      filtered = ContactsModule.search(search);
    }
    
    if (filtered.length === 0) {
      container.innerHTML = '<p class="empty-state">Nessun contatto trovato</p>';
      return;
    }
    
    container.innerHTML = filtered.map(contact => `
      <div class="item-card">
        <h3>${Utils.escapeHtml(contact.name)}</h3>

        ${contact.emails && contact.emails.length > 0
          ? contact.emails.map(e => `<p>📧 ${Utils.escapeHtml(e.value)} <span class="field-label">(${Utils.escapeHtml(e.label)})</span></p>`).join('')
          : ''
        }

        ${contact.phones && contact.phones.length > 0
          ? contact.phones.map(p => `<p>📞 ${Utils.escapeHtml(p.value)} <span class="field-label">(${Utils.escapeHtml(p.label)})</span></p>`).join('')
          : ''
        }

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
   * Render task
   */
  renderTasks() {
    const container = document.getElementById('tasksList');
    const filter = document.getElementById('taskFilter').value;
    const tasks = TasksModule.filterByStatus(filter);
    
    if (tasks.length === 0) {
      container.innerHTML = '<p class="empty-state">Nessun task trovato</p>';
      return;
    }
    
    container.innerHTML = tasks.map(task => `
      <div class="task-item ${task.completed ? 'completed' : ''}">
        <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''}
               onchange="app.toggleTask(${task.id})" 
               ${PermissionsManager.canEditTask(task) ? '' : 'disabled'}>
        <div class="task-content">
          <h4>${Utils.escapeHtml(task.title)}</h4>
          ${task.description ? `<p>${Utils.escapeHtml(task.description)}</p>` : ''}
          <div class="item-meta">
            <span class="item-badge badge-${task.priority}">${task.priority}</span>
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
    `).join('');
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
  
  // ==================== CONTACTS LISTENERS ====================
  
  setupContactsListeners() {
    document.getElementById('addContactBtn').addEventListener('click', () => {
      this.openContactModal();
    });
    
    document.getElementById('contactFilter').addEventListener('change', () => {
      this.renderContacts();
    });
    
    document.getElementById('contactSearch').addEventListener('input', 
      Utils.debounce(() => this.renderContacts(), 300)
    );
    
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

    document.getElementById('contactName').value = contact.name;
    document.getElementById('contactCompany').value = contact.company || '';
    document.getElementById('contactCategory').value = contact.category || 'cliente';
    document.getElementById('contactNotes').value = contact.notes || '';

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
    const name = document.getElementById('contactName').value;
    const company = document.getElementById('contactCompany').value;
    const category = document.getElementById('contactCategory').value.trim();
    const notes = document.getElementById('contactNotes').value;

    // Aggiungi nuova categoria se non esiste
    if (category && !CategoryManager.exists(category)) {
      CategoryManager.add(category);
    }

    const emails = Array.from(document.querySelectorAll('#emailsContainer .multi-input-row')).map(row => ({
      value: row.querySelector('.email-value').value.trim(),
      label: row.querySelector('.email-label').value.trim()
    })).filter(e => e.value || e.label);

    const phones = Array.from(document.querySelectorAll('#phonesContainer .multi-input-row')).map(row => ({
      value: row.querySelector('.phone-value').value.trim(),
      label: row.querySelector('.phone-label').value.trim()
    })).filter(p => p.value || p.label);

    const payload = { name, emails, phones, company, category, notes };
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
    
    document.getElementById('taskFilter').addEventListener('change', () => {
      this.renderTasks();
    });
    
    document.getElementById('taskForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveTask();
    });
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
      console.error('Error adding category:', error);
      this.notificationService.show('Errore nella creazione della categoria', 'error');
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
}

// Inizializza app
const app = new DashboardApp();
// Rendilo disponibile globalmente per i handler inline
window.app = app;