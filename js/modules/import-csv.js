// ==================== CSV IMPORT MODULE ====================

const CSVImportModule = {
  
  /**
   * Parsa file CSV e converte in array di oggetti
   * @param {string} csvContent - Contenuto CSV
   * @returns {Array} - Array di task parsati
   */
  parseCSV(csvContent) {
    try {
      const lines = csvContent.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        throw new Error('CSV vuoto o non valido');
      }
      
      // Prima riga = headers (opzionale, assumiamo struttura roadmap)
      const hasHeaders = this._detectHeaders(lines[0]);
      const dataStartIndex = hasHeaders ? 1 : 0;
      
      const tasks = [];
      
      for (let i = dataStartIndex; i < lines.length; i++) {
        const line = lines[i];
        const task = this._parseRoadmapRow(line, i + 1);
        
        if (task) {
          tasks.push(task);
        }
      }
      
      return tasks;
      
    } catch (error) {
      ErrorHandler.handle(error, 'CSVImportModule.parseCSV', true);
      return [];
    }
  },
  
  /**
   * Rileva se prima riga contiene headers
   * @param {string} firstLine - Prima riga CSV
   * @returns {boolean}
   */
  _detectHeaders(firstLine) {
    const lowerLine = firstLine.toLowerCase();
    return lowerLine.includes('done') || 
           lowerLine.includes('priorit') || 
           lowerLine.includes('stato') ||
           lowerLine.includes('periodo') ||
           lowerLine.includes('attivit');
  },
  
  /**
   * Parsa singola riga roadmap formato: Done, Priorità, Stato, Periodo, Attività, Note (opzionale)
   * @param {string} line - Riga CSV
   * @param {number} rowNumber - Numero riga (per debug)
   * @returns {object|null} - Task parsato o null
   */
  _parseRoadmapRow(line, rowNumber) {
    try {
      // Split rispettando virgole dentro virgolette
      const columns = this._parseCSVLine(line);
      
      if (columns.length < 5) {
        console.warn(`Riga ${rowNumber}: colonne insufficienti (${columns.length}/5)`);
        return null;
      }
      
      // Supporta sia 5 che 6+ colonne (con note opzionali)
      const [doneRaw, priorityRaw, statusRaw, periodRaw, activityRaw, notesRaw] = columns;
      
      // Skip righe vuote o header
      if (!activityRaw || activityRaw.trim() === '' || activityRaw.toLowerCase() === 'attività') {
        return null;
      }
      
      // Parse campi
      const completed = this._parseBoolean(doneRaw);
      const priority = this._parsePriority(priorityRaw);
      const status = this._parseStatus(statusRaw);
      const { startDate, endDate, period } = this._parsePeriod(periodRaw);
      const { title, description, category, tags } = this._parseActivity(activityRaw);
      
      // Parse note opzionali (colonna 6)
      const notes = notesRaw ? notesRaw.trim() : '';
      
      // Combina descrizione da attività + note
      let fullDescription = description;
      if (notes && notes !== '') {
        fullDescription = fullDescription 
          ? `${fullDescription}\n\n📝 Note:\n${notes}`
          : `📝 Note:\n${notes}`;
      }
      
      // Crea oggetto task
      const task = {
        id: Utils.generateId(),
        title: title,
        description: fullDescription,
        priority: priority,
        status: status,
        completed: completed,
        dueDate: endDate, // Usa data fine come scadenza
        startDate: startDate,
        period: period, // Mantieni periodo originale per riferimento
        category: category,
        tags: tags,
        source: 'roadmap-import',
        importedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: completed ? new Date().toISOString() : null,
        assignedTo: null, // Da assegnare dopo import
        assignedToUsername: null,
        createdBy: null, // Verrà impostato all'import
        createdByUsername: 'Import Roadmap',
        attachments: []
      };
      
      return task;
      
    } catch (error) {
      console.error(`Errore parsing riga ${rowNumber}:`, error);
      return null;
    }
  },
  
  /**
   * Parsa riga CSV rispettando virgolette
   * @param {string} line - Riga CSV
   * @returns {Array<string>} - Colonne
   */
  _parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  },
  
  /**
   * Parsa valore booleano (checkbox)
   * @param {string} value - Valore raw
   * @returns {boolean}
   */
  _parseBoolean(value) {
    const cleaned = value.toLowerCase().trim();
    return cleaned === 'true' || 
           cleaned === 'yes' || 
           cleaned === 'si' || 
           cleaned === 'sì' ||
           cleaned === '1' ||
           cleaned === 'x' ||
           cleaned === '✓' ||
           cleaned === '✔' ||
           cleaned === '☑';
  },
  
  /**
   * Parsa priorità da testo
   * @param {string} value - Priorità testuale (es. "🟠 Alta", "Alta", "Alta ⚠️")
   * @returns {string} - Priorità stringa compatibile dashboard (bassa/media/alta/critical)
   */
  _parsePriority(value) {
    if (!value) return 'media';
    
    const cleaned = value.toLowerCase().trim();
    
    // Rimuovi TUTTI gli emoji e simboli comuni
    // Unicode ranges: emoticons, symbols, pictographs
    const textOnly = cleaned
      .replace(/[\u{1F300}-\u{1F9FF}]/gu, '') // Emoji generici
      .replace(/[\u{2600}-\u{26FF}]/gu, '')   // Simboli vari
      .replace(/[\u{2700}-\u{27BF}]/gu, '')   // Dingbats
      .replace(/[\uFE00-\uFE0F]/gu, '')       // Varianti emoji
      .replace(/[\u200D]/gu, '')              // Zero-width joiner
      .trim();
    
    if (textOnly.includes('critica') || textOnly.includes('critical') || textOnly.includes('urgent')) {
      return 'critical';
    } else if (textOnly.includes('alta') || textOnly.includes('high')) {
      return 'alta';
    } else if (textOnly.includes('media') || textOnly.includes('medium') || textOnly.includes('normal')) {
      return 'media';
    } else if (textOnly.includes('bassa') || textOnly.includes('low')) {
      return 'bassa';
    }
    
    return 'media'; // Default: media
  },
  
  /**
   * Parsa stato da emoji o testo (es. "🔄 In corso", "✅", "In corso")
   * @param {string} value - Stato
   * @returns {string} - Stato normalizzato
   */
  _parseStatus(value) {
    if (!value) return 'todo';
    
    const cleaned = value.trim();
    const lowerValue = cleaned.toLowerCase();
    
    // Mappa emoji → status (controlla prima gli emoji)
    const emojiMap = {
      '✅': 'completed',
      '✔': 'completed',
      '☑': 'completed',
      '🔄': 'in-progress',
      '⏸️': 'paused',
      '⏸': 'paused',
      '❌': 'todo',
      '⏹️': 'cancelled',
      '⏹': 'cancelled'
    };
    
    // Controlla emoji (anche se combinati con testo tipo "🔄 In corso")
    for (const [emoji, status] of Object.entries(emojiMap)) {
      if (cleaned.includes(emoji)) {
        return status;
      }
    }
    
    // Controlla testo (fallback se nessun emoji trovato)
    if (lowerValue.includes('complet')) return 'completed';
    if (lowerValue.includes('corso') || lowerValue.includes('progress')) return 'in-progress';
    if (lowerValue.includes('pausa') || lowerValue.includes('pause')) return 'paused';
    if (lowerValue.includes('fare') || lowerValue.includes('todo')) return 'todo';
    if (lowerValue.includes('annull') || lowerValue.includes('cancel')) return 'cancelled';
    
    return 'todo'; // Default
  },
  
  /**
   * Parsa periodo (es. "09-15 Dicembre 2025" o "dicembre 2025")
   * @param {string} value - Periodo
   * @returns {object} - { startDate, endDate, period }
   */
  _parsePeriod(value) {
    const cleaned = value.trim();
    
    if (!cleaned) {
      return { startDate: null, endDate: null, period: null };
    }
    
    // Pattern: "09-15 Dicembre 2025"
    const rangeMatch = cleaned.match(/(\d{1,2})-(\d{1,2})\s+(\w+)\s+(\d{4})/i);
    if (rangeMatch) {
      const [, startDay, endDay, month, year] = rangeMatch;
      const monthNum = this._parseMonth(month);
      
      if (monthNum !== -1) {
        const startDate = new Date(year, monthNum, parseInt(startDay));
        const endDate = new Date(year, monthNum, parseInt(endDay));
        
        return {
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          period: cleaned
        };
      }
    }
    
    // Pattern: "Dicembre 2025" (mese intero)
    const monthMatch = cleaned.match(/(\w+)\s+(\d{4})/i);
    if (monthMatch) {
      const [, month, year] = monthMatch;
      const monthNum = this._parseMonth(month);
      
      if (monthNum !== -1) {
        const startDate = new Date(year, monthNum, 1);
        const endDate = new Date(year, monthNum + 1, 0); // Ultimo giorno mese
        
        return {
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          period: cleaned
        };
      }
    }
    
    // Pattern: "Q1 2026" (trimestre)
    const quarterMatch = cleaned.match(/Q(\d)\s+(\d{4})/i);
    if (quarterMatch) {
      const [, quarter, year] = quarterMatch;
      const q = parseInt(quarter);
      const startMonth = (q - 1) * 3;
      const endMonth = startMonth + 2;
      
      const startDate = new Date(year, startMonth, 1);
      const endDate = new Date(year, endMonth + 1, 0);
      
      return {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        period: cleaned
      };
    }
    
    // Fallback: mantieni stringa originale
    return { startDate: null, endDate: null, period: cleaned };
  },
  
  /**
   * Converte nome mese italiano in numero (0-11)
   * @param {string} month - Nome mese
   * @returns {number} - Numero mese (0-11) o -1
   */
  _parseMonth(month) {
    const months = {
      'gennaio': 0, 'febbraio': 1, 'marzo': 2, 'aprile': 3,
      'maggio': 4, 'giugno': 5, 'luglio': 6, 'agosto': 7,
      'settembre': 8, 'ottobre': 9, 'novembre': 10, 'dicembre': 11,
      // Abbreviazioni
      'gen': 0, 'feb': 1, 'mar': 2, 'apr': 3,
      'mag': 4, 'giu': 5, 'lug': 6, 'ago': 7,
      'set': 8, 'ott': 9, 'nov': 10, 'dic': 11
    };
    
    return months[month.toLowerCase()] ?? -1;
  },
  
  /**
   * Parsa attività estraendo titolo, descrizione, categoria, tags
   * @param {string} value - Testo attività
   * @returns {object} - { title, description, category, tags }
   */
  _parseActivity(value) {
    const cleaned = value.trim();
    
    // Estrai categoria da tag [CATEGORIA]
    const categoryMatch = cleaned.match(/\[([^\]]+)\]/);
    const category = categoryMatch ? categoryMatch[1].trim() : null;
    
    // Rimuovi tag categoria dal titolo
    let title = cleaned.replace(/\[([^\]]+)\]/g, '').trim();
    
    // Estrai hashtags come tags
    const hashtagMatches = title.match(/#\w+/g) || [];
    const tags = hashtagMatches.map(tag => tag.substring(1));
    
    // Rimuovi hashtags dal titolo
    title = title.replace(/#\w+/g, '').trim();
    
    // Se titolo troppo lungo, sposta eccesso in descrizione
    let description = '';
    if (title.length > 100) {
      description = title;
      title = title.substring(0, 97) + '...';
    }
    
    return { title, description, category, tags };
  },
  
  /**
   * Importa task parsati nel sistema
   * @param {Array} parsedTasks - Task parsati da CSV
   * @param {object} options - Opzioni import { merge: boolean, assignToCurrentUser: boolean }
   * @returns {object} - { success: boolean, imported: number, skipped: number, errors: Array }
   */
  importTasks(parsedTasks, options = {}) {
    const { merge = false, assignToCurrentUser = true } = options;
    
    const currentUser = AuthManager.getCurrentUser();
    if (!currentUser) {
      NotificationService.error('Devi essere autenticato per importare task');
      return { success: false, imported: 0, skipped: 0, errors: ['Not authenticated'] };
    }
    
    const existingTasks = StorageManager.load(CONFIG.STORAGE_KEYS.TASKS, []);
    const errors = [];
    let imported = 0;
    let skipped = 0;
    
    for (const task of parsedTasks) {
      try {
        // Assegna a utente corrente se richiesto
        if (assignToCurrentUser) {
          task.assignedTo = currentUser.id;
          task.assignedToUsername = currentUser.username;
          task.createdBy = currentUser.id;
          task.createdByUsername = currentUser.username;
        }
        
        // Controlla duplicati se merge attivo
        if (merge) {
          const duplicate = existingTasks.find(t => 
            t.title.toLowerCase() === task.title.toLowerCase() &&
            t.source === 'roadmap-import'
          );
          
          if (duplicate) {
            skipped++;
            continue;
          }
        }
        
        // Aggiungi task
        existingTasks.push(task);
        imported++;
        
      } catch (error) {
        errors.push(`Errore import task "${task.title}": ${error.message}`);
      }
    }
    
    // Salva
    StorageManager.save(CONFIG.STORAGE_KEYS.TASKS, existingTasks);
    
    // Log attività
    ActivityLog.log(CONFIG.ACTION_TYPES.CREATE, CONFIG.ENTITY_TYPES.TASK, null, {
      action: 'bulk-import',
      imported: imported,
      skipped: skipped,
      source: 'roadmap-csv'
    });
    
    // Notifica
    EventBus.emit(EVENTS.TASKS_IMPORTED, { imported, skipped });
    
    if (imported > 0) {
      NotificationService.success(`${imported} task importati con successo`);
    }
    
    if (skipped > 0) {
      NotificationService.info(`${skipped} task saltati (duplicati)`);
    }
    
    if (errors.length > 0) {
      console.error('Errori import:', errors);
      NotificationService.warning(`${errors.length} errori durante l'import`);
    }
    
    return { success: true, imported, skipped, errors };
  },
  
  /**
   * Genera preview HTML dei task da importare
   * @param {Array} parsedTasks - Task parsati
   * @returns {string} - HTML preview
   */
  generatePreview(parsedTasks) {
    if (!parsedTasks || parsedTasks.length === 0) {
      return '<p class="text-muted">Nessun task da importare</p>';
    }
    
    const priorityLabels = {
      'bassa': 'Bassa',
      'media': 'Media',
      'alta': 'Alta',
      'critical': 'Critica'
    };
    
    const statusLabels = {
      'todo': 'Da fare',
      'in-progress': 'In corso',
      'paused': 'In pausa',
      'completed': 'Completato',
      'cancelled': 'Annullato'
    };
    
    let html = `
      <div class="import-preview">
        <div class="preview-stats">
          <span><strong>${parsedTasks.length}</strong> task da importare</span>
          <span><strong>${parsedTasks.filter(t => t.completed).length}</strong> completati</span>
          <span><strong>${parsedTasks.filter(t => !t.completed).length}</strong> attivi</span>
        </div>
        <div class="preview-list">
    `;
    
    for (const task of parsedTasks.slice(0, 10)) { // Max 10 preview
      const priorityClass = `priority-${task.priority}`;
      const statusClass = `status-${task.status}`;
      const completedClass = task.completed ? 'completed' : '';
      
      html += `
        <div class="preview-item ${completedClass}">
          <div class="preview-checkbox">
            ${task.completed ? '✓' : '○'}
          </div>
          <div class="preview-content">
            <div class="preview-title">${Utils.escapeHtml(task.title)}</div>
            <div class="preview-meta">
              <span class="badge ${priorityClass}">${priorityLabels[task.priority]}</span>
              <span class="badge ${statusClass}">${statusLabels[task.status]}</span>
              ${task.period ? `<span class="badge">📅 ${task.period}</span>` : ''}
              ${task.category ? `<span class="badge">📂 ${task.category}</span>` : ''}
            </div>
          </div>
        </div>
      `;
    }
    
    if (parsedTasks.length > 10) {
      html += `<p class="text-muted text-center">... e altri ${parsedTasks.length - 10} task</p>`;
    }
    
    html += `
        </div>
      </div>
    `;
    
    return html;
  }
  
};
