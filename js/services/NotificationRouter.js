// ==================== NOTIFICATION ROUTER SERVICE ====================
/**
 * NotificationRouter - Smart routing notifiche multi-property
 * Smista notifiche ai contatti giusti in base a:
 * - Property specifica
 * - Tipo di evento
 * - Ruoli target
 * - Preferenze canali (Telegram/Email)
 * 
 * Pattern estendibile per futuri canali (SMS, WhatsApp, Push)
 */

const NotificationRouter = {
  /**
   * Event types supportati
   */
  EVENTS: {
    BOOKING_CREATED: 'booking_created',
    BOOKING_CONFIRMED: 'booking_confirmed',
    BOOKING_CANCELLED: 'booking_cancelled',
    CHECKIN_TODAY: 'checkin_today',
    CHECKOUT_TODAY: 'checkout_today',
    CLEANING_CREATED: 'cleaning_created',
    CLEANING_REMINDER: 'cleaning_reminder',
    MAINTENANCE_CREATED: 'maintenance_created',
    MAINTENANCE_URGENT: 'maintenance_urgent',
    EMERGENCY: 'emergency'
  },

  /**
   * Roles target
   */
  ROLES: {
    CLEANING: 'cleaning',
    MAINTENANCE: 'maintenance',
    OWNER: 'owner',
    EMERGENCY: 'emergency',
    ALL: 'all'  // Tutti i contatti della property
  },

  /**
   * Channels disponibili
   */
  CHANNELS: {
    TELEGRAM: 'telegram',
    EMAIL: 'email',
    SMS: 'sms'  // Future implementation
  },

  /**
   * Invia notifica smart routing
   * @param {object} options
   * @param {string} options.event - Tipo evento (EVENTS.*)
   * @param {number} options.propertyId - ID property
   * @param {array} options.targetRoles - Ruoli target ['cleaning', 'owner', etc]
   * @param {array} options.channels - Canali da usare ['telegram', 'email']
   * @param {object} options.data - Dati payload notifica
   * @param {string} options.message - Messaggio custom (opzionale)
   * @returns {object} - {success: boolean, sent: {telegram: number, email: number}, errors: []}
   */
  async send(options) {
    try {
      const {
        event,
        propertyId,
        targetRoles = [this.ROLES.ALL],
        channels = [this.CHANNELS.TELEGRAM, this.CHANNELS.EMAIL],
        data = {},
        message = null
      } = options;

      // Validazione
      if (!event) {
        throw new Error('Event type richiesto');
      }
      if (!propertyId) {
        throw new Error('PropertyId richiesto');
      }

      // Ottieni property
      const property = PropertiesModule?.getById(propertyId);
      if (!property) {
        throw new Error(`Property ${propertyId} non trovata`);
      }

      // Raccogli contatti target
      const targetContacts = this.resolveTargetContacts(property, targetRoles);
      
      if (targetContacts.length === 0) {
        console.warn(`[NotificationRouter] Nessun contatto trovato per property ${property.name}, roles: ${targetRoles.join(', ')}`);
        return { success: true, sent: { telegram: 0, email: 0 }, errors: [], warning: 'No contacts found' };
      }

      // Genera messaggio se non fornito
      const messageText = message || this.generateMessage(event, data, property);

      // Invia notifiche
      const results = {
        telegram: 0,
        email: 0,
        errors: []
      };

      for (const contact of targetContacts) {
        // Telegram
        if (channels.includes(this.CHANNELS.TELEGRAM)) {
          const telegramSent = await this.sendTelegram(contact, messageText, data);
          if (telegramSent.success) results.telegram++;
          else if (telegramSent.error) results.errors.push(telegramSent.error);
        }

        // Email
        if (channels.includes(this.CHANNELS.EMAIL)) {
          const emailSent = await this.sendEmail(contact, messageText, data, event);
          if (emailSent.success) results.email++;
          else if (emailSent.error) results.errors.push(emailSent.error);
        }
      }

      console.log(`[NotificationRouter] Event: ${event}, Property: ${property.name}, Sent: ${results.telegram} telegram, ${results.email} email`);

      return {
        success: true,
        sent: { telegram: results.telegram, email: results.email },
        errors: results.errors
      };

    } catch (error) {
      console.error('[NotificationRouter] Error:', error);
      return {
        success: false,
        sent: { telegram: 0, email: 0 },
        errors: [error.message]
      };
    }
  },

  /**
   * Risolve contatti target in base a property e roles
   * @param {object} property
   * @param {array} targetRoles
   * @returns {array} - Array di contact objects
   */
  resolveTargetContacts(property, targetRoles) {
    const contacts = new Set();  // Usa Set per evitare duplicati

    if (!property.contacts) return [];

    // Se ruolo 'all', prendi tutti i contatti della property
    if (targetRoles.includes(this.ROLES.ALL)) {
      // Cleaning staff
      if (property.contacts.cleaning) {
        property.contacts.cleaning.forEach(id => {
          const contact = ContactsModule?.getById(id);
          if (contact) contacts.add(contact);
        });
      }
      // Maintenance
      if (property.contacts.maintenance) {
        property.contacts.maintenance.forEach(id => {
          const contact = ContactsModule?.getById(id);
          if (contact) contacts.add(contact);
        });
      }
      // Owner
      if (property.contacts.owner) {
        const contact = ContactsModule?.getById(property.contacts.owner);
        if (contact) contacts.add(contact);
      }
      // Emergency
      if (property.contacts.emergency) {
        property.contacts.emergency.forEach(id => {
          const contact = ContactsModule?.getById(id);
          if (contact) contacts.add(contact);
        });
      }
    } else {
      // Risolvi ruoli specifici
      targetRoles.forEach(role => {
        if (role === this.ROLES.CLEANING && property.contacts.cleaning) {
          property.contacts.cleaning.forEach(id => {
            const contact = ContactsModule?.getById(id);
            if (contact) contacts.add(contact);
          });
        }
        if (role === this.ROLES.MAINTENANCE && property.contacts.maintenance) {
          property.contacts.maintenance.forEach(id => {
            const contact = ContactsModule?.getById(id);
            if (contact) contacts.add(contact);
          });
        }
        if (role === this.ROLES.OWNER && property.contacts.owner) {
          const contact = ContactsModule?.getById(property.contacts.owner);
          if (contact) contacts.add(contact);
        }
        if (role === this.ROLES.EMERGENCY && property.contacts.emergency) {
          property.contacts.emergency.forEach(id => {
            const contact = ContactsModule?.getById(id);
            if (contact) contacts.add(contact);
          });
        }
      });
    }

    return Array.from(contacts);
  },

  /**
   * Invia notifica Telegram a contatto
   * @param {object} contact
   * @param {string} message
   * @param {object} data
   * @returns {object} - {success: boolean, error: string}
   */
  async sendTelegram(contact, message, data) {
    try {
      // Controlla preferenze
      if (!contact.notificationPreferences?.telegram?.enabled) {
        return { success: false, error: null };  // Silently skip
      }

      const chatId = contact.notificationPreferences.telegram.chatId;
      if (!chatId) {
        return { success: false, error: `Telegram chatId mancante per ${contact.name}` };
      }

      // Verifica TelegramService configurato
      if (!TelegramService || !TelegramService.isConfigured()) {
        return { success: false, error: 'TelegramService non configurato' };
      }

      // Invia
      const result = await TelegramService.sendMessage(message, { chatId, ...data });
      return { success: result.success, error: result.error };

    } catch (error) {
      return { success: false, error: `Telegram error: ${error.message}` };
    }
  },

  /**
   * Invia notifica Email a contatto
   * @param {object} contact
   * @param {string} message
   * @param {object} data
   * @param {string} event
   * @returns {object} - {success: boolean, error: string}
   */
  async sendEmail(contact, message, data, event) {
    try {
      // Controlla preferenze
      if (!contact.notificationPreferences?.email?.enabled) {
        return { success: false, error: null };  // Silently skip
      }

      const emailAddress = contact.notificationPreferences.email.address;
      if (!emailAddress) {
        return { success: false, error: `Email mancante per ${contact.name}` };
      }

      // Verifica EmailService configurato
      if (!EmailService || !EmailService.isConfigured()) {
        return { success: false, error: 'EmailService non configurato' };
      }

      // Subject basato su evento
      const subject = this.getEmailSubject(event, data);

      // Invia
      const result = await EmailService.send(
        emailAddress,
        subject,
        message,
        data
      );
      return { success: result.success, error: result.error };

    } catch (error) {
      return { success: false, error: `Email error: ${error.message}` };
    }
  },

  /**
   * Genera messaggio in base a evento
   * @param {string} event
   * @param {object} data
   * @param {object} property
   * @returns {string}
   */
  generateMessage(event, data, property) {
    const propertyName = property.name;

    switch (event) {
      case this.EVENTS.BOOKING_CREATED:
        return `🏠 ${propertyName}\n📅 Nuova prenotazione\n\nOspite: ${data.guestName}\nCheck-in: ${data.checkIn}\nCheck-out: ${data.checkOut}\n${data.notes ? `\nNote: ${data.notes}` : ''}`;

      case this.EVENTS.CLEANING_CREATED:
        return `🧹 ${propertyName}\n📋 Nuova pulizia programmata\n\nData: ${data.scheduledDate}\nOspite: ${data.guestName || 'N/A'}\n${data.notes ? `\nNote: ${data.notes}` : ''}`;

      case this.EVENTS.MAINTENANCE_CREATED:
        return `🔧 ${propertyName}\n⚠️ Nuova manutenzione\n\nCategoria: ${data.category}\nPriorità: ${data.priority}\nDescrizione: ${data.description}`;

      case this.EVENTS.MAINTENANCE_URGENT:
        return `🚨 ${propertyName}\n⚠️ MANUTENZIONE URGENTE\n\nCategoria: ${data.category}\nDescrizione: ${data.description}\n\n❗ Richiede intervento immediato`;

      case this.EVENTS.CHECKIN_TODAY:
        return `🏠 ${propertyName}\n✅ Check-in oggi\n\nOspite: ${data.guestName}\nOra: ${data.checkInTime || '15:00'}`;

      case this.EVENTS.CHECKOUT_TODAY:
        return `🏠 ${propertyName}\n🚪 Check-out oggi\n\nOspite: ${data.guestName}\nOra: ${data.checkOutTime || '10:00'}`;

      case this.EVENTS.EMERGENCY:
        return `🚨 ${propertyName}\n⚠️ EMERGENZA\n\n${data.message}`;

      default:
        return `🏠 ${propertyName}\n📢 Notifica: ${event}\n\n${JSON.stringify(data, null, 2)}`;
    }
  },

  /**
   * Genera subject email in base a evento
   * @param {string} event
   * @param {object} data
   * @returns {string}
   */
  getEmailSubject(event, data) {
    switch (event) {
      case this.EVENTS.BOOKING_CREATED:
        return `Nuova prenotazione - ${data.guestName}`;
      case this.EVENTS.CLEANING_CREATED:
        return `Pulizia programmata - ${data.scheduledDate}`;
      case this.EVENTS.MAINTENANCE_CREATED:
        return `Nuova manutenzione - ${data.category}`;
      case this.EVENTS.MAINTENANCE_URGENT:
        return `⚠️ URGENTE - Manutenzione ${data.category}`;
      case this.EVENTS.CHECKIN_TODAY:
        return `Check-in oggi - ${data.guestName}`;
      case this.EVENTS.CHECKOUT_TODAY:
        return `Check-out oggi - ${data.guestName}`;
      case this.EVENTS.EMERGENCY:
        return `🚨 EMERGENZA`;
      default:
        return `Notifica - ${event}`;
    }
  }
};

// Export globale
window.NotificationRouter = NotificationRouter;
