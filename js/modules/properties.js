// ==================== PROPERTIES MODULE ====================
/**
 * PropertiesModule - Gestione multiple proprietà/appartamenti
 * Permette di gestire più unità immobiliari con dati separati
 */
const PropertiesModule = {
  
  /**
   * Ottiene tutte le properties
   * @returns {Array}
   */
  getAll() {
    return StorageManager.load(CONFIG.STORAGE_KEYS.PROPERTIES, []);
  },
  
  /**
   * Ottiene property per ID
   * @param {number} id
   * @returns {object|null}
   */
  getById(id) {
    const properties = this.getAll();
    return properties.find(p => p.id === id) || null;
  },
  
  /**
   * Ottiene property di default (prima disponibile)
   * Usato solo per assegnazione automatica nei bookings
   * @returns {object|null}
   */
  getDefault() {
    const properties = this.getAll();
    if (properties.length === 0) {
      return this.createDefault();
    }
    return properties[0];
  },
  
  /**
   * Crea nuova property
   * @param {object} data
   * @returns {object}
   */
  create(data) {
    try {
      // Validazione
      if (!data.name || data.name.trim() === '') {
        throw new Error('Nome property richiesto');
      }
      
      const property = {
        id: Utils.generateId(),
        name: data.name.trim(),
        description: data.description || '',
        address: {
          street: data.address?.street || '',
          city: data.address?.city || '',
          zip: data.address?.zip || '',
          country: data.address?.country || 'Italia'
        },
        color: data.color || '#3b82f6',
        active: true,
        createdAt: new Date().toISOString(),
        createdBy: AuthManager.getCurrentUser()?.id || null,
        createdByUsername: AuthManager.getCurrentUser()?.username || 'System'
      };
      
      const properties = this.getAll();
      properties.push(property);
      StorageManager.save(CONFIG.STORAGE_KEYS.PROPERTIES, properties);
      
      // Log attività
      ActivityLog.log(CONFIG.ACTION_TYPES.CREATE, 'property', property.id, {
        name: property.name
      });
      
      EventBus.emit(EVENTS.PROPERTY_CREATED, property);
      NotificationService.success('Property creata con successo!');
      
      return { success: true, property };
    } catch (error) {
      ErrorHandler.handle(error, 'PropertiesModule.create', true);
      return { success: false, error: error.message };
    }
  },
  
  /**
   * Aggiorna property esistente
   * @param {number} id
   * @param {object} changes
   * @returns {object}
   */
  update(id, changes) {
    try {
      const properties = this.getAll();
      const index = properties.findIndex(p => p.id === id);
      
      if (index === -1) {
        throw new Error('Property non trovata');
      }
      
      const oldProperty = { ...properties[index] };
      
      // Aggiorna campi
      properties[index] = {
        ...properties[index],
        ...changes,
        id, // Mantieni ID originale
        updatedAt: new Date().toISOString(),
        updatedBy: AuthManager.getCurrentUser()?.id || null,
        updatedByUsername: AuthManager.getCurrentUser()?.username || 'System'
      };
      
      StorageManager.save(CONFIG.STORAGE_KEYS.PROPERTIES, properties);
      
      // Log attività
      ActivityLog.log(CONFIG.ACTION_TYPES.UPDATE, 'property', id, {
        name: properties[index].name,
        changes: Object.keys(changes)
      });
      
      EventBus.emit(EVENTS.PROPERTY_UPDATED, { 
        property: properties[index], 
        oldProperty 
      });
      NotificationService.success('Property aggiornata!');
      
      return { success: true, property: properties[index] };
    } catch (error) {
      ErrorHandler.handle(error, 'PropertiesModule.update', true);
      return { success: false, error: error.message };
    }
  },
  
  /**
   * Elimina property
   * @param {number} id
   * @returns {object}
   */
  delete(id) {
    try {
      const properties = this.getAll();
      const property = this.getById(id);
      
      if (!property) {
        throw new Error('Property non trovata');
      }
      
      // Verifica se è l'unica property
      if (properties.length === 1) {
        throw new Error('Impossibile eliminare l\'unica property. Creane un\'altra prima.');
      }
      
      // Verifica se ha bookings associati
      const bookings = BookingsModule.getAll().filter(b => b.propertyId === id);
      if (bookings.length > 0) {
        const confirm = window.confirm(
          `Questa property ha ${bookings.length} prenotazioni associate.\n` +
          `Eliminarla cancellerà anche tutte le prenotazioni.\n` +
          `Vuoi procedere?`
        );
        if (!confirm) {
          return { success: false, error: 'Eliminazione annullata' };
        }
        
        // Elimina bookings associati
        bookings.forEach(b => BookingsModule.delete(b.id));
      }
      
      // Elimina property
      const filtered = properties.filter(p => p.id !== id);
      StorageManager.save(CONFIG.STORAGE_KEYS.PROPERTIES, filtered);
      
      // Log attività
      ActivityLog.log(CONFIG.ACTION_TYPES.DELETE, 'property', id, {
        name: property.name
      });
      
      EventBus.emit(EVENTS.PROPERTY_DELETED, { id, property });
      NotificationService.success('Property eliminata!');
      
      return { success: true };
    } catch (error) {
      ErrorHandler.handle(error, 'PropertiesModule.delete', true);
      return { success: false, error: error.message };
    }
  },
  
  /**
   * Crea property di default
   * @returns {object}
   */
  createDefault() {
    const defaultProperty = {
      name: 'Appartamento Principale',
      description: 'Property principale',
      address: {
        street: '',
        city: '',
        zip: '',
        country: 'Italia'
      },
      color: '#3b82f6'
    };
    
    const result = this.create(defaultProperty);
    return result.success ? result.property : null;
  },
  
  /**
   * Ottiene statistiche property
   * @param {number} propertyId
   * @returns {object}
   */
  getStats(propertyId) {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    const bookings = BookingsModule.getAll().filter(b => b.propertyId === propertyId);
    const monthBookings = bookings.filter(b => {
      const checkIn = new Date(b.checkIn);
      return checkIn.getFullYear() === currentYear && checkIn.getMonth() === currentMonth;
    });
    
    const totalRevenue = monthBookings
      .filter(b => b.status !== BookingsModule.STATUS.BLOCKED)
      .reduce((sum, b) => sum + (b.totalAmount || 0), 0);
    
    return {
      totalBookings: bookings.length,
      monthBookings: monthBookings.length,
      totalRevenue,
      activeBookings: bookings.filter(b => b.status === BookingsModule.STATUS.CONFIRMED).length
    };
  },
  
  /**
   * Migra dati esistenti aggiungendo propertyId
   * Assegna tutte le prenotazioni esistenti alla property di default
   */
  migrateExistingData() {
    try {
      const properties = this.getAll();
      
      // Se non ci sono properties, crea default
      if (properties.length === 0) {
        this.createDefault();
        return;
      }
      
      const defaultProperty = this.getDefault();
      if (!defaultProperty) return;
      
      // Migra bookings
      const bookings = BookingsModule.getAll();
      let migrated = 0;
      bookings.forEach(booking => {
        if (!booking.propertyId) {
          booking.propertyId = defaultProperty.id;
          migrated++;
        }
      });
      
      if (migrated > 0) {
        StorageManager.save(CONFIG.STORAGE_KEYS.BOOKINGS, bookings);
        console.log(`✅ Migrati ${migrated} bookings alla property: ${defaultProperty.name}`);
      }
      
      // Migra cleaning
      const cleanings = CleaningModule?.getAll() || [];
      let migratedCleaning = 0;
      cleanings.forEach(cleaning => {
        if (!cleaning.propertyId) {
          cleaning.propertyId = defaultProperty.id;
          migratedCleaning++;
        }
      });
      
      if (migratedCleaning > 0) {
        StorageManager.save(CONFIG.STORAGE_KEYS.CLEANING, cleanings);
        console.log(`✅ Migrati ${migratedCleaning} cleaning alla property: ${defaultProperty.name}`);
      }
      
      // Migra maintenance
      const maintenances = MaintenanceModule?.getAll() || [];
      let migratedMaintenance = 0;
      maintenances.forEach(maintenance => {
        if (!maintenance.propertyId) {
          maintenance.propertyId = defaultProperty.id;
          migratedMaintenance++;
        }
      });
      
      if (migratedMaintenance > 0) {
        StorageManager.save(CONFIG.STORAGE_KEYS.MAINTENANCE, maintenances);
        console.log(`✅ Migrati ${migratedMaintenance} maintenance alla property: ${defaultProperty.name}`);
      }
    } catch (error) {
      ErrorHandler.handle(error, 'PropertiesModule.migrateExistingData');
    }
  }
};
