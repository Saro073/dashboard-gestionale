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
      dueDate: taskData.dueDate || null,
      completed: false,
      assignedTo: taskData.assignedTo || currentUser.id,
      assignedToUsername: taskData.assignedToUsername || currentUser.username,
      createdBy: currentUser.id,
      createdByUsername: currentUser.username,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completedAt: null
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
    
    return this.update(id, updates);
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
    
    return { success: true, message: 'Task eliminato' };
  },
  
  /**
   * Assegna task ad utente
   * @param {number} taskId - ID task
   * @param {number} userId - ID utente
   * @returns {object} - Risultato operazione
   */
  assign(taskId, userId) {
    const user = UserManager.getById(userId);
    
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
      overdue: tasks.filter(t => !t.completed && t.dueDate && new Date(t.dueDate) < new Date()).length
    };
  }
};
