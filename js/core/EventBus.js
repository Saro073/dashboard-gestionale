// ==================== EVENT BUS ====================
/**
 * EventBus - Sistema di comunicazione tra moduli basato su eventi
 * Permette comunicazione disaccoppiata tra componenti
 * 
 * Pattern: Observer/PubSub
 * 
 * Utilizzo:
 * EventBus.on('user:login', (userData) => { ... });
 * EventBus.emit('user:login', { username: 'admin' });
 * EventBus.off('user:login', handlerFunction);
 */

const EventBus = {
  /**
   * Registro degli eventi
   * Struttura: { eventName: [callback1, callback2, ...] }
   */
  events: {},

  /**
   * Registra un listener per un evento
   * @param {string} eventName - Nome dell'evento
   * @param {Function} callback - Funzione da eseguire quando l'evento viene emesso
   * @returns {Function} - Funzione per rimuovere il listener
   */
  on(eventName, callback) {
    if (!eventName || typeof callback !== 'function') {
      console.error('[EventBus] Invalid event registration:', eventName);
      return () => {};
    }

    // Inizializza array se non esiste
    if (!this.events[eventName]) {
      this.events[eventName] = [];
    }

    // Aggiungi callback
    this.events[eventName].push(callback);

    // Ritorna funzione per unsubscribe
    return () => this.off(eventName, callback);
  },

  /**
   * Rimuove un listener da un evento
   * @param {string} eventName - Nome dell'evento
   * @param {Function} callback - Funzione da rimuovere
   */
  off(eventName, callback) {
    if (!this.events[eventName]) {
      return;
    }

    if (!callback) {
      // Rimuovi tutti i listener per questo evento
      delete this.events[eventName];
      return;
    }

    // Rimuovi callback specifico
    this.events[eventName] = this.events[eventName].filter(cb => cb !== callback);

    // Pulisci array vuoto
    if (this.events[eventName].length === 0) {
      delete this.events[eventName];
    }
  },

  /**
   * Emette un evento e chiama tutti i listener registrati
   * @param {string} eventName - Nome dell'evento
   * @param {*} data - Dati da passare ai listener
   */
  emit(eventName, data) {
    if (!this.events[eventName]) {
      return;
    }

    // Esegui tutti i callback registrati
    this.events[eventName].forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`[EventBus] Error in event "${eventName}":`, error);
      }
    });
  },

  /**
   * Registra un listener che si rimuove automaticamente dopo la prima esecuzione
   * @param {string} eventName - Nome dell'evento
   * @param {Function} callback - Funzione da eseguire una sola volta
   */
  once(eventName, callback) {
    const onceCallback = (data) => {
      callback(data);
      this.off(eventName, onceCallback);
    };
    this.on(eventName, onceCallback);
  },

  /**
   * Rimuove tutti i listener di tutti gli eventi
   */
  clear() {
    this.events = {};
  },

  /**
   * Ottiene la lista di tutti gli eventi registrati
   * @returns {string[]} - Array con i nomi degli eventi
   */
  getEventNames() {
    return Object.keys(this.events);
  },

  /**
   * Ottiene il numero di listener per un evento
   * @param {string} eventName - Nome dell'evento
   * @returns {number} - Numero di listener
   */
  getListenerCount(eventName) {
    return this.events[eventName] ? this.events[eventName].length : 0;
  }
};

// ==================== EVENTI PREDEFINITI ====================
/**
 * Lista eventi standard dell'applicazione
 * Utilizzare queste costanti per evitare typo
 */
const EVENTS = {
  // Autenticazione
  USER_LOGIN: 'user:login',
  USER_LOGOUT: 'user:logout',
  AUTH_CHANGE: 'auth:change',

  // Gestione Utenti
  USER_CREATED: 'user:created',
  USER_UPDATED: 'user:updated',
  USER_DELETED: 'user:deleted',

  // Contatti
  CONTACT_CREATED: 'contact:created',
  CONTACT_UPDATED: 'contact:updated',
  CONTACT_DELETED: 'contact:deleted',
  CONTACTS_LOADED: 'contacts:loaded',

  // Categorie Contatti
  CATEGORY_CREATED: 'category:created',
  CATEGORY_DELETED: 'category:deleted',

  // Task
  TASK_CREATED: 'task:created',
  TASK_UPDATED: 'task:updated',
  TASK_DELETED: 'task:deleted',
  TASK_COMPLETED: 'task:completed',
  TASKS_LOADED: 'tasks:loaded',
  TASKS_IMPORTED: 'tasks:imported',

  // Note
  NOTE_CREATED: 'note:created',
  NOTE_UPDATED: 'note:updated',
  NOTE_DELETED: 'note:deleted',
  NOTES_LOADED: 'notes:loaded',

  // Documenti
  DOCUMENT_UPLOADED: 'document:uploaded',
  DOCUMENT_DELETED: 'document:deleted',
  DOCUMENTS_LOADED: 'documents:loaded',

  // Prenotazioni
  BOOKING_CREATED: 'booking:created',
  BOOKING_UPDATED: 'booking:updated',
  BOOKING_DELETED: 'booking:deleted',
  BOOKINGS_LOADED: 'bookings:loaded',

  // Transazioni
  TRANSACTION_CREATED: 'transaction:created',
  TRANSACTION_UPDATED: 'transaction:updated',
  TRANSACTION_DELETED: 'transaction:deleted',
  TRANSACTIONS_LOADED: 'transactions:loaded',

  // UI
  SECTION_CHANGED: 'ui:section-changed',
  THEME_CHANGED: 'ui:theme-changed',
  MODAL_OPENED: 'ui:modal-opened',
  MODAL_CLOSED: 'ui:modal-closed',

  // Notifiche
  NOTIFICATION_SHOW: 'notification:show',
  NOTIFICATION_HIDE: 'notification:hide',

  // Sistema
  DATA_SAVED: 'system:data-saved',
  DATA_LOADED: 'system:data-loaded',
  ERROR: 'system:error'
};

// Congela l'oggetto per renderlo immutabile
Object.freeze(EVENTS);
