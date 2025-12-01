// ==================== CONFIGURAZIONE GLOBALE ====================

const CONFIG = {
  // Versione applicazione
  APP_VERSION: '2.1.0',
  APP_NAME: 'Dashboard Gestionale Ferienwohnung',
  
  // Storage keys
  STORAGE_KEYS: {
    USERS: 'dashboard_users',
    CURRENT_USER: 'dashboard_current_user',
    CONTACTS: 'dashboard_contacts',
    TASKS: 'dashboard_tasks',
    NOTES: 'dashboard_notes',
    DOCUMENTS: 'dashboard_documents',
    ACTIVITY_LOG: 'dashboard_activity_log',
    THEME: 'dashboard_theme',
    BOOKINGS: 'dashboard_bookings'
  },  
  // Ruoli utente
  ROLES: {
    ADMIN: 'admin',
    SUPERVISOR: 'supervisor',
    USER: 'user'
  },
  
  // Permessi per ruolo
  PERMISSIONS: {
    admin: {
      canCreateUsers: true,
      canDeleteUsers: true,
      canEditUsers: true,
      canViewAllData: true,
      canEditAllData: true,
      canDeleteAllData: true,
      canExportData: true,
      canViewLogs: true,
      canManageSettings: true
    },
    supervisor: {
      canCreateUsers: false,
      canDeleteUsers: false,
      canEditUsers: false,
      canViewAllData: true,
      canEditAllData: true,
      canDeleteAllData: false,
      canExportData: true,
      canViewLogs: false,
      canManageSettings: false
    },
    user: {
      canCreateUsers: false,
      canDeleteUsers: false,
      canEditUsers: false,
      canViewAllData: false,
      canEditAllData: false,
      canDeleteAllData: false,
      canExportData: false,
      canViewLogs: false,
      canManageSettings: false
    }
  },
  
  // Categorie contatti
  CONTACT_CATEGORIES: {
    PROPRIETARIO: 'proprietario',
    CLIENTE: 'cliente',
    FORNITORE: 'fornitore',
    PARTNER: 'partner'
  },
  
  // Priorità task
  TASK_PRIORITIES: {
    BASSA: 'bassa',
    MEDIA: 'media',
    ALTA: 'alta',
    CRITICAL: 'critical'
  },
  
  // Categorie note
  NOTE_CATEGORIES: {
    LAVORO: 'lavoro',
    PERSONALE: 'personale',
    IDEE: 'idee',
    GENERALE: 'generale'
  },
  
  // Categorie documenti
  DOCUMENT_CATEGORIES: {
    CONTRATTI: 'contratti',
    FATTURE: 'fatture',
    REPORTS: 'reports',
    ALTRO: 'altro'
  },
  
  // Tipi di azione per activity log
  ACTION_TYPES: {
    LOGIN: 'login',
    LOGOUT: 'logout',
    CREATE: 'create',
    UPDATE: 'update',
    DELETE: 'delete',
    VIEW: 'view',
    DOWNLOAD: 'download',
    UPLOAD: 'upload'
  },
  
  // Entità per activity log
  ENTITY_TYPES: {
    USER: 'user',
    CONTACT: 'contact',
    TASK: 'task',
    NOTE: 'note',
    DOCUMENT: 'document',
    BOOKING: 'booking'
  },  
  // Impostazioni UI
  UI: {
    ITEMS_PER_PAGE: 20,
    MAX_RECENT_ACTIVITIES: 10,
    TOAST_DURATION: 3000,
    MODAL_ANIMATION_DURATION: 300
  },
  
  // Validazione
  VALIDATION: {
    MIN_PASSWORD_LENGTH: 6,
    MAX_PASSWORD_LENGTH: 50,
    MIN_USERNAME_LENGTH: 3,
    MAX_USERNAME_LENGTH: 30,
    EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },
  
  // Formattazione date
  DATE_FORMAT: {
    LOCALE: 'it-IT',
    OPTIONS: {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    },
    DATETIME_OPTIONS: {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }
  },

  // Stato prenotazioni
  BOOKING_STATUSES: {
    CONFIRMED: 'confirmed',
    PENDING: 'pending',
    CANCELLED: 'cancelled',
    BLOCKED: 'blocked'
  },

  // Canali prenotazione
  BOOKING_CHANNELS: {
    DIRECT: 'direct',
    BOOKING_COM: 'booking.com',
    AIRBNB: 'airbnb',
    VRBO: 'vrbo',
    OTHER: 'other'
  }
};

// Esporta configurazione come costante immutabile
Object.freeze(CONFIG);