// ==================== NOTES MODULE ====================
/**
 * NotesModule - Gestione note
 * Permette creazione, modifica, eliminazione e ricerca note
 */

const NotesModule = {
  
  /**
   * Ottiene tutte le note
   * @returns {Array} - Array di note
   */
  getAll() {
    return StorageManager.load(CONFIG.STORAGE_KEYS.NOTES, []);
  },
  
  /**
   * Ottiene nota per ID
   * @param {number} id - ID nota
   * @returns {object|null} - Nota o null
   */
  getById(id) {
    const notes = this.getAll();
    return notes.find(n => n.id === id) || null;
  },
  
  /**
   * Crea nuova nota
   * @param {object} noteData - Dati nota
   * @returns {object} - { success: boolean, note: object|null, message: string }
   */
  create(noteData) {
    const currentUser = AuthManager.getCurrentUser();
    
    if (!currentUser) {
      return { success: false, note: null, message: 'Non autenticato' };
    }
    
    // Validazione
    if (!noteData.title || noteData.title.trim() === '') {
      return { success: false, note: null, message: 'Titolo richiesto' };
    }
    
    if (!noteData.content || noteData.content.trim() === '') {
      return { success: false, note: null, message: 'Contenuto richiesto' };
    }
    
    // Crea nota - SANITIZZATA per XSS protection
    const note = {
      id: Utils.generateId(),
      title: Sanitizer.sanitize(noteData.title.trim()),
      content: Sanitizer.sanitize(noteData.content.trim()),
      category: noteData.category || CONFIG.NOTE_CATEGORIES.GENERALE,
      color: noteData.color || '#ffffff',
      pinned: noteData.pinned || false,
      isUrgent: noteData.isUrgent || false,
      tags: noteData.tags || [],
      createdBy: currentUser.id,
      createdByUsername: currentUser.username,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Salva
    const notes = this.getAll();
    notes.unshift(note); // Aggiungi all'inizio
    StorageManager.save(CONFIG.STORAGE_KEYS.NOTES, notes);
    
    // Log attività
    ActivityLog.log(CONFIG.ACTION_TYPES.CREATE, CONFIG.ENTITY_TYPES.NOTE, note.id, {
      title: note.title,
      category: note.category,
      isUrgent: note.isUrgent
    });
    
    // Emetti evento
    EventBus.emit(EVENTS.NOTE_CREATED, note);
    
    // Notifica
    NotificationService.success('Nota creata con successo!');
    
    return { success: true, note, message: 'Nota creata' };
  },
  
  /**
   * Aggiorna nota
   * @param {number} id - ID nota
   * @param {object} updates - Dati da aggiornare
   * @returns {object} - { success: boolean, note: object|null, message: string }
   */
  update(id, updates) {
    const notes = this.getAll();
    const index = notes.findIndex(n => n.id === id);
    
    if (index === -1) {
      return { success: false, note: null, message: 'Nota non trovata' };
    }
    
    const note = notes[index];
    
    // Verifica permessi
    if (!PermissionsManager.canEditNote(note)) {
      NotificationService.error('Non hai i permessi per modificare questa nota');
      return { success: false, note: null, message: 'Non autorizzato' };
    }
    
    // Validazione
    if (updates.title !== undefined && updates.title.trim() === '') {
      return { success: false, note: null, message: 'Titolo richiesto' };
    }
    
    if (updates.content !== undefined && updates.content.trim() === '') {
      return { success: false, note: null, message: 'Contenuto richiesto' };
    }
    
    // Aggiorna
    const currentUser = AuthManager.getCurrentUser();
    notes[index] = {
      ...note,
      ...updates,
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser.id,
      updatedByUsername: currentUser.username
    };
    
    StorageManager.save(CONFIG.STORAGE_KEYS.NOTES, notes);
    
    // Log attività
    ActivityLog.log(CONFIG.ACTION_TYPES.UPDATE, CONFIG.ENTITY_TYPES.NOTE, id, {
      title: notes[index].title
    });
    
    // Emetti evento
    EventBus.emit(EVENTS.NOTE_UPDATED, notes[index]);
    
    // Notifica
    NotificationService.success('Nota aggiornata!');
    
    return { success: true, note: notes[index], message: 'Nota aggiornata' };
  },
  
  /**
   * Elimina nota
   * @param {number} id - ID nota
   * @returns {object} - { success: boolean, message: string }
   */
  delete(id) {
    const notes = this.getAll();
    const note = notes.find(n => n.id === id);
    
    if (!note) {
      return { success: false, message: 'Nota non trovata' };
    }
    
    // Verifica permessi
    if (!PermissionsManager.canDeleteNote(note)) {
      NotificationService.error('Non hai i permessi per eliminare questa nota');
      return { success: false, message: 'Non autorizzato' };
    }
    
    const filtered = notes.filter(n => n.id !== id);
    StorageManager.save(CONFIG.STORAGE_KEYS.NOTES, filtered);
    
    // Log attività
    ActivityLog.log(CONFIG.ACTION_TYPES.DELETE, CONFIG.ENTITY_TYPES.NOTE, id, {
      title: note.title
    });
    
    // Emetti evento
    EventBus.emit(EVENTS.NOTE_DELETED, { id, note });
    
    // Notifica
    NotificationService.success('Nota eliminata');
    
    return { success: true, message: 'Nota eliminata' };
  },
  
  /**
   * Toggle pin nota
   * @param {number} id - ID nota
   * @returns {object} - { success: boolean, pinned: boolean }
   */
  togglePin(id) {
    const notes = this.getAll();
    const index = notes.findIndex(n => n.id === id);
    
    if (index === -1) {
      return { success: false, pinned: false };
    }
    
    notes[index].pinned = !notes[index].pinned;
    notes[index].updatedAt = new Date().toISOString();
    
    StorageManager.save(CONFIG.STORAGE_KEYS.NOTES, notes);
    
    EventBus.emit(EVENTS.NOTE_UPDATED, notes[index]);
    
    return { success: true, pinned: notes[index].pinned };
  },
  
  /**
   * Toggle flag urgente
   * @param {number} id - ID nota
   * @returns {object} - { success: boolean, isUrgent: boolean }
   */
  toggleUrgent(id) {
    const notes = this.getAll();
    const index = notes.findIndex(n => n.id === id);
    
    if (index === -1) {
      return { success: false, isUrgent: false };
    }
    
    notes[index].isUrgent = !notes[index].isUrgent;
    notes[index].updatedAt = new Date().toISOString();
    
    StorageManager.save(CONFIG.STORAGE_KEYS.NOTES, notes);
    
    EventBus.emit(EVENTS.NOTE_UPDATED, notes[index]);
    
    const message = notes[index].isUrgent ? 'Nota contrassegnata come urgente' : 'Flag urgente rimosso';
    NotificationService.success(message);
    
    return { success: true, isUrgent: notes[index].isUrgent };
  },
  
  /**
   * Filtra note per categoria
   * @param {string} category - Categoria
   * @returns {Array} - Array filtrato
   */
  filterByCategory(category) {
    if (category === 'all') return this.getAll();
    const notes = this.getAll();
    return notes.filter(n => n.category === category);
  },
  
  /**
   * Filtra note urgenti
   * @param {boolean} urgentOnly - Se true, mostra solo urgenti
   * @returns {Array} - Array filtrato
   */
  filterByUrgent(urgentOnly = true) {
    const notes = this.getAll();
    return urgentOnly ? notes.filter(n => n.isUrgent) : notes.filter(n => !n.isUrgent);
  },
  
  /**
   * Ottiene note pinnate
   * @returns {Array} - Array note pinnate
   */
  getPinned() {
    const notes = this.getAll();
    return notes.filter(n => n.pinned);
  },
  
  /**
   * Ottiene note urgenti
   * @returns {Array} - Array note urgenti
   */
  getUrgent() {
    const notes = this.getAll();
    return notes.filter(n => n.isUrgent);
  },
  
  /**
   * Cerca note
   * @param {string} searchTerm - Termine di ricerca
   * @returns {Array} - Array filtrato
   */
  search(searchTerm) {
    const notes = this.getAll();
    return Utils.filterBySearch(notes, searchTerm, ['title', 'content', 'tags']);
  },
  
  /**
   * Filtra note per tag
   * @param {string} tag - Tag
   * @returns {Array} - Array filtrato
   */
  filterByTag(tag) {
    const notes = this.getAll();
    return notes.filter(n => n.tags && n.tags.includes(tag));
  },
  
  /**
   * Ottiene tutti i tag usati
   * @returns {Array} - Array di tag unici
   */
  getAllTags() {
    const notes = this.getAll();
    const tags = new Set();
    notes.forEach(note => {
      if (note.tags) {
        note.tags.forEach(tag => tags.add(tag));
      }
    });
    return Array.from(tags).sort();
  },
  
  /**
   * Statistiche note
   * @returns {object} - Statistiche
   */
  getStats() {
    const notes = this.getAll();
    
    return {
      total: notes.length,
      pinned: notes.filter(n => n.pinned).length,
      urgent: notes.filter(n => n.isUrgent).length,
      byCategory: {
        lavoro: notes.filter(n => n.category === CONFIG.NOTE_CATEGORIES.LAVORO).length,
        personale: notes.filter(n => n.category === CONFIG.NOTE_CATEGORIES.PERSONALE).length,
        idee: notes.filter(n => n.category === CONFIG.NOTE_CATEGORIES.IDEE).length,
        generale: notes.filter(n => n.category === CONFIG.NOTE_CATEGORIES.GENERALE).length
      },
      totalTags: this.getAllTags().length
    };
  },
  
  /**
   * Esporta note in JSON
   * @returns {string} - JSON string
   */
  exportToJSON() {
    const notes = this.getAll();
    return JSON.stringify(notes, null, 2);
  },
  
  /**
   * Importa note da JSON
   * @param {string} jsonString - JSON delle note
   * @returns {object} - { success: boolean, imported: number, message: string }
   */
  importFromJSON(jsonString) {
    try {
      const importedNotes = JSON.parse(jsonString);
      
      if (!Array.isArray(importedNotes)) {
        return { success: false, imported: 0, message: 'Formato non valido' };
      }
      
      const currentUser = AuthManager.getCurrentUser();
      const existingNotes = this.getAll();
      
      // Rigenera ID e aggiorna ownership
      const newNotes = importedNotes.map(note => ({
        ...note,
        id: Utils.generateId(),
        importedBy: currentUser.id,
        importedAt: new Date().toISOString()
      }));
      
      const merged = [...existingNotes, ...newNotes];
      StorageManager.save(CONFIG.STORAGE_KEYS.NOTES, merged);
      
      NotificationService.success(`${newNotes.length} note importate!`);
      
      return { success: true, imported: newNotes.length, message: 'Import completato' };
    } catch (error) {
      NotificationService.error('Errore durante l\'import');
      return { success: false, imported: 0, message: 'Errore parsing JSON' };
    }
  }
};