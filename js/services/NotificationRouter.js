// ==================== NOTIFICATION ROUTER SERVICE ====================
/**
 * NotificationRouter - Smart routing notifiche multi-property
 * Smista notifiche ai contatti giusti in base a:
 * - Property specifica
 * - Tipo di evento
 * - Ruoli target
 * - Preferenze canali (Telegram/Email)
 * 
 * Pattern: send() è SINCRONO (non bloccante, fire-and-forget)
 * Le notifiche vengono inviate in background senza attendere
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
    CLEANING_COMPLETED: 'cleaning_completed',
    CLEANING_REMINDER: 'cleaning_reminder',
    MAINTENANCE_CREATED: 'maintenance_created',
    MAINTENANCE_URGENT: 'maintenance_urgent',
    MAINTENANCE_COMPLETED: 'maintenance_completed',
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
   * Invia notifica smart routing - SINCRONO (non bloccante)
   * Le notifiche vengono inviate in background
   * 
   * @param {object} options
   * @param {string} options.event - Tipo evento (EVENTS.*)
   * @param {number} options.propertyId - ID property
   * @param {array} options.targetRoles - Ruoli target ['cleaning', 'owner', etc]
   * @param {array} options.channels - Canali da usare ['telegram', 'email']
   * @param {object} options.data - Dati payload notifica
   * @param {string} options.message - Messaggio custom (opzionale)
   * @returns {object} - {success: boolean, scheduled: number}
   */
  send(options) {
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
        console.error('[NotificationRouter] Event type richiesto');
        return { success: false, scheduled: 0 };
      }
      if (!propertyId) {
        console.error('[NotificationRouter] PropertyId richiesto');
        return { success: false, scheduled: 0 };
      }

      // Ottieni property
      const property = PropertiesModule?.getById(propertyId);
      if (!property) {
        console.warn(`[NotificationRouter] Property ${propertyId} non trovata`);
        return { success: false, scheduled: 0 };
      }

      // Raccogli contatti target
      const targetContacts = this.resolveTargetContacts(property, targetRoles);
      
      if (targetContacts.length === 0) {
        console.warn(`[NotificationRouter] Nessun contatto per property ${property.name}, roles: ${targetRoles.join(', ')}`);
        return { success: true, scheduled: 0 };
      }

      // Genera messaggio se non fornito
      const messageText = message || this.generateMessage(event, data, property);

      // Invia notifiche in background (fuori dal flusso principale)
      // Non attendiamo il completamento - torna subito
      targetContacts.forEach(contact => {
        // Telegram - async, non bloccante
        if (channels.includes(this.CHANNELS.TELEGRAM)) {
          this._sendTelegramAsync(contact, messageText, data);
        }

        // Email - async, non bloccante
        if (channels.includes(this.CHANNELS.EMAIL)) {
          this._sendEmailAsync(contact, messageText, data, event);
        }
      });

      console.log(`[NotificationRouter] ${event}: Scheduled ${targetContacts.length} notifications for ${property.name}`);

      return {
        success: true,
        scheduled: targetContacts.length
      };

    } catch (error) {
      console.error('[NotificationRouter] Error in send():', error);
      return {
        success: false,
        scheduled: 0
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
   * Invia Telegram in background (async, non bloccante)
   * @private
   */
  _sendTelegramAsync(contact, message, data) {
    // Esegui in background usando setTimeout per uscire dal call stack
    setTimeout(async () => {
      try {
        // Controlla preferenze
        if (!contact.notificationPreferences?.telegram?.enabled) {
          return;
        }

        const chatId = contact.notificationPreferences.telegram.chatId;
        if (!chatId) {
          console.warn(`[NotificationRouter] Telegram chatId mancante per ${contact.firstName} ${contact.lastName}`);
          return;
        }

        // Verifica TelegramService configurato
        if (!TelegramService || !TelegramService.isConfigured()) {
          console.warn('[NotificationRouter] TelegramService non configurato');
          return;
        }

        // Invia
        await TelegramService.sendMessage(message, { chatId, ...data });

      } catch (error) {
        console.error('[NotificationRouter] Telegram send error:', error);
      }
    }, 0);
  },

  /**
   * Invia Email in background (async, non bloccante)
   * @private
   */
  _sendEmailAsync(contact, message, data, event) {
    // Esegui in background usando setTimeout per uscire dal call stack
    setTimeout(async () => {
      try {
        // Controlla preferenze
        if (!contact.notificationPreferences?.email?.enabled) {
          return;
        }

        const emailAddress = contact.notificationPreferences.email.address;
        if (!emailAddress) {
          console.warn(`[NotificationRouter] Email mancante per ${contact.firstName} ${contact.lastName}`);
          return;
        }

        // Verifica EmailService configurato
        if (!EmailService || !EmailService.isConfigured()) {
          console.warn('[NotificationRouter] EmailService non configurato');
          return;
        }

        // Subject basato su evento
        const subject = this.getEmailSubject(event, data);

        // Invia
        await EmailService.send(
          emailAddress,
          subject,
          message,
          data
        );

      } catch (error) {
        console.error('[NotificationRouter] Email send error:', error);
      }
    }, 0);
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

      case this.EVENTS.BOOKING_CANCELLED:
        return `🏠 ${propertyName}\n❌ Prenotazione cancellata\n\nOspite: ${data.guestName}\nDate: ${data.checkIn} → ${data.checkOut}`;

      case this.EVENTS.CLEANING_CREATED:
        return `🧹 ${propertyName}\n📋 Nuova pulizia programmata\n\nData: ${data.scheduledDate}\nOra: ${data.scheduledTime || '14:00'}\n${data.notes ? `Note: ${data.notes}` : ''}`;

      case this.EVENTS.CLEANING_COMPLETED:
        return `🧹 ${propertyName}\n✅ Pulizia completata\n\nData: ${data.scheduledDate}`;

      case this.EVENTS.MAINTENANCE_CREATED:
        return `🔧 ${propertyName}\n⚠️ Nuova manutenzione\n\nCategoria: ${data.categoryLabel}\nPriorità: ${data.priority}\nDescrizione: ${data.description}`;

      case this.EVENTS.MAINTENANCE_URGENT:
        return `🚨 ${propertyName}\n⚠️ MANUTENZIONE URGENTE\n\nCategoria: ${data.categoryLabel}\nDescrizione: ${data.description}\n\n❗ Richiede intervento immediato`;

      case this.EVENTS.MAINTENANCE_COMPLETED:
        return `🔧 ${propertyName}\n✅ Manutenzione completata\n\nCategoria: ${data.categoryLabel}\nDescrizione: ${data.description}`;

      case this.EVENTS.CHECKIN_TODAY:
        return `🏠 ${propertyName}\n✅ Check-in oggi\n\nOspite: ${data.guestName}\nOra: ${data.checkInTime || '15:00'}`;

      case this.EVENTS.CHECKOUT_TODAY:
        return `🏠 ${propertyName}\n🚪 Check-out oggi\n\nOspite: ${data.guestName}\nOra: ${data.checkOutTime || '10:00'}`;

      case this.EVENTS.EMERGENCY:
        return `🚨 ${propertyName}\n⚠️ EMERGENZA\n\n${data.message}`;

      default:
        return `🏠 ${propertyName}\n📢 Notifica: ${event}`;
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
        return `📅 Nuova prenotazione - ${data.guestName}`;
      case this.EVENTS.BOOKING_CANCELLED:
        return `❌ Prenotazione cancellata - ${data.guestName}`;
      case this.EVENTS.CLEANING_CREATED:
        return `🧹 Pulizia programmata - ${data.scheduledDate}`;
      case this.EVENTS.CLEANING_COMPLETED:
        return `✅ Pulizia completata - ${data.scheduledDate}`;
      case this.EVENTS.MAINTENANCE_CREATED:
        return `🔧 Nuova manutenzione - ${data.categoryLabel}`;
      case this.EVENTS.MAINTENANCE_URGENT:
        return `🚨 URGENTE - Manutenzione ${data.categoryLabel}`;
      case this.EVENTS.MAINTENANCE_COMPLETED:
        return `✅ Manutenzione completata - ${data.categoryLabel}`;
      case this.EVENTS.CHECKIN_TODAY:
        return `✅ Check-in oggi - ${data.guestName}`;
      case this.EVENTS.CHECKOUT_TODAY:
        return `🚪 Check-out oggi - ${data.guestName}`;
      case this.EVENTS.EMERGENCY:
        return `🚨 EMERGENZA`;
      default:
        return `Notifica - ${event}`;
    }
  }
};

// Export globale
window.NotificationRouter = NotificationRouter;
