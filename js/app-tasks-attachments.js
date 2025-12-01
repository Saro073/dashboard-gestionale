// ==================== TASK ATTACHMENTS HANDLER ====================
// Aggiungere questi metodi nella classe DashboardApp in js/app.js

// MODIFICA 1: Nel metodo saveTask() aggiungere DOPO la creazione del data object:

// Gestione allegati
const attachmentsInput = document.getElementById('taskAttachments');
if (attachmentsInput && attachmentsInput.files.length > 0) {
  // Salva task prima senza allegati
  let result;
  if (this.currentEditingTaskId) {
    result = TasksModule.update(this.currentEditingTaskId, data);
  } else {
    result = TasksModule.create(data);
  }
  
  if (result.success) {
    const taskId = result.task.id;
    
    // Carica allegati uno per uno
    const files = Array.from(attachmentsInput.files);
    let uploadedCount = 0;
    
    for (const file of files) {
      const uploadResult = await TasksModule.addAttachment(taskId, file);
      if (uploadResult.success) {
        uploadedCount++;
      }
    }
    
    NotificationService.success(`Task salvato con ${uploadedCount} allegato/i`);
    
    // Chiudi modal e reset
    document.getElementById('taskModal').classList.remove('active');
    document.getElementById('taskForm').reset();
    this.currentEditingTaskId = null;
    this.renderTasks();
    
    return; // Esci dalla funzione
  }
}

// MODIFICA 2: Nel metodo renderTasks() aggiornare la parte HTML per visualizzare allegati:
// Sostituire la riga con task.description con:

${task.description ? `<p>${Utils.escapeHtml(task.description)}</p>` : ''}
${task.attachments && task.attachments.length > 0 ? `
  <div class="task-attachments">
    <strong>📎 Allegati (${task.attachments.length}):</strong>
    ${task.attachments.map(att => `
      <span class="attachment-badge">
        ${Utils.escapeHtml(att.name)} (${att.sizeFormatted})
        <button class="btn-attachment-download" onclick="app.downloadTaskAttachment(${task.id}, ${att.id})" title="Scarica">⬇️</button>
        ${PermissionsManager.canEditTask(task) ? 
          `<button class="btn-attachment-remove" onclick="app.removeTaskAttachment(${task.id}, ${att.id})" title="Rimuovi">✕</button>` : ''}
      </span>
    `).join('')}
  </div>
` : ''}

// MODIFICA 3: Aggiungere questi 3 nuovi metodi nella sezione TASKS LISTENERS:

/**
 * Scarica allegato da task
 */
downloadTaskAttachment(taskId, attachmentId) {
  TasksModule.downloadAttachment(taskId, attachmentId);
}

/**
 * Rimuovi allegato da task
 */
removeTaskAttachment(taskId, attachmentId) {
  if (confirm('Rimuovere questo allegato?')) {
    const result = TasksModule.removeAttachment(taskId, attachmentId);
    if (result.success) {
      this.renderTasks();
    }
  }
}

/**
 * Mostra allegati esistenti quando si apre modal in edit
 */
showTaskAttachments(taskId) {
  const task = TasksModule.getById(taskId);
  if (!task || !task.attachments || task.attachments.length === 0) {
    document.getElementById('taskAttachmentsList').style.display = 'none';
    return;
  }
  
  const container = document.getElementById('taskCurrentAttachments');
  container.innerHTML = task.attachments.map(att => `
    <div class="attachment-item">
      <span class="attachment-icon">${DocumentsModule.getFileIcon(att.extension)}</span>
      <span class="attachment-name">${Utils.escapeHtml(att.name)}</span>
      <span class="attachment-size">${att.sizeFormatted}</span>
      <button class="btn btn-sm" onclick="app.downloadTaskAttachment(${taskId}, ${att.id})" title="Scarica">⬇️</button>
      <button class="btn btn-sm btn-danger" onclick="app.removeTaskAttachment(${taskId}, ${att.id})" title="Rimuovi">✕</button>
    </div>
  `).join('');
  
  document.getElementById('taskAttachmentsList').style.display = 'block';
}

// MODIFICA 4: Nel metodo editTask() aggiungere ALLA FINE (prima di classList.add('active')):

// Mostra allegati esistenti
this.showTaskAttachments(id);

// MODIFICA 5: Nel metodo openTaskModal() aggiungere ALLA FINE:

// Nascondi lista allegati (modalità create)
document.getElementById('taskAttachmentsList').style.display = 'none';
document.getElementById('taskAttachments').value = '';

// MODIFICA 6: Aggiungere stili CSS in styles.css:

/* Task Attachments Styles */
.task-attachments {
  margin-top: 0.75rem;
  padding: 0.75rem;
  background: var(--bg-color);
  border-radius: var(--radius-sm);
  border-left: 3px solid var(--primary-color);
}

.attachment-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  margin: 0.25rem;
  padding: 0.375rem 0.625rem;
  background: var(--surface-color);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  font-size: 0.8125rem;
}

.btn-attachment-download,
.btn-attachment-remove {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.875rem;
  padding: 0.125rem 0.25rem;
  transition: transform 0.2s;
}

.btn-attachment-download:hover {
  transform: scale(1.2);
}

.btn-attachment-remove {
  color: var(--danger-color);
}

.btn-attachment-remove:hover {
  transform: scale(1.2);
}

.attachments-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.attachment-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  background: var(--bg-color);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
}

.attachment-icon {
  font-size: 1.25rem;
}

.attachment-name {
  flex: 1;
  font-size: 0.875rem;
}

.attachment-size {
  font-size: 0.75rem;
  color: var(--text-muted);
}

/* ==================== ISTRUZIONI COMPLETE ==================== */

/*
PER APPLICARE TUTTE LE MODIFICHE:

1. Apri js/app.js

2. Nel metodo saveTask() (circa riga 850):
   - Dopo la riga "const data = { ... };"
   - PRIMA di "let result;"
   - Aggiungi il blocco "Gestione allegati" (MODIFICA 1)
   - Rendi saveTask() async: "async saveTask() {"

3. Nel metodo renderTasks() (circa riga 300):
   - Trova la riga con ${task.description ? ...}
   - Sostituisci con il nuovo codice (MODIFICA 2)

4. Dopo il metodo deleteTask() (circa riga 880):
   - Aggiungi i 3 nuovi metodi (MODIFICA 3)

5. Nel metodo editTask() (circa riga 825):
   - Aggiungi "this.showTaskAttachments(id);" alla fine (MODIFICA 4)

6. Nel metodo openTaskModal() (circa riga 815):
   - Aggiungi le 2 righe alla fine (MODIFICA 5)

7. Apri styles.css e aggiungi gli stili (MODIFICA 6) alla fine del file

8. Salva tutto e ricarica la pagina!

*/