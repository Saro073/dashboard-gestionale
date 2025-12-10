/**
 * EmailService - Servizio per invio email tramite EmailJS
 * Gestisce comunicazioni con clienti (conferme booking, fatture)
 */

const EmailService = {
  config: {
    serviceId: null,
    templateId: null,
    publicKey: null,
    enabled: false
  },

  /**
   * Inizializza configurazione EmailJS
   */
  init() {
    const savedConfig = localStorage.getItem('email_config');
    if (savedConfig) {
      try {
        this.config = JSON.parse(savedConfig);
        if (this.config.publicKey) {
          // Inizializza EmailJS
          if (typeof emailjs !== 'undefined') {
            emailjs.init(this.config.publicKey);
          }
        }
      } catch (error) {
        console.error('Errore caricamento config Email:', error);
      }
    }
  },

  /**
   * Salva configurazione
   */
  saveConfig(serviceId, templateId, publicKey) {
    this.config = { serviceId, templateId, publicKey };
    localStorage.setItem('email_config', JSON.stringify(this.config));
    
    if (publicKey && typeof emailjs !== 'undefined') {
      emailjs.init(publicKey);
    }
  },

  /**
   * Verifica se EmailJS è configurato
   */
  isConfigured() {
    return !!this.config.serviceId && !!this.config.templateId && !!this.config.publicKey;
  },

  /**
   * Invia email generica
   */
  async sendEmail(to, subject, htmlContent, templateParams = {}) {
    if (!this.isConfigured()) {
      console.warn('EmailJS non configurato');
      return { success: false, error: 'Non configurato' };
    }

    if (typeof emailjs === 'undefined') {
      return { success: false, error: 'EmailJS non caricato' };
    }

    try {
      const params = {
        to_email: to,
        subject: subject,
        message: htmlContent,
        ...templateParams
      };

      const response = await emailjs.send(
        this.config.serviceId,
        this.config.templateId,
        params
      );

      return { success: true, response };
    } catch (error) {
      console.error('Errore invio email:', error);
      return { success: false, error: error.text || error.message };
    }
  },

  /**
   * Template conferma booking
   */
  async sendBookingConfirmation(booking, contact) {
    if (!contact || !contact.email) {
      return { success: false, error: 'Email contatto non disponibile' };
    }

    const checkIn = Utils.formatDate(new Date(booking.checkIn));
    const checkOut = Utils.formatDate(new Date(booking.checkOut));
    const nights = Math.ceil((new Date(booking.checkOut) - new Date(booking.checkIn)) / (1000 * 60 * 60 * 24));

    const subject = `Conferma Prenotazione - ${checkIn}`;
    
    const htmlContent = `
      <h2>Gentile ${contact.name},</h2>
      
      <p>La sua prenotazione è stata confermata! 🎉</p>
      
      <h3>Dettagli Prenotazione:</h3>
      <ul>
        <li><strong>Check-in:</strong> ${checkIn}</li>
        <li><strong>Check-out:</strong> ${checkOut}</li>
        <li><strong>Notti:</strong> ${nights}</li>
        <li><strong>Ospiti:</strong> ${booking.guests}</li>
        <li><strong>Prezzo totale:</strong> €${booking.price}</li>
      </ul>
      
      ${booking.notes ? `<p><strong>Note:</strong> ${booking.notes}</p>` : ''}
      
      <p>La contatteremo qualche giorno prima del check-in per fornirle tutte le informazioni necessarie.</p>
      
      <p>Per qualsiasi domanda, non esiti a contattarci.</p>
      
      <p>Cordiali saluti,<br>Il Team</p>
    `;

    return await this.sendEmail(contact.email, subject, htmlContent, {
      booking_id: booking.id,
      guest_name: contact.name,
      check_in: checkIn,
      check_out: checkOut,
      nights: nights,
      guests: booking.guests,
      total_price: booking.price
    });
  },

  /**
   * Template reminder check-in (2 giorni prima)
   */
  async sendCheckInReminder(booking, contact) {
    if (!contact || !contact.email) {
      return { success: false, error: 'Email contatto non disponibile' };
    }

    const checkIn = Utils.formatDate(new Date(booking.checkIn));
    const subject = `Reminder Check-in - ${checkIn}`;
    
    const htmlContent = `
      <h2>Gentile ${contact.name},</h2>
      
      <p>Il suo check-in è previsto tra 2 giorni! ⏰</p>
      
      <h3>Informazioni Check-in:</h3>
      <ul>
        <li><strong>Data:</strong> ${checkIn}</li>
        <li><strong>Orario consigliato:</strong> dalle 15:00</li>
        <li><strong>Check-out:</strong> ${Utils.formatDate(new Date(booking.checkOut))} entro le 10:00</li>
      </ul>
      
      <h3>Cosa portare:</h3>
      <ul>
        <li>Documento d'identità valido</li>
        <li>Conferma prenotazione</li>
      </ul>
      
      <p>Ci vediamo presto! 😊</p>
      
      <p>Cordiali saluti,<br>Il Team</p>
    `;

    return await this.sendEmail(contact.email, subject, htmlContent);
  },

  /**
   * Template fattura/ricevuta
   */
  async sendInvoice(booking, contact, invoiceData) {
    if (!contact || !contact.email) {
      return { success: false, error: 'Email contatto non disponibile' };
    }

    const subject = `Fattura/Ricevuta - Prenotazione ${booking.id}`;
    
    const htmlContent = `
      <h2>Gentile ${contact.name},</h2>
      
      <p>In allegato trova la fattura/ricevuta per la prenotazione.</p>
      
      <h3>Riepilogo:</h3>
      <ul>
        <li><strong>Periodo:</strong> ${Utils.formatDate(new Date(booking.checkIn))} - ${Utils.formatDate(new Date(booking.checkOut))}</li>
        <li><strong>Totale:</strong> €${booking.price}</li>
        <li><strong>Pagamento:</strong> ${booking.paymentStatus === 'paid' ? 'Completato ✅' : 'In attesa'}</li>
      </ul>
      
      <p>Grazie per aver scelto la nostra struttura!</p>
      
      <p>Cordiali saluti,<br>Il Team</p>
    `;

    return await this.sendEmail(contact.email, subject, htmlContent, invoiceData);
  }
};

// Inizializza al caricamento
EmailService.init();
