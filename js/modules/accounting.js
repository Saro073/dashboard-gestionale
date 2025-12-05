// ==================== ACCOUNTING MODULE ====================
// Gestione contabilità e transazioni finanziarie

const AccountingModule = {
  /**
   * Categorie transazioni predefinite
   */
  INCOME_CATEGORIES: {
    BOOKING: 'booking',
    EXTRA_SERVICE: 'extra_service',
    DEPOSIT: 'deposit',
    OTHER_INCOME: 'other_income'
  },

  EXPENSE_CATEGORIES: {
    CLEANING: 'cleaning',
    MAINTENANCE: 'maintenance',
    UTILITIES: 'utilities',
    COMMISSION: 'commission',
    INSURANCE: 'insurance',
    TAX: 'tax',
    SUPPLIES: 'supplies',
    MARKETING: 'marketing',
    OTHER_EXPENSE: 'other_expense'
  },

  /**
   * Ottiene tutte le transazioni
   * @returns {Array} - Array di transazioni
   */
  getAll() {
    return StorageManager.load(CONFIG.STORAGE_KEYS.ACCOUNTING, []);
  },

  /**
   * Ottiene transazione per ID
   * @param {number} id - ID transazione
   * @returns {object|null} - Transazione o null
   */
  getById(id) {
    const transactions = this.getAll();
    return transactions.find(t => t.id === id) || null;
  },

  /**
   * Crea nuova transazione
   * @param {object} transactionData - Dati transazione
   * @returns {object} - { success: boolean, transaction: object|null, message: string }
   */
  create(transactionData) {
    // Validazione
    if (!transactionData.type || !['income', 'expense'].includes(transactionData.type)) {
      return { success: false, transaction: null, message: 'Tipo transazione non valido' };
    }

    if (!transactionData.amount || isNaN(transactionData.amount) || transactionData.amount <= 0) {
      return { success: false, transaction: null, message: 'Importo non valido' };
    }

    if (!transactionData.category || !transactionData.category.trim()) {
      return { success: false, transaction: null, message: 'Categoria obbligatoria' };
    }

    if (!transactionData.date) {
      return { success: false, transaction: null, message: 'Data obbligatoria' };
    }

    const currentUser = AuthManager.getCurrentUser();
    if (!currentUser) {
      return { success: false, transaction: null, message: 'Utente non autenticato' };
    }

    const transaction = {
      id: Utils.generateId(),
      type: transactionData.type,
      category: transactionData.category.trim(),
      amount: parseFloat(transactionData.amount),
      date: transactionData.date,
      description: transactionData.description?.trim() || '',
      paymentMethod: transactionData.paymentMethod?.trim() || 'cash',
      bookingId: transactionData.bookingId || null,
      contactId: transactionData.contactId || null,
      receiptNumber: transactionData.receiptNumber?.trim() || '',
      notes: transactionData.notes?.trim() || '',
      createdBy: currentUser.id,
      createdByUsername: currentUser.username,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Salva
    const transactions = this.getAll();
    transactions.push(transaction);
    StorageManager.save(CONFIG.STORAGE_KEYS.ACCOUNTING, transactions);

    // Log attività
    ActivityLog.log(
      CONFIG.ACTION_TYPES.CREATE,
      CONFIG.ENTITY_TYPES.TRANSACTION,
      transaction.id,
      { type: transaction.type, amount: transaction.amount, category: transaction.category }
    );

    // Emetti evento
    EventBus.emit(EVENTS.TRANSACTION_CREATED, { transaction });

    NotificationService.success('Transazione registrata con successo');
    return { success: true, transaction, message: 'Transazione creata' };
  },

  /**
   * Aggiorna transazione
   * @param {number} id - ID transazione
   * @param {object} updates - Dati da aggiornare
   * @returns {object} - { success: boolean, transaction: object|null, message: string }
   */
  update(id, updates) {
    const transactions = this.getAll();
    const index = transactions.findIndex(t => t.id === id);

    if (index === -1) {
      return { success: false, transaction: null, message: 'Transazione non trovata' };
    }

    const currentUser = AuthManager.getCurrentUser();
    if (!currentUser) {
      return { success: false, transaction: null, message: 'Utente non autenticato' };
    }

    // Validazioni
    if (updates.amount !== undefined) {
      if (isNaN(updates.amount) || updates.amount <= 0) {
        return { success: false, transaction: null, message: 'Importo non valido' };
      }
    }

    if (updates.type !== undefined && !['income', 'expense'].includes(updates.type)) {
      return { success: false, transaction: null, message: 'Tipo non valido' };
    }

    // Aggiorna
    const transaction = transactions[index];
    Object.assign(transaction, updates, {
      updatedAt: new Date().toISOString()
    });

    StorageManager.save(CONFIG.STORAGE_KEYS.ACCOUNTING, transactions);

    // Log attività
    ActivityLog.log(
      CONFIG.ACTION_TYPES.UPDATE,
      CONFIG.ENTITY_TYPES.TRANSACTION,
      id,
      updates
    );

    // Emetti evento
    EventBus.emit(EVENTS.TRANSACTION_UPDATED, { transaction });

    NotificationService.success('Transazione aggiornata');
    return { success: true, transaction, message: 'Transazione aggiornata' };
  },

  /**
   * Elimina transazione
   * @param {number} id - ID transazione
   * @returns {object} - { success: boolean, message: string }
   */
  delete(id) {
    const currentUser = AuthManager.getCurrentUser();
    if (!currentUser) {
      return { success: false, message: 'Utente non autenticato' };
    }

    if (!PermissionsManager.canDeleteAllData()) {
      return { success: false, message: 'Permesso negato' };
    }

    const transactions = this.getAll();
    const index = transactions.findIndex(t => t.id === id);

    if (index === -1) {
      return { success: false, message: 'Transazione non trovata' };
    }

    const transaction = transactions[index];
    transactions.splice(index, 1);
    StorageManager.save(CONFIG.STORAGE_KEYS.ACCOUNTING, transactions);

    // Log attività
    ActivityLog.log(
      CONFIG.ACTION_TYPES.DELETE,
      CONFIG.ENTITY_TYPES.TRANSACTION,
      id,
      { type: transaction.type, amount: transaction.amount }
    );

    // Emetti evento
    EventBus.emit(EVENTS.TRANSACTION_DELETED, { transaction });

    NotificationService.success('Transazione eliminata');
    return { success: true, message: 'Transazione eliminata' };
  },

  /**
   * Filtra transazioni per tipo
   * @param {string} type - 'income', 'expense', o 'all'
   * @returns {Array} - Array filtrato
   */
  filterByType(type) {
    if (type === 'all') return this.getAll();
    const transactions = this.getAll();
    return transactions.filter(t => t.type === type);
  },

  /**
   * Filtra transazioni per categoria
   * @param {string} category - Categoria
   * @returns {Array} - Array filtrato
   */
  filterByCategory(category) {
    if (category === 'all') return this.getAll();
    const transactions = this.getAll();
    return transactions.filter(t => t.category === category);
  },

  /**
   * Ottiene transazioni per range di date
   * @param {string} startDate - Data inizio (ISO string)
   * @param {string} endDate - Data fine (ISO string)
   * @returns {Array} - Array filtrato
   */
  getByDateRange(startDate, endDate) {
    const transactions = this.getAll();
    const start = new Date(startDate);
    const end = new Date(endDate);

    return transactions.filter(t => {
      const tDate = new Date(t.date);
      return tDate >= start && tDate <= end;
    });
  },

  /**
   * Ottiene transazioni per mese
   * @param {number} year - Anno
   * @param {number} month - Mese (0-11)
   * @returns {Array} - Array filtrato
   */
  getByMonth(year, month) {
    const transactions = this.getAll();
    return transactions.filter(t => {
      const tDate = new Date(t.date);
      return tDate.getFullYear() === year && tDate.getMonth() === month;
    });
  },

  /**
   * Calcola statistiche finanziarie
   * @param {number} year - Anno (opzionale)
   * @param {number} month - Mese 0-11 (opzionale)
   * @returns {object} - Statistiche
   */
  getStats(year = null, month = null) {
    let transactions = this.getAll();

    // Filtra per periodo se specificato
    if (year !== null && month !== null) {
      transactions = this.getByMonth(year, month);
    } else if (year !== null) {
      transactions = transactions.filter(t => new Date(t.date).getFullYear() === year);
    }

    const income = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const expenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const balance = income - expenses;

    // Statistiche per categoria
    const incomeByCategory = {};
    const expensesByCategory = {};

    transactions.forEach(t => {
      if (t.type === 'income') {
        incomeByCategory[t.category] = (incomeByCategory[t.category] || 0) + t.amount;
      } else {
        expensesByCategory[t.category] = (expensesByCategory[t.category] || 0) + t.amount;
      }
    });

    return {
      totalIncome: income,
      totalExpenses: expenses,
      balance: balance,
      transactionCount: transactions.length,
      incomeCount: transactions.filter(t => t.type === 'income').length,
      expenseCount: transactions.filter(t => t.type === 'expense').length,
      incomeByCategory,
      expensesByCategory,
      averageIncome: transactions.filter(t => t.type === 'income').length > 0 
        ? income / transactions.filter(t => t.type === 'income').length 
        : 0,
      averageExpense: transactions.filter(t => t.type === 'expense').length > 0 
        ? expenses / transactions.filter(t => t.type === 'expense').length 
        : 0
    };
  },

  /**
   * Ottiene transazioni collegate a una prenotazione
   * @param {number} bookingId - ID prenotazione
   * @returns {Array} - Array di transazioni
   */
  getByBooking(bookingId) {
    const transactions = this.getAll();
    return transactions.filter(t => t.bookingId === bookingId);
  },

  /**
   * Ottiene transazioni collegate a un contatto
   * @param {number} contactId - ID contatto
   * @returns {Array} - Array di transazioni
   */
  getByContact(contactId) {
    const transactions = this.getAll();
    return transactions.filter(t => t.contactId === contactId);
  },

  /**
   * Cerca transazioni
   * @param {string} searchTerm - Termine di ricerca
   * @returns {Array} - Array filtrato
   */
  search(searchTerm) {
    const transactions = this.getAll();
    const term = searchTerm.toLowerCase();

    return transactions.filter(t => {
      return (
        t.description.toLowerCase().includes(term) ||
        t.category.toLowerCase().includes(term) ||
        t.receiptNumber.toLowerCase().includes(term) ||
        t.notes.toLowerCase().includes(term) ||
        t.amount.toString().includes(term)
      );
    });
  },

  /**
   * Formatta categoria per visualizzazione
   * @param {string} category - Codice categoria
   * @returns {string} - Nome leggibile
   */
  formatCategory(category) {
    const labels = {
      // Entrate
      booking: 'Prenotazione',
      extra_service: 'Servizi Extra',
      deposit: 'Caparra',
      other_income: 'Altro Ricavo',
      // Uscite
      cleaning: 'Pulizie',
      maintenance: 'Manutenzione',
      utilities: 'Utenze',
      commission: 'Commissioni',
      insurance: 'Assicurazione',
      tax: 'Tasse',
      supplies: 'Forniture',
      marketing: 'Marketing',
      other_expense: 'Altra Spesa'
    };
    return labels[category] || category;
  },

  /**
   * Formatta metodo di pagamento
   * @param {string} method - Codice metodo
   * @returns {string} - Nome leggibile
   */
  formatPaymentMethod(method) {
    const labels = {
      cash: 'Contanti',
      card: 'Carta',
      bank_transfer: 'Bonifico',
      paypal: 'PayPal',
      stripe: 'Stripe',
      other: 'Altro'
    };
    return labels[method] || method;
  },

  /**
   * Esporta transazioni in formato CSV per commercialista
   * @param {number} year - Anno (opzionale)
   * @param {number} month - Mese 0-11 (opzionale)
   * @returns {void}
   */
  exportToCSV(year = null, month = null) {
    try {
      let transactions = this.getAll();
      
      // Filtra per periodo se specificato
      if (year !== null && month !== null) {
        transactions = this.getByMonth(year, month);
      } else if (year !== null) {
        transactions = transactions.filter(t => new Date(t.date).getFullYear() === year);
      }
      
      // Ordina per data
      transactions.sort((a, b) => new Date(a.date) - new Date(b.date));
      
      // Definisci colonne per export
      const columns = [
        { key: 'date', label: 'Data' },
        { key: 'type', label: 'Tipo' },
        { key: 'category', label: 'Categoria' },
        { key: 'description', label: 'Descrizione' },
        { key: 'amount', label: 'Importo (€)' },
        { key: 'paymentMethod', label: 'Metodo Pagamento' },
        { key: 'receiptNumber', label: 'N° Ricevuta' },
        { key: 'notes', label: 'Note' },
        { key: 'createdByUsername', label: 'Creato da' }
      ];
      
      // Prepara dati con formattazione
      const dataToExport = transactions.map(t => ({
        date: Utils.formatDate(new Date(t.date)),
        type: t.type === 'income' ? 'Entrata' : 'Uscita',
        category: this.formatCategory(t.category),
        description: t.description,
        amount: t.type === 'income' ? t.amount.toFixed(2) : `-${t.amount.toFixed(2)}`,
        paymentMethod: this.formatPaymentMethod(t.paymentMethod),
        receiptNumber: t.receiptNumber || '',
        notes: t.notes || '',
        createdByUsername: t.createdByUsername || ''
      }));
      
      // Genera CSV
      const csv = Utils.convertToCSV(dataToExport, columns);
      
      // Nome file con periodo
      const periodStr = month !== null 
        ? `${year}-${String(month + 1).padStart(2, '0')}`
        : year !== null ? `${year}` : 'completo';
      const filename = `contabilita_${periodStr}_${Date.now()}.csv`;
      
      // Download
      Utils.downloadFile(csv, filename, 'text/csv;charset=utf-8;');
      
      NotificationService.success('Export CSV completato!');
    } catch (error) {
      ErrorHandler.handle(error, 'AccountingModule.exportToCSV');
    }
  },

  /**
   * Esporta statistiche riepilogative
   * @param {number} year - Anno
   * @returns {void}
   */
  exportSummary(year) {
    try {
      const stats = this.getStats(year);
      const transactions = this.getAll().filter(t => 
        new Date(t.date).getFullYear() === year
      );
      
      let summary = `RIEPILOGO CONTABILE ${year}\n`;
      summary += `Generato il: ${Utils.formatDate(new Date(), true)}\n\n`;
      summary += `TOTALI:\n`;
      summary += `Entrate: €${stats.totalIncome.toFixed(2)}\n`;
      summary += `Uscite: €${stats.totalExpenses.toFixed(2)}\n`;
      summary += `Saldo: €${stats.balance.toFixed(2)}\n`;
      summary += `Transazioni: ${stats.transactionCount}\n\n`;
      
      summary += `ENTRATE PER CATEGORIA:\n`;
      Object.entries(stats.incomeByCategory).forEach(([cat, amount]) => {
        summary += `${this.formatCategory(cat)}: €${amount.toFixed(2)}\n`;
      });
      
      summary += `\nUSCITE PER CATEGORIA:\n`;
      Object.entries(stats.expensesByCategory).forEach(([cat, amount]) => {
        summary += `${this.formatCategory(cat)}: €${amount.toFixed(2)}\n`;
      });
      
      Utils.downloadFile(summary, `riepilogo_${year}.txt`, 'text/plain;charset=utf-8;');
      NotificationService.success('Riepilogo generato!');
    } catch (error) {
      ErrorHandler.handle(error, 'AccountingModule.exportSummary');
    }
  }
};
