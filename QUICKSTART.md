# 🚀 Quick Start - Dashboard Gestionale

## In 2 Minuti

### 1️⃣ Avvia il Dashboard
```bash
cd /path/to/dashboard-gestionale
./start.sh
```

Il browser si apre automaticamente a `http://localhost:8000`.

Se non funziona il double-click su `start.sh`, usa il terminal:
```bash
bash start.sh
```

### 2️⃣ Primo Accesso (Setup Admin)

**Schermata**: "Crea Account Amministratore"

Compila i campi:
- **Username**: Es. `saro` (min 3 caratteri)
- **Nome Completo**: Es. `Saro Rossi`
- **Email**: Es. `saro@example.com` (formato valido)
- **Password**: Min 8 caratteri, 1 maiuscola, 1 numero (Es. `Password123`)
- **Conferma Password**: Ripeti la password

Clicca **"Crea Account"** → Automaticamente loggato!

**Successivamente**: Usa `admin` / `admin` (account di default se saltato)

---

## 🎯 Prime 5 Azioni

### 1. Aggiungere un Contatto (Ospite)
**Menu**: Contatti → `+ Aggiungi Contatto`
- Nome, Email, Telefono
- Categoria (es. "cliente")
- Indirizzi (privato/business)
Clicca **Salva**

### 2. Creare una Prenotazione
**Menu**: Prenotazioni → Calendario Airbnb-style
1. Seleziona **Check-in** (clicca data verde)
2. Seleziona **Check-out** (clicca data dopo check-in)
3. Menu azioni appare → `Nuova Prenotazione`
4. Seleziona ospite (autocomplete) o compila manualmente
5. Importo totale, caparra, status
6. Clicca **Salva** → Cleaning auto-creato!

### 3. Registrare un'Entrata (Contabilità)
**Menu**: Contabilità → `+ Aggiungi Transazione`
- Tipo: Entrata
- Categoria: Booking
- Data, Importo (es. 150€)
- Metodo pagamento
Clicca **Salva**

### 4. Registrare una Pulizia
**Menu**: Cleaning (auto-creata da booking, oppure manuale)
- Fatto! Se da booking, è già settata
- Se manuale → `+ Aggiungi Pulizia`

### 5. Guardare Analytics
**Menu**: Analytics
- Revenue trend
- Occupancy %
- Booking channels
- Expense categories

---

## 🔧 Troubleshooting

| Problema | Soluzione |
|----------|-----------|
| **Browser non si apre** | Apri manualmente `http://localhost:8000` |
| **"Porta già in uso"** | Lo script prova 8001, oppure: `lsof -ti:8000 \| xargs kill -9` |
| **Password non accettata** | Min 8 char + 1 maiuscola + 1 numero. Es: `Admin123` ✅ |
| **Dati scomparsi** | Usa Impostazioni → Backup per recuperare |
| **Notifiche non funzionano** | Setup Telegram/Email in Impostazioni → Integrazioni |

---

## 🎛️ Menu Principale

```
📊 Overview      → Statistiche dashboard
👥 Contatti      → Gestione ospiti/contatti
✅ Task          → To-do list
📝 Note          → Appunti
📄 Documenti     → File upload
🗓️ Prenotazioni  → Calendario + booking
🧹 Cleaning      → Schedule pulizie
🔧 Manutenzione  → Repair tracking
💰 Contabilità   → Entrate/uscite
📈 Analytics     → Grafici revenue/occupancy
📋 Attività      → Audit log
👤 Utenti        → Gestione team
🏷️ Categorie     → Custom tags
⚙️ Impostazioni  → Config system
🏠 Properties    → Multi-proprietà
💾 Backup        → Download/restore
```

---

## 🔐 Account di Default

Se skippi il setup, account auto-generato:
- **Username**: `admin`
- **Password**: `admin`
- **Ruolo**: Admin (accesso completo)

**⚠️ IMPORTANTE**: Cambia password dopo primo login!

---

## 📱 Mobile

L'app è responsive:
- **Tablet**: Sidebar collassa, hamburger menu (☰)
- **Phone**: Taps il ☰ per navigation
- **Desktop**: Sidebar sempre visibile

---

## 🧪 Test End-to-End (15 min)

1. ✅ Login/Setup
2. ✅ Create booking + verify cleaning auto-created
3. ✅ Add transaction (contabilità)
4. ✅ Check analytics updated
5. ✅ Create backup
6. ✅ Send notification (se Telegram/Email configured)

---

## 🆘 Aiuto?

Vedi documentazione estesa:
- `SECURITY.md` - Funzionalità sicurezza
- `BEST_PRACTICES.md` - Come usare il codice
- `SETUP.md` - Setup avanzato
- `.github/copilot-instructions.md` - Architettura

---

**Non hai altri problemi? Inizia a usarlo! 🚀**

Annota bug/feature requests in `ISSUES.md` mentre usi.
