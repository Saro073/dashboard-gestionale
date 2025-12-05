# 🚀 Guida Integrazione Sistema Notifiche + Manutenzione

## ✅ File già creati:
1. `/js/services/TelegramService.js` - Servizio Telegram completo
2. `/js/services/EmailService.js` - Servizio Email (EmailJS)
3. `/js/modules/maintenance.js` - Modulo manutenzione completo

## 📝 Modifiche da fare manualmente a `index.html`:

### 1. Aggi ungi nella SIDEBAR (dopo Cleaning, linea ~75):
```html
<!-- Maintenance Section -->
<a href="#maintenance" class="nav-item" data-section="maintenance" id="maintenanceNavItem">
    <span class="nav-icon">🔧</span>
    <span>Manutenzione</span>
</a>
```

### 2. Aggiungi nella SIDEBAR (dopo Category Admin, linea ~105):
```html
<!-- Settings Section -->
<a href="#settings" class="nav-item" data-section="settings" id="settingsNavItem">
    <span class="nav-icon">⚙️</span>
    <span>Impostazioni</span>
</a>
```

### 3. Aggiungi SEZIONE MANUTENZIONE (dopo cleaningSection, linea ~342):
```html
<!-- Maintenance Section -->
<div id="maintenanceSection" class="content-section">
    <div class="section-header">
        <h1>🔧 Manutenzione</h1>
        <button class="btn btn-primary" id="addMaintenanceBtn">+ Aggiungi Intervento</button>
    </div>

    <div class="maintenance-stats">
        <div class="stat-card-small">
            <h3>Da Programmare</h3>
            <p class="stat-value" id="maintenancePending">0</p>
        </div>
        <div class="stat-card-small">
            <h3>In Corso</h3>
            <p class="stat-value" id="maintenanceInProgress">0</p>
        </div>
        <div class="stat-card-small">
            <h3>🔴 Urgenti</h3>
            <p class="stat-value" id="maintenanceUrgent">0</p>
        </div>
        <div class="stat-card-small">
            <h3>Costo Totale (30gg)</h3>
            <p class="stat-value" id="maintenanceTotalCost">€0</p>
        </div>
    </div>

    <div class="section-toolbar">
        <input type="text" id="maintenanceSearch" class="form-control" placeholder="Cerca intervento...">
        <select id="maintenanceCategoryFilter" class="form-control">
            <option value="all">Tutte le categorie</option>
            <option value="plumbing">🚰 Idraulica</option>
            <option value="electrical">⚡ Elettricità</option>
            <option value="heating">🔥 Riscaldamento</option>
            <option value="locksmith">🔑 Serrature</option>
            <option value="appliances">🔧 Elettrodomestici</option>
            <option value="other">🛠️ Altro</option>
        </select>
        <select id="maintenanceStatusFilter" class="form-control">
            <option value="all">Tutti gli stati</option>
            <option value="pending">Da programmare</option>
            <option value="in-progress">In corso</option>
            <option value="completed">Completati</option>
        </select>
        <select id="maintenancePriorityFilter" class="form-control">
            <option value="all">Tutte le priorità</option>
            <option value="urgent">🔴 Urgente</option>
            <option value="high">🟠 Alta</option>
            <option value="medium">🟡 Media</option>
            <option value="low">🔵 Bassa</option>
        </select>
    </div>

    <div id="maintenanceList" class="items-list"></div>
</div>
```

### 4. Aggiungi SEZIONE SETTINGS (dopo categoryAdminSection):
```html
<!-- Settings Section -->
<div id="settingsSection" class="content-section">
    <div class="section-header">
        <h1>⚙️ Impostazioni Notifiche</h1>
    </div>

    <!-- Telegram Settings -->
    <div class="settings-card">
        <h2>💬 Telegram (Staff Operativo)</h2>
        <p class="text-secondary">Notifiche istantanee per pulizie e manutenzione</p>
        
        <div class="form-group">
            <label>Bot Token</label>
            <input type="text" id="telegramBotToken" class="form-control" placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11">
            <small>Ottieni da @BotFather su Telegram</small>
        </div>

        <div class="form-row">
            <div class="form-group">
                <label>Chat ID Pulizie</label>
                <input type="text" id="telegramCleaningChatId" class="form-control" placeholder="123456789">
            </div>
            <div class="form-group">
                <label>Chat ID Manutenzione</label>
                <input type="text" id="telegramMaintenanceChatId" class="form-control" placeholder="987654321">
            </div>
            <div class="form-group">
                <label>Chat ID Admin</label>
                <input type="text" id="telegramAdminChatId" class="form-control" placeholder="111222333">
            </div>
        </div>

        <button class="btn btn-secondary" id="testTelegramBtn">🧪 Test Connessione</button>
        <button class="btn btn-primary" id="saveTelegramBtn">💾 Salva Telegram</button>
    </div>

    <!-- Email Settings -->
    <div class="settings-card">
        <h2>📧 Email (Clienti)</h2>
        <p class="text-secondary">Conferme booking e comunicazioni ufficiali via EmailJS</p>
        
        <div class="form-group">
            <label>Service ID</label>
            <input type="text" id="emailServiceId" class="form-control" placeholder="service_xxxxxxx">
        </div>

        <div class="form-row">
            <div class="form-group">
                <label>Template ID</label>
                <input type="text" id="emailTemplateId" class="form-control" placeholder="template_xxxxxxx">
            </div>
            <div class="form-group">
                <label>Public Key</label>
                <input type="text" id="emailPublicKey" class="form-control" placeholder="user_xxxxxxxxxxxxxxxxxxxx">
            </div>
        </div>

        <div class="form-group">
            <label>
                <input type="checkbox" id="emailEnabled"> Abilita Email
            </label>
        </div>

        <button class="btn btn-secondary" id="testEmailBtn">🧪 Test Email</button>
        <button class="btn btn-primary" id="saveEmailBtn">💾 Salva Email</button>
    </div>

    <!-- Notification Rules -->
    <div class="settings-card">
        <h2>🔔 Regole Notifiche</h2>
        
        <div class="form-group">
            <label>
                <input type="checkbox" id="notifyCleaningCreated" checked> Notifica nuova pulizia creata
            </label>
        </div>
        <div class="form-group">
            <label>
                <input type="checkbox" id="notifyCleaningReminder" checked> Reminder pulizia (2 giorni prima)
            </label>
        </div>
        <div class="form-group">
            <label>
                <input type="checkbox" id="notifyMaintenanceCreated" checked> Notifica nuova manutenzione
            </label>
        </div>
        <div class="form-group">
            <label>
                <input type="checkbox" id="notifyMaintenanceUrgent" checked> Alert urgenze (priorità alta)
            </label>
        </div>
        <div class="form-group">
            <label>
                <input type="checkbox" id="notifyBookingConfirmation" checked> Email conferma booking
            </label>
        </div>

        <button class="btn btn-primary" id="saveNotificationRulesBtn">💾 Salva Regole</button>
    </div>
</div>
```

### 5. Aggiungi MODAL MANUTENZIONE (prima di </body>):
```html
<!-- Maintenance Modal -->
<div id="maintenanceModal" class="modal">
    <div class="modal-content">
        <div class="modal-header">
            <h2 id="maintenanceModalTitle">Nuovo Intervento</h2>
            <button class="modal-close">&times;</button>
        </div>
        <form id="maintenanceForm">
            <div class="form-row">
                <div class="form-group">
                    <label>Categoria *</label>
                    <select id="maintenanceCategory" class="form-control" required>
                        <option value="">Seleziona...</option>
                        <option value="plumbing">🚰 Idraulica</option>
                        <option value="electrical">⚡ Elettricità</option>
                        <option value="heating">🔥 Riscaldamento/Caldaia</option>
                        <option value="locksmith">🔑 Serrature</option>
                        <option value="appliances">🔧 Elettrodomestici</option>
                        <option value="other">🛠️ Altro</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Priorità *</label>
                    <select id="maintenancePriority" class="form-control" required>
                        <option value="medium">🟡 Media</option>
                        <option value="low">🔵 Bassa</option>
                        <option value="high">🟠 Alta</option>
                        <option value="urgent">🔴 Urgente</option>
                    </select>
                </div>
            </div>

            <div class="form-group">
                <label>Descrizione Problema *</label>
                <textarea id="maintenanceDescription" class="form-control" rows="3" required></textarea>
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label>Data Richiesta</label>
                    <input type="date" id="maintenanceRequestDate" class="form-control" required>
                </div>
                <div class="form-group">
                    <label>Data Programmata</label>
                    <input type="date" id="maintenanceScheduledDate" class="form-control">
                </div>
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label>Assegnato a</label>
                    <input type="text" id="maintenanceAssignedTo" class="form-control" placeholder="Nome tecnico">
                </div>
                <div class="form-group">
                    <label>Costo Stimato (€)</label>
                    <input type="number" id="maintenanceEstimatedCost" class="form-control" step="0.01" min="0" value="0">
                </div>
            </div>

            <div class="form-group">
                <label>Note</label>
                <textarea id="maintenanceNotes" class="form-control" rows="2"></textarea>
            </div>

            <div class="modal-footer">
                <button type="button" class="btn btn-secondary modal-close">Annulla</button>
                <button type="submit" class="btn btn-primary">Salva</button>
            </div>
        </form>
    </div>
</div>
```

### 6. Aggiungi SCRIPT IMPORTS (prima di </body>):
```html
<!-- EmailJS CDN -->
<script src="https://cdn.jsdelivr.net/npm/@emailjs/browser@3/dist/email.min.js"></script>

<!-- Services -->
<script src="js/services/TelegramService.js"></script>
<script src="js/services/EmailService.js"></script>

<!-- Modules -->
<script src="js/modules/maintenance.js"></script>
```

### 7. Aggiorna `js/core/Router.js`:
Aggiungi 'maintenance' e 'settings' nell'array sections:
```javascript
const sections = [
  'overview', 'contacts', 'tasks', 'notes', 'documents', 'bookings', 
  'cleaning', 'maintenance', 'accounting', 'analytics', 'activityLog', 
  'users', 'categoryAdmin', 'settings'
];
```

## 🔧 Setup Telegram (5 minuti):

1. **Crea bot**:
   - Apri Telegram, cerca `@BotFather`
   - Invia `/newbot`
   - Segui istruzioni, ottieni `BOT_TOKEN`

2. **Ottieni Chat ID**:
   - Cerca `@userinfobot` su Telegram
   - Avvia chat, ti darà il tuo `Chat ID`
   - Salva questo ID per Admin, Pulizie, o Manutenzione

3. **Configura nell'app**:
   - Vai su ⚙️ Impostazioni
   - Inserisci Bot Token e Chat IDs
   - Clicca "Test Connessione"
   - Se OK ✅ → Salva

## 📧 Setup EmailJS (Opzionale):

1. Registrati su [EmailJS.com](https://www.emailjs.com) (100 email/mese gratis)
2. Crea servizio email (Gmail, Outlook, etc.)
3. Crea template email
4. Copia Service ID, Template ID, Public Key
5. Inserisci in ⚙️ Impostazioni → Email

## ✨ Funzionalità complete:

### Telegram:
- ✅ Notifica creazione pulizia → donna pulizie
- ✅ Reminder 2 giorni prima → donna pulizie
- ✅ Notifica completamento → admin
- ✅ Notifica nuova manutenzione → tecnico
- ✅ Alert urgenze → admin
- ✅ Supporto foto/allegati

### Email:
- ✅ Conferma booking → cliente
- ✅ Reminder check-in → cliente
- ✅ Invio fattura → cliente

## 🎯 Prossimo step:

Dopo integrazione HTML, implementare in `app.js`:
- `renderMaintenance()`
- `setupMaintenanceListeners()`
- `renderSettings()`
- `setupSettingsListeners()`

**Vuoi che proceda con l'implementazione completa in app.js?**
