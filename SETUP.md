# 🔐 Setup & Configuration - Dashboard Gestionale

**Guida completa per installazione, primo accesso e troubleshooting**

---

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

## Setup Form Fields

| Field | Requirements | Validation |
|-------|--------------|-----------|
| **Username** | 3+ characters | Must be unique |
| **Full Name** | Required | Non-empty |
| **Email** | Valid format | Regex validation |
| **Password** | 8+ chars, 1 upper, 1 digit | Hashed automatically |
| **Confirm** | Must match password | Equality check |

---

## Password Policy

- **Minimum Length**: 8 characters
- **Uppercase**: At least 1 (A-Z)
- **Lowercase**: Allowed but not required
- **Digit**: At least 1 (0-9)
- **Hashing**: PasswordHash.hash() automatic
- **Storage**: Never plaintext, always hashed

**Valid Examples**:
- `SecurePass123`
- `Admin@Password2025`
- `Ferienwohnung2025`

**Invalid Examples**:
- `password123` (no uppercase)
- `PASSWORD123` (no lowercase)
- `Password` (no digit)
- `Pass123` (too short - 7 chars)

---

## Validation Messages (Italian)

| Validation | Error Message |
|-----------|---------------|
| Username too short | "Nome utente deve avere almeno 3 caratteri" |
| Username exists | "Nome utente già in uso" |
| Full name missing | "Nome completo è obbligatorio" |
| Invalid email | "Email non valida" |
| Password too short | "Password deve avere almeno 8 caratteri" |
| No uppercase | "Password deve contenere almeno una lettera maiuscola" |
| No digit | "Password deve contenere almeno un numero" |
| Passwords don't match | "Le password non corrispondono" |

---

## Testing the Setup Flow

### Test 1: Fresh Installation
```javascript
// Clear localStorage and reload
localStorage.clear()
location.reload()

// Expected: Setup form appears
// Setup screen visible, login screen hidden
```

### Test 2: Valid Account Creation
```
Username:        testadmin
Full Name:       Test Administrator
Email:           admin@test.com
Password:        SecurePass123
Confirm:         SecurePass123

// Expected: Success message → Dashboard
```

### Test 3: Password is Hashed
```javascript
// In browser console:
JSON.parse(localStorage.getItem('users'))[0].password

// Expected: Starts with "hash_v1_"
// NOT plaintext password
```

### Test 4: Auto-Login Works
```
// After setup completes
// Expected: Username "Test Administrator" shown
// User logged in and dashboard visible
```

### Test 5: Second User Can Be Created
```
// After first user setup
// Expected: Login screen appears (not setup)
// Admin can create additional users via Users Management
```

---

## File Locations

**Implementation**:
- `js/app.js` (lines 196-205) - showSetup() method
- `js/app.js` (lines 411-531) - handleSetup() method  
- `js/app.js` (lines 217-225) - Event listener integration

**HTML Form**:
- `index.html` - setupScreen section with all fields

**CSS Styling**:
- `styles.css` - setupForm styling

**Security Integration**:
- `js/security/hash.js` - PasswordHash.hash() auto-called
- `js/auth/auth.js` - Rate limit reset after setup

---

## How Setup Works

```
Application Starts
  ↓
Check UserManager.getAll().length
  ↓
  If 0 users → showSetup()
  If users exist → showLogin() or showDashboard()
  ↓
User fills form with credentials
  ↓
Form submitted (setupForm.addEventListener)
  ↓
handleSetup() validation:
  1. Username: 3+ chars, unique
  2. Full Name: required
  3. Email: valid format
  4. Password: 8+ chars, 1 upper, 1 digit
  5. Confirm: matches password
  ↓
All valid → UserManager.create()
  ├─ Password automatically hashed
  ├─ First user role = ADMIN
  └─ Stored in localStorage
  ↓
AuthManager._resetAttempts(username)
  ├─ Clears any rate limit lockout
  ↓
AuthManager.login(username, password)
  ├─ Auto-login with new credentials
  ↓
Show success message
  (1.5 second delay)
  ↓
showDashboard()
  ├─ Dashboard displays
  └─ User fully logged in
```

---

## Security Features

✅ **Automatic Detection**
- Detects zero users on startup
- Displays setup form immediately

✅ **No Hardcoding**
- First admin created by user (not hardcoded)
- Prevents unauthorized access

✅ **Strong Passwords**
- 8+ characters required
- Mixed case + numbers enforced
- Regex validation before creation

✅ **Password Hashing**
- PasswordHash.hash() called automatically
- Timing-safe comparison
- Never stored in plaintext

✅ **Admin Role**
- First user always gets ADMIN role
- Can't be changed during setup
- Ensures initial control

✅ **Rate Limit Reset**
- Login attempts cleared after setup
- Prevents lockout on first login

✅ **Auto-Login**
- User logged in immediately
- No need to re-enter credentials

✅ **Error Feedback**
- Clear Italian error messages
- No sensitive data exposed
- Form remains open for correction

✅ **Success Feedback**
- Green success message
- Delay before redirect
- User knows operation succeeded

---

## Troubleshooting

### Setup form doesn't appear
**Check**: 
```javascript
UserManager.getAll().length === 0
```
**Fix**: Clear localStorage and reload

### Password validation too strict
**Check**: handleSetup() password checks in js/app.js
**Current requirements**: 8+ chars, 1 uppercase, 1 digit
**Can be relaxed** if needed in production

### Form submission does nothing
**Check**: 
- Browser console for errors
- setupForm element exists: `document.getElementById('setupForm')`
- Event listener registered

### User created but auto-login fails
**Check**:
- UserManager.create() returned success
- Password hashes correctly
- AuthManager.login() error message

### Setup form stuck
**Check**:
- `UserManager.getAll()` returns empty array
- setupScreen element exists in DOM
- No JavaScript errors in console

---

## After Setup is Complete

**Admin can**:
- ✅ Create additional users
- ✅ Manage user roles
- ✅ Access all data
- ✅ Configure system settings
- ✅ View audit logs

**Regular users**:
- ✅ View only their own data
- ✅ Create/edit own entries
- ✅ Cannot access admin functions
- ✅ Cannot see other users' data

---

## Verification Checklist

- [ ] Setup form appears on fresh install
- [ ] All 8 validations working
- [ ] Admin user created successfully
- [ ] Password is hashed (not plaintext)
- [ ] User auto-logged in after setup
- [ ] Dashboard displays correctly
- [ ] Admin role assigned
- [ ] Error messages display properly
- [ ] Setup form doesn't appear on subsequent loads
- [ ] Second user creation works normally

---

## 📁 Backend & Persistenza Dati

### Dove Sono i Dati?

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

### Architettura

**Backend (Node.js - porta 3000)**
- Server Express per gestire salvataggio dati
- Salva su file JSON in `./data/`
- Backup automatici in `./backups/`

**Frontend (Python HTTP - porta 8000)**
- Interfaccia web (vanilla JS)
- Comunica con backend via API REST

### Backup e Restore

**Backup manuale:**
```bash
# Copia l'intera cartella data
cp -r data/ backup_manuale_$(date +%Y%m%d)/
```

**Restore da backup:**
```bash
# Sostituisci la cartella data con il backup
rm -rf data/
cp -r backup_manuale_20250115/ data/
```

**Backup automatici:**
Ogni volta che modifichi dati, viene creato un backup automatico in `./backups/`

---

## ⚠️ TROUBLESHOOTING COMPLETO

### Problema di Login

#### 1. Nessun Account Admin Creato (CASO PIÙ COMUNE)
Se è la prima volta che usi il dashboard, nessun account esiste ancora.

**Soluzione:**
Apri il browser a:
```
http://localhost:8000/scripts/initialize-admin.html
```

Compila il form con:
- **Username**: `admin`
- **Password**: `admin` (cambierai dopo il primo accesso)
- **Full Name**: `Administrator`
- **Email**: `admin@example.com`

Clicca **"Create Admin Account"** e sarai reindirizzato al dashboard.

#### 2. Reset localStorage Corrotto
Se i dati locali sono danneggiati:

1. Apri Console Browser (F12)
2. Esegui: `localStorage.clear()`
3. Ricarica la pagina: `location.reload()`
4. Dovresti ora vedere la schermata di setup

#### 3. Password Non Valida
La password deve avere:
- **Min 8 caratteri**
- **Almeno 1 lettera maiuscola**
- **Almeno 1 numero**

Esempi corretti:
- ✅ `Admin123`
- ✅ `DashboardPass2024`

Esempi errati:
- ❌ `admin` (troppo corta, no maiuscola)
- ❌ `password123` (no maiuscola)

#### 4. Account Bloccato (Rate Limiting)
Dopo 5 tentativi falliti, l'account è bloccato per 15 minuti.

**Soluzione rapida:**
```javascript
// Console (F12):
localStorage.clear();
location.reload();
```

### Problemi Backend

#### "Errore avvio backend"

```bash
# Verifica che Node.js sia installato
node --version

# Se non c'è, installalo da https://nodejs.org/
```

#### "Porta già in uso"

Lo script usa automaticamente porta alternativa (8001).

#### "Perdo i dati"

**VECCHIO sistema**: `localStorage` del browser → si perdeva tutto
**NUOVO sistema**: `./data/*.json` → persistenti!

Per verificare:
```bash
ls -la data/  # Vedi i file JSON con i tuoi dati
```

#### "Non vedo i dati dopo il riavvio"

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

### Test Manuale Backend

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

### Verifica Server Attivi

```bash
lsof -i :3000  # Backend
lsof -i :8000  # Frontend
```

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

## Documentation Reference

**For complete testing procedures**:
→ See `SETUP_FLOW_TEST.md` (10 detailed test cases)

**For security details**:
→ See `SECURITY.md` (comprehensive guide)

**For resource reference**:
→ See `SETUP_RESOURCES.md` (Q&A, troubleshooting)

**For verification**:
→ See `PHASE5_VERIFICATION.md` (checklist)

---

**Status**: ✅ **PRODUCTION READY**
**Last Updated**: 2025-01-10
