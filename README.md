# Dashboard Gestionale v2.1.0

![Version](https://img.shields.io/badge/version-2.1.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Architecture](https://img.shields.io/badge/architecture-hybrid%20modular-brightgreen.svg)

Dashboard gestionale completa per la gestione di contatti, task, note e documenti con **architettura modulare ibrida professionale**.

## 🎉 Novità v2.1.0 - Architettura Ibrida

### ✨ Nuove Funzionalità
- ✅ **EventBus** - Sistema di comunicazione tra moduli basato su eventi
- ✅ **Router** - Gestione navigazione con supporto hash URL
- ✅ **NotificationService** - Sistema di notifiche toast/snackbar eleganti
- ✅ **Modulo Note** - Gestione completa note con pin, categorie, tag
- ✅ **Modulo Documenti** - Upload, download, organizzazione file (max 5MB)
- ✅ **Aggiornamenti Reattivi** - UI si aggiorna automaticamente via EventBus

### 🏛️ Nuova Architettura

```
dashboard-gestionale/
├── index.html
├── styles.css
├── js/
│   ├── config.js              ⚙️ Configurazioni globali
│   ├── 🏛️ core/              NEW! Core Architecture
│   │   ├── EventBus.js        📡 Sistema eventi pub/sub
│   │   └── Router.js          🧭navigazione sezioni
│   ├── 🛠️ services/          NEW! Service Layer
│   │   └── NotificationService.js 🔔 Notifiche toast
│   ├── storage.js
│   ├── utils.js
│   ├── 🔐 auth/
│   │   ├── users.js
│   │   ├── auth.js
│   │   └── permissions.js
│   ├── 📦 modules/
│   │   ├── activity-log.js
│   │   ├── contacts.js
│   │   ├── tasks.js
│   │   ├── notes.js           NEW! Gestione note
│   │   └── documents.js       NEW! Gestione documenti
│   └── app.js              🚀 Orchestratore principale
├── README.md
└── LICENSE
```

## 🚀 Caratteristiche

### Core Features
- ✅ **Autenticazione sicura** - Sistema di login con gestione utenti e ruoli
- 👥 **Gestione Contatti** - CRUD completo con categorie e ricerca
- ✅ **Task Management** - Organizza attività con priorità e assegnazione
- 📝 **Note** - Crea note con categorie, pin, tag ed export
- 📄 **Gestione Documenti** - Upload file fino a 5MB con metadata
- 🔍 **Ricerca e Filtri** - Trova rapidamente ciò che cerchi
- 📊 **Dashboard Analitica** - Statistiche e overview delle attività
- 🎨 **Design Moderno** - Interfaccia pulita e responsive
- 🌓 **Dark Mode** - Supporto tema scuro/chiaro
- 🔔 **Notifiche Toast** - Feedback utente elegante e non invasivo

### Architettura
- 🏛️ **Modular Design** - Componenti separati e riutilizzabili
- 📡 **Event-Driven** - Comunicazione disaccoppiata tra moduli
- 🧭 **Router** - Navigazione con supporto browser history
- 📦 **Service Layer** - Logica business centralizzata
- 🔒 **Permission System** - Controllo accessi granulare
- 📝 **Activity Logging** - Tracciamento azioni utenti

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
NotificationService.success('Operazione completata!');
NotificationService.error('Errore durante il salvataggio');
NotificationService.warning('Attenzione!');
NotificationService.info('Informazione importante');
```

### Module Pattern

```javascript
// Ogni modulo espone API pubblica
const ContactsModule = {
  getAll() { ... },
  create(data) { ... },
  update(id, data) { ... },
  delete(id) { ... },
  search(term) { ... }
};
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
    return StorageManager.load('mio_modulo', []);
  },
  
  create(data) {
    // Logica creazione
    EventBus.emit('mio_modulo:created', data);
  }
};
```

2. **Aggiungi import** in `index.html`

```html
<script src="js/modules/mio-modulo.js"></script>
```

3. **Integra in app.js**

```javascript
setupEventBusListeners() {
  EventBus.on('mio_modulo:created', () => this.updateStats());
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
