// Legacy root app.js moved here for archival.
// File moved here to avoid conflicts with the modern `js/app.js`.
// NOTE: This file should not be loaded by the application; it is kept for history.

// See js/app.js for current implementation.

/* Begin archived root app.js content */
// ==================== DATA MODELS ====================
// NOTE: Authentication is handled by AuthManager (see js/auth/auth.js)
// Keep local currentUser for compatibility with existing app functions
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
	// Tasks (use StorageManager with proper keys)
	const savedTasks = StorageManager.load(CONFIG.STORAGE_KEYS.TASKS, null);
	if (savedTasks) {
		tasks = savedTasks;
	} else {
		tasks = INITIAL_TASKS.map((task, index) => ({
			id: Utils.generateId(),
			...task,
			createdAt: new Date().toISOString(),
			createdBy: AuthManager.getCurrentUser()?.id || null,
			createdByUsername: AuthManager.getCurrentUser()?.username || 'system'
		}));
		StorageManager.save(CONFIG.STORAGE_KEYS.TASKS, tasks);
	}

	// Notes
	notes = StorageManager.load(CONFIG.STORAGE_KEYS.NOTES, []);

	// Documents
	documents = StorageManager.load(CONFIG.STORAGE_KEYS.DOCUMENTS, []);
}

function saveTasks() {
	StorageManager.save(CONFIG.STORAGE_KEYS.TASKS, tasks);
	updateStats();
}

function saveNotes() {
	StorageManager.save(CONFIG.STORAGE_KEYS.NOTES, notes);
	updateStats();
}

function saveDocuments() {
	StorageManager.save(CONFIG.STORAGE_KEYS.DOCUMENTS, documents);
	updateStats();
}

// ==================== AUTHENTICATION ====================
function login(username, password) {
	// Use centralized AuthManager for authentication
	const result = AuthManager.login(username, password);
	if (result.success) {
		currentUser = AuthManager.getCurrentUser();
		return true;
	}
	return false;
}

function logout() {
	// Use AuthManager for logout
	AuthManager.logout();
	currentUser = null;
	showLoginScreen();
}

function checkAuth() {
	// Use AuthManager for session state
	const user = AuthManager.getCurrentUser();
	if (user) {
		currentUser = user;
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
	// Ensure we have the current user from AuthManager
	currentUser = AuthManager.getCurrentUser();
	document.getElementById('userDisplay').textContent = currentUser ? currentUser.username : 'Unknown';
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

/* End archived root app.js content */

