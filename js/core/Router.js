// ==================== ROUTER ====================
/**
 * Router - Gestione navigazione tra sezioni
 * Gestisce cambio sezione con supporto per history API e hash routing
 * 
 * Pattern: Front Controller
 * 
 * Utilizzo:
 * Router.init();
 * Router.navigate('contacts');
 * Router.getCurrentSection(); // 'contacts'
 */

const Router = {
  /**
   * Sezione corrente
   */
  currentSection: 'overview',

  /**
   * Sezioni disponibili
   */
  sections: ['overview', 'contacts', 'tasks', 'notes', 'documents', 'bookings', 'activityLog', 'users'],

  /**
   * Callback da eseguire al cambio di sezione
   */
  onSectionChange: null,

  /**
   * Inizializza il router
   */
  init() {
    // Leggi sezione da URL hash
    this.currentSection = this.getSectionFromHash() || 'overview';

    // Ascolta cambiamenti URL
    window.addEventListener('hashchange', () => {
      this.handleHashChange();
    });

    // Carica sezione iniziale
    this.navigate(this.currentSection, false);
  },

  /**
   * Ottiene la sezione dall'hash URL
   * @returns {string|null} - Nome sezione o null
   */
  getSectionFromHash() {
    const hash = window.location.hash.slice(1); // Rimuove #
    return this.sections.includes(hash) ? hash : null;
  },

  /**
   * Gestisce cambio hash
   */
  handleHashChange() {
    const section = this.getSectionFromHash();
    if (section && section !== this.currentSection) {
      this.navigate(section, false); // false = non aggiornare hash (già fatto)
    }
  },

  /**
   * Naviga a una sezione
   * @param {string} section - Nome della sezione
   * @param {boolean} updateHash - Se aggiornare l'URL hash (default: true)
   */
  navigate(section, updateHash = true) {
    // Validazione
    if (!this.sections.includes(section)) {
      console.error(`[Router] Invalid section: ${section}`);
      return;
    }

    // Salva sezione precedente
    const previousSection = this.currentSection;

    // Aggiorna sezione corrente
    this.currentSection = section;

    // Aggiorna URL hash
    if (updateHash) {
      window.location.hash = section;
    }

    // Aggiorna UI
    this.updateUI(section, previousSection);

    // Emetti evento
    EventBus.emit(EVENTS.SECTION_CHANGED, {
      section,
      previousSection
    });

    // Callback personalizzato
    if (typeof this.onSectionChange === 'function') {
      this.onSectionChange(section, previousSection);
    }
  },

  /**
   * Aggiorna l'interfaccia utente
   * @param {string} section - Sezione da mostrare
   * @param {string} previousSection - Sezione precedente
   */
  updateUI(section, previousSection) {
    // Aggiorna navigation items
    document.querySelectorAll('.nav-item').forEach(item => {
      if (item.dataset.section === section) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // Aggiorna content sections
    document.querySelectorAll('.content-section').forEach(contentSection => {
      contentSection.classList.remove('active');
    });

    const targetSection = document.getElementById(`${section}Section`);
    if (targetSection) {
      targetSection.classList.add('active');
    }

    // Aggiorna titolo
    const titles = {
      overview: 'Overview',
      contacts: 'Contatti',
      tasks: 'Task',
      notes: 'Note',
      documents: 'Documenti',
      bookings: 'Prenotazioni',
      activityLog: 'Registro Attività',
      users: 'Gestione Utenti'
    };

    const titleElement = document.getElementById('sectionTitle');
    if (titleElement) {
      titleElement.textContent = titles[section] || section;
    }
  },

  /**
   * Ottiene la sezione corrente
   * @returns {string} - Nome sezione corrente
   */
  getCurrentSection() {
    return this.currentSection;
  },

  /**
   * Naviga alla sezione precedente nella history
   */
  back() {
    window.history.back();
  },

  /**
   * Naviga alla sezione successiva nella history
   */
  forward() {
    window.history.forward();
  },

  /**
   * Registra una callback per il cambio di sezione
   * @param {Function} callback - Funzione(newSection, oldSection)
   */
  onNavigate(callback) {
    if (typeof callback === 'function') {
      this.onSectionChange = callback;
    }
  },

  /**
   * Verifica se una sezione esiste
   * @param {string} section - Nome sezione
   * @returns {boolean}
   */
  hasSection(section) {
    return this.sections.includes(section);
  },

  /**
   * Aggiunge una nuova sezione al router
   * @param {string} section - Nome sezione
   */
  addSection(section) {
    if (!this.sections.includes(section)) {
      this.sections.push(section);
    }
  },

  /**
   * Rimuove una sezione dal router
   * @param {string} section - Nome sezione
   */
  removeSection(section) {
    const index = this.sections.indexOf(section);
    if (index > -1) {
      this.sections.splice(index, 1);
    }
  }
};