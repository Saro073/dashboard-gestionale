// ==================== NOTIFICATION SERVICE ====================
/**
 * NotificationService - Sistema di notifiche toast/snackbar
 * Gestisce messaggi di successo, errore, info, warning
 * 
 * Utilizzo:
 * NotificationService.success('Contatto salvato!');
 * NotificationService.error('Errore nel salvataggio');
 * NotificationService.info('Informazione importante');
 * NotificationService.warning('Attenzione!');
 */

const NotificationService = {
  /**
   * Container per le notifiche
   */
  container: null,

  /**
   * Configurazione default
   */
  config: {
    duration: 3000, // ms
    maxNotifications: 5,
    position: 'top-right' // top-right, top-left, bottom-right, bottom-left
  },

  /**
   * Inizializza il servizio
   */
  init() {
    // Crea container se non esiste
    if (!this.container) {
      this.createContainer();
    }

    // Ascolta eventi EventBus
    EventBus.on(EVENTS.NOTIFICATION_SHOW, (data) => {
      this.show(data.message, data.type, data.duration);
    });
  },

  /**
   * Crea il container delle notifiche
   */
  createContainer() {
    this.container = document.createElement('div');
    this.container.id = 'notificationContainer';
    this.container.className = `notification-container ${this.config.position}`;
    document.body.appendChild(this.container);

    // Aggiungi stili se non presenti
    if (!document.getElementById('notificationStyles')) {
      this.injectStyles();
    }
  },

  /**
   * Inietta gli stili CSS per le notifiche
   */
  injectStyles() {
    const style = document.createElement('style');
    style.id = 'notificationStyles';
    style.textContent = `
      .notification-container {
        position: fixed;
        z-index: 10000;
        pointer-events: none;
      }

      .notification-container.top-right {
        top: 20px;
        right: 20px;
      }

      .notification-container.top-left {
        top: 20px;
        left: 20px;
      }

      .notification-container.bottom-right {
        bottom: 20px;
        right: 20px;
      }

      .notification-container.bottom-left {
        bottom: 20px;
        left: 20px;
      }

      .notification {
        background: white;
        border-radius: 8px;
        padding: 16px 20px;
        margin-bottom: 10px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 300px;
        max-width: 400px;
        pointer-events: all;
        animation: slideIn 0.3s ease;
        border-left: 4px solid #666;
      }

      .notification.success {
        border-left-color: #10b981;
      }

      .notification.error {
        border-left-color: #ef4444;
      }

      .notification.warning {
        border-left-color: #f59e0b;
      }

      .notification.info {
        border-left-color: #3b82f6;
      }

      .notification-icon {
        font-size: 24px;
        flex-shrink: 0;
      }

      .notification-content {
        flex: 1;
      }

      .notification-message {
        margin: 0;
        color: #1f2937;
        font-size: 14px;
        font-weight: 500;
      }

      .notification-close {
        background: none;
        border: none;
        font-size: 20px;
        cursor: pointer;
        color: #6b7280;
        padding: 0;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
        transition: background 0.2s;
      }

      .notification-close:hover {
        background: #f3f4f6;
      }

      .notification.removing {
        animation: slideOut 0.3s ease forwards;
      }

      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translateX(100%);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }

      @keyframes slideOut {
        from {
          opacity: 1;
          transform: translateX(0);
        }
        to {
          opacity: 0;
          transform: translateX(100%);
        }
      }

      [data-theme="dark"] .notification {
        background: #1f2937;
      }

      [data-theme="dark"] .notification-message {
        color: #f9fafb;
      }

      [data-theme="dark"] .notification-close {
        color: #9ca3af;
      }

      [data-theme="dark"] .notification-close:hover {
        background: #374151;
      }
    `;
    document.head.appendChild(style);
  },

  /**
   * Mostra una notifica
   * @param {string} message - Messaggio da mostrare
   * @param {string} type - Tipo: 'success', 'error', 'warning', 'info'
   * @param {number} duration - Durata in ms (default: 3000)
   */
  show(message, type = 'info', duration = this.config.duration) {
    if (!this.container) {
      this.init();
    }

    // Limita numero di notifiche
    const notifications = this.container.querySelectorAll('.notification');
    if (notifications.length >= this.config.maxNotifications) {
      this.remove(notifications[0]);
    }

    // Crea notifica
    const notification = this.createNotification(message, type);
    this.container.appendChild(notification);

    // Auto-rimozione
    if (duration > 0) {
      setTimeout(() => {
        this.remove(notification);
      }, duration);
    }

    return notification;
  },

  /**
   * Crea elemento notifica
   * @param {string} message - Messaggio
   * @param {string} type - Tipo notifica
   * @returns {HTMLElement} - Elemento notifica
   */
  createNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;

    const icons = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ'
    };

    notification.innerHTML = `
      <div class="notification-icon">${icons[type] || icons.info}</div>
      <div class="notification-content">
        <p class="notification-message">${this.escapeHtml(message)}</p>
      </div>
      <button class="notification-close" aria-label="Chiudi">&times;</button>
    `;

    // Event listener per chiusura
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => {
      this.remove(notification);
    });

    return notification;
  },

  /**
   * Rimuove una notifica con animazione
   * @param {HTMLElement} notification - Elemento da rimuovere
   */
  remove(notification) {
    if (!notification || !notification.parentElement) return;

    notification.classList.add('removing');
    setTimeout(() => {
      notification.remove();
    }, 300);
  },

  /**
   * Escape HTML per prevenire XSS
   * @param {string} text - Testo da escapare
   * @returns {string} - Testo escapato
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  // ==================== METODI SHORTCUT ====================

  /**
   * Mostra notifica di successo
   * @param {string} message - Messaggio
   * @param {number} duration - Durata (opzionale)
   */
  success(message, duration) {
    return this.show(message, 'success', duration);
  },

  /**
   * Mostra notifica di errore
   * @param {string} message - Messaggio
   * @param {number} duration - Durata (opzionale)
   */
  error(message, duration) {
    return this.show(message, 'error', duration);
  },

  /**
   * Mostra notifica di warning
   * @param {string} message - Messaggio
   * @param {number} duration - Durata (opzionale)
   */
  warning(message, duration) {
    return this.show(message, 'warning', duration);
  },

  /**
   * Mostra notifica informativa
   * @param {string} message - Messaggio
   * @param {number} duration - Durata (opzionale)
   */
  info(message, duration) {
    return this.show(message, 'info', duration);
  },

  /**
   * Rimuove tutte le notifiche
   */
  clearAll() {
    if (!this.container) return;
    const notifications = this.container.querySelectorAll('.notification');
    notifications.forEach(n => this.remove(n));
  },

  /**
   * Cambia posizione delle notifiche
   * @param {string} position - 'top-right', 'top-left', 'bottom-right', 'bottom-left'
   */
  setPosition(position) {
    if (!this.container) return;
    this.container.className = `notification-container ${position}`;
    this.config.position = position;
  },

  /**
   * Cambia durata default
   * @param {number} duration - Durata in ms
   */
  setDuration(duration) {
    this.config.duration = duration;
  }
};
