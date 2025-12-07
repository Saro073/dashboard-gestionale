// ==================== BOOKINGS HANDLERS ====================
/**
 * BookingsHandlers - Gestione UI e interazioni per prenotazioni
 * Separato da app.js per mantenere codice modulare
 */

const BookingsHandlers = {
  
  selectedContactId: null, // Track selected contact from autocomplete
  
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
    EventBus.on('CALENDAR_DATES_SELECTED', (data) => this.onCalendarDatesSelected(data));
    EventBus.on('CALENDAR_BOOKING_SELECTED', (data) => this.onCalendarBookingSelected(data));
    
    // Autocomplete contatti
    this.setupContactAutocomplete();
  },
  
  /**
   * Setup autocomplete per ricerca contatti esistenti
   */
  setupContactAutocomplete() {
    const searchInput = document.getElementById('bookingSearchContact');
    const suggestionsDiv = document.getElementById('bookingContactSuggestions');
    
    if (!searchInput || !suggestionsDiv) return;
    
    searchInput.addEventListener('input', Utils.debounce(() => {
      const term = searchInput.value.trim().toLowerCase();
      
      if (term.length < 2) {
        suggestionsDiv.style.display = 'none';
        return;
      }
      
      if (typeof ContactsModule === 'undefined') {
        suggestionsDiv.style.display = 'none';
        return;
      }
      
      const contacts = ContactsModule.getAll();
      const matches = contacts.filter(c => {
        const fullName = `${c.firstName} ${c.lastName}`.toLowerCase();
        const email = c.emails?.[0]?.value?.toLowerCase() || '';
        const phone = c.phones?.[0]?.value || '';
        return fullName.includes(term) || email.includes(term) || phone.includes(term);
      }).slice(0, 5);
      
      if (matches.length === 0) {
        suggestionsDiv.style.display = 'none';
        return;
      }
      
      suggestionsDiv.innerHTML = matches.map(c => `
        <div class=\"autocomplete-item\" data-contact-id=\"${c.id}\">
          <strong>${Utils.escapeHtml(c.firstName)} ${Utils.escapeHtml(c.lastName)}</strong>
          <small>
            ${c.emails?.[0]?.value ? `📧 ${Utils.escapeHtml(c.emails[0].value)}` : ''}
            ${c.phones?.[0]?.value ? ` • 📞 ${Utils.escapeHtml(c.phones[0].value)}` : ''}
          </small>
        </div>
      `).join('');
      
      suggestionsDiv.style.display = 'block';
      
      // Click su suggestion
      suggestionsDiv.querySelectorAll('.autocomplete-item').forEach(item => {
        item.addEventListener('click', () => {
          const contactId = parseInt(item.dataset.contactId);
          this.fillFormFromContact(contactId);
          searchInput.value = '';
          suggestionsDiv.style.display = 'none';
        });
      });
    }, 300));
    
    // Hide suggestions on outside click
    document.addEventListener('click', (e) => {
      if (!searchInput.contains(e.target) && !suggestionsDiv.contains(e.target)) {
        suggestionsDiv.style.display = 'none';
      }
    });
  },
  
  /**
   * Pre-compila form con dati da contatto selezionato
   */
  fillFormFromContact(contactId) {
    const contact = ContactsModule.getById(contactId);
    if (!contact) return;
    
    this.selectedContactId = contactId;
    
    // Dati base
    document.getElementById('bookingGuestFirstName').value = contact.firstName || '';
    document.getElementById('bookingGuestLastName').value = contact.lastName || '';
    document.getElementById('bookingGuestEmail').value = contact.emails?.[0]?.value || '';
    document.getElementById('bookingGuestPhone').value = contact.phones?.[0]?.value || '';
    
    // Indirizzo privato
    if (contact.address) {
      document.getElementById('bookingPrivateStreet').value = contact.address.street || '';
      document.getElementById('bookingPrivateZip').value = contact.address.zip || '';
      document.getElementById('bookingPrivateCity').value = contact.address.city || '';
      document.getElementById('bookingPrivateCountry').value = contact.address.country || 'Italia';
    }
    
    // Indirizzo aziendale
    if (contact.businessAddress) {
      document.getElementById('bookingBusinessStreet').value = contact.businessAddress.street || '';
      document.getElementById('bookingBusinessZip').value = contact.businessAddress.zip || '';
      document.getElementById('bookingBusinessCity').value = contact.businessAddress.city || '';
      document.getElementById('bookingBusinessCountry').value = contact.businessAddress.country || 'Italia';
    }
    
    NotificationService.success(`Cliente "${contact.firstName} ${contact.lastName}" selezionato`);
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

    container.innerHTML = filtered.map(booking => {
      const guestInfo = BookingsModule.getGuestInfo(booking);
      return `
        <div class="booking-item">
          <div class="booking-content">
            <h4>
              ${Utils.escapeHtml(guestInfo.fullName)}
              ${booking.contactId ? '<span title="Collegato a contatto">🔗</span>' : ''}
            </h4>
            ${guestInfo.email ? `<p>📧 ${Utils.escapeHtml(guestInfo.email)}</p>` : ''}
            ${guestInfo.phone ? `<p>📞 ${Utils.escapeHtml(guestInfo.phone)}</p>` : ''}
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
      `;
    }).join('');
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
    
    // Ottieni dati ospite (da contatto o snapshot)
    const guestInfo = BookingsModule.getGuestInfo(booking);
    
    document.getElementById('bookingModalTitle').textContent = 'Modifica Prenotazione';
    
    // Campi nome/cognome
    document.getElementById('bookingGuestFirstName').value = guestInfo.firstName;
    document.getElementById('bookingGuestLastName').value = guestInfo.lastName;
    document.getElementById('bookingGuestEmail').value = guestInfo.email || '';
    document.getElementById('bookingGuestPhone').value = guestInfo.phone || '';
    
    // Indirizzo privato
    if (guestInfo.privateAddress) {
      document.getElementById('bookingPrivateStreet').value = guestInfo.privateAddress.street || '';
      document.getElementById('bookingPrivateZip').value = guestInfo.privateAddress.zip || '';
      document.getElementById('bookingPrivateCity').value = guestInfo.privateAddress.city || '';
      document.getElementById('bookingPrivateCountry').value = guestInfo.privateAddress.country || 'Italia';
    }
    
    // Indirizzo aziendale
    if (guestInfo.businessAddress) {
      document.getElementById('bookingBusinessStreet').value = guestInfo.businessAddress.street || '';
      document.getElementById('bookingBusinessZip').value = guestInfo.businessAddress.zip || '';
      document.getElementById('bookingBusinessCity').value = guestInfo.businessAddress.city || '';
      document.getElementById('bookingBusinessCountry').value = guestInfo.businessAddress.country || 'Italia';
    }
    
    // Altri campi prenotazione
    document.getElementById('bookingCheckIn').value = booking.checkIn;
    document.getElementById('bookingCheckOut').value = booking.checkOut;
    document.getElementById('bookingGuests').value = booking.guests;
    document.getElementById('bookingChannel').value = booking.channel;
    document.getElementById('bookingTotalAmount').value = booking.totalAmount;
    document.getElementById('bookingDeposit').value = booking.deposit;
    document.getElementById('bookingStatus').value = booking.status;
    document.getElementById('bookingIsPaid').checked = booking.isPaid;
    document.getElementById('bookingNotes').value = booking.notes || '';
    
    // Salva contactId originale
    this.selectedContactId = booking.contactId || null;
    
    const modal = document.getElementById('bookingModal');
    modal.classList.add('active');
    
    // Cambia form submit per update
    const form = document.getElementById('bookingForm');
    form.onsubmit = (e) => {
      e.preventDefault();
      
      // Raccogli dati aggiornati
      const firstName = document.getElementById('bookingGuestFirstName').value.trim();
      const lastName = document.getElementById('bookingGuestLastName').value.trim();
      const email = document.getElementById('bookingGuestEmail').value.trim();
      const phone = document.getElementById('bookingGuestPhone').value.trim();
      
      const privateAddress = {
        street: document.getElementById('bookingPrivateStreet')?.value.trim() || '',
        zip: document.getElementById('bookingPrivateZip')?.value.trim() || '',
        city: document.getElementById('bookingPrivateCity')?.value.trim() || '',
        country: document.getElementById('bookingPrivateCountry')?.value.trim() || 'Italia'
      };
      
      const businessStreet = document.getElementById('bookingBusinessStreet')?.value.trim() || '';
      const businessAddress = businessStreet ? {
        street: businessStreet,
        zip: document.getElementById('bookingBusinessZip')?.value.trim() || '',
        city: document.getElementById('bookingBusinessCity')?.value.trim() || '',
        country: document.getElementById('bookingBusinessCountry')?.value.trim() || 'Italia'
      } : null;
      
      const updates = {
        contactId: this.selectedContactId,
        guestFirstName: firstName,
        guestLastName: lastName,
        guestEmail: email,
        guestPhone: phone,
        guestPrivateAddress: privateAddress,
        guestBusinessAddress: businessAddress,
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
        this.selectedContactId = null;
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
    // Raccogli dati base
    const firstName = document.getElementById('bookingGuestFirstName').value.trim();
    const lastName = document.getElementById('bookingGuestLastName').value.trim();
    const email = document.getElementById('bookingGuestEmail').value.trim();
    const phone = document.getElementById('bookingGuestPhone').value.trim();
    
    // Raccogli indirizzo privato
    const privateAddress = {
      street: document.getElementById('bookingPrivateStreet')?.value.trim() || '',
      zip: document.getElementById('bookingPrivateZip')?.value.trim() || '',
      city: document.getElementById('bookingPrivateCity')?.value.trim() || '',
      country: document.getElementById('bookingPrivateCountry')?.value.trim() || 'Italia'
    };
    
    // Raccogli indirizzo aziendale (opzionale)
    const businessStreet = document.getElementById('bookingBusinessStreet')?.value.trim() || '';
    const businessAddress = businessStreet ? {
      street: businessStreet,
      zip: document.getElementById('bookingBusinessZip')?.value.trim() || '',
      city: document.getElementById('bookingBusinessCity')?.value.trim() || '',
      country: document.getElementById('bookingBusinessCountry')?.value.trim() || 'Italia'
    } : null;
    
    // Prepara dati ospite per getOrCreateContact()
    const guestData = {
      firstName,
      lastName,
      email,
      phone,
      privateAddress,
      businessAddress
    };
    
    // Ottieni o crea contatto
    const contactResult = BookingsModule.getOrCreateContact(guestData);
    const contactId = contactResult.success ? contactResult.contactId : this.selectedContactId;
    
    // Costruisci booking data con nuovo modello
    const data = {
      contactId,
      guestFirstName: firstName,
      guestLastName: lastName,
      guestEmail: email,
      guestPhone: phone,
      guestPrivateAddress: privateAddress,
      guestBusinessAddress: businessAddress,
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
      this.selectedContactId = null;
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
   * Handler per date selezionate (Airbnb-style 2-step)
   * Apre modale nuova prenotazione con date pre-compilate
   */
  onCalendarDatesSelected(data) {
    const { checkIn, checkOut } = data;
    
    this.openBookingModal();
    
    // Pre-compila date
    document.getElementById('bookingCheckIn').value = checkIn;
    document.getElementById('bookingCheckOut').value = checkOut;
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
