// ==================== CATEGORY MANAGER MODULE ====================
const CategoryManager = {
  /**
   * Ottiene tutte le categorie di contatto
   * @returns {Array<string>} - Array di nomi categorie
   */
  getAll() {
    return StorageManager.load(CONFIG.STORAGE_KEYS.CONTACT_CATEGORIES, []);
  },

  /**
   * Aggiunge una nuova categoria (se non esiste già)
   * @param {string} categoryName - Nome categoria
   * @returns {object} - { success: boolean, message: string, category: string|null }
   */
  add(categoryName) {
    if (!categoryName || typeof categoryName !== 'string') {
      return { success: false, message: 'Nome categoria non valido', category: null };
    }

    const trimmed = categoryName.trim();
    if (trimmed.length === 0) {
      return { success: false, message: 'Nome categoria vuoto', category: null };
    }

    const categories = this.getAll();
    const normalized = trimmed.toLowerCase();

    // Verifica duplicati (case-insensitive)
    if (categories.some(cat => cat.toLowerCase() === normalized)) {
      return { success: true, message: 'Categoria già esistente', category: trimmed };
    }

    categories.push(trimmed);
    categories.sort((a, b) => a.localeCompare(b, 'it', { sensitivity: 'base' }));
    StorageManager.save(CONFIG.STORAGE_KEYS.CONTACT_CATEGORIES, categories);

    NotificationService.success(`Categoria "${trimmed}" aggiunta`);
    EventBus.emit(EVENTS.CATEGORY_CREATED, { category: trimmed });
    
    return { success: true, message: 'Categoria aggiunta', category: trimmed };
  },

  /**
   * Rimuove una categoria
   * @param {string} categoryName - Nome categoria da rimuovere
   * @returns {object} - { success: boolean, message: string }
   */
  remove(categoryName) {
    const categories = this.getAll();
    const index = categories.findIndex(cat => cat.toLowerCase() === categoryName.toLowerCase());

    if (index === -1) {
      return { success: false, message: 'Categoria non trovata' };
    }

    categories.splice(index, 1);
    StorageManager.save(CONFIG.STORAGE_KEYS.CONTACT_CATEGORIES, categories);

    NotificationService.success(`Categoria "${categoryName}" rimossa`);
    EventBus.emit(EVENTS.CATEGORY_DELETED, { category: categoryName });

    return { success: true, message: 'Categoria rimossa' };
  },

  /**
   * Migra categorie esistenti dai contatti
   * Esegue l'estrazione di tutte le categorie uniche presenti nei contatti
   * e le aggiunge al CategoryManager
   * @returns {object} - { success: boolean, categoriesFound: number, categoriesAdded: number }
   */
  migrateFromContacts() {
    const contacts = ContactsModule.getAll();
    const existingCategories = this.getAll();
    const categorySet = new Set(existingCategories.map(c => c.toLowerCase()));

    let categoriesFound = 0;
    let categoriesAdded = 0;

    contacts.forEach(contact => {
      if (contact.category && typeof contact.category === 'string') {
        const trimmed = contact.category.trim();
        const normalized = trimmed.toLowerCase();
        
        if (trimmed.length > 0 && !categorySet.has(normalized)) {
          categorySet.add(normalized);
          existingCategories.push(trimmed);
          categoriesAdded++;
        }
        categoriesFound++;
      }
    });

    if (categoriesAdded > 0) {
      existingCategories.sort((a, b) => a.localeCompare(b, 'it', { sensitivity: 'base' }));
      StorageManager.save(CONFIG.STORAGE_KEYS.CONTACT_CATEGORIES, existingCategories);
    }

    return { success: true, categoriesFound, categoriesAdded };
  },

  /**
   * Inizializza le categorie di default se non esistono
   * @returns {object} - { success: boolean, initialized: boolean }
   */
  initializeDefaults() {
    const categories = this.getAll();
    
    if (categories.length === 0) {
      const defaults = ['Proprietario', 'Cliente', 'Fornitore', 'Partner'];
      StorageManager.save(CONFIG.STORAGE_KEYS.CONTACT_CATEGORIES, defaults);
      return { success: true, initialized: true };
    }

    return { success: true, initialized: false };
  },

  /**
   * Verifica se una categoria esiste (case-insensitive)
   * @param {string} categoryName - Nome categoria
   * @returns {boolean}
   */
  exists(categoryName) {
    if (!categoryName) return false;
    const categories = this.getAll();
    const normalized = categoryName.toLowerCase();
    return categories.some(cat => cat.toLowerCase() === normalized);
  },

  /**
   * Conta quanti contatti utilizzano una specifica categoria
   * @param {string} categoryName - Nome categoria
   * @returns {number} - Numero di contatti che usano questa categoria
   */
  getUsageCount(categoryName) {
    if (!categoryName) return 0;
    const contacts = ContactsModule.getAll();
    const normalized = categoryName.toLowerCase();
    
    return contacts.filter(contact => 
      contact.category && contact.category.toLowerCase() === normalized
    ).length;
  },

  /**
   * Ottiene statistiche di utilizzo per tutte le categorie
   * @returns {Array<{name: string, count: number, canDelete: boolean}>}
   */
  getAllWithUsage() {
    const categories = this.getAll();
    
    return categories.map(categoryName => {
      const count = this.getUsageCount(categoryName);
      return {
        name: categoryName,
        count: count,
        canDelete: count === 0
      };
    });
  }
};
