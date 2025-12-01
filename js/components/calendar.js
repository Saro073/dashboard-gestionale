// ==================== CALENDAR COMPONENT ====================
/**
 * CalendarComponent - Componente calendario per visualizzazione prenotazioni
 * Mostra mese corrente + prima settimana del mese successivo
 */
const CalendarComponent = {
  currentDate: new Date(),
  selectedDate: null,
  container: null,

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
   * Render griglia calendario
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
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const bookings = BookingsModule.getByDate(dateStr);
      const isToday = today.getFullYear() === year && 
                      today.getMonth() === month && 
                      today.getDate() === day;
      
      const classes = ['calendar-day'];
      if (isToday) classes.push('today');
      if (bookings.length > 0) {
        classes.push('has-booking');
        const booking = bookings[0];
        classes.push(`status-${booking.status}`);
      }

      html += `
        <div class="${classes.join(' ')}" data-date="${dateStr}">
          <span class="day-number">${day}</span>
          ${bookings.length > 0 ? this.renderDayBookings(bookings) : ''}
        </div>
      `;
    }

    html += '</div></div>';
    return html;
  },

  /**
   * Render prenotazioni nel giorno
   */
  renderDayBookings(bookings) {
    if (bookings.length === 0) return '';
    
    const booking = bookings[0];
    const isBlocked = booking.status === 'blocked';
    
    return `
      <div class="day-booking ${isBlocked ? 'blocked' : ''}" 
           data-booking-id="${booking.id}"
           title="${Utils.escapeHtml(booking.guestName)}">
        ${isBlocked ? '🔒' : Utils.escapeHtml(booking.guestName.substring(0, 8))}
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

      html += `
        <div class="${classes.join(' ')}" data-date="${dateStr}">
          <span class="day-name">${dayNames[dayOfWeek]}</span>
          <span class="day-num">${day}</span>
          ${bookings.length > 0 ? `<span class="booking-indicator" title="${Utils.escapeHtml(bookings[0].guestName)}"></span>` : ''}
        </div>
      `;
    }

    html += '</div></div>';
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
   * Handler click su data
   */
  onDateClick(date) {
    this.selectedDate = date;
    const bookings = BookingsModule.getByDate(date);
    
    if (bookings.length > 0) {
      // Mostra dettagli prenotazione esistente
      EventBus.emit('CALENDAR_BOOKING_SELECTED', { date, booking: bookings[0] });
    } else {
      // Permetti di creare nuova prenotazione
      EventBus.emit('CALENDAR_DATE_SELECTED', { date });
    }
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
  }
};

window.CalendarComponent = CalendarComponent;
