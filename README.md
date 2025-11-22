# Dashboard Gestionale

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

Dashboard gestionale completa per la gestione di contatti, task, note e documenti.

## 🚀 Caratteristiche

- ✅ **Autenticazione sicura** - Sistema di login con gestione utenti
- 👥 **Gestione Contatti** - Aggiungi, modifica, elimina e cerca contatti
- 📋 **Task Management** - Organizza le tue attività con priorità e categorie
- 📝 **Note** - Crea e gestisci note con categorie personalizzate
- 📄 **Gestione Documenti** - Upload e organizzazione file
- 🔍 **Ricerca e Filtri** - Trova rapidamente ciò che cerchi
- 📊 **Dashboard Analitica** - Statistiche e overview delle attività
- 🎨 **Design Moderno** - Interfaccia pulita e responsive
- 🌓 **Dark Mode** - Supporto tema scuro/chiaro

## 📦 Installazione

### Opzione 1: Download diretto

1. Scarica il repository:
```bash
git clone https://github.com/Saro073/dashboard-gestionale.git
cd dashboard-gestionale
```

2. Apri `index.html` nel tuo browser

### Opzione 2: Live Server (consigliato per sviluppo)

1. Installa [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) in VS Code
2. Apri il progetto in VS Code
3. Click destro su `index.html` → "Open with Live Server"

## 🔐 Accesso Default

**Username:** admin  
**Password:** admin123

⚠️ **Importante:** Cambia le credenziali dopo il primo accesso!

## 📖 Utilizzo

### Gestione Contatti

- Clicca su "Contatti" nella sidebar
- Usa il pulsante "+" per aggiungere nuovi contatti
- Cerca contatti usando la barra di ricerca
- Filtra per categoria (Clienti, Fornitori, Partner)

### Task Management

- Naviga alla sezione "Task"
- Crea nuovi task con titolo, descrizione e priorità
- Filtra per stato: Tutti, Attivi, Completati
- Marca task come completati con un click

### Note

- Accedi alla sezione "Note"
- Crea note con titolo e contenuto
- Organizza per categoria
- Modifica o elimina note esistenti

### Documenti

- Sezione "Documenti" per upload file
- Supporta vari formati (PDF, DOC, XLS, etc.)
- Organizza per categoria
- Download diretto dei file

## 🛠️ Tecnologie Utilizzate

- **HTML5** - Struttura semantica
- **CSS3** - Styling moderno con variabili CSS e flexbox
- **JavaScript (ES6+)** - Logica applicativa
- **LocalStorage** - Persistenza dati lato client

## 📂 Struttura del Progetto

```
dashboard-gestionale/
│
├── index.html          # File principale HTML
├── styles.css          # Foglio di stile
├── app.js              # Logica applicativa
├── README.md           # Questo file
└── .gitignore          # File da ignorare
```

## 🔧 Configurazione

### Personalizzazione Colori

Modifica le variabili CSS in `styles.css`:

```css
:root {
  --primary-color: #2563eb;
  --secondary-color: #1e40af;
  /* altre variabili... */
}
```

### Aggiungere Nuovi Utenti

Modifica l'array `users` in `app.js`:

```javascript
const users = [
  { username: 'admin', password: 'admin123', role: 'admin' },
  { username: 'user', password: 'user123', role: 'user' }
];
```

## 🚀 Deploy

### GitHub Pages

1. Vai su Settings → Pages
2. Seleziona branch `main` e folder `root`
3. Clicca "Save"
4. La dashboard sarà disponibile su: `https://saro073.github.io/dashboard-gestionale/`

### Netlify

1. Connetti il repository a [Netlify](https://netlify.com)
2. Deploy automatico ad ogni push

### Vercel

1. Importa il progetto su [Vercel](https://vercel.com)
2. Deploy istantaneo

## 🤝 Contribuire

Contributi, issues e feature requests sono benvenuti!

1. Fork del progetto
2. Crea un branch per la tua feature (`git checkout -b feature/AmazingFeature`)
3. Commit delle modifiche (`git commit -m 'Add some AmazingFeature'`)
4. Push al branch (`git push origin feature/AmazingFeature`)
5. Apri una Pull Request

## 📝 Roadmap

- [ ] Export dati in CSV/JSON
- [ ] Integrazione API esterne
- [ ] Sistema di notifiche
- [ ] Backup automatico cloud
- [ ] Multi-language support
- [ ] PWA per uso offline
- [ ] Grafici e statistiche avanzate

## 📄 Licenza

MIT License - vedi [LICENSE](LICENSE) per dettagli

## 👤 Autore

**Saro073**

- GitHub: [@Saro073](https://github.com/Saro073)

## 🙏 Ringraziamenti

- Ispirato dalle migliori pratiche di UI/UX design
- Icone e assets da risorse open source

---

⭐ Se questo progetto ti è stato utile, lascia una stella!