// ==================== APP ORCHESTRATOR ====================
// Orchestratore modulare con nuova architettura

class DashboardApp {
  constructor() {
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
    EventBus.on(EVENTS.USER_CREATED, () => this.renderUsers());
    EventBus.on(EVENTS.USER_UPDATED, () => this.renderUsers());
    EventBus.on(EVENTS.USER_DELETED, () => this.renderUsers());
    
    // Aggiorna attività recenti
    EventBus.on(EVENTS.CONTACT_CREATED, () => this.renderRecentActivity());
    EventBus.on(EVENTS.TASK_CREATED, () => this.renderRecentActivity());
    EventBus.on(EVENTS.NOTE_CREATED, () => this.renderRecentActivity());
    EventBus.on(EVENTS.DOCUMENT_UPLOADED, () => this.renderRecentActivity());
    EventBus.on(EVENTS.USER_CREATED, () => this.renderRecentActivity());
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
    
    // Users (solo se admin)
    if (PermissionsManager.canCreateUsers()) {
      this.setupUsersListeners();
    }
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
    this.renderContacts();
    this.renderTasks();
    this.renderNotes();
    this.renderDocuments();
    this.renderRecentActivity();
    
    // Render users solo se admin
    if (PermissionsManager.canCreateUsers()) {
      this.renderUsers();
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
    
    document.getElementById('contactsCount').textContent = contactsStats.total;
    document.getElementById('tasksCount').textContent = tasksStats.active;
    document.getElementById('notesCount').textContent = notesStats.total;
    document.getElementById('documentsCount').textContent = documentsStats.total;
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
        ${contact.email ? `<p>📧 ${Utils.escapeHtml(contact.email)}</p>` : ''}
        ${contact.phone ? `<p>📞 ${Utils.escapeHtml(contact.phone)}</p>` : ''}
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
            <span class="item-badge badge-${user.active ? 'active' : 'inactive'}">${user.active ? 'Attivo' : 'Disattivato'}</span>
            <span class="activity-time">${Utils.formatDate(user.createdAt)}</span>
          </div>
        </div>
        <div class="item-actions">
          <button class="btn btn-sm btn-secondary" onclick="app.toggleUserActive(${user.id})">
            ${user.active ? 'Disattiva' : 'Attiva'}
          </button>
          <button class="btn btn-sm btn-secondary" onclick="app.editUser(${user.id})">Modifica</button>
          <button class="btn btn-sm btn-danger" onclick="app.deleteUser(${user.id})">Elimina</button>
        </div>
      </div>
    `).join('');
  }
  
  /**
   * Render attività recenti
   */
  renderRecentActivity() {
    if (!PermissionsManager.canViewLogs()) return;
    
    const container = document.getElementById('recentActivity');
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
    document.getElementById('contactModal').classList.add('active');
    EventBus.emit(EVENTS.MODAL_OPENED, { modal: 'contact' });
  }
  
  editContact(id) { /* TODO: Implementare edit */ }
  
  deleteContact(id) {
    if (confirm('Elimina questo contatto?')) {
      ContactsModule.delete(id);
      this.renderContacts();
    }
  }
  
  saveContact() {
    const data = {
      name: document.getElementById('contactName').value,
      email: document.getElementById('contactEmail').value,
      phone: document.getElementById('contactPhone').value,
      company: document.getElementById('contactCompany').value,
      category: document.getElementById('contactCategory').value,
      notes: document.getElementById('contactNotes').value
    };
    
    const result = ContactsModule.create(data);
    if (result.success) {
      document.getElementById('contactModal').classList.remove('active');
      document.getElementById('contactForm').reset();
      this.renderContacts();
    }
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
    document.getElementById('taskModal').classList.add('active');
    EventBus.emit(EVENTS.MODAL_OPENED, { modal: 'task' });
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
    
    const result = TasksModule.create(data);
    if (result.success) {
      document.getElementById('taskModal').classList.remove('active');
      document.getElementById('taskForm').reset();
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
    document.getElementById('noteModal').classList.add('active');
    EventBus.emit(EVENTS.MODAL_OPENED, { modal: 'note' });
  }
  
  togglePinNote(id) {
    NotesModule.togglePin(id);
    this.renderNotes();
  }
  
  editNote(id) { /* TODO: Implementare edit */ }
  
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
      category: document.getElementById('noteCategory').value
    };
    
    const result = NotesModule.create(data);
    if (result.success) {
      document.getElementById('noteModal').classList.remove('active');
      document.getElementById('noteForm').reset();
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
