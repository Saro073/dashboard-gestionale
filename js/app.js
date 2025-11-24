// ==================== APP ORCHESTRATOR ====================
// Nuovo orchestratore modulare

class DashboardApp {
  constructor() {
    this.init();
  }
  
  /**
   * Inizializzazione applicazione
   */
  init() {
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
    
    // Carica dati
    this.loadData();
    this.renderAll();
    
    // Aggiorna UI basata su permessi
    this.updateUIPermissions();
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
    
    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        this.switchSection(item.dataset.section);
      });
    });
    
    // Contacts
    this.setupContactsListeners();
    
    // Tasks
    this.setupTasksListeners();
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
    }
  }
  
  /**
   * Handle logout
   */
  handleLogout() {
    AuthManager.logout();
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
    this.renderRecentActivity();
  }
  
  /**
   * Aggiorna statistiche
   */
  updateStats() {
    const contactsStats = ContactsModule.getStats();
    const tasksStats = TasksModule.getStats();
    
    document.getElementById('contactsCount').textContent = contactsStats.total;
    document.getElementById('tasksCount').textContent = tasksStats.active;
    document.getElementById('notesCount').textContent = '0'; // TODO: notes module
    document.getElementById('documentsCount').textContent = '0'; // TODO: documents module
  }
  
  /**
   * Render contatti
   */
  renderContacts() {
    const container = document.getElementById('contactsList');
    const contacts = ContactsModule.getAll();
    
    // Apply filters
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
  
  /**
   * Gestione contatti
   */
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
  
  /**
   * Gestione task
   */
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
  
  /**
   * Switch section
   */
  switchSection(sectionName) {
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    document.querySelector(`[data-section="${sectionName}"]`).classList.add('active');
    
    document.querySelectorAll('.content-section').forEach(section => section.classList.remove('active'));
    document.getElementById(`${sectionName}Section`).classList.add('active');
    
    const titles = { overview: 'Overview', contacts: 'Contatti', tasks: 'Task', notes: 'Note', documents: 'Documenti' };
    document.getElementById('sectionTitle').textContent = titles[sectionName];
  }
  
  /**
   * Aggiorna UI basata su permessi
   */
  updateUIPermissions() {
    // Mostra/nascondi elementi basati su permessi
    if (!PermissionsManager.canViewLogs()) {
      const activitySection = document.querySelector('.recent-activity');
      if (activitySection) activitySection.style.display = 'none';
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
  }
  
  // Metodi contatti (semplificati - da completare con modal)
  openContactModal() { document.getElementById('contactModal').classList.add('active'); }
  editContact(id) { /* TODO */ }
  deleteContact(id) {
    if (confirm('Elimina questo contatto?')) {
      ContactsModule.delete(id);
      this.renderContacts();
      this.updateStats();
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
    ContactsModule.create(data);
    document.getElementById('contactModal').classList.remove('active');
    document.getElementById('contactForm').reset();
    this.renderContacts();
    this.updateStats();
  }
  
  // Metodi task
  openTaskModal() { document.getElementById('taskModal').classList.add('active'); }
  toggleTask(id) {
    TasksModule.toggleComplete(id);
    this.renderTasks();
    this.updateStats();
  }
  deleteTask(id) {
    if (confirm('Elimina questo task?')) {
      TasksModule.delete(id);
      this.renderTasks();
      this.updateStats();
    }
  }
  saveTask() {
    const data = {
      title: document.getElementById('taskTitle').value,
      description: document.getElementById('taskDescription').value,
      priority: document.getElementById('taskPriority').value,
      dueDate: document.getElementById('taskDueDate').value
    };
    TasksModule.create(data);
    document.getElementById('taskModal').classList.remove('active');
    document.getElementById('taskForm').reset();
    this.renderTasks();
    this.updateStats();
  }
}

// Inizializza app
const app = new DashboardApp();
