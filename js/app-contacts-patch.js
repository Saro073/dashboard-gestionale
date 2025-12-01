// ==================== PATCH PER APP.JS - CONTATTI MULTI-VALORE ====================
// Copiare questi metodi in app.js nelle posizioni indicate

// MODIFICA 1: Nella funzione init() aggiungere dopo AuthManager.init():
ContactsModule.migrateOldContacts();

// MODIFICA 2: Sostituire il metodo openContactModal() con:
openContactModal() {
  document.getElementById('contactForm').reset();
  document.getElementById('emailsContainer').innerHTML = `
    <div class="multi-input-row">
      <input type="email" class="email-value" placeholder="email@esempio.com" required>
      <input type="text" class="email-label" placeholder="Etichetta (es: Lavoro)" required>
      <button type="button" class="btn-remove-field" onclick="app.removeEmailField(this)">✕</button>
    </div>
  `;
  document.getElementById('phonesContainer').innerHTML = `
    <div class="multi-input-row">
      <input type="tel" class="phone-value" placeholder="+39 123 456 789" required>
      <input type="text" class="phone-label" placeholder="Etichetta (es: Ufficio)" required>
      <button type="button" class="btn-remove-field" onclick="app.removePhoneField(this)">✕</button>
    </div>
  `;
  document.getElementById('contactModal').classList.add('active');
  EventBus.emit(EVENTS.MODAL_OPENED, { modal: 'contact' });
}

// MODIFICA 3: Aggiungere questi 6 nuovi metodi dopo openContactModal():

addEmailField() {
  const container = document.getElementById('emailsContainer');
  const row = document.createElement('div');
  row.className = 'multi-input-row';
  row.innerHTML = `
    <input type="email" class="email-value" placeholder="email@esempio.com" required>
    <input type="text" class="email-label" placeholder="Etichetta" required>
    <button type="button" class="btn-remove-field" onclick="app.removeEmailField(this)">✕</button>
  `;
  container.appendChild(row);
}

removeEmailField(btn) {
  const container = document.getElementById('emailsContainer');
  if (container.children.length > 1) {
    btn.closest('.multi-input-row').remove();
  } else {
    NotificationService.error('Almeno un\'email è richiesta');
  }
}

addPhoneField() {
  const container = document.getElementById('phonesContainer');
  const row = document.createElement('div');
  row.className = 'multi-input-row';
  row.innerHTML = `
    <input type="tel" class="phone-value" placeholder="+39 123 456 789" required>
    <input type="text" class="phone-label" placeholder="Etichetta" required>
    <button type="button" class="btn-remove-field" onclick="app.removePhoneField(this)">✕</button>
  `;
  container.appendChild(row);
}

removePhoneField(btn) {
  const container = document.getElementById('phonesContainer');
  if (container.children.length > 1) {
    btn.closest('.multi-input-row').remove();
  } else {
    NotificationService.error('Almeno un telefono è richiesto');
  }
}

collectEmails() {
  const rows = document.querySelectorAll('#emailsContainer .multi-input-row');
  return Array.from(rows).map(row => ({
    value: row.querySelector('.email-value').value.trim(),
    label: row.querySelector('.email-label').value.trim()
  }));
}

collectPhones() {
  const rows = document.querySelectorAll('#phonesContainer .multi-input-row');
  return Array.from(rows).map(row => ({
    value: row.querySelector('.phone-value').value.trim(),
    label: row.querySelector('.phone-label').value.trim()
  }));
}

// MODIFICA 4: Sostituire il metodo saveContact() con:

saveContact() {
  const data = {
    name: document.getElementById('contactName').value,
    emails: this.collectEmails(),
    phones: this.collectPhones(),
    company: document.getElementById('contactCompany').value,
    category: document.getElementById('contactCategory').value,
    notes: document.getElementById('contactNotes').value
  };
  
  const result = ContactsModule.create(data);
  if (result.success) {
    document.getElementById('contactModal').classList.remove('active');
    document.getElementById('contactForm').reset();
    this.renderContacts();
  }
}

// MODIFICA 5: Sostituire il metodo renderContacts() con:

renderContacts() {
  const container = document.getElementById('contactsList');
  const filter = document.getElementById('contactFilter').value;
  const search = document.getElementById('contactSearch').value;
  
  let filtered = ContactsModule.filterByCategory(filter);
  if (search) {
    filtered = ContactsModule.search(search);
  }
  
  if (filtered.length === 0) {
    container.innerHTML = '<p class="empty-state">Nessun contatto trovato</p>';
    return;
  }
  
  container.innerHTML = filtered.map(contact => `
    <div class="item-card">
      <h3>${Utils.escapeHtml(contact.name)}</h3>
      
      ${contact.emails && contact.emails.length > 0 ? 
        contact.emails.map(e => 
          `<p>📧 ${Utils.escapeHtml(e.value)} <span class="field-label">(${Utils.escapeHtml(e.label)})</span></p>`
        ).join('') 
        : ''}
      
      ${contact.phones && contact.phones.length > 0 ? 
        contact.phones.map(p => 
          `<p>📞 ${Utils.escapeHtml(p.value)} <span class="field-label">(${Utils.escapeHtml(p.label)})</span></p>`
        ).join('') 
        : ''}
      
      ${contact.company ? `<p>🏢 ${Utils.escapeHtml(contact.company)}</p>` : ''}
      ${contact.notes ? `<p class="contact-notes">📝 ${Utils.escapeHtml(contact.notes)}</p>` : ''}
      <div class="item-meta">
        <span class="item-badge badge-${contact.category}">${contact.category}</span>
        <span class="activity-time">by ${contact.createdByUsername}</span>
      </div>
      <div class="item-actions">
        ${PermissionsManager.canEditContact(contact) ? 
          `<button class="btn btn-sm btn-secondary" onclick="app.editContact(${contact.id})">Modifica</button>` : ''}
        ${PermissionsManager.canDeleteContact(contact) ?
          `<button class="btn btn-sm btn-danger" onclick="app.deleteContact(${contact.id})">Elimina</button>` : ''}
      </div>
    </div>
  `).join('');
}
