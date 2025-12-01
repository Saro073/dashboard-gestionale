// ==================== STORAGE MANAGER ====================
// Gestisce tutte le operazioni di localStorage con error handling

const StorageManager = {
  
  /**
   * Salva dati nel localStorage
   * @param {string} key - Chiave di storage
   * @param {any} data - Dati da salvare
   * @returns {boolean} - True se successo
   */
  save(key, data) {
    try {
      const serialized = JSON.stringify(data);
      localStorage.setItem(key, serialized);
      return true;
    } catch (error) {
      console.error(`Errore salvataggio ${key}:`, error);
      return false;
    }
  },
  
  /**
   * Carica dati dal localStorage
   * @param {string} key - Chiave di storage
   * @param {any} defaultValue - Valore di default se non trovato
   * @returns {any} - Dati deserializzati o defaultValue
   */
  load(key, defaultValue = null) {
    try {
      const serialized = localStorage.getItem(key);
      return serialized ? JSON.parse(serialized) : defaultValue;
    } catch (error) {
      console.error(`Errore caricamento ${key}:`, error);
      return defaultValue;
    }
  },
  
  /**
   * Rimuove dati dal localStorage
   * @param {string} key - Chiave da rimuovere
   * @returns {boolean} - True se successo
   */
  remove(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`Errore rimozione ${key}:`, error);
      return false;
    }
  },
  
  /**
   * Pulisce completamente il localStorage
   * @returns {boolean} - True se successo
   */
  clear() {
    try {
      localStorage.clear();
      return true;
    } catch (error) {
      console.error('Errore pulizia storage:', error);
      return false;
    }
  },
  
  /**
   * Verifica se una chiave esiste
   * @param {string} key - Chiave da verificare
   * @returns {boolean} - True se esiste
   */
  exists(key) {
    return localStorage.getItem(key) !== null;
  },
  
  /**
   * Ottiene tutte le chiavi dello storage
   * @returns {string[]} - Array di chiavi
   */
  getAllKeys() {
    return Object.keys(localStorage);
  },
  
  /**
   * Esporta tutti i dati dell'applicazione
   * @returns {object} - Oggetto con tutti i dati
   */
  exportAll() {
    const data = {};
    Object.keys(CONFIG.STORAGE_KEYS).forEach(key => {
      const storageKey = CONFIG.STORAGE_KEYS[key];
      data[key] = this.load(storageKey);
    });
    return data;
  },
  
  /**
   * Importa dati nell'applicazione
   * @param {object} data - Dati da importare
   * @returns {boolean} - True se successo
   */
  importAll(data) {
    try {
      Object.keys(data).forEach(key => {
        if (CONFIG.STORAGE_KEYS[key]) {
          const storageKey = CONFIG.STORAGE_KEYS[key];
          this.save(storageKey, data[key]);
        }
      });
      return true;
    } catch (error) {
      console.error('Errore importazione dati:', error);
      return false;
    }
  },
  
  /**
   * Calcola dimensione storage utilizzato (approssimativa)
   * @returns {number} - Dimensione in bytes
   */
  getStorageSize() {
    let size = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        size += localStorage[key].length + key.length;
      }
    }
    return size;
  },
  
  /**
   * Formatta dimensione storage in modo leggibile
   * @returns {string} - Dimensione formattata
   */
  getStorageSizeFormatted() {
    const bytes = this.getStorageSize();
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / 1048576).toFixed(2) + ' MB';
  }
};
