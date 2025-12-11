# 🔐 Risoluzione Problema di Login

## Il Problema
Quando accedi al dashboard per la prima volta, ricevi un messaggio di errore.

## Cause Possibili e Soluzioni

### 1. **Nessun Account Admin Creato** (CASO PIÙ COMUNE)
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

### 2. **Reset localStorage Corrotto**
Se i dati locali sono danneggiati:

1. Apri Console Browser (F12)
2. Esegui: `localStorage.clear()`
3. Ricarica la pagina: `location.reload()`
4. Dovresti ora vedere la schermata di setup

### 3. **Password Non Valida**
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

### 4. **Account Bloccato (Rate Limiting)**
Dopo 5 tentativi falliti, l'account è bloccato per 15 minuti.

**Soluzione rapida:**
```javascript
// Console (F12):
localStorage.clear();
location.reload();
```

---

## 📋 Step-by-Step: Primo Login

1. Vai a `http://localhost:8000`
2. Se vedi **"🔐 Primo Accesso - Configura Admin"**: compila il form
3. Se vedi **"Dashboard Gestionale" (login)**: 
   - Vai a `http://localhost:8000/scripts/initialize-admin.html`
   - O apri Console e esegui `localStorage.clear()`

4. Clicca "Crea Account" o "Create Admin Account"
5. Sarai automaticamente loggato nel dashboard ✅

---

**Leggi [QUICKSTART.md](QUICKSTART.md) per il setup completo.**
