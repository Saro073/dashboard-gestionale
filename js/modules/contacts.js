// ==================== CONTACTS MODULE ====================

const ContactsModule = {
  
  /**
   * Ottiene tutti i contatti
   * @returns {Array} - Array di contatti
   */
  getAll() {
    return StorageManager.load(CONFIG.STORAGE_KEYS.CONTACTS, []);
  },
  
  /**
   * Ottiene contatto per ID
   * @param {number} id - ID contatto
   * @returns {object|null} - Contatto o null
   */
  getById(id) {
    const contacts = this.getAll();
    return contacts.find(c => c.id === id) || null;
  },
  
  /**
   * Crea nuovo contatto
   * @param {object} contactData - Dati contatto
   * @returns {object} - { success: boolean, contact: object|null, message: string }
   */
  create(contactData) {
    const currentUser = AuthManager.getCurrentUser();
    
    if (!currentUser) {
      return { success: false, contact: null, message: 'Non autenticato' };
    }
    
    // Validazione
    if (!contactData.name || contactData.name.trim() === '') {
      return { success: false, contact: null, message: 'Nome richiesto' };
    }
    
    if (contactData.email && !Utils.validateEmail(contactData.email)) {
      return { success: false, contact: null, message: 'Email non valida' };
    }
    
    // Crea contatto
    const contact = {
      id: Utils.generateId(),
      name: contactData.name.trim(),
      email: contactData.email?.trim() || '',
      phone: contactData.phone?.trim() || '',
      company: contactData.company?.trim() || '',
      category: contactData.category || CONFIG.CONTACT_CATEGORIES.CLIENTE,
      notes: contactData.notes?.trim() || '',
      createdBy: currentUser.id,
      createdByUsername: currentUser.username,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Salva
    const contacts = this.getAll();
    contacts.push(contact);
    StorageManager.save(CONFIG.STORAGE_KEYS.CONTACTS, contacts);
    
    // Log attività
    ActivityLog.log(CONFIG.ACTION_TYPES.CREATE, CONFIG.ENTITY_TYPES.CONTACT, contact.id, {
      name: contact.name,
      category: contact.category
    });
    
    return { success: true, contact, message: 'Contatto creato' };
  },
  
  /**
   * Aggiorna contatto
   * @param {number} id - ID contatto
   * @param {object} updates - Dati da aggiornare
   * @returns {object} - { success: boolean, contact: object|null, message: string }
   */
  update(id, updates) {
    const contacts = this.getAll();
    const index = contacts.findIndex(c => c.id === id);
    
    if (index === -1) {
      return { success: false, contact: null, message: 'Contatto non trovato' };
    }
    
    const contact = contacts[index];
    
    // Verifica permessi
    if (!PermissionsManager.canEditContact(contact)) {
      return { success: false, contact: null, message: 'Non autorizzato' };
    }
    
    // Validazione
    if (updates.name !== undefined && updates.name.trim() === '') {
      return { success: false, contact: null, message: 'Nome richiesto' };
    }
    
    if (updates.email && !Utils.validateEmail(updates.email)) {
      return { success: false, contact: null, message: 'Email non valida' };
    }
    
    // Aggiorna
    const currentUser = AuthManager.getCurrentUser();
    contacts[index] = {
      ...contact,
      ...updates,
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser.id,
      updatedByUsername: currentUser.username
    };
    
    StorageManager.save(CONFIG.STORAGE_KEYS.CONTACTS, contacts);
    
    // Log attività
    ActivityLog.log(CONFIG.ACTION_TYPES.UPDATE, CONFIG.ENTITY_TYPES.CONTACT, id, {
      name: contacts[index].name
    });
    
    return { success: true, contact: contacts[index], message: 'Contatto aggiornato' };
  },
  
  /**
   * Elimina contatto
   * @param {number} id - ID contatto
   * @returns {object} - { success: boolean, message: string }
   */
  delete(id) {
    const contacts = this.getAll();
    const contact = contacts.find(c => c.id === id);
    
    if (!contact) {
      return { success: false, message: 'Contatto non trovato' };
    }
    
    // Verifica permessi
    if (!PermissionsManager.canDeleteContact(contact)) {
      return { success: false, message: 'Non autorizzato' };
    }
    
    const filtered = contacts.filter(c => c.id !== id);
    StorageManager.save(CONFIG.STORAGE_KEYS.CONTACTS, filtered);
    
    // Log attività
    ActivityLog.log(CONFIG.ACTION_TYPES.DELETE, CONFIG.ENTITY_TYPES.CONTACT, id, {
      name: contact.name
    });
    
    return { success: true, message: 'Contatto eliminato' };
  },
  
  /**
   * Filtra contatti per categoria
   * @param {string} category - Categoria
   * @returns {Array} - Array filtrato
   */
  filterByCategory(category) {
    if (category === 'all') return this.getAll();
    const contacts = this.getAll();
    return contacts.filter(c => c.category === category);
  },
  
  /**
   * Cerca contatti
   * @param {string} searchTerm - Termine di ricerca
   * @returns {Array} - Array filtrato
   */
  search(searchTerm) {
    const contacts = this.getAll();
    return Utils.filterBySearch(contacts, searchTerm, ['name', 'email', 'phone', 'company', 'notes']);
  },
  
  /**
   * Statistiche contatti
   * @returns {object} - Statistiche
   */
  getStats() {
    const contacts = this.getAll();
    
    return {
      total: contacts.length,
      byCategory: {
        proprietario: contacts.filter(c => c.category === CONFIG.CONTACT_CATEGORIES.PROPRIETARIO).length,
        cliente: contacts.filter(c => c.category === CONFIG.CONTACT_CATEGORIES.CLIENTE).length,
        fornitore: contacts.filter(c => c.category === CONFIG.CONTACT_CATEGORIES.FORNITORE).length,
        partner: contacts.filter(c => c.category === CONFIG.CONTACT_CATEGORIES.PARTNER).length
      },
      withEmail: contacts.filter(c => c.email).length,
      withPhone: contacts.filter(c => c.phone).length
    };
  }
};
