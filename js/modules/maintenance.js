/**
 * MaintenanceModule - Gestione interventi di manutenzione
 * Include categorie (idraulico, elettricista, caldaia), priorità, foto, costi
 */

const MaintenanceModule = {
  storageKey: 'dashboard_maintenance',

  categories: {
    plumbing: '🚰 Idraulica',
    electrical: '⚡ Elettricità',
    heating: '🔥 Riscaldamento/Caldaia',
    locksmith: '🔑 Serrature',
    appliances: '🔧 Elettrodomestici',
    other: '🛠️ Altro'
  },

  priorities: {
    low: { label: 'Bassa', color: '#6b7280' },
    medium: { label: 'Media', color: '#3b82f6' },
    high: { label: 'Alta', color: '#f59e0b' },
    urgent: { label: 'Urgente', color: '#ef4444' }
  },

  /**
   * Ottieni tutti gli interventi
   */
  getAll() {
    try {
      const data = localStorage.getItem(this.storageKey);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Errore lettura manutenzioni:', error);
      return [];
    }
  },

  /**
   * Ottieni intervento per ID
   */
  getById(id) {
    return this.getAll().find(m => m.id === parseInt(id));
  },

  /**
   * Salva interventi
   */
  save(maintenances) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(maintenances));
      EventBus.emit('maintenance:changed');
      return true;
    } catch (error) {
      console.error('Errore salvataggio manutenzioni:', error);
      return false;
    }
  },

  /**
   * Crea nuovo intervento
   */
  async create(maintenanceData) {
    const maintenances = this.getAll();
    
    const newMaintenance = {
      id: Date.now(),
      category: maintenanceData.category,
      priority: maintenanceData.priority || 'medium',
      description: maintenanceData.description,
      requestDate: maintenanceData.requestDate || new Date().toISOString().split('T')[0],
      scheduledDate: maintenanceData.scheduledDate || null,
      completedDate: null,
      status: 'pending', // pending, in-progress, completed, cancelled
      assignedTo: maintenanceData.assignedTo || null,
      estimatedCost: parseFloat(maintenanceData.estimatedCost) || 0,
      finalCost: null,
      notes: maintenanceData.notes || '',
      photos: maintenanceData.photos || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    maintenances.push(newMaintenance);
    this.save(maintenances);

    // Log attività
    if (typeof ActivityLog !== 'undefined') {
      ActivityLog.log('maintenance_created', `Creato intervento: ${this.categories[newMaintenance.category]}`);
    }

    // Invia notifica Telegram se configurato
    if (typeof TelegramService !== 'undefined' && TelegramService.isConfigured()) {
      await TelegramService.notifyNewMaintenance(newMaintenance);
    }

    return newMaintenance;
  },

  /**
   * Aggiorna intervento
   */
  async update(id, updates) {
    const maintenances = this.getAll();
    const index = maintenances.findIndex(m => m.id === parseInt(id));
    
    if (index === -1) {
      throw new Error('Intervento non trovato');
    }

    maintenances[index] = {
      ...maintenances[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    this.save(maintenances);

    if (typeof ActivityLog !== 'undefined') {
      ActivityLog.log('maintenance_updated', `Aggiornato intervento #${id}`);
    }

    return maintenances[index];
  },

  /**
   * Elimina intervento
   */
  delete(id) {
    const maintenances = this.getAll();
    const filtered = maintenances.filter(m => m.id !== parseInt(id));
    
    if (filtered.length === maintenances.length) {
      throw new Error('Intervento non trovato');
    }

    this.save(filtered);

    if (typeof ActivityLog !== 'undefined') {
      ActivityLog.log('maintenance_deleted', `Eliminato intervento #${id}`);
    }

    return true;
  },

  /**
   * Avvia intervento (cambia status a in-progress)
   */
  async start(id) {
    const maintenance = this.getById(id);
    if (!maintenance) throw new Error('Intervento non trovato');

    if (maintenance.status !== 'pending') {
      throw new Error('Intervento già avviato o completato');
    }

    return await this.update(id, {
      status: 'in-progress',
      startedAt: new Date().toISOString()
    });
  },

  /**
   * Completa intervento
   */
  async complete(id, finalCost, notes = '') {
    const maintenance = this.getById(id);
    if (!maintenance) throw new Error('Intervento non trovato');

    const completedDate = new Date().toISOString().split('T')[0];
    const cost = parseFloat(finalCost) || maintenance.estimatedCost;

    // Crea transazione contabile se c'è un costo
    if (cost > 0 && typeof AccountingModule !== 'undefined') {
      await AccountingModule.create({
        type: 'expense',
        amount: cost,
        category: 'manutenzione',
        description: `Manutenzione: ${this.categories[maintenance.category]} - ${maintenance.description}`,
        date: completedDate,
        paymentMethod: 'cash',
        notes: notes || maintenance.notes
      });
    }

    const updated = await this.update(id, {
      status: 'completed',
      completedDate: completedDate,
      finalCost: cost,
      notes: notes || maintenance.notes
    });

    // Notifica completamento
    if (typeof TelegramService !== 'undefined' && TelegramService.isConfigured()) {
      await TelegramService.notifyMaintenanceCompleted(updated);
    }

    if (typeof ActivityLog !== 'undefined') {
      ActivityLog.log('maintenance_completed', `Completato intervento: ${this.categories[maintenance.category]}`);
    }

    return updated;
  },

  /**
   * Aggiungi foto a intervento
   */
  async addPhoto(id, photoUrl, caption = '') {
    const maintenance = this.getById(id);
    if (!maintenance) throw new Error('Intervento non trovato');

    const photos = maintenance.photos || [];
    photos.push({
      url: photoUrl,
      caption: caption,
      uploadedAt: new Date().toISOString()
    });

    return await this.update(id, { photos });
  },

  /**
   * Filtra per status
   */
  filterByStatus(status) {
    if (status === 'all') return this.getAll();
    return this.getAll().filter(m => m.status === status);
  },

  /**
   * Filtra per categoria
   */
  filterByCategory(category) {
    if (category === 'all') return this.getAll();
    return this.getAll().filter(m => m.category === category);
  },

  /**
   * Filtra per priorità
   */
  filterByPriority(priority) {
    if (priority === 'all') return this.getAll();
    return this.getAll().filter(m => m.priority === priority);
  },

  /**
   * Ottieni interventi urgenti
   */
  getUrgent() {
    return this.getAll().filter(m => 
      m.priority === 'urgent' && 
      m.status !== 'completed' && 
      m.status !== 'cancelled'
    );
  },

  /**
   * Ottieni interventi in corso
   */
  getInProgress() {
    return this.filterByStatus('in-progress');
  },

  /**
   * Ottieni interventi pending
   */
  getPending() {
    return this.filterByStatus('pending');
  },

  /**
   * Ottieni interventi da programmare (pending senza data)
   */
  getNeedScheduling() {
    return this.getAll().filter(m => 
      m.status === 'pending' && 
      !m.scheduledDate
    );
  },

  /**
   * Ottieni statistiche manutenzione
   */
  getStats(days = 30) {
    const maintenances = this.getAll();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const recent = maintenances.filter(m => 
      new Date(m.createdAt) >= cutoffDate
    );

    const completed = recent.filter(m => m.status === 'completed');
    const totalCost = completed.reduce((sum, m) => sum + (m.finalCost || m.estimatedCost || 0), 0);
    
    // Calcola tempo medio di risoluzione (per interventi completati)
    let avgResolutionTime = 0;
    if (completed.length > 0) {
      const resolutionTimes = completed
        .filter(m => m.requestDate && m.completedDate)
        .map(m => {
          const start = new Date(m.requestDate);
          const end = new Date(m.completedDate);
          return Math.ceil((end - start) / (1000 * 60 * 60 * 24)); // giorni
        });
      
      if (resolutionTimes.length > 0) {
        avgResolutionTime = Math.round(
          resolutionTimes.reduce((sum, t) => sum + t, 0) / resolutionTimes.length
        );
      }
    }

    // Categoria più frequente
    const categoryCounts = {};
    recent.forEach(m => {
      categoryCounts[m.category] = (categoryCounts[m.category] || 0) + 1;
    });
    const mostFrequentCategory = Object.keys(categoryCounts).reduce((a, b) => 
      categoryCounts[a] > categoryCounts[b] ? a : b, 
      'other'
    );

    return {
      total: recent.length,
      pending: recent.filter(m => m.status === 'pending').length,
      inProgress: recent.filter(m => m.status === 'in-progress').length,
      completed: completed.length,
      urgent: recent.filter(m => m.priority === 'urgent' && m.status !== 'completed').length,
      totalCost: totalCost,
      avgResolutionTime: avgResolutionTime,
      mostFrequentCategory: mostFrequentCategory,
      completionRate: recent.length > 0 ? Math.round((completed.length / recent.length) * 100) : 0
    };
  },

  /**
   * Ottieni costi per categoria (per analytics)
   */
  getCostsByCategory(months = 12) {
    const maintenances = this.getAll();
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - months);

    const completed = maintenances.filter(m => 
      m.status === 'completed' && 
      m.completedDate &&
      new Date(m.completedDate) >= cutoffDate
    );

    const costsByCategory = {};
    Object.keys(this.categories).forEach(cat => {
      costsByCategory[cat] = 0;
    });

    completed.forEach(m => {
      const cost = m.finalCost || m.estimatedCost || 0;
      costsByCategory[m.category] = (costsByCategory[m.category] || 0) + cost;
    });

    return costsByCategory;
  },

  /**
   * Export per backup
   */
  exportData() {
    return {
      maintenances: this.getAll(),
      exportDate: new Date().toISOString(),
      version: '1.0'
    };
  },

  /**
   * Import da backup
   */
  importData(data) {
    if (!data || !data.maintenances) {
      throw new Error('Dati non validi');
    }

    this.save(data.maintenances);
    
    if (typeof ActivityLog !== 'undefined') {
      ActivityLog.log('maintenance_imported', `Importate ${data.maintenances.length} manutenzioni`);
    }

    return data.maintenances.length;
  }
};
