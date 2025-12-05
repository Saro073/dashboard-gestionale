/**
 * TelegramService - Servizio per invio notifiche via Telegram Bot API
 * Gestisce comunicazioni con staff operativo (pulizie, manutenzione)
 */

const TelegramService = {
  config: {
    botToken: null,
    chatIds: {
      cleaning: null,      // Chat ID donna delle pulizie
      maintenance: null,   // Chat ID manutentore principale
      admin: null         // Chat ID admin per urgenze
    }
  },

  /**
   * Inizializza configurazione Telegram
   */
  init() {
    const savedConfig = localStorage.getItem('telegram_config');
    if (savedConfig) {
      try {
        this.config = JSON.parse(savedConfig);
      } catch (error) {
        console.error('Errore caricamento config Telegram:', error);
      }
    }
  },

  /**
   * Salva configurazione
   */
  saveConfig(botToken, chatIds) {
    this.config.botToken = botToken;
    this.config.chatIds = { ...this.config.chatIds, ...chatIds };
    localStorage.setItem('telegram_config', JSON.stringify(this.config));
  },

  /**
   * Verifica se Telegram è configurato
   */
  isConfigured() {
    return !!this.config.botToken;
  },

  /**
   * Invia messaggio Telegram generico
   */
  async sendMessage(chatId, text, options = {}) {
    if (!this.config.botToken || !chatId) {
      console.warn('Telegram non configurato');
      return { success: false, error: 'Non configurato' };
    }

    try {
      const url = `https://api.telegram.org/bot${this.config.botToken}/sendMessage`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: text,
          parse_mode: options.parseMode || 'HTML',
          disable_notification: options.silent || false
        })
      });

      const data = await response.json();
      
      if (!data.ok) {
        throw new Error(data.description || 'Errore invio Telegram');
      }

      return { success: true, data };
    } catch (error) {
      console.error('Errore invio Telegram:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Invia foto via Telegram
   */
  async sendPhoto(chatId, photoUrl, caption = '') {
    if (!this.config.botToken || !chatId) {
      return { success: false, error: 'Non configurato' };
    }

    try {
      const url = `https://api.telegram.org/bot${this.config.botToken}/sendPhoto`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          photo: photoUrl,
          caption: caption,
          parse_mode: 'HTML'
        })
      });

      const data = await response.json();
      return data.ok ? { success: true, data } : { success: false, error: data.description };
    } catch (error) {
      console.error('Errore invio foto Telegram:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Template notifica nuova pulizia
   */
  async notifyNewCleaning(cleaning) {
    const chatId = this.config.chatIds.cleaning;
    if (!chatId) return { success: false, error: 'Chat ID pulizie non configurato' };

    const text = `
🧹 <b>Nuova Pulizia Programmata</b>

📅 <b>Data:</b> ${Utils.formatDate(new Date(cleaning.scheduledDate))}
⏰ <b>Orario:</b> ${cleaning.scheduledTime}
👤 <b>Ospite:</b> ${cleaning.guestName || 'Standard'}
${cleaning.bookingId ? `📋 <b>Booking #${cleaning.bookingId}</b>` : ''}

⏱️ <b>Durata stimata:</b> ${cleaning.estimatedDuration} minuti
💰 <b>Compenso:</b> €${cleaning.cost}

${cleaning.notes ? `📝 <b>Note:</b>\n${cleaning.notes}` : ''}

✅ Conferma quando hai visto il messaggio!
    `.trim();

    return await this.sendMessage(chatId, text);
  },

  /**
   * Template reminder pulizia (2 giorni prima)
   */
  async notifyCleaningReminder(cleaning) {
    const chatId = this.config.chatIds.cleaning;
    if (!chatId) return { success: false, error: 'Chat ID non configurato' };

    const text = `
⏰ <b>Promemoria Pulizia</b>

📅 Tra 2 giorni: ${Utils.formatDate(new Date(cleaning.scheduledDate))} alle ${cleaning.scheduledTime}
👤 Ospite: ${cleaning.guestName || 'Standard'}

Non dimenticare! 😊
    `.trim();

    return await this.sendMessage(chatId, text);
  },

  /**
   * Template pulizia completata
   */
  async notifyCleaningCompleted(cleaning, duration) {
    const chatId = this.config.chatIds.admin;
    if (!chatId) return { success: false, error: 'Chat ID admin non configurato' };

    const text = `
✅ <b>Pulizia Completata</b>

👤 ${cleaning.guestName || 'Standard'}
📅 ${Utils.formatDate(new Date(cleaning.scheduledDate))}
⏱️ Durata: ${duration} minuti ${duration > cleaning.estimatedDuration ? '⚠️' : ''}
💰 Costo: €${cleaning.cost}

Ottimo lavoro! 🎉
    `.trim();

    return await this.sendMessage(chatId, text);
  },

  /**
   * Template nuova manutenzione
   */
  async notifyNewMaintenance(maintenance) {
    const chatId = this.config.chatIds.maintenance;
    if (!chatId) return { success: false, error: 'Chat ID manutenzione non configurato' };

    const urgencyEmoji = {
      low: '🔵',
      medium: '🟡',
      high: '🟠',
      urgent: '🔴'
    };

    const categoryEmoji = {
      plumbing: '🚰',
      electrical: '⚡',
      heating: '🔥',
      locksmith: '🔑',
      appliances: '🔧',
      other: '🛠️'
    };

    const text = `
${urgencyEmoji[maintenance.priority]} <b>${maintenance.priority === 'urgent' ? '⚠️ URGENTE - ' : ''}Nuova Manutenzione</b>

${categoryEmoji[maintenance.category]} <b>Categoria:</b> ${this.getCategoryLabel(maintenance.category)}
📅 <b>Data richiesta:</b> ${Utils.formatDate(new Date(maintenance.requestDate))}
${maintenance.scheduledDate ? `🗓️ <b>Programmata:</b> ${Utils.formatDate(new Date(maintenance.scheduledDate))}` : ''}

📝 <b>Descrizione:</b>
${maintenance.description}

${maintenance.assignedTo ? `👤 <b>Assegnato a:</b> ${maintenance.assignedTo}` : ''}
${maintenance.estimatedCost ? `💰 <b>Costo stimato:</b> €${maintenance.estimatedCost}` : ''}

${maintenance.priority === 'urgent' ? '⚠️ <b>INTERVENTO URGENTE RICHIESTO!</b>' : ''}
    `.trim();

    return await this.sendMessage(chatId, text, { silent: maintenance.priority === 'low' });
  },

  /**
   * Template manutenzione completata
   */
  async notifyMaintenanceCompleted(maintenance) {
    const chatId = this.config.chatIds.admin;
    if (!chatId) return { success: false, error: 'Chat ID admin non configurato' };

    const text = `
✅ <b>Manutenzione Completata</b>

🛠️ ${this.getCategoryLabel(maintenance.category)}
📅 ${Utils.formatDate(new Date(maintenance.completedDate))}
${maintenance.assignedTo ? `👤 ${maintenance.assignedTo}` : ''}
💰 Costo finale: €${maintenance.finalCost || maintenance.estimatedCost || 0}

${maintenance.notes ? `📝 Note:\n${maintenance.notes}` : ''}

Problema risolto! ✨
    `.trim();

    return await this.sendMessage(chatId, text);
  },

  /**
   * Helper per ottenere label categoria
   */
  getCategoryLabel(category) {
    const labels = {
      plumbing: 'Idraulica',
      electrical: 'Elettricità',
      heating: 'Riscaldamento/Caldaia',
      locksmith: 'Serrature',
      appliances: 'Elettrodomestici',
      other: 'Altro'
    };
    return labels[category] || category;
  },

  /**
   * Test connessione bot
   */
  async testConnection() {
    if (!this.config.botToken) {
      return { success: false, error: 'Bot Token non configurato' };
    }

    try {
      const url = `https://api.telegram.org/bot${this.config.botToken}/getMe`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.ok) {
        return { 
          success: true, 
          botInfo: {
            username: data.result.username,
            firstName: data.result.first_name,
            id: data.result.id
          }
        };
      } else {
        return { success: false, error: data.description };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};

// Inizializza al caricamento
TelegramService.init();
