// ==================== CALENDAR COMPONENT ====================
/**
 * CalendarComponent - Componente calendario per visualizzazione prenotazioni
 * Mostra mese corrente + prima settimana del mese successivo
 */
const CalendarComponent = {
  currentDate: new Date(),
  selectedDate: null,
  container: null,
  
  // Airbnb-style date selection state
  selectionState: 'IDLE',  // IDLE | SELECTING_CHECKOUT | SELECTED
  selectedCheckIn: null,
  selectedCheckOut: null,

  /**
   * Inizializza il calendario
   * @param {string} containerId - ID del container
   */
  init(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) return;
    
    this.currentDate = new Date();
    this.render();
    this.setupEventListeners();
  },

  /**
   * Setup event listeners per EventBus
   */
  setupEventListeners() {
    EventBus.on(EVENTS.BOOKING_CREATED, () => this.render());
    EventBus.on(EVENTS.BOOKING_UPDATED, () => this.render());
    EventBus.on(EVENTS.BOOKING_DELETED, () => this.render());
  },

  /**
   * Render completo del calendario
   */
  render() {
    if (!this.container) return;

    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();

    this.container.innerHTML = `
      <div class="calendar-wrapper">
        ${this.renderHeader(year, month)}
        ${this.renderCalendarGrid(year, month)}
        ${this.renderPropertiesLegend()}
        ${this.renderSelectionSummary()}
        ${this.renderNextWeek(year, month)}
        ${this.renderStats(year, month)}
      </div>
    `;

    this.attachCalendarEvents();
  },

  /**
   * Render header con navigazione
   */
  renderHeader(year, month) {
    const monthNames = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
      'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];

    return `
      <div class="calendar-header">
        <button class="calendar-nav-btn" data-action="prev-month">
          <span>◀</span>
        </button>
        <h3 class="calendar-title">${monthNames[month]} ${year}</h3>
        <button class="calendar-nav-btn" data-action="next-month">
          <span>▶</span>
        </button>
        <button class="calendar-nav-btn calendar-today-btn" data-action="today">
          Oggi
        </button>
      </div>
    `;
  },

  /**
   * Render griglia calendario - Vista mensile completa con tutte le settimane
   */
  renderCalendarGrid(year, month) {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDay = firstDay.getDay() || 7; // Lunedì = 1
    const daysInMonth = lastDay.getDate();

    const dayNames = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
    
    let html = '<div class="calendar-grid">';
    
    // Header giorni
    html += '<div class="calendar-days-header">';
    dayNames.forEach(day => {
      html += `<div class="calendar-day-name">${day}</div>`;
    });
    html += '</div>';

    // Griglia giorni
    html += '<div class="calendar-days">';
    
    // Giorni vuoti prima del primo giorno del mese
    const emptyDays = startDay - 1;
    for (let i = 0; i < emptyDays; i++) {
      html += '<div class="calendar-day empty"></div>';
    }

    // Giorni del mese
    const today = new Date();
    const currentUser = AuthManager.getCurrentUser();
    const isAdmin = currentUser && currentUser.role === 'admin';
    
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const bookings = BookingsModule.getByDate(dateStr);
      const isToday = today.getFullYear() === year && 
                      today.getMonth() === month && 
                      today.getDate() === day;
      
      const classes = ['calendar-day'];
      if (isToday) classes.push('today');
      
      // Date passate - disabilita se non admin
      const isPast = this.isPastDate(dateStr);
      if (isPast && !isAdmin) {
        classes.push('past-date-disabled');
      }
      
      // Selection state classes
      if (this.selectedCheckIn && dateStr === this.selectedCheckIn) {
        classes.push('selected-checkin');
      }
      if (this.selectedCheckOut && dateStr === this.selectedCheckOut) {
        classes.push('selected-checkout');
      }
      if (this.isDateInRange(dateStr)) {
        classes.push('in-range');
      }
      
      // Overlap detection - evidenzia conflitti
      const hasOverlap = this.checkOverlapForDate(dateStr);
      if (hasOverlap) {
        classes.push('has-overlap');
      }
      
      if (bookings.length > 0) {
        classes.push('has-booking');
        const booking = bookings[0];
        classes.push(`status-${booking.status}`);
      }

      html += `
        <div class="${classes.join(' ')}" 
             data-date="${dateStr}"
             ${bookings.length > 0 ? `data-booking-id="${bookings[0].id}"` : ''}>
          <span class="day-number">${day}</span>
          ${bookings.length > 0 ? this.renderDayBookings(bookings, dateStr) : ''}
        </div>
      `;
    }
    
    // Giorni vuoti dopo l'ultimo giorno per completare la griglia
    const totalCells = emptyDays + daysInMonth;
    const remainingCells = Math.ceil(totalCells / 7) * 7 - totalCells;
    for (let i = 0; i < remainingCells; i++) {
      html += '<div class="calendar-day empty"></div>';
    }

    html += '</div></div>';
    return html;
  },

  /**
   * Render prenotazioni nel giorno con tooltip dettagliati
   */
  renderDayBookings(bookings, dateStr) {
    if (bookings.length === 0) return '';
    
    const booking = bookings[0];
    const isBlocked = booking.status === 'blocked';
    const guestInfo = BookingsModule.getGuestInfo(booking);
    
    // Ottieni colore property
    let propertyColor = '#3b82f6'; // Default blu
    if (booking.propertyId && typeof PropertiesModule !== 'undefined') {
      const property = PropertiesModule.getById(booking.propertyId);
      if (property) propertyColor = property.color;
    }
    
    // Calcola notti
    const checkIn = new Date(booking.checkIn);
    const checkOut = new Date(booking.checkOut);
    const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
    
    // Determina se questa data è check-in, check-out o in mezzo
    const isCheckIn = booking.checkIn === dateStr;
    const isCheckOut = booking.checkOut === dateStr;
    
    // Tooltip dettagliato
    const tooltipLines = [
      `Ospite: ${guestInfo.fullName}`,
      `Check-in: ${Utils.formatDate(booking.checkIn)}`,
      `Check-out: ${Utils.formatDate(booking.checkOut)}`,
      `${nights} nott${nights > 1 ? 'i' : 'e'}`,
      booking.totalPrice ? `Prezzo: €${booking.totalPrice}` : '',
      `Stato: ${this.getStatusLabel(booking.status)}`,
      booking.bookingChannel ? `Canale: ${booking.bookingChannel}` : ''
    ].filter(Boolean).join('\n');
    
    // Icone check-in/check-out
    let icon = '';
    if (isCheckIn) icon = '🟢 ';
    else if (isCheckOut) icon = '🔴 ';
    
    return `
      <div class="day-booking ${isBlocked ? 'blocked' : ''}" 
           data-booking-id="${booking.id}"
           style="background-color: ${propertyColor}; border-color: ${propertyColor};"
           title="${Utils.escapeHtml(tooltipLines)}">
        <span class="booking-name">
          ${icon}${isBlocked ? '🔒' : Utils.escapeHtml(guestInfo.fullName.substring(0, 8))}
        </span>
        <button class="booking-delete-btn" 
                data-booking-id="${booking.id}" 
                title="Elimina prenotazione"
                onclick="event.stopPropagation(); CalendarComponent.deleteBooking(${booking.id})">×</button>
      </div>
    `;
  },

  /**
   * Render prima settimana del mese successivo
   */
  renderNextWeek(year, month) {
    const nextMonth = month === 11 ? 0 : month + 1;
    const nextYear = month === 11 ? year + 1 : year;
    const monthNames = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
      'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];

    let html = `
      <div class="calendar-next-week">
        <h4>Prima settimana ${monthNames[nextMonth]}</h4>
        <div class="next-week-days">
    `;

    for (let day = 1; day <= 7; day++) {
      const dateStr = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const bookings = BookingsModule.getByDate(dateStr);
      const dayOfWeek = new Date(nextYear, nextMonth, day).getDay();
      const dayNames = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];

      const classes = ['next-week-day'];
      if (bookings.length > 0) {
        classes.push('has-booking');
        classes.push(`status-${bookings[0].status}`);
      }

      const guestName = bookings.length > 0 ? BookingsModule.getGuestInfo(bookings[0]).fullName : '';
      html += `
        <div class="${classes.join(' ')}" data-date="${dateStr}">
          <span class="day-name">${dayNames[dayOfWeek]}</span>
          <span class="day-num">${day}</span>
          ${bookings.length > 0 ? `<span class="booking-indicator" title="${Utils.escapeHtml(guestName)}"></span>` : ''}
        </div>
      `;
    }

    html += '</div></div>';
    return html;
  },

  /**
   * Render legenda colori properties
   */
  renderPropertiesLegend() {
    if (!PropertiesModule) return '';
    
    const properties = PropertiesModule.getAll();
    if (properties.length === 0) return '';
    
    let html = '<div class="calendar-legend"><strong>Proprietà:</strong> ';
    
    html += properties.map(property => `
      <span class="legend-item">
        <span class="legend-color" style="background-color: ${property.color}"></span>
        ${Utils.escapeHtml(property.name)}
      </span>
    `).join('');
    
    html += '</div>';
    return html;
  },

  /**
   * Render statistiche mese
   */
  renderStats(year, month) {
    const stats = BookingsModule.getStats(year, month);
    
    return `
      <div class="calendar-stats">
        <div class="stat-item">
          <span class="stat-value">${stats.totalBookings}</span>
          <span class="stat-label">Prenotazioni</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">${stats.occupancyRate}%</span>
          <span class="stat-label">Occupazione</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">€${stats.totalRevenue.toLocaleString()}</span>
          <span class="stat-label">Ricavi</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">€${stats.avgNightlyRate}</span>
          <span class="stat-label">Media/notte</span>
        </div>
      </div>
    `;
  },

  /**
   * Attach eventi ai pulsanti del calendario
   */
  attachCalendarEvents() {
    // Navigazione mesi
    this.container.querySelectorAll('.calendar-nav-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const action = e.currentTarget.dataset.action;
        if (action === 'prev-month') this.prevMonth();
        else if (action === 'next-month') this.nextMonth();
        else if (action === 'today') this.goToToday();
      });
    });

    // Click sui giorni
    this.container.querySelectorAll('.calendar-day:not(.empty), .next-week-day').forEach(day => {
      day.addEventListener('click', (e) => {
        const date = e.currentTarget.dataset.date;
        this.onDateClick(date);
      });
    });

    // Click sulle prenotazioni
    this.container.querySelectorAll('.day-booking').forEach(booking => {
      booking.addEventListener('click', (e) => {
        e.stopPropagation();
        const bookingId = parseInt(e.currentTarget.dataset.bookingId);
        this.onBookingClick(bookingId);
      });
    });
  },

  /**
   * Vai al mese precedente
   */
  prevMonth() {
    this.currentDate.setMonth(this.currentDate.getMonth() - 1);
    this.render();
  },

  /**
   * Vai al mese successivo
   */
  nextMonth() {
    this.currentDate.setMonth(this.currentDate.getMonth() + 1);
    this.render();
  },

  /**
   * Vai a oggi
   */
  goToToday() {
    this.currentDate = new Date();
    this.render();
  },

  /**
   * Handler click su data - Airbnb-style 2-step selection
   */
  onDateClick(date) {
    // Controllo permessi per date passate
    if (!this.canSelectPastDate(date)) {
      NotificationService.error('Solo gli amministratori possono operare su date passate');
      return;
    }
    
    const bookings = BookingsModule.getByDate(date);
    
    // Se la data ha già una prenotazione, mostra dettagli (non interferisce con selezione)
    if (bookings.length > 0) {
      EventBus.emit('CALENDAR_BOOKING_SELECTED', { date, booking: bookings[0] });
      return;
    }
    
    // FSM: Finite State Machine per selezione date
    switch (this.selectionState) {
      case 'IDLE':
        // Step 1: Seleziona check-in
        this.selectedCheckIn = date;
        this.selectedCheckOut = null;
        this.selectionState = 'SELECTING_CHECKOUT';
        break;
        
      case 'SELECTING_CHECKOUT':
        // Step 2: Seleziona check-out
        const checkInDate = new Date(this.selectedCheckIn);
        const selectedDate = new Date(date);
        
        if (selectedDate < checkInDate) {
          // Click su data prima del check-in → reset e ricomincia
          this.selectedCheckIn = date;
          this.selectedCheckOut = null;
        } else {
          // Check-out valido
          this.selectedCheckOut = date;
          this.selectionState = 'SELECTED';
        }
        break;
        
      case 'SELECTED':
        // Già selezionato → reset e ricomincia
        this.resetSelection();
        this.selectedCheckIn = date;
        this.selectionState = 'SELECTING_CHECKOUT';
        break;
    }
    
    this.render();
  },

  /**
   * Handler click su prenotazione
   */
  onBookingClick(bookingId) {
    const booking = BookingsModule.getById(bookingId);
    if (booking) {
      EventBus.emit('CALENDAR_BOOKING_SELECTED', { booking });
    }
  },

  /**
   * Elimina prenotazione dal calendario
   */
  deleteBooking(bookingId) {
    const booking = BookingsModule.getById(bookingId);
    if (!booking) return;
    
    const guestInfo = BookingsModule.getGuestInfo(booking);
    if (confirm(`Eliminare la prenotazione di "${guestInfo.fullName}"?`)) {
      BookingsModule.delete(bookingId);
      this.render();
    }
  },

  /**
   * Aggiorna solo la data specifica
   */
  refreshDate(date) {
    const dayEl = this.container.querySelector(`[data-date="${date}"]`);
    if (!dayEl) return;
    
    const bookings = BookingsModule.getByDate(date);
    dayEl.className = 'calendar-day';
    
    if (bookings.length > 0) {
      dayEl.classList.add('has-booking', `status-${bookings[0].status}`);
    }
  },
  
  /**
   * Verifica se una data è nel range selezionato
   */
  isDateInRange(dateStr) {
    if (!this.selectedCheckIn || !this.selectedCheckOut) return false;
    
    const date = new Date(dateStr);
    const checkIn = new Date(this.selectedCheckIn);
    const checkOut = new Date(this.selectedCheckOut);
    
    return date > checkIn && date < checkOut;
  },
  
  /**
   * Calcola numero di notti
   */
  calculateNights() {
    if (!this.selectedCheckIn || !this.selectedCheckOut) return 0;
    
    const checkIn = new Date(this.selectedCheckIn);
    const checkOut = new Date(this.selectedCheckOut);
    const diffTime = Math.abs(checkOut - checkIn);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  },
  
  /**
   * Reset selezione date
   */
  resetSelection() {
    this.selectedCheckIn = null;
    this.selectedCheckOut = null;
    this.selectionState = 'IDLE';
  },
  
  /**
   * Verifica se l'utente può selezionare date passate
   * Solo admin può operare su date passate
   */
  canSelectPastDate(dateStr) {
    const selectedDate = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    selectedDate.setHours(0, 0, 0, 0);
    
    // Se la data è futura o oggi, tutti possono selezionarla
    if (selectedDate >= today) {
      return true;
    }
    
    // Se la data è passata, solo admin può selezionarla
    const currentUser = AuthManager.getCurrentUser();
    return currentUser && currentUser.role === 'admin';
  },
  
  /**
   * Verifica se una data è passata
   */
  isPastDate(dateStr) {
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    
    return date < today;
  },
  
  /**
   * Render summary selezione (notti + pulsante)
   */
  renderSelectionSummary() {
    if (this.selectionState !== 'SELECTED') return '';
    
    const nights = this.calculateNights();
    const checkInFormatted = this.selectedCheckIn ? 
      Utils.formatDate(this.selectedCheckIn) : '-';
    const checkOutFormatted = this.selectedCheckOut ? 
      Utils.formatDate(this.selectedCheckOut) : '-';
    
    return `
      <div class="calendar-selection-summary">
        <div class="selection-info">
          <div class="selection-dates">
            <span class="selection-label">Check-in:</span>
            <strong>${checkInFormatted}</strong>
            <span class="selection-separator">→</span>
            <span class="selection-label">Check-out:</span>
            <strong>${checkOutFormatted}</strong>
          </div>
          <div class="selection-nights">
            <span class="nights-badge">${nights} ${nights === 1 ? 'notte' : 'notti'}</span>
          </div>
          <div class="selection-hint">
            Click per scegliere l'azione
          </div>
        </div>
        <div class="selection-actions">
          <button class="btn btn-secondary btn-sm" 
                  onclick="CalendarComponent.resetSelection(); CalendarComponent.render()">
            Annulla
          </button>
          <button class="btn btn-primary btn-sm" 
                  onclick="CalendarComponent.showActionMenu()">
            Scegli Azione
          </button>
        </div>
      </div>
    `;
  },
  
  /**
   * Procedi alla creazione prenotazione con date selezionate
   */
  proceedToBooking() {
    if (this.selectionState !== 'SELECTED') return;
    
    EventBus.emit('CALENDAR_DATES_SELECTED', {
      checkIn: this.selectedCheckIn,
      checkOut: this.selectedCheckOut,
      nights: this.calculateNights()
    });
    
    // Reset selezione dopo apertura modale
    this.resetSelection();
    this.render();
  },
  
  /**
   * Mostra menu azioni contestuale
   */
  showActionMenu() {
    if (this.selectionState !== 'SELECTED') return;
    
    const nights = this.calculateNights();
    
    // Popola dati nel menu
    document.getElementById('actionMenuCheckIn').textContent = Utils.formatDate(this.selectedCheckIn);
    document.getElementById('actionMenuCheckOut').textContent = Utils.formatDate(this.selectedCheckOut);
    document.getElementById('actionMenuNights').textContent = `${nights} ${nights === 1 ? 'notte' : 'notti'}`;
    
    // Verifica se esiste prenotazione nel range selezionato
    const hasExistingBooking = this.checkExistingBookingInRange();
    const existingActions = document.getElementById('existingBookingActions');
    
    if (hasExistingBooking) {
      existingActions.style.display = 'block';
      this.existingBookingInRange = hasExistingBooking;
    } else {
      existingActions.style.display = 'none';
      this.existingBookingInRange = null;
    }
    
    // Mostra modal
    document.getElementById('calendarActionMenu').classList.add('active');
  },
  
  /**
   * Chiudi menu azioni
   */
  closeActionMenu() {
    document.getElementById('calendarActionMenu').classList.remove('active');
  },
  
  /**
   * Verifica se esiste prenotazione nel range
   */
  checkExistingBookingInRange() {
    if (!this.selectedCheckIn || !this.selectedCheckOut) return null;
    
    const checkIn = new Date(this.selectedCheckIn);
    const checkOut = new Date(this.selectedCheckOut);
    const allBookings = BookingsModule.getAll();
    
    for (let booking of allBookings) {
      const bookingCheckIn = new Date(booking.checkIn);
      const bookingCheckOut = new Date(booking.checkOut);
      
      // Verifica overlap
      if (bookingCheckIn <= checkOut && bookingCheckOut >= checkIn) {
        return booking;
      }
    }
    
    return null;
  },
  
  /**
   * Azione: Nuova Prenotazione
   */
  actionNewBooking() {
    this.closeActionMenu();
    
    EventBus.emit('CALENDAR_DATES_SELECTED', {
      checkIn: this.selectedCheckIn,
      checkOut: this.selectedCheckOut,
      nights: this.calculateNights()
    });
    
    this.resetSelection();
    this.render();
  },
  
  /**
   * Azione: Blocca Date
   */
  actionBlockDates() {
    this.closeActionMenu();
    
    // Pre-compila form blocco date
    document.getElementById('blockStartDate').value = this.selectedCheckIn;
    document.getElementById('blockEndDate').value = this.selectedCheckOut;
    document.getElementById('blockDatesModal').classList.add('active');
    
    this.resetSelection();
    this.render();
  },
  
  /**
   * Azione: Modifica Prenotazione Esistente
   */
  actionEditBooking() {
    this.closeActionMenu();
    
    if (this.existingBookingInRange) {
      EventBus.emit('CALENDAR_BOOKING_SELECTED', { booking: this.existingBookingInRange });
    }
    
    this.resetSelection();
    this.render();
  },
  
  /**
   * Azione: Elimina Prenotazione Esistente
   */
  actionDeleteBooking() {
    this.closeActionMenu();
    
    if (this.existingBookingInRange) {
      this.deleteBooking(this.existingBookingInRange.id);
    }
    
    this.resetSelection();
    this.render();
  },
  
  /**
   * Helper: Traduzione label stato
   */
  getStatusLabel(status) {
    const labels = {
      'confirmed': 'Confermata',
      'pending': 'In attesa',
      'cancelled': 'Cancellata',
      'blocked': 'Bloccata'
    };
    return labels[status] || status;
  },
  
  /**
   * Helper: Verifica overlap per una specifica data
   */
  checkOverlapForDate(dateStr) {
    const bookings = BookingsModule.getByDate(dateStr);
    return bookings.length > 1; // Overlap se ci sono più prenotazioni nella stessa data
  }
};

window.CalendarComponent = CalendarComponent;
