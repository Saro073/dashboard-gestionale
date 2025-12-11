# Dashboard Gestionale v3.0.0

![Version](https://img.shields.io/badge/version-3.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Architecture](https://img.shields.io/badge/architecture-hybrid%20modular-brightgreen.svg)
![Bookings](https://img.shields.io/badge/bookings-airbnb%20style-ff5a5f.svg)
![Security](https://img.shields.io/badge/security-10%2F10-brightgreen.svg)
![Status](https://img.shields.io/badge/status-PRODUCTION%20READY-green.svg)

Dashboard gestionale completa per la gestione di **casa vacanze** (Ferienwohnung) con sistema prenotazioni, contatti, contabilità e architettura modulare ibrida professionale.

---

## 🚀 QUICKSTART (2 minuti)

### Avvia subito:
```bash
./start.sh
# Browser si apre automaticamente a http://localhost:8000
```

**Nuovo utente?** Vedi [QUICKSTART.md](QUICKSTART.md) per guide step-by-step.

---

## 🎉 Novità v3.0.0 - Sistema Prenotazioni Completo

### ✨ Nuove Funzionalità Prenotazioni
- 🗓️ **Calendario Airbnb-style** - Selezione date 2-step intuitiva (check-in → check-out)
- 🎯 **Menu Azioni Contestuale** - 4 azioni disponibili dopo selezione date
- 🔗 **Integrazione Contatti-Bookings** - Unified customer registry con hybrid linking
- 🔍 **Autocomplete Contatti** - Ricerca intelligente per nome/email/telefono
- 🔐 **Permessi Basati su Ruolo** - Solo admin può operare su date passate
- 📧 **Auto-create Contatti** - Nuovi contatti creati automaticamente da prenotazioni
- 🗑️ **Delete Inline** - Elimina prenotazioni direttamente dal calendario

### 🏛️ Architettura v3.0.0

```
dashboard-gestionale/
├── index.html
├── styles.css
├── js/
│   ├── config.js              ⚙️ Configurazioni globali
│   ├── 🏛️ core/              NEW! Core Architecture
│   │   ├── EventBus.js        📡 Sistema eventi pub/sub
│   │   └── Router.js          🧭 Navigazione hash-based
│   ├── 🛠️ services/
│   │   ├── NotificationService.js 🔔 Toast notifications
│   │   ├── EmailService.js        📧 EmailJS integration
│   │   └── TelegramService.js     📱 Telegram bot
│   ├── 🎨 components/
│   │   └── calendar.js        🗓️ Airbnb-style calendar (FSM)
│   ├── 🎯 handlers/
│   │   └── bookings-handlers.js   UI event handlers + autocomplete
│   ├── storage.js
│   ├── utils.js               🔧 Utils + ErrorHandler
│   ├── config.js              ⚙️ CONFIG (STORAGE_KEYS, EVENTS, ROLES)
│   ├── 🔐 auth/
│   │   ├── users.js           UserManager (CRUD)
│   │   ├── auth.js            AuthManager (session)
│   │   └── permissions.js     Role-based access control
│   ├── 📦 modules/
│   │   ├── bookings.js        🏠 Prenotazioni + contact integration
│   │   ├── contacts.js        👥 Multi-email/phone + hybrid linking
│   │   ├── accounting.js      💰 Contabilità + CSV export
│   │   ├── cleaning.js        🧹 Pulizie schedules
│   │   ├── maintenance.js     🔧 Manutenzioni
│   │   ├── activity-log.js    📝 Activity tracking
│   │   ├── tasks.js           ✅ Task management
│   │   ├── notes.js           📄 Gestione note
│   │   ├── documents.js       📁 File management
│   │   ├── analytics.js       📊 Charts & statistics
│   │   ├── backup.js          💾 Backup/restore
│   │   ├── categories.js      🏷️ Category management
│   │   └── users-management.js 👤 User CRUD
│   └── app.js                 🚀 Orchestratore (3000+ lines)
├── README.md
└── LICENSE
```

## 🚀 Caratteristiche

### 🗓️ Bookings & Calendar System
- **Calendario Airbnb-style** - Selezione 2-step intuitiva (check-in → check-out)
- **Menu azioni contestuale** - 4 azioni: nuova prenotazione, blocca date, modifica, elimina
- **Feedback visivo** - range highlighting, contatore notti 🌙, icone 📥📤
- **Controllo sovrapposizioni** - verifica automatica booking esistenti nel range
- **Finite State Machine** - gestione stati selezione (IDLE → SELECTING_CHECKOUT → SELECTED)
- **Role-based permissions** - solo admin può operare su date passate
- **Contabilità integrata** - transazioni create automaticamente con prenotazioni
- **Block dates** - blocco periodi per manutenzione/personale con motivazione
- **Delete inline** - elimina prenotazioni dal calendario con hover
- **Export CSV** - esporta prenotazioni per commercialista

### 👥 Contact Integration
- **Hybrid linking** - contactId (primario) + snapshot data (fallback resiliente)
- **Autocomplete intelligente** - ricerca contatti per nome/email/telefono (debounce 300ms)
- **Auto-create contacts** - nuovi contatti creati automaticamente da bookings
- **Pre-fill forms** - campi prenotazione popolati da contatto esistente
- **Guest info retrieval** - dati ospite da contact o snapshot se eliminato
- **Data migration** - migrazione automatica vecchie prenotazioni al primo avvio
- **Multi-email/phone** - array di email/telefoni con label personalizzate
- **Indirizzi privato/business** - gestione separata residenza e sede legale
- **Unified customer registry** - registro unico clienti condiviso tra moduli

### Core Features
- ✅ **Autenticazione sicura** - Sistema di login con gestione utenti e ruoli (admin/supervisor/user)
- 👥 **Gestione Contatti** - CRUD completo con categorie, ricerca e custom tags
- ✅ **Task Management** - Organizza attività con priorità e assegnazione
- 📝 **Note** - Crea note con categorie, pin, tag ed export
- 📄 **Gestione Documenti** - Upload file fino a 5MB con metadata
- 💰 **Accounting** - Gestione entrate/uscite con categorie e report
- 🧹 **Cleaning Schedules** - Pianificazione pulizie con checklist
- 🔧 **Maintenance** - Tracciamento riparazioni e manutenzioni
- 🔍 **Ricerca e Filtri** - Trova rapidamente ciò che cerchi
- 📊 **Dashboard Analitica** - Statistiche e overview delle attività
- 🎨 **Design Moderno** - Interfaccia pulita e responsive
- 🌓 **Dark Mode** - Supporto tema scuro/chiaro
- 🔔 **Notifiche Toast** - Feedback utente elegante e non invasivo
- 📧 **EmailJS Integration** - Invio email automatiche (conferme prenotazioni)
- 📱 **Telegram Bot** - Notifiche push su Telegram

### Architettura
- 🏛️ **Modular Design** - Componenti separati e riutilizzabili
- 📡 **Event-Driven** - Comunicazione disaccoppiata tra moduli tramite EventBus
- 🧭 **Router** - Navigazione hash-based con supporto browser history
- 📦 **Service Layer** - Logica business centralizzata
- 🔒 **Permission System** - Controllo accessi granulare basato su ruoli
- 📝 **Activity Logging** - Tracciamento completo azioni utenti
- 🎯 **FSM Pattern** - Finite State Machine per flussi complessi (date selection)
- 💾 **localStorage Persistence** - Storage manager con migrazione automatica dati

## 💻 Installazione

### Opzione 1: Clone Repository

```bash
git clone https://github.com/Saro073/dashboard-gestionale.git
cd dashboard-gestionale
```

### Opzione 2: Download ZIP

Scarica il repository come ZIP e estrai i file.

### Avvio Applicazione

#### A) Browser Locale (semplice)
```bash
# Apri direttamente index.html nel browser
open index.html  # macOS
start index.html # Windows
xdg-open index.html # Linux
```

#### B) Live Server (consigliato per sviluppo)
```bash
# Con VS Code + Live Server extension
# 1. Apri progetto in VS Code
# 2. Click destro su index.html
# 3. "Open with Live Server"
```

#### C) Python HTTP Server
```bash
# Python 3
python -m http.server 8000

# Apri browser su http://localhost:8000
```

## 🔐 Accesso Default

**Username:** `admin`  
**Password:** `admin123`

⚠️ **Importante:** Cambia le credenziali dopo il primo accesso!

## 📖 Utilizzo

### Gestione Contatti

1. Clicca su "Contatti" nella sidebar
2. Usa il pulsante "+" per aggiungere nuovi contatti
3. Cerca contatti usando la barra di ricerca
4. Filtra per categoria (Proprietario, Clienti, Fornitori, Partner)
5. Modifica o elimina contatti esistenti

### Task Management

1. Naviga alla sezione "Task"
2. Crea nuovi task con titolo, descrizione, priorità e scadenza
3. Filtra per stato: Tutti, Attivi, Completati
4. Marca task come completati con checkbox
5. Elimina task non più necessari

### Note

1. Accedi alla sezione "Note"
2. Crea note con titolo e contenuto
3. Organizza per categoria (Lavoro, Personale, Idee, Generale)
4. Pin note importanti per accesso rapido
5. Cerca note per contenuto o titolo
6. Esporta/importa note in formato JSON

### Documenti

1. Sezione "Documenti" per upload file
2. Supporta formati: PDF, DOC, XLS, PPT, IMG, ZIP (max 5MB)
3. Organizza per categoria (Contratti, Fatture, Reports, Altro)
4. Aggiungi descrizione ai documenti
5. Download diretto dei file
6. Visualizza statistiche storage

## 🛠️ Tecnologie Utilizzate

- **HTML5** - Struttura semantica moderna
- **CSS3** - Styling con variabili CSS e flexbox/grid
- **JavaScript (ES6+)** - Logica applicativa modulare
- **LocalStorage** - Persistenza dati lato client
- **Event-Driven Architecture** - Pattern pub/sub per comunicazione moduli
- **Hash Routing** - Navigazione SPA con URL hash

## 🏛️ Pattern Architetturali

### EventBus Pattern (Observer/PubSub)

```javascript
// Publisher
EventBus.emit(EVENTS.CONTACT_CREATED, contactData);

// Subscriber
EventBus.on(EVENTS.CONTACT_CREATED, (data) => {
  console.log('Nuovo contatto:', data);
  this.updateStats();
});
```

### Router Pattern (Front Controller)

```javascript
// Navigazione programmatica
Router.navigate('contacts');

// Ottieni sezione corrente
const current = Router.getCurrentSection();

// Callback al cambio sezione
Router.onNavigate((newSection, oldSection) => {
  console.log(`Navigato da ${oldSection} a ${newSection}`);
});
```

### Service Layer Pattern

```javascript
// NotificationService
NotificationService.success('Prenotazione creata!');
NotificationService.error('Errore durante il salvataggio');

// EmailService
await EmailService.sendBookingConfirmation(booking);

// TelegramService
await TelegramService.notify('Nuova prenotazione ricevuta!');
```

### Module Pattern (CRUD Template)

```javascript
// Ogni modulo segue pattern standard
const BookingsModule = {
  getAll() { 
    return StorageManager.load(CONFIG.STORAGE_KEYS.BOOKINGS, []);
  },
  
  create(data) {
    const item = { id: Utils.generateId(), ...data, createdAt: new Date().toISOString() };
    const items = this.getAll();
    items.push(item);
    StorageManager.save(CONFIG.STORAGE_KEYS.BOOKINGS, items);
    
    ActivityLog.log(CONFIG.ACTION_TYPES.CREATE, 'booking', item.id);
    EventBus.emit(EVENTS.BOOKING_CREATED, item);
    NotificationService.success('Prenotazione creata!');
    
    return { success: true, item };
  },
  
  update(id, changes) { /* ... */ },
  delete(id) { /* ... */ }
};
```

### Hybrid Linking Pattern

```javascript
// Booking-Contact integration con resilienza
{
  // Link primario (optional)
  contactId: 123,
  
  // Snapshot fallback (sempre presente)
  guestFirstName: 'Mario',
  guestLastName: 'Rossi',
  guestEmail: 'mario@email.com',
  guestPhone: '+39 123 456789',
  guestPrivateAddress: { street, city, zip, country },
  guestBusinessAddress: { ... }
}

// Recupero dati con fallback automatico
BookingsModule.getGuestInfo(booking);
// 1. Cerca contatto se contactId exists
// 2. Usa snapshot se contatto eliminato
// 3. Data integrity garantita
```

### Finite State Machine (FSM)

```javascript
// Calendario date selection (Airbnb-style)
const SELECTION_STATES = {
  IDLE: 'idle',                     // Nessuna selezione
  SELECTING_CHECKOUT: 'selecting',  // Check-in selezionato
  SELECTED: 'selected'              // Range completo
};

onDateClick(date) {
  switch (this.selectionState) {
    case STATES.IDLE:
      this.selectedCheckIn = date;
      this.selectionState = STATES.SELECTING_CHECKOUT;
      this.renderSelectionSummary();
      break;
      
    case STATES.SELECTING_CHECKOUT:
      if (date <= this.selectedCheckIn) {
        this.resetSelection();
        this.selectedCheckIn = date;
      } else {
        this.selectedCheckOut = date;
        this.selectionState = STATES.SELECTED;
        this.showActionMenu();  // Menu contestuale
      }
      break;
  }
  this.render();
}
```

## 🔧 Configurazione

### Personalizzazione Colori

Modifica le variabili CSS in `styles.css`:

```css
:root {
  --primary-color: #2563eb;
  --secondary-color: #1e40af;
  --success-color: #10b981;
  --danger-color: #ef4444;
  /* altre variabili... */
}
```

### Aggiungere Nuovi Utenti

Modifica `js/auth/users.js`:

```javascript
const initialUsers = [
  { 
    id: 1,
    username: 'admin', 
    password: 'admin123', 
    role: 'admin',
    fullName: 'Amministratore'
  },
  { 
    id: 2,
    username: 'user', 
    password: 'user123', 
    role: 'user',
    fullName: 'Utente Standard'
  }
];
```

### Configurazione Globale

Modifica `js/config.js` per:
- Storage keys
- Categorie contatti/task/note/documenti
- Limiti validazione
- Formati data
- Impostazioni UI

## 📦 Estensibilità

### Aggiungere un Nuovo Modulo

1. **Crea file modulo** in `js/modules/mio-modulo.js`

```javascript
const MioModulo = {
  getAll() {
    return StorageManager.load(CONFIG.STORAGE_KEYS.MIO_MODULO, []);
  },
  
  create(data) {
    const item = { id: Utils.generateId(), ...data, createdAt: new Date().toISOString() };
    const items = this.getAll();
    items.push(item);
    StorageManager.save(CONFIG.STORAGE_KEYS.MIO_MODULO, items);
    
    ActivityLog.log(CONFIG.ACTION_TYPES.CREATE, 'mioModulo', item.id);
    EventBus.emit(EVENTS.MIO_MODULO_CREATED, item);
    NotificationService.success('Item creato!');
    
    return { success: true, item };
  },
  
  update(id, changes) { /* ... */ },
  delete(id) { /* ... */ }
};
```

2. **Aggiungi storage key** in `js/config.js`

```javascript
const CONFIG = {
  STORAGE_KEYS: {
    // ... existing keys
    MIO_MODULO: 'mio_modulo_data'
  }
};
```

3. **Aggiungi eventi** in `js/config.js`

```javascript
const EVENTS = {
  // ... existing events
  MIO_MODULO_CREATED: 'MIO_MODULO_CREATED',
  MIO_MODULO_UPDATED: 'MIO_MODULO_UPDATED',
  MIO_MODULO_DELETED: 'MIO_MODULO_DELETED'
};
```

4. **Aggiungi import** in `index.html`

```html
<script src="js/modules/mio-modulo.js"></script>
```

5. **Integra in app.js**

```javascript
setupEventBusListeners() {
  // Reactive UI updates
  EventBus.on(EVENTS.MIO_MODULO_CREATED, () => {
    this.updateStats();
    this.renderMioModulo();
  });
}
```

### Aggiungere Nuova Sezione UI

1. **Aggiungi sezione** in `index.html`:

```html
<section id="mioModuloSection" class="content-section" style="display: none;">
  <h2>Mio Modulo</h2>
  <!-- ... contenuto ... -->
</section>
```

2. **Registra in Router** in `js/core/Router.js`:

```javascript
this.sections = [
  // ... existing
  'mioModulo'
];
```

3. **Aggiungi handler** in `js/app.js`:

```javascript
renderMioModulo() {
  const items = MioModulo.getAll();
  // ... rendering logic
}
```

### Aggiungere Nuovi Eventi

Modifica `js/core/EventBus.js`:

```javascript
const EVENTS = {
  // ... eventi esistenti
  MIO_EVENTO: 'mio:evento'
};
```

## 🚀 Deploy

### GitHub Pages

1. Vai su **Settings** → **Pages**
2. Seleziona branch `main` e folder `root`
3. Clicca "Save"
4. Dashboard disponibile su: `https://saro073.github.io/dashboard-gestionale/`

### Netlify

```bash
# Installa Netlify CLI
npm install -g netlify-cli

# Deploy
netlify deploy --prod
```

### Vercel

```bash
# Installa Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

## 🧪 Testing

### Test Funzionalità Base

1. **Login/Logout**
   - Testa credenziali corrette/errate
   - Verifica persistenza sessione

2. **CRUD Operations**
   - Crea contatti/task/note/documenti
   - Modifica elementi esistenti
   - Elimina elementi
   - Verifica persistenza dati

3. **Ricerca e Filtri**
   - Testa ricerca per ogni sezione
   - Verifica filtri per categoria

4. **Permessi**
   - Testa con utente admin e user
   - Verifica restrizioni corrette

5. **Upload Documenti**
   - Testa file validi/invalidi
   - Verifica limite dimensione
   - Test download

## 📝 Roadmap

### v2.2.0 (Prossimo)
- [ ] Edit inline per contatti e note
- [ ] Drag & drop per documenti
- [ ] Esportazione dati CSV/JSON completa
- [ ] Filtri avanzati multi-criterio

### v3.0.0 (Futuro)
- [ ] Backend API con Node.js/Express
- [ ] Database PostgreSQL/MongoDB
- [ ] Autenticazione JWT
- [ ] Upload documenti su cloud (S3/Cloudinary)
- [ ] Real-time updates con WebSocket
- [ ] PWA per uso offline
- [ ] Multi-language support (i18n)
- [ ] Grafici e statistiche avanzate con Chart.js
- [ ] Export PDF report

## 🐞 Bug Noti

- **LocalStorage Limit**: Max 5-10MB totali (browser dependent)
  - **Workaround**: Elimina documenti vecchi o usa backend
- **Safari Private Mode**: LocalStorage disabilitato
  - **Workaround**: Usa modalità normale

## 🤝 Contribuire

Contributi, issues e feature requests sono benvenuti!

### Come Contribuire

1. **Fork** del progetto
2. Crea un **branch** per la tua feature
   ```bash
   git checkout -b feature/AmazingFeature
   ```
3. **Commit** delle modifiche
   ```bash
   git commit -m 'feat: Add some AmazingFeature'
   ```
4. **Push** al branch
   ```bash
   git push origin feature/AmazingFeature
   ```
5. Apri una **Pull Request**

### Convenzioni Commit

Usa [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - Nuova funzionalità
- `fix:` - Bug fix
- `docs:` - Modifiche documentazione
- `style:` - Formattazione, punto e virgola mancanti, etc
- `refactor:` - Refactoring codice
- `test:` - Aggiunta test
- `chore:` - Maintenance

## 📝 Licenza

MIT License - vedi [LICENSE](LICENSE) per dettagli

## 👤 Autore

**Saro073**

- GitHub: [@Saro073](https://github.com/Saro073)
- Repository: [dashboard-gestionale](https://github.com/Saro073/dashboard-gestionale)

## 🙏 Ringraziamenti

- Ispirato dalle migliori pratiche di architettura software moderna
- Pattern design da [Martin Fowler](https://martinfowler.com/)
- UI/UX principles da Material Design e Apple HIG

---

⭐ Se questo progetto ti è stato utile, lascia una stella!

**Made with ❤️ using Vanilla JavaScript**
