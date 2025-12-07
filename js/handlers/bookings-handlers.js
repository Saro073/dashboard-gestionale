// ==================== BOOKINGS HANDLERS ====================
/**
 * BookingsHandlers - Gestione UI e interazioni per prenotazioni
 * Separato da app.js per mantenere codice modulare
 */

const BookingsHandlers = {
  
  /**
   * Inizializza tutti i listener per bookings
   */
  setupBookingsListeners() {
    // Pulsanti view toggle
    document.getElementById('calendarViewBtn')?.addEventListener('click', () => {
      this.switchBookingsView('calendar');
    });
    
    document.getElementById('listViewBtn')?.addEventListener('click', () => {
      this.switchBookingsView('list');
    });
    
    // Pulsanti azioni
    document.getElementById('addBookingBtn')?.addEventListener('click', () => {
      this.openBookingModal();
    });
    
    document.getElementById('blockDatesBtn')?.addEventListener('click', () => {
      this.openBlockDatesModal();
    });
    
    // Filtri
    document.getElementById('bookingChannelFilter')?.addEventListener('change', () => {
      this.renderBookings();
    });
    
    document.getElementById('bookingStatusFilter')?.addEventListener('change', () => {
      this.renderBookings();
    });
    
    document.getElementById('bookingSearch')?.addEventListener('input', 
      Utils.debounce(() => this.renderBookings(), 300)
    );
    
    // Form prenotazione
    document.getElementById('bookingForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveBooking();
    });
    
    // Form blocco date
    document.getElementById('blockDatesForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.blockDates();
    });
    
    // Inizializza calendario quando si entra nella sezione bookings via EventBus
    EventBus.on(EVENTS.SECTION_CHANGED, (data) => {
      if (data.section === 'bookings') {
        CalendarComponent.init('bookingsCalendar');
        this.renderBookings();
      }
    });

    // EventBus listeners per click calendario
    EventBus.on('CALENDAR_DATE_SELECTED', (data) => this.onCalendarDateSelected(data));
    EventBus.on('CALENDAR_BOOKING_SELECTED', (data) => this.onCalendarBookingSelected(data));
  },

  /**
   * Cambia vista tra calendario e lista
   */
  switchBookingsView(view) {
    if (view === 'calendar') {
      document.getElementById('bookingsCalendarView').classList.add('active');
      document.getElementById('bookingsListView').classList.remove('active');
      document.getElementById('calendarViewBtn').classList.add('active');
      document.getElementById('listViewBtn').classList.remove('active');
      CalendarComponent.render();
    } else {
      document.getElementById('bookingsCalendarView').classList.remove('active');
      document.getElementById('bookingsListView').classList.add('active');
      document.getElementById('calendarViewBtn').classList.remove('active');
      document.getElementById('listViewBtn').classList.add('active');
      this.renderBookings();
    }
  },

  /**
   * Render lista prenotazioni
   */
  renderBookings() {
    const container = document.getElementById('bookingsList');
    if (!container) return;
    
    const channelFilter = document.getElementById('bookingChannelFilter')?.value || 'all';
    const statusFilter = document.getElementById('bookingStatusFilter')?.value || 'all';
    const search = document.getElementById('bookingSearch')?.value || '';
    
    let filtered = BookingsModule.getAll();
    
    if (channelFilter !== 'all') {
      filtered = BookingsModule.filterByChannel(channelFilter);
    }
    
    if (statusFilter !== 'all') {
      filtered = BookingsModule.filterByStatus(statusFilter);
    }
    
    if (search) {
      filtered = BookingsModule.search(search);
    }
    
    if (filtered.length === 0) {
      container.innerHTML = '<p class="empty-state">Nessuna prenotazione trovata</p>';
      return;
    }
    
    filtered.sort((a, b) => new Date(a.checkIn) - new Date(b.checkIn));

    container.innerHTML = filtered.map(booking => `
      <div class="booking-item">
        <div class="booking-content">
          <h4>${Utils.escapeHtml(booking.guestName)}</h4>
          ${booking.guestEmail ? `<p>📧 ${Utils.escapeHtml(booking.guestEmail)}</p>` : ''}
          ${booking.guestPhone ? `<p>📞 ${Utils.escapeHtml(booking.guestPhone)}</p>` : ''}
          <div class="booking-dates">
            <span>📅 ${Utils.formatDate(booking.checkIn)} - ${Utils.formatDate(booking.checkOut)}</span>
            <span>👥 ${booking.guests} ${booking.guests === 1 ? 'ospite' : 'ospiti'}</span>
          </div>
          <div class="item-meta">
            <span class="item-badge badge-${booking.status}">${this.getStatusLabel(booking.status)}</span>
            <span class="item-badge badge-${booking.channel}">${this.getChannelLabel(booking.channel)}</span>
            ${booking.isPaid ? '<span class="item-badge" style="background: #d1fae5; color: #065f46;">✓ Pagato</span>' : ''}
          </div>
        </div>
        <div class="booking-amount">€${booking.totalAmount.toFixed(2)}</div>
        <div class="item-actions">
          <button class="btn btn-sm btn-secondary" onclick="BookingsHandlers.editBooking(${booking.id})">Modifica</button>
          <button class="btn btn-sm btn-danger" onclick="BookingsHandlers.deleteBooking(${booking.id})">Elimina</button>
        </div>
      </div>
    `).join('');
  },

  /**
   * Ottiene label tradotta per stato
   */
  getStatusLabel(status) {
    const labels = {
      confirmed: 'Confermata',
      pending: 'In Attesa',
      cancelled: 'Annullata',
      blocked: 'Bloccata'
    };
    return labels[status] || status;
  },

  /**
   * Ottiene label tradotta per canale
   */
  getChannelLabel(channel) {
    const labels = {
      direct: 'Diretto',
      booking: 'Booking.com',
      airbnb: 'Airbnb',
      vrbo: 'VRBO',
      other: 'Altro'
    };
    return labels[channel] || channel;
  },

  /**
   * Apre modale nuova prenotazione
   */
  openBookingModal() {
    const modal = document.getElementById('bookingModal');
    modal.classList.add('active');
    document.getElementById('bookingModalTitle').textContent = 'Nuova Prenotazione';
    document.getElementById('bookingForm').reset();
    
    // Reset form submit handler to create mode
    const form = document.getElementById('bookingForm');
    form.onsubmit = (e) => {
      e.preventDefault();
      this.saveBooking();
    };
    
    EventBus.emit(EVENTS.MODAL_OPENED, { modal: 'booking' });
  },

  /**
   * Modifica prenotazione esistente
   */
  editBooking(id) {
    const booking = BookingsModule.getById(id);
    if (!booking) return;
    
    document.getElementById('bookingModalTitle').textContent = 'Modifica Prenotazione';
    document.getElementById('bookingGuestName').value = booking.guestName;
    document.getElementById('bookingGuestEmail').value = booking.guestEmail || '';
    document.getElementById('bookingGuestPhone').value = booking.guestPhone || '';
    document.getElementById('bookingCheckIn').value = booking.checkIn;
    document.getElementById('bookingCheckOut').value = booking.checkOut;
    document.getElementById('bookingGuests').value = booking.guests;
    document.getElementById('bookingChannel').value = booking.channel;
    document.getElementById('bookingTotalAmount').value = booking.totalAmount;
    document.getElementById('bookingDeposit').value = booking.deposit;
    document.getElementById('bookingStatus').value = booking.status;
    document.getElementById('bookingIsPaid').checked = booking.isPaid;
    document.getElementById('bookingNotes').value = booking.notes || '';
    
    const modal = document.getElementById('bookingModal');
    modal.classList.add('active');
    
    // Cambia form submit per update
    const form = document.getElementById('bookingForm');
    form.onsubmit = (e) => {
      e.preventDefault();
      const updates = {
        guestName: document.getElementById('bookingGuestName').value,
        guestEmail: document.getElementById('bookingGuestEmail').value,
        guestPhone: document.getElementById('bookingGuestPhone').value,
        checkIn: document.getElementById('bookingCheckIn').value,
        checkOut: document.getElementById('bookingCheckOut').value,
        guests: parseInt(document.getElementById('bookingGuests').value),
        channel: document.getElementById('bookingChannel').value,
        totalAmount: parseFloat(document.getElementById('bookingTotalAmount').value),
        deposit: parseFloat(document.getElementById('bookingDeposit').value),
        status: document.getElementById('bookingStatus').value,
        isPaid: document.getElementById('bookingIsPaid').checked,
        notes: document.getElementById('bookingNotes').value
      };
      
      const result = BookingsModule.update(id, updates);
      if (result.success) {
        document.getElementById('bookingModal').classList.remove('active');
        document.getElementById('bookingForm').reset();
        form.onsubmit = null;
        this.renderBookings();
        CalendarComponent.render();
        
        // Update stats via EventBus
        EventBus.emit(EVENTS.BOOKING_UPDATED, { id, booking: result.booking });
      }
    };
  },

  /**
   * Elimina prenotazione
   */
  deleteBooking(id) {
    if (confirm('Eliminare questa prenotazione?')) {
      BookingsModule.delete(id);
      this.renderBookings();
      CalendarComponent.render();
    }
  },

  /**
   * Salva nuova prenotazione
   */
  saveBooking() {
    const data = {
      guestName: document.getElementById('bookingGuestName').value,
      guestEmail: document.getElementById('bookingGuestEmail').value,
      guestPhone: document.getElementById('bookingGuestPhone').value,
      checkIn: document.getElementById('bookingCheckIn').value,
      checkOut: document.getElementById('bookingCheckOut').value,
      guests: parseInt(document.getElementById('bookingGuests').value),
      channel: document.getElementById('bookingChannel').value,
      totalAmount: parseFloat(document.getElementById('bookingTotalAmount').value),
      deposit: parseFloat(document.getElementById('bookingDeposit').value),
      status: document.getElementById('bookingStatus').value,
      isPaid: document.getElementById('bookingIsPaid').checked,
      notes: document.getElementById('bookingNotes').value
    };
    
    const result = BookingsModule.create(data);
    if (result.success) {
      document.getElementById('bookingModal').classList.remove('active');
      document.getElementById('bookingForm').reset();
      this.renderBookings();
      CalendarComponent.render();
    }
  },

  /**
   * Apre modale blocco date
   */
  openBlockDatesModal() {
    const modal = document.getElementById('blockDatesModal');
    modal.classList.add('active');
    document.getElementById('blockDatesForm').reset();
    EventBus.emit(EVENTS.MODAL_OPENED, { modal: 'blockDates' });
  },

  /**
   * Blocca date
   */
  blockDates() {
    const startDate = document.getElementById('blockStartDate').value;
    const endDate = document.getElementById('blockEndDate').value;
    const reason = document.getElementById('blockReason').value;
    
    const result = BookingsModule.blockDates(startDate, endDate, reason);
    if (result.success) {
      document.getElementById('blockDatesModal').classList.remove('active');
      document.getElementById('blockDatesForm').reset();
      this.renderBookings();
      CalendarComponent.render();
    }
  },

  /**
   * Handler per click su giorno vuoto del calendario
   * Apre modale nuova prenotazione con data pre-compilata
   */
  onCalendarDateSelected(data) {
    const { date } = data;
    
    // Apri modale con data pre-compilata
    this.openBookingModal();
    
    // Pre-compila check-in
    document.getElementById('bookingCheckIn').value = date;
    
    // Pre-compila check-out (giorno dopo)
    const checkOut = new Date(date);
    checkOut.setDate(checkOut.getDate() + 1);
    document.getElementById('bookingCheckOut').value = checkOut.toISOString().split('T')[0];
  },

  /**
   * Handler per click su prenotazione esistente nel calendario
   * Apre modale modifica prenotazione
   */
  onCalendarBookingSelected(data) {
    const { booking } = data;
    if (booking) {
      this.editBooking(booking.id);
    }
  }
};

window.BookingsHandlers = BookingsHandlers;
