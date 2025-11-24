// ==================== UTILITY FUNCTIONS ====================

const Utils = {
  
  /**
   * Genera un ID univoco
   * @returns {number} - Timestamp + random
   */
  generateId() {
    return Date.now() + Math.floor(Math.random() * 1000);
  },
  
  /**
   * Formatta una data
   * @param {string|Date} date - Data da formattare
   * @param {boolean} includeTime - Include ora
   * @returns {string} - Data formattata
   */
  formatDate(date, includeTime = false) {
    if (!date) return '-';
    const d = typeof date === 'string' ? new Date(date) : date;
    const options = includeTime ? CONFIG.DATE_FORMAT.DATETIME_OPTIONS : CONFIG.DATE_FORMAT.OPTIONS;
    return d.toLocaleString(CONFIG.DATE_FORMAT.LOCALE, options);
  },
  
  /**
   * Calcola tempo relativo (es: "2 ore fa")
   * @param {string|Date} date - Data
   * @returns {string} - Tempo relativo
   */
  getRelativeTime(date) {
    if (!date) return '-';
    const d = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diff = now - d;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (seconds < 60) return 'Ora';
    if (minutes < 60) return `${minutes} minuti fa`;
    if (hours < 24) return `${hours} ore fa`;
    if (days < 7) return `${days} giorni fa`;
    return this.formatDate(d);
  },
  
  /**
   * Valida email
   * @param {string} email - Email da validare
   * @returns {boolean} - True se valida
   */
  validateEmail(email) {
    return CONFIG.VALIDATION.EMAIL_REGEX.test(email);
  },
  
  /**
   * Valida password
   * @param {string} password - Password da validare
   * @returns {object} - { valid: boolean, message: string }
   */
  validatePassword(password) {
    if (!password) {
      return { valid: false, message: 'Password richiesta' };
    }
    if (password.length < CONFIG.VALIDATION.MIN_PASSWORD_LENGTH) {
      return { valid: false, message: `Password troppo corta (min ${CONFIG.VALIDATION.MIN_PASSWORD_LENGTH} caratteri)` };
    }
    if (password.length > CONFIG.VALIDATION.MAX_PASSWORD_LENGTH) {
      return { valid: false, message: `Password troppo lunga (max ${CONFIG.VALIDATION.MAX_PASSWORD_LENGTH} caratteri)` };
    }
    return { valid: true, message: '' };
  },
  
  /**
   * Valida username
   * @param {string} username - Username da validare
   * @returns {object} - { valid: boolean, message: string }
   */
  validateUsername(username) {
    if (!username) {
      return { valid: false, message: 'Username richiesto' };
    }
    if (username.length < CONFIG.VALIDATION.MIN_USERNAME_LENGTH) {
      return { valid: false, message: `Username troppo corto (min ${CONFIG.VALIDATION.MIN_USERNAME_LENGTH} caratteri)` };
    }
    if (username.length > CONFIG.VALIDATION.MAX_USERNAME_LENGTH) {
      return { valid: false, message: `Username troppo lungo (max ${CONFIG.VALIDATION.MAX_USERNAME_LENGTH} caratteri)` };
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return { valid: false, message: 'Username può contenere solo lettere, numeri e underscore' };
    }
    return { valid: true, message: '' };
  },
  
  /**
   * Sanitizza stringa HTML
   * @param {string} str - Stringa da sanitizzare
   * @returns {string} - Stringa sanitizzata
   */
  escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },
  
  /**
   * Capitalizza prima lettera
   * @param {string} str - Stringa
   * @returns {string} - Stringa capitalizzata
   */
  capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  },
  
  /**
   * Tronca testo
   * @param {string} text - Testo
   * @param {number} maxLength - Lunghezza massima
   * @returns {string} - Testo troncato
   */
  truncate(text, maxLength = 150) {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  },
  
  /**
   * Debounce function
   * @param {Function} func - Funzione da eseguire
   * @param {number} wait - Millisecondi di attesa
   * @returns {Function} - Funzione debounced
   */
  debounce(func, wait = 300) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },
  
  /**
   * Filtra array in base a stringa di ricerca
   * @param {Array} items - Array di oggetti
   * @param {string} searchTerm - Termine di ricerca
   * @param {string[]} fields - Campi da cercare
   * @returns {Array} - Array filtrato
   */
  filterBySearch(items, searchTerm, fields) {
    if (!searchTerm) return items;
    const term = searchTerm.toLowerCase();
    return items.filter(item => {
      return fields.some(field => {
        const value = item[field];
        return value && value.toString().toLowerCase().includes(term);
      });
    });
  },
  
  /**
   * Ordina array
   * @param {Array} items - Array da ordinare
   * @param {string} field - Campo per ordinamento
   * @param {string} order - 'asc' o 'desc'
   * @returns {Array} - Array ordinato
   */
  sortBy(items, field, order = 'asc') {
    return [...items].sort((a, b) => {
      const valA = a[field];
      const valB = b[field];
      
      if (typeof valA === 'string') {
        const comparison = valA.localeCompare(valB);
        return order === 'asc' ? comparison : -comparison;
      }
      
      const comparison = valA - valB;
      return order === 'asc' ? comparison : -comparison;
    });
  },
  
  /**
   * Copia testo negli appunti
   * @param {string} text - Testo da copiare
   * @returns {Promise<boolean>} - True se successo
   */
  async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      console.error('Errore copia clipboard:', error);
      return false;
    }
  },
  
  /**
   * Download file JSON
   * @param {object} data - Dati da esportare
   * @param {string} filename - Nome file
   */
  downloadJSON(data, filename = 'export.json') {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
};
