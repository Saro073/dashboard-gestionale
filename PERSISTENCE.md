# 📁 Persistenza Dati - Backend File-Based Storage

**Data Aggiornamento**: 11 Dicembre 2025  
**Versione**: 2.0.0 con Backend Node.js

---

## 🎯 Il Problema (RISOLTO)

### PRIMA (v1.0)
```
Browser → localStorage → ❌ Dati persi al riavvio browser / pulizia cache
```

**Problemi:**
- Dati sparivano se pulivi cache
- Niente backup automatico
- Non disponibile offline
- Storage limitato (~5MB)

### DOPO (v2.0)
```
Browser → Backend Node.js → File JSON (./data/) → ✅ Persistenti per sempre!
                          → Backup automatici (./backups/)
```

**Soluzioni:**
- ✅ Dati salvati su file system (illimitati)
- ✅ Backup automatici ad ogni modifica
- ✅ Disponibile offline (cache locale)
- ✅ Migrazione semplice da localStorage

---

## 🚀 AVVIO RAPIDO

```bash
./start.sh
```

**Cosa succede:**
1. ✅ npm install (primo avvio)
2. ✅ Backend Node.js avviato (porta 3000)
3. ✅ Frontend avviato (porta 8000)
4. ✅ Browser aperto automaticamente
5. ✅ Crea primo admin account
6. ✅ Dati salvati in ./data/*.json

---

## 📁 STRUTTURA DATI

```
dashboard-gestionale/
├── server.js                 ← Backend Node.js (320 linee)
├── package.json              ← Dipendenze (express, cors)
├── js/
│   └── storage.js            ← StorageManager (rewritten)
├── data/                     ← 📁 I TUOI DATI (creato al primo avvio)
│   ├── dashboard_users.json
│   ├── dashboard_contacts.json
│   ├── dashboard_bookings.json
│   ├── dashboard_cleaning.json
│   ├── dashboard_properties.json
│   ├── dashboard_activity_log.json
│   └── ... (altri file)
└── backups/                  ← 💾 Backup automatici (creati ad ogni modifica)
    ├── backup_2025-12-11T10-33-35.json
    ├── backup_2025-12-11T10-34-22.json
    └── ... (ultimi 50 backup)
```

---

## 🔧 ARCHITETTURA BACKEND

### server.js (Node.js + Express)

**Port**: 3000  
**Endpoints**:
- `GET /api/storage/:key` - Carica dati
- `POST /api/storage/:key` - Salva dati
- `DELETE /api/storage/:key` - Elimina chiave
- `GET /api/storage` - Lista tutte le chiavi
- `POST /api/backup` - Backup manuale
- `GET /health` - Health check

**Funzionalità**:
- ✅ Sanitizzazione nomi file (previene path traversal)
- ✅ Backup automatici con limite 50 file
- ✅ Gestione errori completa
- ✅ CORS abilitato per localhost:8000
- ✅ JSON parsing con limite 50MB

### js/storage.js (Client-side API)

**API URL**: `http://localhost:3000/api/storage`

**Funzionalità**:
- ✅ Dual API (sync + async)
- ✅ Cache locale per performance
- ✅ Fallback a localStorage se backend offline
- ✅ Health check automatico
- ✅ Sincronizzazione bidirezionale

**Operazioni**:
```javascript
// Synchronous API (usa cache)
StorageManager.load('dashboard_contacts')  // Istantaneo

// Asynchronous API (backend-first)
await StorageManager.loadAsync('dashboard_contacts')  // Fresh data

// Save (auto-backup)
StorageManager.save('dashboard_contacts', data)
await StorageManager.saveAsync('dashboard_contacts', data)
```

---

## 🔄 MIGRAZIONE DA LOCALSTORAGE

### Automatica (primo avvio)
Se il backend vede localStorage con dati:
```bash
./start.sh
# browser → clicci su "Migrazione Dati"
# I dati vengono spostati a ./data/
```

### Manuale (tool migrate-data.html)
```bash
./start.sh
# Apri nel browser: http://localhost:8000/migrate-data.html
# Clicca "Migra Dati al Backend"
```

---

## 💾 BACKUP

### Automatico
Ogni operazione di scrittura crea un backup:
```javascript
StorageManager.save(key, data)  // → crea backup_TIMESTAMP.json
```

**Limite**: Ultimi 50 backup (auto-cleanup)

### Manuale
```bash
# Dentro dashboard → clicca "Backup" → "Scarica JSON"
# O via API:
curl -X POST http://localhost:3000/api/backup
```

---

## 🚨 TROUBLESHOOTING

### Errore: "Backend non raggiungibile"
```bash
# Verifica che il backend sia attivo
curl http://localhost:3000/health

# Se non risponde, riavvia
./start.sh

# Se porta 3000 è occupata:
lsof -i :3000
kill -9 <PID>
./start.sh
```

### Dati spariti dopo migrazione
```bash
# Ripristina dal backup
ls -la backups/
# Copia il backup più recente
cp backups/backup_*.json ./data/backup_restore.json
```

### Errore "ENOENT" nel log backend
- Significa che un file dati è stato eliminato
- Il backend crea automaticamente file nuovi al salvataggio
- Non è un errore critico

---

## ⚙️ SVILUPPO

### Avvio in modalità development
```bash
npm run dev  # nodemon osserva server.js
```

### Variabili di ambiente
```bash
# Usa porte alternative se necessario
PORT=3001 ./start.sh  # Backend su 3001
FRONTEND_PORT=8001 ./start.sh  # Frontend su 8001
```

### Debug
```bash
# Vedi log backend
tail -f /tmp/dashboard_backend.log

# Vedi log frontend
tail -f /tmp/dashboard_frontend.log

# Test endpoint
curl http://localhost:3000/api/storage
```

---

## 🔒 SICUREZZA

### Path Traversal Prevention
```javascript
// Sanitizzazione obbligatoria
function sanitizeKey(key) {
  return key.replace(/[^a-zA-Z0-9_-]/g, '_');
}
// "users/../../config" → "users_______config"
```

### CORS
Solo localhost:8000 può accedere al backend:
```javascript
app.use(cors({
  origin: 'http://localhost:8000',
  credentials: true
}));
```

### Rate Limiting (Future)
Consigliato aggiungere rate limiting se esposto in rete

---

## 📊 PERFORMANCE

### Caching Strategy
```
Client Request → Check Cache (0ms) → Se non cached → Fetch Backend → Store in Cache
```

**Impact**:
- ✅ Letture istantanee (cache hit)
- ✅ Scritture non-blocking (salvataggio in background)
- ✅ Offline support (cache fallback)

### Backup Performance
- Creazione backup: ~50ms (async, non blocca UI)
- Limite backup: 50 file (~100MB max)
- Auto-cleanup: rimuove vecchi automaticamente

---

## 🎯 CHECKLIST PRIMO AVVIO

- [ ] Node.js v14+ installato (`node --version`)
- [ ] Esegui `./start.sh`
- [ ] Crea primo admin account
- [ ] Vedi cartella `./data/` creata
- [ ] Vedi cartella `./backups/` creata
- [ ] Aggiungi alcuni dati test
- [ ] Riavvia browser/applicazione
- [ ] Verifica che i dati rimangono (✅ persistenza!)
- [ ] Scarica un backup manuale

---

## 📞 SUPPORTO

Se il backend non parte:
1. Verifica Node.js: `node --version`
2. Verifica npm: `npm --version`
3. Leggi log: `tail -f /tmp/dashboard_backend.log`
4. Riavvia: `./start.sh`

Se i dati non vengono salvati:
1. Controlla che `./data/` sia scrivibile: `ls -la data/`
2. Controlla permessi: `chmod -R 755 data/`
3. Guarda network tab nel browser (F12)
4. Controlla se backend è attivo: `curl http://localhost:3000/health`
