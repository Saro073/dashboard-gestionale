// ==================== DATA MODELS ====================
const users = [
  { username: 'admin', password: 'admin123', role: 'admin' }
];

let currentUser = null;
// ATTENZIONE: i contatti ora sono gestiti da ContactsModule/StorageManager
let tasks = [];
let notes = [];
let documents = [];

// ==================== INITIAL DATA ====================
const INITIAL_TASKS = [
  {
    title: 'Contratto con Proprietario',
    description: 'Firma Mietvertrag con clausole Untervermietung, pilot-phase 6 mesi, Vorkaufsrecht',
    priority: 'alta',
    dueDate: '2025-11-22',
    completed: false
  },
  {
    title: 'Anmeldung Finanzamt Steuernummer',
    description: 'Richiesta Steuernummer via ELSTER, setup contabilità',
    priority: 'alta',
    dueDate: '2025-11-24',
    completed: false
  },
  {
    title: 'Assicurazione Ferienwohnung',
    description: 'Haftpflicht + Hausrat 450€/anno, certificato attivo 1 Dic',
    priority: 'alta',
    dueDate: '2025-11-24',
    completed: false
  },
  {
    title: 'Sopralluogo e Inventory Check',
    description: 'Checklist completa immobile: dimensioni, difetti, manutenzioni necessarie',
    priority: 'alta',
    dueDate: '2025-11-25',
    completed: false
  },
  {
    title: 'Ordine Mobili IKEA',
    description: 'Letto, armadio, tavolo, sedie, mensole (1.800€ budget)',
    priority: 'alta',
    dueDate: '2025-11-27',
    completed: false
  },
  {
    title: 'Servizio Fotografico Professionale',
    description: 'Booking fotografo, 25-30 foto, editing incluso (400-500€)',
    priority: 'media',
    dueDate: '2025-12-15',
    completed: false
  },
  {
    title: 'Creazione Listing Airbnb',
    description: 'Listing completo: foto, descrizione, amenities, pricing',
    priority: 'alta',
    dueDate: '2025-12-20',
    completed: false
  },
  {
    title: 'Partner Pulizie Professionali',
    description: 'Ricerca e contratto con servizio pulizie (25€/turnover)',
    priority: 'media',
    dueDate: '2025-12-10',
    completed: false
  },
  {
    title: 'Soft Launch Amici & Famiglia',
    description: 'Test weekend con feedback dettagliato',
    priority: 'media',
    dueDate: '2025-12-27',
    completed: false
  },
  {
    title: 'Lancio Ufficiale Airbnb',
    description: 'Attivazione calendario pubblico, pricing competitivo',
    priority: 'alta',
    dueDate: '2026-01-01',
    completed: false
  }
];

// ==================== STORAGE MANAGEMENT ====================
function loadData() {
  // Migrazione contatti legacy -> nuovo schema
  ContactsModule.migrateOldContacts();

  // Tasks
  const savedTasks = localStorage.getItem('tasks');
  if (savedTasks) {
    tasks = JSON.parse(savedTasks);
  } else {
    tasks = INITIAL_TASKS.map((task, index) => ({
      id: Date.now() + index,
      ...task,
      createdAt: new Date().toISOString()
    }));
    saveTasks();
  }

  // Notes
  notes = JSON.parse(localStorage.getItem('notes') || '[]');

  // Documents
  documents = JSON.parse(localStorage.getItem('documents') || '[]');
}

function saveTasks() {
  localStorage.setItem('tasks', JSON.stringify(tasks));
  updateStats();
}

function saveNotes() {
  localStorage.setItem('notes', JSON.stringify(notes));
  updateStats();
}

function saveDocuments() {
  localStorage.setItem('documents', JSON.stringify(documents));
  updateStats();
}

// ==================== AUTHENTICATION ====================
function login(username, password) {
  const user = users.find(u => u.username === username && u.password === password);
  if (user) {
    currentUser = user;
    localStorage.setItem('currentUser', JSON.stringify(user));
    return true;
  }
  return false;
}

function logout() {
  currentUser = null;
  localStorage.removeItem('currentUser');
  showLoginScreen();
}

function checkAuth() {
  const savedUser = localStorage.getItem('currentUser');
  if (savedUser) {
    currentUser = JSON.parse(savedUser);
    showDashboard();
  } else {
    showLoginScreen();
  }
}

function showLoginScreen() {
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('dashboard').style.display = 'none';
}

function showDashboard() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('dashboard').style.display = 'flex';
  document.getElementById('userDisplay').textContent = currentUser.username;
  loadData();
  updateStats();
  app.renderContacts();
  renderTasks();
  renderNotes();
  renderDocuments();
}

// ==================== NAVIGATION ====================
function switchSection(sectionName) {
  // Update nav items
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active');
  });
  document.querySelector(`[data-section="${sectionName}"]`).classList.add('active');

  // Update sections
  document.querySelectorAll('.content-section').forEach(section => {
    section.classList.remove('active');
  });
  document.getElementById(`${sectionName}Section`).classList.add('active');

  // Update title
  const titles = {
    overview: 'Overview',
    contacts: 'Contatti',
    tasks: 'Task',
    notes: 'Note',
    documents: 'Documenti',
    activityLog: 'File Registro',
    bookings: 'Prenotazioni',
    users: 'Utenti'
  };
  document.getElementById('sectionTitle').textContent = titles[sectionName];
}

// ==================== STATISTICS ====================
function updateStats() {
  const contactStats = ContactsModule.getStats();
  document.getElementById('contactsCount').textContent = contactStats.total;
  document.getElementById('tasksCount').textContent = tasks.filter(t => !t.completed).length;
  document.getElementById('notesCount').textContent = notes.length;
  document.getElementById('documentsCount').textContent = documents.length;
}

// ==================== CONTACTS MANAGEMENT ====================
let editingContactId = null;

const app = {
  // ---- UI dinamica multi-valore ----
  addEmailField() {
    const container = document.getElementById('emailsContainer');
    const row = document.createElement('div');
    row.className = 'multi-input-row';
    row.innerHTML = `
      <input type="email" class="email-value" placeholder="email@esempio.com" required>
      <input type="text" class="email-label" placeholder="Etichetta (es: Lavoro)" required>
      <button type="button" class="btn-remove-field" onclick="app.removeEmailField(this)">✕</button>
    `;
    container.appendChild(row);
  },

  removeEmailField(btn) {
    const container = document.getElementById('emailsContainer');
    if (container.children.length > 1) {
      btn.closest('.multi-input-row').remove();
    } else {
      NotificationService.error('Almeno un\'email è richiesta');
    }
  },

  addPhoneField() {
    const container = document.getElementById('phonesContainer');
    const row = document.createElement('div');
    row.className = 'multi-input-row';
    row.innerHTML = `
      <input type="tel" class="phone-value" placeholder="+39 123 456 789" required>
      <input type="text" class="phone-label" placeholder="Etichetta (es: Ufficio)" required>
      <button type="button" class="btn-remove-field" onclick="app.removePhoneField(this)">✕</button>
    `;
    container.appendChild(row);
  },

  removePhoneField(btn) {
    const container = document.getElementById('phonesContainer');
    if (container.children.length > 1) {
      btn.closest('.multi-input-row').remove();
    } else {
      NotificationService.error('Almeno un telefono è richiesto');
    }
  },

  collectEmails() {
    const rows = document.querySelectorAll('#emailsContainer .multi-input-row');
    return Array.from(rows).map(row => ({
      value: row.querySelector('.email-value').value.trim(),
      label: row.querySelector('.email-label').value.trim()
    }));
  },

  collectPhones() {
    const rows = document.querySelectorAll('#phonesContainer .multi-input-row');
    return Array.from(rows).map(row => ({
      value: row.querySelector('.phone-value').value.trim(),
      label: row.querySelector('.phone-label').value.trim()
    }));
  },

  // ---- CRUD contatti via ContactsModule ----
  renderContacts(filter = 'all', searchTerm = '') {
    const container = document.getElementById('contactsList');
    const isListView = container.classList.contains('items-list-view');

    let contacts = ContactsModule.getAll();

    // Filtro per categoria
    if (filter !== 'all') {
      contacts = contacts.filter(c => c.category === filter);
    }

    // Filtro per ricerca
    if (searchTerm) {
      contacts = ContactsModule.search(searchTerm).filter(c =>
        filter === 'all' ? true : c.category === filter
      );
    }

    // Ordinamento alfabetico per vista lista
    if (isListView) {
      contacts = [...contacts].sort((a, b) => a.name.localeCompare(b.name));
    }

    if (contacts.length === 0) {
      container.innerHTML = '<p>Nessun contatto trovato</p>';
      return;
    }

    container.innerHTML = contacts.map(contact => `
      <div class="item-card">
        <h3>${Utils.escapeHtml(contact.name)}</h3>

        ${contact.emails && contact.emails.length > 0
          ? contact.emails.map(e =>
              `<p>📧 ${Utils.escapeHtml(e.value)} <span class="field-label">(${Utils.escapeHtml(e.label)})</span></p>`
            ).join('')
          : ''
        }

        ${contact.phones && contact.phones.length > 0
          ? contact.phones.map(p =>
              `<p>📞 ${Utils.escapeHtml(p.value)} <span class="field-label">(${Utils.escapeHtml(p.label)})</span></p>`
            ).join('')
          : ''
        }

        ${contact.company
          ? `<p>🏢 ${Utils.escapeHtml(contact.company)}</p>`
          : ''
        }

        ${contact.notes
          ? `<p class="contact-notes">📝 ${Utils.escapeHtml(contact.notes)}</p>`
          : ''
        }

        <p class="badge badge-sm">${Utils.escapeHtml(contact.category || '')}</p>

        <div class="item-actions">
          <button class="btn btn-sm" onclick="app.editContact(${contact.id})">✏️ Modifica</button>
          <button class="btn btn-sm btn-danger" onclick="app.deleteContact(${contact.id})">🗑️ Elimina</button>
        </div>
      </div>
    `).join('');
  },

  saveContact() {
    const data = {
      name: document.getElementById('contactName').value,
      emails: this.collectEmails(),
      phones: this.collectPhones(),
      company: document.getElementById('contactCompany').value,
      category: document.getElementById('contactCategory').value,
      notes: document.getElementById('contactNotes').value
    };

    let result;
    if (editingContactId) {
      result = ContactsModule.update(editingContactId, data);
    } else {
      result = ContactsModule.create(data);
    }

    if (!result.success) {
      return;
    }

    this.closeContactModal();
    this.renderContacts(
      document.getElementById('contactFilter').value,
      document.getElementById('contactSearch').value
    );
    updateStats();
  },

  editContact(id) {
    const contact = ContactsModule.getById(id);
    if (!contact) {
      NotificationService.error('Contatto non trovato');
      return;
    }

    editingContactId = id;
    document.getElementById('contactModalTitle').textContent = 'Modifica Contatto';
    document.getElementById('contactName').value = contact.name;
    document.getElementById('contactCompany').value = contact.company || '';
    document.getElementById('contactCategory').value = contact.category || 'cliente';
    document.getElementById('contactNotes').value = contact.notes || '';

    const emailsContainer = document.getElementById('emailsContainer');
    const phonesContainer = document.getElementById('phonesContainer');
    emailsContainer.innerHTML = '';
    phonesContainer.innerHTML = '';

    const emails = contact.emails && contact.emails.length
      ? contact.emails
      : [{ value: '', label: 'Principale' }];

    emails.forEach(e => {
      const row = document.createElement('div');
      row.className = 'multi-input-row';
      row.innerHTML = `
        <input type="email" class="email-value" placeholder="email@esempio.com" required value="${Utils.escapeHtml(e.value)}">
        <input type="text" class="email-label" placeholder="Etichetta (es: Lavoro)" required value="${Utils.escapeHtml(e.label)}">
        <button type="button" class="btn-remove-field" onclick="app.removeEmailField(this)">✕</button>
      `;
      emailsContainer.appendChild(row);
    });

    const phones = contact.phones && contact.phones.length
      ? contact.phones
      : [{ value: '', label: 'Principale' }];

    phones.forEach(p => {
      const row = document.createElement('div');
      row.className = 'multi-input-row';
      row.innerHTML = `
        <input type="tel" class="phone-value" placeholder="+39 123 456 789" required value="${Utils.escapeHtml(p.value)}">
        <input type="text" class="phone-label" placeholder="Etichetta (es: Ufficio)" required value="${Utils.escapeHtml(p.label)}">
        <button type="button" class="btn-remove-field" onclick="app.removePhoneField(this)">✕</button>
      `;
      phonesContainer.appendChild(row);
    });

    openModal('contactModal');
  },

  deleteContact(id) {
    if (!confirm('Sei sicuro di voler eliminare questo contatto?')) return;

    const result = ContactsModule.delete(id);
    if (!result.success) return;

    this.renderContacts(
      document.getElementById('contactFilter').value,
      document.getElementById('contactSearch').value
    );
    updateStats();
  },

  openContactModalForNew() {
    editingContactId = null;
    document.getElementById('contactModalTitle').textContent = 'Aggiungi Contatto';
    document.getElementById('contactForm').reset();

    const emailsContainer = document.getElementById('emailsContainer');
    const phonesContainer = document.getElementById('phonesContainer');
    emailsContainer.innerHTML = '';
    phonesContainer.innerHTML = '';

    // campo email di default
    const emailRow = document.createElement('div');
    emailRow.className = 'multi-input-row';
    emailRow.innerHTML = `
      <input type="email" class="email-value" placeholder="email@esempio.com" required>
      <input type="text" class="email-label" placeholder="Etichetta (es: Lavoro)" required>
      <button type="button" class="btn-remove-field" onclick="app.removeEmailField(this)">✕</button>
    `;
    emailsContainer.appendChild(emailRow);

    // campo telefono di default
    const phoneRow = document.createElement('div');
    phoneRow.className = 'multi-input-row';
    phoneRow.innerHTML = `
      <input type="tel" class="phone-value" placeholder="+39 123 456 789" required>
      <input type="text" class="phone-label" placeholder="Etichetta (es: Ufficio)" required>
      <button type="button" class="btn-remove-field" onclick="app.removePhoneField(this)">✕</button>
    `;
    phonesContainer.appendChild(phoneRow);

    openModal('contactModal');
  },

  closeContactModal() {
    closeModal('contactModal');
    editingContactId = null;
  }
};

// ==================== TASKS MANAGEMENT ====================
function renderTasks(filter = 'all') {
  const container = document.getElementById('tasksList');
  let filteredTasks = tasks;

  if (filter === 'active') {
    filteredTasks = tasks.filter(t => !t.completed);
  } else if (filter === 'completed') {
    filteredTasks = tasks.filter(t => t.completed);
  }

  if (filteredTasks.length === 0) {
    container.innerHTML = '<p>Nessun task trovato</p>';
    return;
  }

  container.innerHTML = filteredTasks.map(task => `
    <div class="task-item">
      <label>
        <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''} onchange="toggleTask(${task.id})">
        <span class="${task.completed ? 'task-completed' : ''}">${Utils.escapeHtml(task.title)}</span>
      </label>
      ${task.description ? `<p>${Utils.escapeHtml(task.description)}</p>` : ''}
      <div class="task-meta">
        <span class="badge badge-${Utils.escapeHtml(task.priority)}">${Utils.escapeHtml(task.priority)}</span>
        ${task.dueDate ? `<span>📅 ${new Date(task.dueDate).toLocaleDateString('it-IT')}</span>` : ''}
      </div>
      <div class="item-actions">
        <button class="btn btn-sm" onclick="editTask(${task.id})">✏️ Modifica</button>
        <button class="btn btn-sm btn-danger" onclick="deleteTask(${task.id})">🗑️ Elimina</button>
      </div>
    </div>
  `).join('');
}

function addTask(taskData) {
  const task = {
    id: Date.now(),
    ...taskData,
    completed: false,
    createdAt: new Date().toISOString()
  };
  tasks.push(task);
  saveTasks();
  renderTasks(document.getElementById('taskFilter').value);
}

function toggleTask(id) {
  const task = tasks.find(t => t.id === id);
  if (task) {
    task.completed = !task.completed;
    saveTasks();
    renderTasks(document.getElementById('taskFilter').value);
  }
}

function deleteTask(id) {
  if (confirm('Sei sicuro di voler eliminare questo task?')) {
    tasks = tasks.filter(t => t.id !== id);
    saveTasks();
    renderTasks(document.getElementById('taskFilter').value);
  }
}

let editingTaskId = null;

function editTask(id) {
  const task = tasks.find(t => t.id === id);
  if (task) {
    editingTaskId = id;
    document.getElementById('taskModalTitle').textContent = 'Modifica Task';
    document.getElementById('taskTitle').value = task.title;
    document.getElementById('taskDescription').value = task.description || '';
    document.getElementById('taskPriority').value = task.priority;
    document.getElementById('taskDueDate').value = task.dueDate || '';
    openModal('taskModal');
  }
}

function updateTask(id, taskData) {
  const index = tasks.findIndex(t => t.id === id);
  if (index !== -1) {
    tasks[index] = { ...tasks[index], ...taskData };
    saveTasks();
    renderTasks(document.getElementById('taskFilter').value);
  }
}

// ==================== NOTES MANAGEMENT ====================
let editingNoteId = null;

function renderNotes(filter = 'all') {
  const container = document.getElementById('notesList');
  let filteredNotes = notes;

  if (filter !== 'all') {
    filteredNotes = notes.filter(n => n.category === filter);
  }

  if (filteredNotes.length === 0) {
    container.innerHTML = '<p>Nessuna nota trovata</p>';
    return;
  }

  container.innerHTML = filteredNotes.map(note => `
    <div class="item-card">
      <h3>${Utils.escapeHtml(note.title)}</h3>
      <p>${Utils.escapeHtml(note.content.substring(0, 150))}${note.content.length > 150 ? '...' : ''}</p>
      <div class="item-meta">
        <span class="badge">${Utils.escapeHtml(note.category)}</span>
        ${note.urgent ? '<span class="badge urgent-badge">🚨 URGENTE</span>' : ''}
        <span>${new Date(note.createdAt).toLocaleDateString('it-IT')}</span>
      </div>
      <div class="item-actions">
        <button class="btn btn-sm" onclick="viewNote(${note.id})">👁️ Visualizza</button>
        <button class="btn btn-sm" onclick="editNote(${note.id})">✏️ Modifica</button>
        <button class="btn btn-sm btn-danger" onclick="deleteNote(${note.id})">🗑️ Elimina</button>
      </div>
    </div>
  `).join('');
}

function addNote(noteData) {
  const note = {
    id: Date.now(),
    ...noteData,
    createdAt: new Date().toISOString()
  };
  notes.push(note);
  saveNotes();
  renderNotes(document.getElementById('noteFilter').value);
}

function updateNote(id, noteData) {
  const index = notes.findIndex(n => n.id === id);
  if (index !== -1) {
    notes[index] = { 
      ...notes[index], 
      ...noteData,
      updatedAt: new Date().toISOString()
    };
    saveNotes();
    renderNotes(document.getElementById('noteFilter').value);
  }
}

let editingNoteId = null;

function editNote(id) {
  const note = notes.find(n => n.id === id);
  if (!note) {
    alert('Nota non trovata');
    return;
  }

  editingNoteId = id;
  document.getElementById('noteModalTitle').textContent = 'Modifica Nota';
  document.getElementById('noteTitle').value = note.title;
  document.getElementById('noteContent').value = note.content;
  document.getElementById('noteCategory').value = note.category;
  document.getElementById('noteUrgent').checked = note.urgent || false;
  openModal('noteModal');
}

function updateNote(id, noteData) {
  const index = notes.findIndex(n => n.id === id);
  if (index !== -1) {
    notes[index] = { 
      ...notes[index], 
      ...noteData,
      updatedAt: new Date().toISOString()
    };
    saveNotes();
    renderNotes(document.getElementById('noteFilter').value);
  }
}

function viewNote(id) {
  const note = notes.find(n => n.id === id);
  if (note) {
    alert(`${note.title}\n\n${note.content}`);
  }
}

function deleteNote(id) {
  if (confirm('Sei sicuro di voler eliminare questa nota?')) {
    notes = notes.filter(n => n.id !== id);
    saveNotes();
    renderNotes(document.getElementById('noteFilter').value);
  }
}

// ==================== DOCUMENTS MANAGEMENT ====================
function renderDocuments(filter = 'all') {
  const container = document.getElementById('documentsList');
  let filteredDocuments = documents;

  if (filter !== 'all') {
    filteredDocuments = documents.filter(d => d.category === filter);
  }

  if (filteredDocuments.length === 0) {
    container.innerHTML = '<p>Nessun documento trovato</p>';
    return;
  }

  container.innerHTML = filteredDocuments.map(doc => `
    <div class="item-card">
      <h4>📄 ${Utils.escapeHtml(doc.name)}</h4>
      ${doc.notes ? `<p>${Utils.escapeHtml(doc.notes)}</p>` : ''}
      <div class="item-meta">
        <span class="badge">${Utils.escapeHtml(doc.category)}</span>
        <span>${new Date(doc.createdAt).toLocaleDateString('it-IT')}</span>
      </div>
      <div class="item-actions">
        <button class="btn btn-sm btn-danger" onclick="deleteDocument(${doc.id})">🗑️ Elimina</button>
      </div>
    </div>
  `).join('');
}

function addDocument(documentData) {
  const doc = {
    id: Date.now(),
    ...documentData,
    createdAt: new Date().toISOString()
  };
  documents.push(doc);
  saveDocuments();
  renderDocuments(document.getElementById('documentFilter').value);
}

function deleteDocument(id) {
  if (confirm('Sei sicuro di voler eliminare questo documento?')) {
    documents = documents.filter(d => d.id !== id);
    saveDocuments();
    renderDocuments(document.getElementById('documentFilter').value);
  }
}

// ==================== MODAL MANAGEMENT ====================
function openModal(modalId) {
  document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.remove('active');
  
  // Reset states based on modal type
  if (modalId === 'contactModal') {
    editingContactId = null;
    document.getElementById('contactForm').reset();
    document.getElementById('contactModalTitle').textContent = 'Aggiungi Contatto';
  } else if (modalId === 'taskModal') {
    editingTaskId = null;
    document.getElementById('taskForm').reset();
    document.getElementById('taskModalTitle').textContent = 'Aggiungi Task';
  } else if (modalId === 'noteModal') {
    editingNoteId = null;
    document.getElementById('noteForm').reset();
    document.getElementById('noteModalTitle').textContent = 'Nuova Nota';
  }
}

// ==================== THEME MANAGEMENT ====================
function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  document.getElementById('themeToggle').textContent = newTheme === 'dark' ? '☀️' : '🌓';
}

function loadTheme() {
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  document.getElementById('themeToggle').textContent = savedTheme === 'dark' ? '☀️' : '🌓';
}

// ==================== EVENT LISTENERS ====================
document.addEventListener('DOMContentLoaded', () => {
  loadTheme();
  checkAuth();

  // Login form
  document.getElementById('loginForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    if (login(username, password)) {
      showDashboard();
    } else {
      const errorDiv = document.getElementById('loginError');
      errorDiv.textContent = 'Credenziali non valide';
      errorDiv.style.display = 'block';
    }
  });

  // Logout
  document.getElementById('logoutBtn').addEventListener('click', logout);

  // Theme toggle
  document.getElementById('themeToggle').addEventListener('click', toggleTheme);

  // Navigation
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      switchSection(item.dataset.section);
    });
  });

  // Contact management
  document.getElementById('addContactBtn').addEventListener('click', () => {
    app.openContactModalForNew();
  });

  document.getElementById('contactSearch').addEventListener('input', (e) => {
    const filter = document.getElementById('contactFilter').value;
    app.renderContacts(filter, e.target.value);
  });

  document.getElementById('contactFilter').addEventListener('change', (e) => {
    const search = document.getElementById('contactSearch').value;
    app.renderContacts(e.target.value, search);
  });

  document.getElementById('contactForm').addEventListener('submit', (e) => {
    e.preventDefault();
    app.saveContact();
  });

  // View toggle for contacts
  document.getElementById('gridViewBtn').addEventListener('click', () => {
    document.getElementById('gridViewBtn').classList.add('active');
    document.getElementById('listViewBtn').classList.remove('active');
    const container = document.getElementById('contactsList');
    container.classList.remove('items-list-view');
    container.classList.add('items-grid');
    const filter = document.getElementById('contactFilter').value;
    const search = document.getElementById('contactSearch').value;
    app.renderContacts(filter, search);
  });

  document.getElementById('listViewBtn').addEventListener('click', () => {
    document.getElementById('listViewBtn').classList.add('active');
    document.getElementById('gridViewBtn').classList.remove('active');
    const container = document.getElementById('contactsList');
    container.classList.remove('items-grid');
    container.classList.add('items-list-view');
    const filter = document.getElementById('contactFilter').value;
    const search = document.getElementById('contactSearch').value;
    app.renderContacts(filter, search);
  });

  // Task management
  document.getElementById('addTaskBtn').addEventListener('click', () => {
    openModal('taskModal');
  });

  document.getElementById('taskFilter').addEventListener('change', (e) => {
    renderTasks(e.target.value);
  });

  document.getElementById('taskForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const taskData = {
      title: document.getElementById('taskTitle').value,
      description: document.getElementById('taskDescription').value,
      priority: document.getElementById('taskPriority').value,
      dueDate: document.getElementById('taskDueDate').value
    };

    if (editingTaskId) {
      updateTask(editingTaskId, taskData);
      editingTaskId = null;
      document.getElementById('taskModalTitle').textContent = 'Aggiungi Task';
    } else {
      addTask(taskData);
    }

    closeModal('taskModal');
    document.getElementById('taskForm').reset();
  });

  // Note management
  document.getElementById('addNoteBtn').addEventListener('click', () => {
    editingNoteId = null;
    document.getElementById('noteModalTitle').textContent = 'Nuova Nota';
    document.getElementById('noteForm').reset();
    openModal('noteModal');
  });

  document.getElementById('noteFilter').addEventListener('change', (e) => {
    renderNotes(e.target.value);
  });

  document.getElementById('noteForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const noteData = {
      title: document.getElementById('noteTitle').value,
      content: document.getElementById('noteContent').value,
      category: document.getElementById('noteCategory').value,
      urgent: document.getElementById('noteUrgent').checked
    };

    if (editingNoteId) {
      updateNote(editingNoteId, noteData);
      editingNoteId = null;
      document.getElementById('noteModalTitle').textContent = 'Nuova Nota';
    } else {
      addNote(noteData);
    }

    closeModal('noteModal');
    document.getElementById('noteForm').reset();
  });

  // Document management
  document.getElementById('addDocumentBtn').addEventListener('click', () => {
    openModal('documentModal');
  });

  document.getElementById('documentFilter').addEventListener('change', (e) => {
    renderDocuments(e.target.value);
  });

  document.getElementById('documentForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const documentData = {
      name: document.getElementById('documentName').value,
      category: document.getElementById('documentCategory').value,
      notes: document.getElementById('documentNotes').value,
      fileName: document.getElementById('documentFile').files[0]?.name || 'N/A'
    };
    addDocument(documentData);
    closeModal('documentModal');
    document.getElementById('documentForm').reset();
  });

  // Modal close buttons
  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', () => {
      const modal = btn.closest('.modal');
      closeModal(modal.id);
    });
  });

  // Close modal on outside click
  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal(modal.id);
      }
    });
  });
});
