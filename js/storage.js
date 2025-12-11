// ==================== STORAGE MANAGER ====================
// Gestisce tutte le operazioni di storage con persistenza su file system
// NUOVA VERSIONE: Usa backend Node.js invece di localStorage del browser
// I dati vengono salvati in ./data/*.json e backuppati automaticamente

const StorageManager = {
  // URL del backend storage server
  API_URL: 'http://localhost:3000/api/storage',
  
  // Cache locale per operazioni sincrone (fallback)
  _cache: {},
  _initialized: false,
  
  /**
   * Inizializza il manager caricando tutti i dati esistenti
   * Chiamato automaticamente al primo utilizzo
   */
  async _init() {
    if (this._initialized) return;
    
    try {
      // Verifica che il backend sia attivo
      const healthCheck = await fetch('http://localhost:3000/health');
      if (!healthCheck.ok) {
        throw new Error('Backend storage non raggiungibile');
      }
      
      // Carica tutte le chiavi esistenti nella cache
      const response = await fetch(this.API_URL);
      const result = await response.json();
      
      if (result.success && result.keys) {
        // Pre-carica in cache per operazioni sincrone
        for (const key of result.keys) {
          const data = await this._fetchData(key);
          this._cache[key] = data;
        }
      }
      
      this._initialized = true;
      console.log('✅ StorageManager inizializzato (backend attivo)');
    } catch (error) {
      console.error('⚠️ Backend storage non disponibile, uso localStorage come fallback:', error.message);
      // Fallback: carica da localStorage se backend non disponibile
      this._loadFromLocalStorage();
      this._initialized = true;
    }
  },
  
  /**
   * Carica dati da localStorage come fallback
   */
  _loadFromLocalStorage() {
    try {
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          this._cache[key] = JSON.parse(localStorage.getItem(key));
        }
      }
      console.log('📦 Dati caricati da localStorage (fallback)');
    } catch (error) {
      console.error('Errore caricamento localStorage:', error);
    }
  },
  
  /**
   * Fetch dati dal backend
   */
  async _fetchData(key) {
    try {
      const response = await fetch(`${this.API_URL}/${key}`);
      const result = await response.json();
      return result.success ? result.data : null;
    } catch (error) {
      console.error(`Errore fetch ${key}:`, error);
      return null;
    }
  },
  
  /**
   * Salva dati (ASYNC - versione principale)
   * @param {string} key - Chiave di storage
   * @param {any} data - Dati da salvare
   * @returns {Promise<boolean>} - True se successo
   */
  async saveAsync(key, data) {
    await this._init();
    
    try {
      const response = await fetch(`${this.API_URL}/${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data })
      });
      
      const result = await response.json();
      
      if (result.success) {
        this._cache[key] = data;
        // Sincronizza anche con localStorage come backup
        try {
          localStorage.setItem(key, JSON.stringify(data));
        } catch (e) {
          console.warn('localStorage backup fallito:', e.message);
        }
        return true;
      }
      
      return false;
    } catch (error) {
      console.error(`❌ Errore salvataggio ${key}:`, error);
      // Fallback: salva solo in localStorage
      try {
        localStorage.setItem(key, JSON.stringify(data));
        this._cache[key] = data;
        return true;
      } catch (e) {
        return false;
      }
    }
  },
  
  /**
   * Salva dati (SYNC - wrapper per compatibilità)
   * ATTENZIONE: Usa cache locale, salvataggio backend avviene in background
   * @param {string} key - Chiave di storage
   * @param {any} data - Dati da salvare
   * @returns {boolean} - True se successo (sempre true, salvataggio async)
   */
  save(key, data) {
    // Salva immediatamente in cache per reattività UI
    this._cache[key] = data;
    
    // Salva in background (non bloccante)
    this.saveAsync(key, data).catch(err => {
      console.error(`Background save failed for ${key}:`, err);
    });
    
    return true;
  },
  
  /**
   * Carica dati (ASYNC - versione principale)
   * @param {string} key - Chiave di storage
   * @param {any} defaultValue - Valore di default se non trovato
   * @returns {Promise<any>} - Dati deserializzati o defaultValue
   */
  async loadAsync(key, defaultValue = null) {
    await this._init();
    
    try {
      const response = await fetch(`${this.API_URL}/${key}`);
      const result = await response.json();
      
      if (result.success && result.data !== null) {
        this._cache[key] = result.data;
        return result.data;
      }
      
      return defaultValue;
    } catch (error) {
      console.error(`❌ Errore caricamento ${key}:`, error);
      // Fallback: usa cache o localStorage
      if (this._cache[key]) return this._cache[key];
      
      try {
        const localData = localStorage.getItem(key);
        return localData ? JSON.parse(localData) : defaultValue;
      } catch (e) {
        return defaultValue;
      }
    }
  },
  
  /**
   * Carica dati (SYNC - versione compatibilità)
   * ATTENZIONE: Usa cache locale, se dati non in cache restituisce defaultValue
   * Per garantire dati aggiornati, usare loadAsync()
   * @param {string} key - Chiave di storage
   * @param {any} defaultValue - Valore di default se non trovato
   * @returns {any} - Dati dalla cache o defaultValue
   */
  load(key, defaultValue = null) {
    // Se in cache, restituisci immediatamente
    if (this._cache[key] !== undefined) {
      return this._cache[key];
    }
    
    // Prova localStorage come fallback
    try {
      const localData = localStorage.getItem(key);
      if (localData) {
        const parsed = JSON.parse(localData);
        this._cache[key] = parsed;
        return parsed;
      }
    } catch (e) {
      console.error(`Errore load localStorage ${key}:`, e);
    }
    
    // Avvia caricamento async in background (aggiorna cache per prossime letture)
    this.loadAsync(key, defaultValue).then(data => {
      if (data !== null) {
        this._cache[key] = data;
      }
    }).catch(err => console.error(`Background load failed for ${key}:`, err));
    
    return defaultValue;
  },
  
  /**
   * Rimuove dati
   * @param {string} key - Chiave da rimuovere
   * @returns {Promise<boolean>} - True se successo
   */
  async removeAsync(key) {
    await this._init();
    
    try {
      const response = await fetch(`${this.API_URL}/${key}`, {
        method: 'DELETE'
      });
      
      const result = await response.json();
      
      if (result.success) {
        delete this._cache[key];
        localStorage.removeItem(key);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error(`❌ Errore rimozione ${key}:`, error);
      // Fallback
      delete this._cache[key];
      localStorage.removeItem(key);
      return true;
    }
  },
  
  /**
   * Rimuove dati (SYNC wrapper)
   */
  remove(key) {
    delete this._cache[key];
    this.removeAsync(key).catch(err => console.error(`Remove failed for ${key}:`, err));
    return true;
  },
  
  /**
   * Pulisce completamente lo storage (PERICOLOSO!)
   * @returns {Promise<boolean>} - True se successo
   */
  async clearAsync() {
    await this._init();
    
    try {
      const allKeys = await this.getAllKeysAsync();
      for (const key of allKeys) {
        await this.removeAsync(key);
      }
      this._cache = {};
      localStorage.clear();
      return true;
    } catch (error) {
      console.error('❌ Errore pulizia storage:', error);
      return false;
    }
  },
  
  /**
   * Pulisce storage (SYNC wrapper)
   */
  clear() {
    this._cache = {};
    this.clearAsync().catch(err => console.error('Clear failed:', err));
    return true;
  },
  
  /**
   * Verifica se una chiave esiste
   * @param {string} key - Chiave da verificare
   * @returns {boolean} - True se esiste nella cache o localStorage
   */
  exists(key) {
    if (this._cache[key] !== undefined) return true;
    return localStorage.getItem(key) !== null;
  },
  
  /**
   * Ottiene tutte le chiavi dello storage (ASYNC)
   * @returns {Promise<string[]>} - Array di chiavi
   */
  async getAllKeysAsync() {
    await this._init();
    
    try {
      const response = await fetch(this.API_URL);
      const result = await response.json();
      return result.success ? result.keys : [];
    } catch (error) {
      console.error('❌ Errore getAllKeys:', error);
      return Object.keys(this._cache);
    }
  },
  
  /**
   * Ottiene tutte le chiavi (SYNC - dalla cache)
   * @returns {string[]} - Array di chiavi
   */
  getAllKeys() {
    return Object.keys(this._cache);
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
   * Calcola dimensione storage utilizzato
   * @returns {number} - Dimensione in bytes (approssimativa dalla cache)
   */
  getStorageSize() {
    let size = 0;
    for (let key in this._cache) {
      const serialized = JSON.stringify(this._cache[key]);
      size += serialized.length + key.length;
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
  },
  
  /**
   * Crea backup manuale completo
   * @returns {Promise<boolean>}
   */
  async createBackup() {
    try {
      const response = await fetch('http://localhost:3000/api/backup', {
        method: 'POST'
      });
      const result = await response.json();
      return result.success;
    } catch (error) {
      console.error('❌ Errore creazione backup:', error);
      return false;
    }
  }
};
