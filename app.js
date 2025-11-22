// ==================== DATA MODELS ====================
const users = [
  { username: 'admin', password: 'admin123', role: 'admin' }
];

let currentUser = null;
let contacts = [];
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
  contacts = JSON.parse(localStorage.getItem('contacts') || '[]');
  
  // Load tasks with initial data if empty
  const savedTasks = localStorage.getItem('tasks');
  if (savedTasks) {
    tasks = JSON.parse(savedTasks);
  } else {
    // First time load: populate with initial tasks
    tasks = INITIAL_TASKS.map((task, index) => ({
      id: Date.now() + index,
      ...task,
      createdAt: new Date().toISOString()
    }));
    saveTasks();
  }
  
  notes = JSON.parse(localStorage.getItem('notes') || '[]');
  documents = JSON.parse(localStorage.getItem('documents') || '[]');
}

function saveContacts() {
  localStorage.setItem('contacts', JSON.stringify(contacts));
  updateStats();
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
  renderContacts();
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
    documents: 'Documenti'
  };
  document.getElementById('sectionTitle').textContent = titles[sectionName];
}

// ==================== STATISTICS ====================
function updateStats() {
  document.getElementById('contactsCount').textContent = contacts.length;
  document.getElementById('tasksCount').textContent = tasks.filter(t => !t.completed).length;
  document.getElementById('notesCount').textContent = notes.length;
  document.getElementById('documentsCount').textContent = documents.length;
}

// ==================== CONTACTS MANAGEMENT ====================
let editingContactId = null;

function renderContacts(filter = 'all', searchTerm = '') {
  const container = document.getElementById('contactsList');
  let filteredContacts = contacts;

  if (filter !== 'all') {
    filteredContacts = filteredContacts.filter(c => c.category === filter);
  }

  if (searchTerm) {
    filteredContacts = filteredContacts.filter(c =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.company && c.company.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }

  if (filteredContacts.length === 0) {
    container.innerHTML = '<p class="empty-state">Nessun contatto trovato</p>';
    return;
  }

  container.innerHTML = filteredContacts.map(contact => `
    <div class="item-card">
      <h3>${contact.name}</h3>
      ${contact.email ? `<p>📧 ${contact.email}</p>` : ''}
      ${contact.phone ? `<p>📞 ${contact.phone}</p>` : ''}
      ${contact.company ? `<p>🏢 ${contact.company}</p>` : ''}
      <div class="item-meta">
        <span class="item-badge badge-${contact.category}">${contact.category}</span>
      </div>
      <div class="item-actions">
        <button class="btn btn-sm btn-secondary" onclick="editContact(${contact.id})">Modifica</button>
        <button class="btn btn-sm btn-danger" onclick="deleteContact(${contact.id})">Elimina</button>
      </div>
    </div>
  `).join('');
}

function addContact(contactData) {
  const contact = {
    id: Date.now(),
    ...contactData,
    createdAt: new Date().toISOString()
  };
  contacts.push(contact);
  saveContacts();
  renderContacts();
}

function updateContact(id, contactData) {
  const index = contacts.findIndex(c => c.id === id);
  if (index !== -1) {
    contacts[index] = { ...contacts[index], ...contactData };
    saveContacts();
    renderContacts();
  }
}

function editContact(id) {
  const contact = contacts.find(c => c.id === id);
  if (contact) {
    editingContactId = id;
    document.getElementById('contactModalTitle').textContent = 'Modifica Contatto';
    document.getElementById('contactName').value = contact.name;
    document.getElementById('contactEmail').value = contact.email || '';
    document.getElementById('contactPhone').value = contact.phone || '';
    document.getElementById('contactCompany').value = contact.company || '';
    document.getElementById('contactCategory').value = contact.category;
    openModal('contactModal');
  }
}

function deleteContact(id) {
  if (confirm('Sei sicuro di voler eliminare questo contatto?')) {
    contacts = contacts.filter(c => c.id !== id);
    saveContacts();
    renderContacts();
  }
}

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
    container.innerHTML = '<p class="empty-state">Nessun task trovato</p>';
    return;
  }

  container.innerHTML = filteredTasks.map(task => `
    <div class="task-item ${task.completed ? 'completed' : ''}">
      <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''} 
             onchange="toggleTask(${task.id})">
      <div class="task-content">
        <h4>${task.title}</h4>
        ${task.description ? `<p>${task.description}</p>` : ''}
        <div class="item-meta">
          <span class="item-badge badge-${task.priority}">${task.priority}</span>
          ${task.dueDate ? `<span>📅 ${new Date(task.dueDate).toLocaleDateString('it-IT')}</span>` : ''}
        </div>
      </div>
      <div class="item-actions">
        <button class="btn btn-sm btn-danger" onclick="deleteTask(${task.id})">Elimina</button>
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
  renderTasks();
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
    renderTasks();
  }
}

// ==================== NOTES MANAGEMENT ====================
function renderNotes(filter = 'all') {
  const container = document.getElementById('notesList');
  let filteredNotes = notes;

  if (filter !== 'all') {
    filteredNotes = notes.filter(n => n.category === filter);
  }

  if (filteredNotes.length === 0) {
    container.innerHTML = '<p class="empty-state">Nessuna nota trovata</p>';
    return;
  }

  container.innerHTML = filteredNotes.map(note => `
    <div class="item-card">
      <h3>${note.title}</h3>
      <p>${note.content.substring(0, 150)}${note.content.length > 150 ? '...' : ''}</p>
      <div class="item-meta">
        <span class="item-badge badge-${note.category}">${note.category}</span>
        <span class="activity-time">${new Date(note.createdAt).toLocaleDateString('it-IT')}</span>
      </div>
      <div class="item-actions">
        <button class="btn btn-sm btn-secondary" onclick="viewNote(${note.id})">Visualizza</button>
        <button class="btn btn-sm btn-danger" onclick="deleteNote(${note.id})">Elimina</button>
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
  renderNotes();
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
    renderNotes();
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
    container.innerHTML = '<p class="empty-state">Nessun documento trovato</p>';
    return;
  }

  container.innerHTML = filteredDocuments.map(doc => `
    <div class="task-item">
      <div class="task-content flex-1">
        <h4>📄 ${doc.name}</h4>
        ${doc.notes ? `<p>${doc.notes}</p>` : ''}
        <div class="item-meta">
          <span class="item-badge badge-${doc.category}">${doc.category}</span>
          <span class="activity-time">${new Date(doc.createdAt).toLocaleDateString('it-IT')}</span>
        </div>
      </div>
      <div class="item-actions">
        <button class="btn btn-sm btn-danger" onclick="deleteDocument(${doc.id})">Elimina</button>
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
  renderDocuments();
}

function deleteDocument(id) {
  if (confirm('Sei sicuro di voler eliminare questo documento?')) {
    documents = documents.filter(d => d.id !== id);
    saveDocuments();
    renderDocuments();
  }
}

// ==================== MODAL MANAGEMENT ====================
function openModal(modalId) {
  document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.remove('active');
  if (modalId === 'contactModal') {
    editingContactId = null;
    document.getElementById('contactForm').reset();
    document.getElementById('contactModalTitle').textContent = 'Aggiungi Contatto';
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
    editingContactId = null;
    document.getElementById('contactModalTitle').textContent = 'Aggiungi Contatto';
    openModal('contactModal');
  });

  document.getElementById('contactSearch').addEventListener('input', (e) => {
    const filter = document.getElementById('contactFilter').value;
    renderContacts(filter, e.target.value);
  });

  document.getElementById('contactFilter').addEventListener('change', (e) => {
    const search = document.getElementById('contactSearch').value;
    renderContacts(e.target.value, search);
  });

  document.getElementById('contactForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const contactData = {
      name: document.getElementById('contactName').value,
      email: document.getElementById('contactEmail').value,
      phone: document.getElementById('contactPhone').value,
      company: document.getElementById('contactCompany').value,
      category: document.getElementById('contactCategory').value
    };

    if (editingContactId) {
      updateContact(editingContactId, contactData);
    } else {
      addContact(contactData);
    }

    closeModal('contactModal');
    document.getElementById('contactForm').reset();
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
    addTask(taskData);
    closeModal('taskModal');
    document.getElementById('taskForm').reset();
  });

  // Note management
  document.getElementById('addNoteBtn').addEventListener('click', () => {
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
      category: document.getElementById('noteCategory').value
    };
    addNote(noteData);
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