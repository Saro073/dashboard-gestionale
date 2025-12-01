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
   * Migra vecchi contatti con email/phone singoli ad array
   * Eseguita automaticamente al primo caricamento
   * @returns {object} - { success: boolean, migratedCount: number }
   */
  migrateOldContacts() {
    const contacts = this.getAll();
    let migratedCount = 0;

    contacts.forEach(contact => {
      let migrated = false;

      // Se ha ancora email singola, converti in array
      if (contact.email !== undefined && !contact.emails) {
        contact.emails = contact.email
          ? [{ value: contact.email, label: 'Principale' }]
          : [];
        delete contact.email;
        migrated = true;
      }

      // Se ha ancora phone singolo, converti in array
      if (contact.phone !== undefined && !contact.phones) {
        contact.phones = contact.phone
          ? [{ value: contact.phone, label: 'Principale' }]
          : [];
        delete contact.phone;
        migrated = true;
      }

      // Assicurati che esistano gli array anche se vuoti
      if (!contact.emails) contact.emails = [];
      if (!contact.phones) contact.phones = [];

      if (migrated) migratedCount++;
    });

    if (migratedCount > 0) {
      StorageManager.save(CONFIG.STORAGE_KEYS.CONTACTS, contacts);
    }

    return { success: true, migratedCount };
  },

  /**
   * Validazione array emails
   * @param {Array} emails - Array di oggetti {value, label}
   * @returns {object} - { valid: boolean, message: string }
   */
  validateEmails(emails) {
    if (!Array.isArray(emails)) {
      return { valid: false, message: 'Formato emails non valido' };
    }

    if (emails.length === 0) {
      return { valid: false, message: 'Almeno un\'email è richiesta' };
    }

    for (let i = 0; i < emails.length; i++) {
      const item = emails[i];

      if (!item.value || !item.value.trim()) {
        return { valid: false, message: `Email ${i + 1}: valore mancante` };
      }

      if (!Utils.validateEmail(item.value)) {
        return { valid: false, message: `Email ${i + 1}: formato non valido` };
      }

      if (!item.label || !item.label.trim()) {
        return { valid: false, message: `Email ${i + 1}: etichetta mancante` };
      }
    }

    return { valid: true, message: '' };
  },

  /**
   * Validazione array phones
   * @param {Array} phones - Array di oggetti {value, label}
   * @returns {object} - { valid: boolean, message: string }
   */
  validatePhones(phones) {
    if (!Array.isArray(phones)) {
      return { valid: false, message: 'Formato telefoni non valido' };
    }

    if (phones.length === 0) {
      return { valid: false, message: 'Almeno un telefono è richiesto' };
    }

    for (let i = 0; i < phones.length; i++) {
      const item = phones[i];

      if (!item.value || !item.value.trim()) {
        return { valid: false, message: `Telefono ${i + 1}: valore mancante` };
      }

      if (item.value.trim().length < 5) {
        return { valid: false, message: `Telefono ${i + 1}: troppo corto` };
      }

      if (!item.label || !item.label.trim()) {
        return { valid: false, message: `Telefono ${i + 1}: etichetta mancante` };
      }
    }

    return { valid: true, message: '' };
  },

  /**
   * Crea nuovo contatto
   * @param {object} contactData - Dati contatto
   * @returns {object} - { success: boolean, contact: object|null, message: string }
   */
  create(contactData) {
    const currentUser = AuthManager.getCurrentUser();
    if (!currentUser) {
      NotificationService.error('Non autenticato');
      return { success: false, contact: null, message: 'Non autenticato' };
    }

    // Validazione nome
    if (!contactData.name || contactData.name.trim() === '') {
      NotificationService.error('Nome richiesto');
      return { success: false, contact: null, message: 'Nome richiesto' };
    }

    // Validazione emails (array)
    const emailValidation = this.validateEmails(contactData.emails);
    if (!emailValidation.valid) {
      NotificationService.error(emailValidation.message);
      return { success: false, contact: null, message: emailValidation.message };
    }

    // Validazione phones (array)
    const phoneValidation = this.validatePhones(contactData.phones);
    if (!phoneValidation.valid) {
      NotificationService.error(phoneValidation.message);
      return { success: false, contact: null, message: phoneValidation.message };
    }

    // Crea contatto con nuovo schema
    const contact = {
      id: Utils.generateId(),
      name: contactData.name.trim(),
      emails: contactData.emails.map(e => ({
        value: e.value.trim(),
        label: e.label.trim()
      })),
      phones: contactData.phones.map(p => ({
        value: p.value.trim(),
        label: p.label.trim()
      })),
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
    ActivityLog.log(
      CONFIG.ACTION_TYPES.CREATE,
      CONFIG.ENTITY_TYPES.CONTACT,
      contact.id,
      { name: contact.name, category: contact.category }
    );

    // Emetti evento
    EventBus.emit(EVENTS.CONTACT_CREATED, { contact });

    NotificationService.success('Contatto creato con successo');
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
      NotificationService.error('Contatto non trovato');
      return { success: false, contact: null, message: 'Contatto non trovato' };
    }

    const contact = contacts[index];

    // Verifica permessi
    if (!PermissionsManager.canEditContact(contact)) {
      NotificationService.error('Non autorizzato a modificare questo contatto');
      return { success: false, contact: null, message: 'Non autorizzato' };
    }

    // Validazione nome
    if (updates.name !== undefined && updates.name.trim() === '') {
      NotificationService.error('Nome richiesto');
      return { success: false, contact: null, message: 'Nome richiesto' };
    }

    // Validazione emails se presenti negli updates
    if (updates.emails) {
      const emailValidation = this.validateEmails(updates.emails);
      if (!emailValidation.valid) {
        NotificationService.error(emailValidation.message);
        return { success: false, contact: null, message: emailValidation.message };
      }
    }

    // Validazione phones se presenti negli updates
    if (updates.phones) {
      const phoneValidation = this.validatePhones(updates.phones);
      if (!phoneValidation.valid) {
        NotificationService.error(phoneValidation.message);
        return { success: false, contact: null, message: phoneValidation.message };
      }
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
    ActivityLog.log(
      CONFIG.ACTION_TYPES.UPDATE,
      CONFIG.ENTITY_TYPES.CONTACT,
      id,
      { name: contacts[index].name }
    );

    // Emetti evento
    EventBus.emit(EVENTS.CONTACT_UPDATED, { contact: contacts[index] });

    NotificationService.success('Contatto aggiornato con successo');
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
      NotificationService.error('Contatto non trovato');
      return { success: false, message: 'Contatto non trovato' };
    }

    // Verifica permessi
    if (!PermissionsManager.canDeleteContact(contact)) {
      NotificationService.error('Non autorizzato a eliminare questo contatto');
      return { success: false, message: 'Non autorizzato' };
    }

    const filtered = contacts.filter(c => c.id !== id);
    StorageManager.save(CONFIG.STORAGE_KEYS.CONTACTS, filtered);

    // Log attività
    ActivityLog.log(
      CONFIG.ACTION_TYPES.DELETE,
      CONFIG.ENTITY_TYPES.CONTACT,
      id,
      { name: contact.name }
    );

    // Emetti evento
    EventBus.emit(EVENTS.CONTACT_DELETED, { id });

    NotificationService.success('Contatto eliminato con successo');
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
    const term = searchTerm.toLowerCase();

    return contacts.filter(contact => {
      // Cerca nel nome
      if (contact.name.toLowerCase().includes(term)) return true;

      // Cerca nelle emails
      if (contact.emails && contact.emails.some(
        e =>
          e.value.toLowerCase().includes(term) ||
          e.label.toLowerCase().includes(term)
      )) return true;

      // Cerca nei telefoni
      if (contact.phones && contact.phones.some(
        p =>
          p.value.toLowerCase().includes(term) ||
          p.label.toLowerCase().includes(term)
      )) return true;

      // Cerca in company e notes
      if (contact.company && contact.company.toLowerCase().includes(term)) return true;
      if (contact.notes && contact.notes.toLowerCase().includes(term)) return true;

      return false;
    });
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
        proprietario: contacts.filter(
          c => c.category === CONFIG.CONTACT_CATEGORIES.PROPRIETARIO
        ).length,
        cliente: contacts.filter(
          c => c.category === CONFIG.CONTACT_CATEGORIES.CLIENTE
        ).length,
        fornitore: contacts.filter(
          c => c.category === CONFIG.CONTACT_CATEGORIES.FORNITORE
        ).length,
        partner: contacts.filter(
          c => c.category === CONFIG.CONTACT_CATEGORIES.PARTNER
        ).length
      },
      withEmail: contacts.filter(c => c.emails && c.emails.length > 0).length,
      withPhone: contacts.filter(c => c.phones && c.phones.length > 0).length
    };
  }
};

window.ContactsModule = ContactsModule;
