// ==================== CONTACTS MODULE ====================
const ContactsModule = {
  /**
   * Verifica se utente può accedere contatto (data ownership)
   * @param {object} contact - Contatto
   * @param {object} user - Utente corrente
   * @returns {boolean} - True se utente può accedere
   * @private
   */
  _canAccess(contact, user) {
    // Admin può accedere a tutti i contatti
    if (user && user.role === CONFIG.ROLES.ADMIN) {
      return true;
    }
    
    // Utente regolare può accedere solo ai propri contatti
    if (user && contact.createdBy === user.id) {
      return true;
    }
    
    return false;
  },

  /**
   * Ottiene tutti i contatti
   * @returns {Array} - Array di contatti
   */
  getAll() {
    const allContacts = StorageManager.load(CONFIG.STORAGE_KEYS.CONTACTS, []);
    let currentUser = AuthManager.getCurrentUser();
    
    // Se non autenticato, ritorna array vuoto
    if (!currentUser) {
      return [];
    }
    
    // Filtra contatti per data ownership
    return allContacts.filter(contact => this._canAccess(contact, currentUser));
  },

  /**
   * Ottiene contatto per ID
   * @param {number} id - ID contatto
   * @returns {object|null} - Contatto o null
   */
  getById(id) {
    const contact = StorageManager.load(CONFIG.STORAGE_KEYS.CONTACTS, [])
      .find(c => c.id === id) || null;
    
    if (!contact) {
      return null;
    }
    
    let currentUser = AuthManager.getCurrentUser();
    
    // Verifica data ownership
    if (!this._canAccess(contact, currentUser)) {
      console.warn(`[SECURITY] Accesso negato a contatto ${id}: user ${currentUser?.id}`);
      return null;
    }
    
    return contact;
  },

  /**
   * Migra vecchi contatti con email/phone singoli ad array
   * Eseguita automaticamente al primo caricamento
   * @returns {object} - { success: boolean, migratedCount: number }
   */
  migrateOldContacts() {
    const allContacts = StorageManager.load(CONFIG.STORAGE_KEYS.CONTACTS, []);
    let migratedCount = 0;

    allContacts.forEach(contact => {
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

      // MIGRAZIONE: Split name in firstName e lastName
      if (contact.name && !contact.firstName && !contact.lastName) {
        const nameParts = contact.name.trim().split(/\s+/);
        if (nameParts.length === 1) {
          contact.firstName = nameParts[0];
          contact.lastName = '';
        } else {
          contact.firstName = nameParts[0];
          contact.lastName = nameParts.slice(1).join(' ');
        }
        migrated = true;
      }

      // Assicurati che firstName e lastName esistano
      if (!contact.firstName) contact.firstName = contact.name || '';
      if (!contact.lastName) contact.lastName = '';

      // MIGRAZIONE: Aggiungi struttura address se mancante
      if (!contact.address) {
        contact.address = {
          street: '',
          city: '',
          zip: '',
          province: '',
          country: ''
        };
        migrated = true;
      }

      // MIGRAZIONE: Aggiungi struttura businessAddress se mancante
      if (!contact.businessAddress) {
        contact.businessAddress = {
          street: '',
          city: '',
          zip: '',
          province: '',
          country: ''
        };
        migrated = true;
      }

      // MIGRAZIONE: Aggiungi roles se mancanti
      if (!contact.roles) {
        contact.roles = [];
        migrated = true;
      }

      // MIGRAZIONE: Aggiungi notificationPreferences se mancanti
      if (!contact.notificationPreferences) {
        const primaryEmail = contact.emails && contact.emails.length > 0 ? contact.emails[0].value : '';
        contact.notificationPreferences = {
          telegram: {
            enabled: false,
            chatId: ''
          },
          email: {
            enabled: primaryEmail !== '',
            address: primaryEmail
          },
          sms: {
            enabled: false,
            phone: ''
          }
        };
        migrated = true;
      }

      if (migrated) migratedCount++;
    });

    if (migratedCount > 0) {
      StorageManager.save(CONFIG.STORAGE_KEYS.CONTACTS, allContacts);
      console.log(`[ContactsModule] Migrati ${migratedCount} contatti alla nuova struttura`);
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

    // Permettiamo array vuoto (validazione combinata con phones nel create)
    if (emails.length === 0) {
      return { valid: true, message: '' };
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

    // Permettiamo array vuoto (validazione combinata con emails nel create)
    if (phones.length === 0) {
      return { valid: true, message: '' };
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
    let currentUser = AuthManager.getCurrentUser();
    if (!currentUser) {
      NotificationService.error('Non autenticato');
      return { success: false, contact: null, message: 'Non autenticato' };
    }

    // Validazione firstName
    if (!contactData.firstName || contactData.firstName.trim() === '') {
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

    // Validazione combinata: almeno uno tra email O telefono deve essere fornito
    const hasValidEmail = contactData.emails && contactData.emails.length > 0;
    const hasValidPhone = contactData.phones && contactData.phones.length > 0;
    
    if (!hasValidEmail && !hasValidPhone) {
      const message = 'Almeno un\'email O un telefono è richiesto';
      NotificationService.error(message);
      return { success: false, contact: null, message };
    }

    // Crea contatto con nuovo schema - SANITIZZATO per XSS protection
    const contact = {
      id: Utils.generateId(),
      name: Sanitizer.sanitize(`${contactData.firstName.trim()} ${contactData.lastName?.trim() || ''}`.trim()), // Legacy compatibility
      firstName: Sanitizer.sanitize(contactData.firstName.trim()),
      lastName: Sanitizer.sanitize(contactData.lastName?.trim() || ''),
      emails: contactData.emails.map(e => ({
        value: Sanitizer.sanitize(e.value.trim()),
        label: Sanitizer.sanitize(e.label.trim())
      })),
      phones: contactData.phones.map(p => ({
        value: Sanitizer.sanitize(p.value.trim()),
        label: Sanitizer.sanitize(p.label.trim())
      })),
      address: {
        street: Sanitizer.sanitize(contactData.address?.street?.trim() || ''),
        city: Sanitizer.sanitize(contactData.address?.city?.trim() || ''),
        zip: Sanitizer.sanitize(contactData.address?.zip?.trim() || ''),
        province: Sanitizer.sanitize(contactData.address?.province?.trim() || ''),
        country: Sanitizer.sanitize(contactData.address?.country?.trim() || '')
      },
      businessAddress: {
        street: Sanitizer.sanitize(contactData.businessAddress?.street?.trim() || ''),
        city: Sanitizer.sanitize(contactData.businessAddress?.city?.trim() || ''),
        zip: Sanitizer.sanitize(contactData.businessAddress?.zip?.trim() || ''),
        province: Sanitizer.sanitize(contactData.businessAddress?.province?.trim() || ''),
        country: Sanitizer.sanitize(contactData.businessAddress?.country?.trim() || '')
      },
      company: Sanitizer.sanitize(contactData.company?.trim() || ''),
      category: contactData.category || CONFIG.CONTACT_CATEGORIES.CLIENTE,
      // Operational roles per property assignment
      roles: contactData.roles || [],  // ['cleaner', 'maintenance', 'owner', 'emergency']\n      // Notification preferences per contact
      notificationPreferences: contactData.notificationPreferences || {
        telegram: {
          enabled: false,
          chatId: ''
        },
        email: {
          enabled: true,  // Default email enabled if has email
          address: contactData.emails && contactData.emails.length > 0 ? contactData.emails[0].value : ''
        },
        sms: {
          enabled: false,
          phone: ''
        }
      },
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
    const allContacts = StorageManager.load(CONFIG.STORAGE_KEYS.CONTACTS, []);
    const index = allContacts.findIndex(c => c.id === id);

    if (index === -1) {
      NotificationService.error('Contatto non trovato');
      return { success: false, contact: null, message: 'Contatto non trovato' };
    }

    // Verifica data ownership
    let currentUser = AuthManager.getCurrentUser();
    if (!this._canAccess(allContacts[index], currentUser)) {
      console.warn(`[SECURITY] Tentativo modifica non autorizzato contatto ${id}`);
      NotificationService.error('Non autorizzato');
      return { success: false, contact: null, message: 'Non autorizzato' };
    }

    const contact = allContacts[index];

    // Verifica permessi
    if (!PermissionsManager.canEditContact(contact)) {
      NotificationService.error('Non autorizzato a modificare questo contatto');
      return { success: false, contact: null, message: 'Non autorizzato' };
    }

    // Validazione firstName
    if (updates.firstName !== undefined && updates.firstName.trim() === '') {
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

    // Validazione combinata: almeno uno tra email O telefono deve essere presente
    const finalEmails = updates.emails !== undefined ? updates.emails : contact.emails;
    const finalPhones = updates.phones !== undefined ? updates.phones : contact.phones;
    const hasValidEmail = finalEmails && finalEmails.length > 0;
    const hasValidPhone = finalPhones && finalPhones.length > 0;
    
    if (!hasValidEmail && !hasValidPhone) {
      const message = 'Almeno un\'email O un telefono è richiesto';
      NotificationService.error(message);
      return { success: false, contact: null, message };
    }

    // Aggiorna
    currentUser = AuthManager.getCurrentUser();  // Reuse variable

    // Ricostruisci name se firstName o lastName cambiano
    const updatedFirstName = updates.firstName !== undefined ? updates.firstName : contact.firstName;
    const updatedLastName = updates.lastName !== undefined ? updates.lastName : contact.lastName;
    const updatedName = `${updatedFirstName} ${updatedLastName}`.trim();

    allContacts[index] = {
      ...contact,
      ...updates,
      name: updatedName, // Mantieni legacy field aggiornato
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser.id,
      updatedByUsername: currentUser.username
    };

    StorageManager.save(CONFIG.STORAGE_KEYS.CONTACTS, allContacts);

    // Log attività
    ActivityLog.log(
      CONFIG.ACTION_TYPES.UPDATE,
      CONFIG.ENTITY_TYPES.CONTACT,
      id,
      { name: allContacts[index].name }
    );

    // Emetti evento
    EventBus.emit(EVENTS.CONTACT_UPDATED, { contact: allContacts[index] });

    NotificationService.success('Contatto aggiornato con successo');
    return { success: true, contact: allContacts[index], message: 'Contatto aggiornato' };
  },

  /**
   * Elimina contatto
   * @param {number} id - ID contatto
   * @returns {object} - { success: boolean, message: string }
   */
  delete(id) {
    const allContacts = StorageManager.load(CONFIG.STORAGE_KEYS.CONTACTS, []);
    const index = allContacts.findIndex(c => c.id === id);
    
    if (index === -1) {
      NotificationService.error('Contatto non trovato');
      return { success: false, message: 'Contatto non trovato' };
    }
    
    // Verifica data ownership
    let currentUser = AuthManager.getCurrentUser();
    if (!this._canAccess(allContacts[index], currentUser)) {
      console.warn(`[SECURITY] Tentativo eliminazione non autorizzato contatto ${id}`);
      NotificationService.error('Non autorizzato');
      return { success: false, message: 'Non autorizzato' };
    }

    const contact = allContacts[index];

    // Verifica permessi
    if (!PermissionsManager.canDeleteContact(contact)) {
      NotificationService.error('Non autorizzato a eliminare questo contatto');
      return { success: false, message: 'Non autorizzato' };
    }

    const filtered = allContacts.filter(c => c.id !== id);
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
    return contacts.filter(c => 
      c.category && c.category.toLowerCase() === category.toLowerCase()
    );
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
      // Cerca in firstName e lastName
      if (contact.firstName && contact.firstName.toLowerCase().includes(term)) return true;
      if (contact.lastName && contact.lastName.toLowerCase().includes(term)) return true;
      // Cerca anche nel campo legacy name
      if (contact.name && contact.name.toLowerCase().includes(term)) return true;

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
