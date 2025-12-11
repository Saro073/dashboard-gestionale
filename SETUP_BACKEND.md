# Dashboard Gestionale - Setup & Avvio

## 🚀 AVVIO RAPIDO

### Prima volta (setup iniziale):

```bash
# 1. Assicurati di avere Node.js installato
node --version  # Deve essere v14 o superiore
npm --version

# Se non hai Node.js, installalo da: https://nodejs.org/

# 2. Lancia lo script di avvio
./start.sh
```

**Cosa succede al primo avvio:**
1. Il browser si apre automaticamente
2. Vedi la schermata "Crea primo account amministratore"
3. Inserisci username, password, email
4. Fai login automatico → entri nella dashboard vuota
5. I dati vengono salvati in `./data/*.json` (persistenti!)

### Avvii successivi:

```bash
./start.sh  # Login con le tue credenziali
```

---

## 📁 DOVE SONO I DATI?

**IMPORTANTE**: I dati NON sono più nel localStorage del browser!

```
./data/              ← Tutti i tuoi dati (JSON files)
./backups/           ← Backup automatici ad ogni modifica
```

**Vantaggi**:
- ✅ Dati persistenti anche se chiudi il browser
- ✅ Backup automatici
- ✅ Puoi fare backup manuali copiando la cartella `data/`
- ✅ Migrazione facile (sposta cartella `data/`)

---

## 🔧 ARCHITETTURA

### Backend (Node.js - porta 3000)
- Server Express per gestire salvataggio dati
- Salva su file JSON in `./data/`
- Backup automatici in `./backups/`

### Frontend (Python HTTP - porta 8000)
- Interfaccia web (vanilla JS)
- Comunica con backend via API REST

---

## ⚠️ TROUBLESHOOTING

### Problema: "Errore avvio backend"

```bash
# Verifica che Node.js sia installato
node --version

# Se non c'è, installalo da https://nodejs.org/
```

### Problema: "Porta già in uso"

Lo script usa automaticamente porta alternativa (8001).

### Problema: "Perdo i dati"

**VECCHIO sistema**: `localStorage` del browser → si perdeva tutto
**NUOVO sistema**: `./data/*.json` → persistenti!

Per verificare:
```bash
ls -la data/  # Vedi i file JSON con i tuoi dati
```

### Problema: "Non vedo i dati dopo il riavvio"

1. Verifica che il backend sia attivo:
```bash
curl http://localhost:3000/health
# Deve rispondere: {"status":"ok","timestamp":"..."}
```

2. Controlla i log:
```bash
tail -f /tmp/dashboard_backend.log
tail -f /tmp/dashboard_frontend.log
```

---

## 💾 BACKUP E RESTORE

### Backup manuale:
```bash
# Copia l'intera cartella data
cp -r data/ backup_manuale_$(date +%Y%m%d)/
```

### Restore da backup:
```bash
# Sostituisci la cartella data con il backup
rm -rf data/
cp -r backup_manuale_20250115/ data/
```

### Backup automatici:
Ogni volta che modifichi dati, viene creato un backup automatico in `./backups/`

---

## 🔐 SICUREZZA

- Le password sono hashate (SHA-256)
- I dati sono salvati in locale (non su cloud)
- Backup automatici proteggono da perdite accidentali

**RACCOMANDAZIONE**: Fai backup periodici della cartella `data/` su un disco esterno o cloud privato.

---

## 📝 NOTE IMPORTANTI

1. **Non eliminare la cartella `data/`** - contiene tutti i tuoi dati!
2. **Backup regolari** - copia `data/` su un drive esterno
3. **Testing in sicurezza** - i backup automatici ti proteggono
4. **Migrazione semplice** - sposta `data/` su un altro computer

---

## 🆘 SUPPORTO

Se hai problemi:

1. Controlla i log:
```bash
tail -f /tmp/dashboard_backend.log
tail -f /tmp/dashboard_frontend.log
```

2. Verifica che entrambi i server siano attivi:
```bash
lsof -i :3000  # Backend
lsof -i :8000  # Frontend
```

3. Test manuale backend:
```bash
# Salva un dato
curl -X POST http://localhost:3000/api/storage/test \
  -H "Content-Type: application/json" \
  -d '{"data": {"hello": "world"}}'

# Leggi il dato
curl http://localhost:3000/api/storage/test

# Verifica file creato
cat data/test.json
```
