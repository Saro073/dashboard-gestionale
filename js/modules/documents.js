// ==================== DOCUMENTS MODULE ====================
/**
 * DocumentsModule - Gestione documenti
 * Permette upload, download, eliminazione e organizzazione documenti
 * 
 * NOTA: Poiché stiamo usando localStorage, i file vengono convertiti in base64
 * Per applicazioni production, considerare un backend con storage reale
 */

const DocumentsModule = {
  
  /**
   * Limiti file
   */
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB in localStorage
  
  ALLOWED_EXTENSIONS: [
    'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
    'txt', 'csv', 'jpg', 'jpeg', 'png', 'gif', 'zip', 'rar',
    // Formati Apple iWork
    'pages', 'numbers', 'key'
  ],
  
  /**
   * Ottiene tutti i documenti
   * @returns {Array} - Array di documenti
   */
  getAll() {
    return StorageManager.load(CONFIG.STORAGE_KEYS.DOCUMENTS, []);
  },
  
  /**
   * Ottiene documento per ID
   * @param {number} id - ID documento
   * @returns {object|null} - Documento o null
   */
  getById(id) {
    const documents = this.getAll();
    return documents.find(d => d.id === id) || null;
  },
  
  /**
   * Upload documento
   * @param {File} file - File da caricare
   * @param {object} metadata - Metadati (category, description, tags)
   * @returns {Promise<object>} - { success: boolean, document: object|null, message: string }
   */
  async upload(file, metadata = {}) {
    const currentUser = AuthManager.getCurrentUser();
    
    if (!currentUser) {
      return { success: false, document: null, message: 'Non autenticato' };
    }
    
    // Validazione file
    const validation = this.validateFile(file);
    if (!validation.valid) {
      NotificationService.error(validation.message);
      return { success: false, document: null, message: validation.message };
    }
    
    try {
      // Converti file in base64
      const base64 = await this.fileToBase64(file);
      
      // Crea documento
      const document = {
        id: Utils.generateId(),
        name: file.name,
        originalName: file.name,
        size: file.size,
        sizeFormatted: this.formatFileSize(file.size),
        type: file.type,
        extension: this.getFileExtension(file.name),
        category: metadata.category || CONFIG.DOCUMENT_CATEGORIES.ALTRO,
        description: metadata.description || '',
        tags: metadata.tags || [],
        base64Data: base64, // Salva contenuto
        uploadedBy: currentUser.id,
        uploadedByUsername: currentUser.username,
        uploadedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Salva
      const documents = this.getAll();
      documents.unshift(document);
      
      // Verifica spazio disponibile
      try {
        StorageManager.save(CONFIG.STORAGE_KEYS.DOCUMENTS, documents);
      } catch (error) {
        NotificationService.error('Spazio insufficiente. Elimina alcuni documenti.');
        return { success: false, document: null, message: 'Quota storage superata' };
      }
      
      // Log attività
      ActivityLog.log(CONFIG.ACTION_TYPES.CREATE, CONFIG.ENTITY_TYPES.DOCUMENT, document.id, {
        name: document.name,
        size: document.sizeFormatted
      });
      
      // Emetti evento
      EventBus.emit(EVENTS.DOCUMENT_UPLOADED, document);
      
      // Notifica
      NotificationService.success(`Documento "${file.name}" caricato!`);
      
      return { success: true, document, message: 'Documento caricato' };
      
    } catch (error) {
      console.error('Error uploading document:', error);
      NotificationService.error('Errore durante il caricamento');
      return { success: false, document: null, message: 'Errore upload' };
    }
  },
  
  /**
   * Valida file
   * @param {File} file - File da validare
   * @returns {object} - { valid: boolean, message: string }
   */
  validateFile(file) {
    // Verifica esistenza
    if (!file) {
      return { valid: false, message: 'Nessun file selezionato' };
    }
    
    // Verifica dimensione
    if (file.size > this.MAX_FILE_SIZE) {
      return { 
        valid: false, 
        message: `File troppo grande (max ${this.formatFileSize(this.MAX_FILE_SIZE)})` 
      };
    }
    
    // Verifica estensione
    const ext = this.getFileExtension(file.name).toLowerCase();
    if (!this.ALLOWED_EXTENSIONS.includes(ext)) {
      return { 
        valid: false, 
        message: `Formato non supportato. Formati consentiti: ${this.ALLOWED_EXTENSIONS.join(', ')}` 
      };
    }
    
    return { valid: true, message: 'OK' };
  },
  
  /**
   * Converte file in base64
   * @param {File} file - File
   * @returns {Promise<string>} - Stringa base64
   */
  fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  },
  
  /**
   * Download documento
   * @param {number} id - ID documento
   */
  download(id) {
    const document = this.getById(id);
    
    if (!document) {
      NotificationService.error('Documento non trovato');
      return;
    }
    
    // Crea link temporaneo per download
    const link = document.createElement('a');
    link.href = document.base64Data;
    link.download = document.originalName;
    link.click();
    
    // Log attività
    ActivityLog.log(CONFIG.ACTION_TYPES.DOWNLOAD, CONFIG.ENTITY_TYPES.DOCUMENT, id, {
      name: document.name
    });
    
    NotificationService.info(`Download "${document.name}" avviato`);
  },
  
  /**
   * Aggiorna metadati documento
   * @param {number} id - ID documento
   * @param {object} updates - Metadati da aggiornare
   * @returns {object} - { success: boolean, document: object|null, message: string }
   */
  updateMetadata(id, updates) {
    const documents = this.getAll();
    const index = documents.findIndex(d => d.id === id);
    
    if (index === -1) {
      return { success: false, document: null, message: 'Documento non trovato' };
    }
    
    const document = documents[index];
    
    // Verifica permessi
    if (!PermissionsManager.canEditDocument(document)) {
      NotificationService.error('Non hai i permessi per modificare questo documento');
      return { success: false, document: null, message: 'Non autorizzato' };
    }
    
    // Aggiorna solo metadati (non il file stesso)
    const currentUser = AuthManager.getCurrentUser();
    documents[index] = {
      ...document,
      category: updates.category !== undefined ? updates.category : document.category,
      description: updates.description !== undefined ? updates.description : document.description,
      tags: updates.tags !== undefined ? updates.tags : document.tags,
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser.id,
      updatedByUsername: currentUser.username
    };
    
    StorageManager.save(CONFIG.STORAGE_KEYS.DOCUMENTS, documents);
    
    NotificationService.success('Documento aggiornato!');
    
    return { success: true, document: documents[index], message: 'Documento aggiornato' };
  },
  
  /**
   * Elimina documento
   * @param {number} id - ID documento
   * @returns {object} - { success: boolean, message: string }
   */
  delete(id) {
    const documents = this.getAll();
    const document = documents.find(d => d.id === id);
    
    if (!document) {
      return { success: false, message: 'Documento non trovato' };
    }
    
    // Verifica permessi
    if (!PermissionsManager.canDeleteDocument(document)) {
      NotificationService.error('Non hai i permessi per eliminare questo documento');
      return { success: false, message: 'Non autorizzato' };
    }
    
    const filtered = documents.filter(d => d.id !== id);
    StorageManager.save(CONFIG.STORAGE_KEYS.DOCUMENTS, filtered);
    
    // Log attività
    ActivityLog.log(CONFIG.ACTION_TYPES.DELETE, CONFIG.ENTITY_TYPES.DOCUMENT, id, {
      name: document.name
    });
    
    // Emetti evento
    EventBus.emit(EVENTS.DOCUMENT_DELETED, { id, document });
    
    // Notifica
    NotificationService.success('Documento eliminato');
    
    return { success: true, message: 'Documento eliminato' };
  },
  
  /**
   * Filtra documenti per categoria
   * @param {string} category - Categoria
   * @returns {Array} - Array filtrato
   */
  filterByCategory(category) {
    if (category === 'all') return this.getAll();
    const documents = this.getAll();
    return documents.filter(d => d.category === category);
  },
  
  /**
   * Cerca documenti
   * @param {string} searchTerm - Termine di ricerca
   * @returns {Array} - Array filtrato
   */
  search(searchTerm) {
    const documents = this.getAll();
    return Utils.filterBySearch(documents, searchTerm, ['name', 'description', 'tags']);
  },
  
  /**
   * Filtra per estensione
   * @param {string} extension - Estensione (es: 'pdf')
   * @returns {Array} - Array filtrato
   */
  filterByExtension(extension) {
    const documents = this.getAll();
    return documents.filter(d => d.extension.toLowerCase() === extension.toLowerCase());
  },
  
  /**
   * Ottiene dimensione totale documenti
   * @returns {number} - Dimensione in bytes
   */
  getTotalSize() {
    const documents = this.getAll();
    return documents.reduce((total, doc) => total + doc.size, 0);
  },
  
  /**
   * Statistiche documenti
   * @returns {object} - Statistiche
   */
  getStats() {
    const documents = this.getAll();
    
    return {
      total: documents.length,
      totalSize: this.getTotalSize(),
      totalSizeFormatted: this.formatFileSize(this.getTotalSize()),
      byCategory: {
        contratti: documents.filter(d => d.category === CONFIG.DOCUMENT_CATEGORIES.CONTRATTI).length,
        fatture: documents.filter(d => d.category === CONFIG.DOCUMENT_CATEGORIES.FATTURE).length,
        reports: documents.filter(d => d.category === CONFIG.DOCUMENT_CATEGORIES.REPORTS).length,
        altro: documents.filter(d => d.category === CONFIG.DOCUMENT_CATEGORIES.ALTRO).length
      },
      byExtension: this.getExtensionStats()
    };
  },
  
  /**
   * Statistiche per estensione
   * @returns {object} - { pdf: 5, doc: 3, ... }
   */
  getExtensionStats() {
    const documents = this.getAll();
    const stats = {};
    
    documents.forEach(doc => {
      const ext = doc.extension.toLowerCase();
      stats[ext] = (stats[ext] || 0) + 1;
    });
    
    return stats;
  },
  
  /**
   * Formatta dimensione file
   * @param {number} bytes - Dimensione in bytes
   * @returns {string} - Dimensione formattata (es: '1.5 MB')
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  },
  
  /**
   * Ottiene estensione file
   * @param {string} filename - Nome file
   * @returns {string} - Estensione
   */
  getFileExtension(filename) {
    return filename.split('.').pop() || '';
  },
  
  /**
   * Ottiene icona per tipo file
   * @param {string} extension - Estensione
   * @returns {string} - Emoji icona
   */
  getFileIcon(extension) {
    const icons = {
      pdf: '📄',
      doc: '📄',
      docx: '📄',
      xls: '📈',
      xlsx: '📈',
      ppt: '📊',
      pptx: '📊',
      txt: '📃',
      csv: '📋',
      jpg: '🖼️',
      jpeg: '🖼️',
      png: '🖼️',
      gif: '🖼️',
      zip: '🗃️',
      rar: '🗃️',
      // Icone Apple iWork
      pages: '📘',   // Libro arancione (documento testo)
      numbers: '📊', // Grafico (foglio calcolo)
      key: '📽️'     // Proiettore (presentazione)
    };
    return icons[extension.toLowerCase()] || '📁';
  }
};