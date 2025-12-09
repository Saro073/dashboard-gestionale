// ==================== TASKS MODULE ====================

const TasksModule = {
  
  /**
   * Ottiene tutti i task visibili all'utente corrente
   * @returns {Array} - Array di task
   */
  getAll() {
    const tasks = StorageManager.load(CONFIG.STORAGE_KEYS.TASKS, []);
    return PermissionsManager.filterViewable(tasks, 'task');
  },
  
  /**
   * Ottiene task per ID
   * @param {number} id - ID task
   * @returns {object|null} - Task o null
   */
  getById(id) {
    const tasks = this.getAll();
    return tasks.find(t => t.id === id) || null;
  },
  
  /**
   * Crea nuovo task
   * @param {object} taskData - Dati task
   * @returns {object} - { success: boolean, task: object|null, message: string }
   */
  create(taskData) {
    const currentUser = AuthManager.getCurrentUser();
    
    if (!currentUser) {
      return { success: false, task: null, message: 'Non autenticato' };
    }
    
    // Validazione
    if (!taskData.title || taskData.title.trim() === '') {
      return { success: false, task: null, message: 'Titolo richiesto' };
    }
    
    // Crea task
    const task = {
      id: Utils.generateId(),
      title: taskData.title.trim(),
      description: taskData.description?.trim() || '',
      priority: taskData.priority || CONFIG.TASK_PRIORITIES.MEDIA,
      status: taskData.status || 'todo',
      dueDate: taskData.dueDate || null,
      completed: false,
      assignedTo: taskData.assignedTo || currentUser.id,
      assignedToUsername: taskData.assignedToUsername || currentUser.username,
      createdBy: currentUser.id,
      createdByUsername: currentUser.username,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completedAt: null,
      attachments: [] // Array di allegati
    };
    
    // Salva
    const allTasks = StorageManager.load(CONFIG.STORAGE_KEYS.TASKS, []);
    allTasks.push(task);
    StorageManager.save(CONFIG.STORAGE_KEYS.TASKS, allTasks);
    
    // Log attività
    ActivityLog.log(CONFIG.ACTION_TYPES.CREATE, CONFIG.ENTITY_TYPES.TASK, task.id, {
      title: task.title,
      priority: task.priority
    });
    
    EventBus.emit(EVENTS.TASK_CREATED, task);
    NotificationService.success('Task creato con successo');
    
    return { success: true, task, message: 'Task creato' };
  },
  
  /**
   * Aggiorna task
   * @param {number} id - ID task
   * @param {object} updates - Dati da aggiornare
   * @returns {object} - { success: boolean, task: object|null, message: string }
   */
  update(id, updates) {
    const allTasks = StorageManager.load(CONFIG.STORAGE_KEYS.TASKS, []);
    const index = allTasks.findIndex(t => t.id === id);
    
    if (index === -1) {
      return { success: false, task: null, message: 'Task non trovato' };
    }
    
    const task = allTasks[index];
    
    // Verifica permessi
    if (!PermissionsManager.canEditTask(task)) {
      return { success: false, task: null, message: 'Non autorizzato' };
    }
    
    // Validazione
    if (updates.title !== undefined && updates.title.trim() === '') {
      return { success: false, task: null, message: 'Titolo richiesto' };
    }
    
    // Aggiorna
    const currentUser = AuthManager.getCurrentUser();
    allTasks[index] = {
      ...task,
      ...updates,
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser.id,
      updatedByUsername: currentUser.username
    };
    
    StorageManager.save(CONFIG.STORAGE_KEYS.TASKS, allTasks);
    
    // Log attività
    ActivityLog.log(CONFIG.ACTION_TYPES.UPDATE, CONFIG.ENTITY_TYPES.TASK, id, {
      title: allTasks[index].title
    });
    
    NotificationService.success('Task aggiornato');
    
    return { success: true, task: allTasks[index], message: 'Task aggiornato' };
  },
  
  /**
   * Completa/Incompleta task
   * @param {number} id - ID task
   * @returns {object} - Risultato operazione
   */
  toggleComplete(id) {
    const allTasks = StorageManager.load(CONFIG.STORAGE_KEYS.TASKS, []);
    const task = allTasks.find(t => t.id === id);
    
    if (!task) {
      return { success: false, message: 'Task non trovato' };
    }
    
    // Verifica permessi
    if (!PermissionsManager.canEditTask(task)) {
      return { success: false, message: 'Non autorizzato' };
    }
    
    const updates = {
      completed: !task.completed,
      completedAt: !task.completed ? new Date().toISOString() : null
    };
    
    const result = this.update(id, updates);
    
    if (result.success) {
      EventBus.emit(EVENTS.TASK_COMPLETED, result.task);
    }
    
    return result;
  },
  
  /**
   * Elimina task
   * @param {number} id - ID task
   * @returns {object} - { success: boolean, message: string }
   */
  delete(id) {
    const allTasks = StorageManager.load(CONFIG.STORAGE_KEYS.TASKS, []);
    const task = allTasks.find(t => t.id === id);
    
    if (!task) {
      return { success: false, message: 'Task non trovato' };
    }
    
    // Verifica permessi
    if (!PermissionsManager.canDeleteTask(task)) {
      return { success: false, message: 'Non autorizzato' };
    }
    
    const filtered = allTasks.filter(t => t.id !== id);
    StorageManager.save(CONFIG.STORAGE_KEYS.TASKS, filtered);
    
    // Log attività
    ActivityLog.log(CONFIG.ACTION_TYPES.DELETE, CONFIG.ENTITY_TYPES.TASK, id, {
      title: task.title
    });
    
    EventBus.emit(EVENTS.TASK_DELETED, { id });
    NotificationService.success('Task eliminato');
    
    return { success: true, message: 'Task eliminato' };
  },
  
  /**
   * Elimina task multipli
   * @param {Array<number>} ids - Array ID task da eliminare
   * @returns {object} - { success: boolean, deleted: number, errors: number, message: string }
   */
  bulkDelete(ids) {
    if (!ids || ids.length === 0) {
      return { success: false, deleted: 0, errors: 0, message: 'Nessun task selezionato' };
    }
    
    const allTasks = StorageManager.load(CONFIG.STORAGE_KEYS.TASKS, []);
    let deleted = 0;
    let errors = 0;
    
    // Verifica permessi per ogni task
    const toDelete = ids.filter(id => {
      const task = allTasks.find(t => t.id === id);
      if (!task) {
        errors++;
        return false;
      }
      if (!PermissionsManager.canDeleteTask(task)) {
        errors++;
        return false;
      }
      return true;
    });
    
    // Filtra task da eliminare
    const filtered = allTasks.filter(t => !toDelete.includes(t.id));
    deleted = allTasks.length - filtered.length;
    
    if (deleted > 0) {
      StorageManager.save(CONFIG.STORAGE_KEYS.TASKS, filtered);
      
      // Log attività bulk
      ActivityLog.log(CONFIG.ACTION_TYPES.DELETE, CONFIG.ENTITY_TYPES.TASK, null, {
        action: 'bulk-delete',
        count: deleted,
        ids: toDelete
      });
      
      EventBus.emit(EVENTS.TASK_DELETED, { ids: toDelete, bulk: true });
      NotificationService.success(`${deleted} task eliminati`);
    }
    
    if (errors > 0) {
      NotificationService.warning(`${errors} task non eliminati (permessi insufficienti)`);
    }
    
    return { success: deleted > 0, deleted, errors, message: `${deleted} task eliminati` };
  },
  
  /**
   * Aggiunge allegato a task
   * @param {number} taskId - ID task
   * @param {File} file - File da allegare
   * @returns {Promise<object>} - Risultato operazione
   */
  async addAttachment(taskId, file) {
    const task = this.getById(taskId);
    
    if (!task) {
      return { success: false, message: 'Task non trovato' };
    }
    
    if (!PermissionsManager.canEditTask(task)) {
      return { success: false, message: 'Non autorizzato' };
    }
    
    // Validazione file (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return { success: false, message: 'File troppo grande (max 5MB)' };
    }
    
    // Converti file in base64
    const base64 = await Utils.fileToBase64(file);
    
    const attachment = {
      id: Utils.generateId(),
      name: file.name,
      size: file.size,
      sizeFormatted: Utils.formatFileSize(file.size),
      type: file.type,
      extension: file.name.split('.').pop().toLowerCase(),
      data: base64,
      uploadedAt: new Date().toISOString(),
      uploadedBy: AuthManager.getCurrentUser().id,
      uploadedByUsername: AuthManager.getCurrentUser().username
    };
    
    // Aggiorna task
    const attachments = task.attachments || [];
    attachments.push(attachment);
    
    const result = this.update(taskId, { attachments });
    
    if (result.success) {
      NotificationService.success(`Allegato "${file.name}" aggiunto`);
    }
    
    return result;
  },
  
  /**
   * Rimuove allegato da task
   * @param {number} taskId - ID task
   * @param {number} attachmentId - ID allegato
   * @returns {object} - Risultato operazione
   */
  removeAttachment(taskId, attachmentId) {
    const task = this.getById(taskId);
    
    if (!task) {
      return { success: false, message: 'Task non trovato' };
    }
    
    if (!PermissionsManager.canEditTask(task)) {
      return { success: false, message: 'Non autorizzato' };
    }
    
    const attachments = (task.attachments || []).filter(a => a.id !== attachmentId);
    const result = this.update(taskId, { attachments });
    
    if (result.success) {
      NotificationService.success('Allegato rimosso');
    }
    
    return result;
  },
  
  /**
   * Scarica allegato
   * @param {number} taskId - ID task
   * @param {number} attachmentId - ID allegato
   */
  downloadAttachment(taskId, attachmentId) {
    const task = this.getById(taskId);
    
    if (!task) {
      NotificationService.error('Task non trovato');
      return;
    }
    
    const attachment = (task.attachments || []).find(a => a.id === attachmentId);
    
    if (!attachment) {
      NotificationService.error('Allegato non trovato');
      return;
    }
    
    // Crea link per download
    const link = document.createElement('a');
    link.href = attachment.data;
    link.download = attachment.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    NotificationService.success(`Download "${attachment.name}" avviato`);
  },
  
  /**
   * Assegna task ad utente
   * @param {number} taskId - ID task
   * @param {number} userId - ID utente
   * @returns {object} - Risultato operazione
   */
  assign(taskId, userId) {
    const user = UsersManagementModule.getById(userId);
    
    if (!user) {
      return { success: false, message: 'Utente non trovato' };
    }
    
    return this.update(taskId, {
      assignedTo: user.id,
      assignedToUsername: user.username
    });
  },
  
  /**
   * Filtra task per stato
   * @param {string} filter - 'all', 'active', 'completed'
   * @returns {Array} - Array filtrato
   */
  filterByStatus(filter) {
    const tasks = this.getAll();
    
    switch (filter) {
      case 'active':
        return tasks.filter(t => !t.completed);
      case 'completed':
        return tasks.filter(t => t.completed);
      default:
        return tasks;
    }
  },
  
  /**
   * Filtra task per priorità
   * @param {string} priority - Priorità
   * @returns {Array} - Array filtrato
   */
  filterByPriority(priority) {
    const tasks = this.getAll();
    return tasks.filter(t => t.priority === priority);
  },
  
  /**
   * Ottiene task assegnati ad utente
   * @param {number} userId - ID utente
   * @returns {Array} - Array task
   */
  getByAssignee(userId) {
    const tasks = this.getAll();
    return tasks.filter(t => t.assignedTo === userId);
  },
  
  /**
   * Ottiene task creati da utente
   * @param {number} userId - ID utente
   * @returns {Array} - Array task
   */
  getByCreator(userId) {
    const tasks = this.getAll();
    return tasks.filter(t => t.createdBy === userId);
  },
  
  /**
   * Statistiche task
   * @returns {object} - Statistiche
   */
  getStats() {
    const tasks = this.getAll();
    
    return {
      total: tasks.length,
      active: tasks.filter(t => !t.completed).length,
      completed: tasks.filter(t => t.completed).length,
      byPriority: {
        bassa: tasks.filter(t => t.priority === CONFIG.TASK_PRIORITIES.BASSA).length,
        media: tasks.filter(t => t.priority === CONFIG.TASK_PRIORITIES.MEDIA).length,
        alta: tasks.filter(t => t.priority === CONFIG.TASK_PRIORITIES.ALTA).length,
        critical: tasks.filter(t => t.priority === CONFIG.TASK_PRIORITIES.CRITICAL).length
      },
      overdue: tasks.filter(t => !t.completed && t.dueDate && new Date(t.dueDate) < new Date()).length,
      withAttachments: tasks.filter(t => t.attachments && t.attachments.length > 0).length
    };
  }
};