// ==================== NOTE URGENTI - PATCH COMPLETO ====================

// ========== MODIFICA 1: index.html - Aggiungi checkbox nel Note Modal ==========
// Nel form #noteForm, dopo il campo noteCategory, aggiungere:

<div class="form-group">
  <label>
    <input type="checkbox" id="noteIsUrgent"> Contrassegna come urgente 🔴
  </label>
</div>

// ========== MODIFICA 2: index.html - Aggiungi filtro urgenti ==========
// Nel #notesSection .section-toolbar, dopo noteFilter, aggiungere:

<button id="noteUrgentFilterBtn" class="btn btn-secondary" onclick="app.toggleUrgentFilter()" title="Mostra solo note urgenti">
  🔴 Urgenti
</button>

// ========== MODIFICA 3: app.js - Metodi per gestire flag urgente ==========
// Nella classe DashboardApp, aggiungere dopo setupNotesListeners():

constructor() {
  this.currentEditingTaskId = null;
  this.showOnlyUrgentNotes = false; // <-- AGGIUNGI QUESTA RIGA
  this.init();
}

// Dopo il metodo togglePinNote(), aggiungere:

/**
 * Toggle flag urgente nota
 */
toggleUrgentNote(id) {
  NotesModule.toggleUrgent(id);
  this.renderNotes();
}

/**
 * Toggle filtro note urgenti
 */
toggleUrgentFilter() {
  this.showOnlyUrgentNotes = !this.showOnlyUrgentNotes;
  
  const btn = document.getElementById('noteUrgentFilterBtn');
  if (this.showOnlyUrgentNotes) {
    btn.classList.add('active');
    btn.style.background = '#ef4444';
    btn.style.color = 'white';
  } else {
    btn.classList.remove('active');
    btn.style.background = '';
    btn.style.color = '';
  }
  
  this.renderNotes();
}

// ========== MODIFICA 4: app.js - Aggiorna saveNote() ==========
// Nel metodo saveNote(), modificare la riga "const data = {" con:

saveNote() {
  const data = {
    title: document.getElementById('noteTitle').value,
    content: document.getElementById('noteContent').value,
    category: document.getElementById('noteCategory').value,
    isUrgent: document.getElementById('noteIsUrgent').checked  // <-- AGGIUNGI QUESTA RIGA
  };
  
  const result = NotesModule.create(data);
  if (result.success) {
    document.getElementById('noteModal').classList.remove('active');
    document.getElementById('noteForm').reset();
    this.renderNotes();
  }
}

// ========== MODIFICA 5: app.js - Aggiorna renderNotes() ==========
// Nel metodo renderNotes(), dopo "let filtered = NotesModule.filterByCategory(filter);" aggiungere:

renderNotes() {
  const container = document.getElementById('notesList');
  const filter = document.getElementById('noteFilter').value;
  const search = document.getElementById('noteSearch').value;
  
  let filtered = NotesModule.filterByCategory(filter);
  
  // AGGIUNGI QUESTE 3 RIGHE:
  if (this.showOnlyUrgentNotes) {
    filtered = filtered.filter(n => n.isUrgent);
  }
  
  if (search) {
    filtered = NotesModule.search(search);
  }
  
  // Filtra per permessi
  filtered = PermissionsManager.filterViewable(filtered, 'note');
  
  if (filtered.length === 0) {
    container.innerHTML = '<p class="empty-state">Nessuna nota trovata</p>';
    return;
  }
  
  container.innerHTML = filtered.map(note => `
    <div class="item-card note-card ${note.isUrgent ? 'note-urgent' : ''}">
      <h3>${Utils.escapeHtml(note.title)}</h3>
      <p class="note-content">${Utils.escapeHtml(note.content.substring(0, 150))}${note.content.length > 150 ? '...' : ''}</p>
      <div class="item-meta">
        <span class="item-badge badge-${note.category}">${note.category}</span>
        ${note.pinned ? '<span>📌 Pinned</span>' : ''}
        ${note.isUrgent ? '<span class="urgent-badge">🔴 URGENTE</span>' : ''}  
        <span class="activity-time">${Utils.formatDate(note.createdAt)}</span>
      </div>
      <div class="item-actions">
        <button class="btn btn-sm btn-secondary" onclick="app.togglePinNote(${note.id})">
          ${note.pinned ? 'Unpin' : 'Pin'}
        </button>
        <button class="btn btn-sm ${note.isUrgent ? 'btn-danger' : 'btn-secondary'}" onclick="app.toggleUrgentNote(${note.id})">
          ${note.isUrgent ? '🔴 Rimuovi Urgente' : '🔴 Urgente'}
        </button>
        ${PermissionsManager.canEditNote(note) ? 
          `<button class="btn btn-sm btn-secondary" onclick="app.editNote(${note.id})">Modifica</button>` : ''}
        ${PermissionsManager.canDeleteNote(note) ?
          `<button class="btn btn-sm btn-danger" onclick="app.deleteNote(${note.id})">Elimina</button>` : ''}
      </div>
    </div>
  `).join('');
}

// ========== MODIFICA 6: styles.css - Aggiungi stili note urgenti ==========
// Aggiungere alla fine del file:

/* Note Urgenti */
.note-urgent {
  border-left: 4px solid #ef4444 !important;
  background: rgba(239, 68, 68, 0.05);
}

.urgent-badge {
  background: #ef4444;
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: var(--radius-sm);
  font-weight: 600;
  font-size: 0.75rem;
  animation: pulse-urgent 2s infinite;
}

@keyframes pulse-urgent {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

.btn.active {
  box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.3);
}

/* ==================== ISTRUZIONI APPLICAZIONE ==================== */
/*

APPLICA LE MODIFICHE IN QUESTO ORDINE:

1. index.html:
   - Aggiungi checkbox "isUrgent" nel noteForm (dopo noteCategory)
   - Aggiungi pulsante filtro urgenti nella toolbar

2. app.js:
   - Aggiungi "showOnlyUrgentNotes: false" nel constructor
   - Aggiungi metodi toggleUrgentNote() e toggleUrgentFilter()
   - Modifica saveNote() per includere isUrgent
   - Aggiorna renderNotes() con filtro urgenti e badge rosso

3. styles.css:
   - Aggiungi stili .note-urgent, .urgent-badge e animazione

4. Salva e ricarica!

*/