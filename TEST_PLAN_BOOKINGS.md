# Test Plan - Bookings Calendar

## ✅ Fixes Completati

### 1. Modal Management (CRITICAL FIX)
**Problema**: `bookings-handlers.js` usava funzioni `openModal()` e `closeModal()` inesistenti
**Fix**: Sostituito con accesso diretto a `.classList.add/remove('active')` come in `app.js`
**File modificati**: 
- `js/handlers/bookings-handlers.js` (6 modifiche)

### 2. EventBus Integration (CRITICAL FIX)
**Problema**: `Router.onNavigate()` sovrascriveeva callback invece di accumulare
**Fix**: Usato `EventBus.on(EVENTS.SECTION_CHANGED)` per inizializzare calendario
**File modificati**:
- `js/handlers/bookings-handlers.js`

### 3. Stats Update Pattern (IMPROVEMENT)
**Problema**: Riferimenti a `window.updateStats()` obsoleti
**Fix**: Rimossi, EventBus già gestisce aggiornamenti reattivi via `EVENTS.BOOKING_*`
**File modificati**:
- `js/handlers/bookings-handlers.js`

---

## 🧪 Test Manuale (da eseguire nel browser)

### Setup
1. Apri http://localhost:8000
2. Login: admin / admin
3. Apri Console (F12)
4. Incolla e esegui lo script demo:

```javascript
function createDemoBookings() {
    const today = new Date();
    const bookings = [
        {
            guestName: 'Mario Rossi',
            guestEmail: 'mario.rossi@email.it',
            guestPhone: '+39 123 456789',
            checkIn: new Date(today.getFullYear(), today.getMonth(), 5).toISOString().split('T')[0],
            checkOut: new Date(today.getFullYear(), today.getMonth(), 10).toISOString().split('T')[0],
            guests: 2,
            totalAmount: 750,
            deposit: 150,
            isPaid: true,
            status: 'confirmed',
            channel: 'booking',
            notes: 'Cliente VIP'
        },
        {
            guestName: 'Anna Bianchi',
            guestEmail: 'anna.b@email.com',
            guestPhone: '+39 987 654321',
            checkIn: new Date(today.getFullYear(), today.getMonth(), 12).toISOString().split('T')[0],
            checkOut: new Date(today.getFullYear(), today.getMonth(), 15).toISOString().split('T')[0],
            guests: 4,
            totalAmount: 900,
            deposit: 200,
            isPaid: false,
            status: 'pending',
            channel: 'airbnb',
            notes: ''
        },
        {
            guestName: 'BLOCCATO',
            checkIn: new Date(today.getFullYear(), today.getMonth(), 20).toISOString().split('T')[0],
            checkOut: new Date(today.getFullYear(), today.getMonth(), 22).toISOString().split('T')[0],
            guests: 0,
            totalAmount: 0,
            status: 'blocked',
            channel: 'direct',
            notes: 'Manutenzione caldaia'
        },
        {
            guestName: 'Klaus Schmidt',
            guestEmail: 'klaus.schmidt@email.de',
            guestPhone: '+49 123 456789',
            checkIn: new Date(today.getFullYear(), today.getMonth(), 25).toISOString().split('T')[0],
            checkOut: new Date(today.getFullYear(), today.getMonth(), 28).toISOString().split('T')[0],
            guests: 2,
            totalAmount: 600,
            deposit: 120,
            isPaid: true,
            status: 'confirmed',
            channel: 'direct',
            notes: 'Check-in serale'
        }
    ];
    
    bookings.forEach(b => BookingsModule.create(b));
    Router.navigate('bookings');
}

createDemoBookings();
```

---

### Test Checklist

#### ✅ Rendering Calendario
- [ ] Calendario visibile nella sezione Prenotazioni
- [ ] Mese corrente mostrato con nome italiano
- [ ] Giorni settimana: Lun, Mar, Mer, Gio, Ven, Sab, Dom
- [ ] Griglia 7x5 (circa) con giorni del mese
- [ ] Giorno corrente evidenziato con classe `.today`
- [ ] Prenotazioni visibili sui giorni corretti

#### ✅ Color Coding Stati
- [ ] Status `confirmed` → background verde
- [ ] Status `pending` → background giallo/arancio
- [ ] Status `blocked` → background grigio con icona 🔒
- [ ] Status `cancelled` → (non testato, colore rosso/strikethrough)

#### ✅ Navigation
- [ ] Pulsante "◀" naviga a mese precedente
- [ ] Pulsante "▶" naviga a mese successivo
- [ ] Pulsante "Oggi" torna al mese corrente
- [ ] Nessun errore console durante navigation

#### ✅ Statistiche Mese
- [ ] "Prenotazioni" mostra count corretto
- [ ] "Occupazione" mostra percentuale (es: 45%)
- [ ] "Ricavi" mostra totale €
- [ ] "Media/notte" mostra valore medio €

#### ✅ Prima Settimana Mese Successivo
- [ ] Sezione "Prima settimana [MeseSuccessivo]" visibile
- [ ] 7 giorni mostrati (1-7 del mese prossimo)
- [ ] Prenotazioni future visibili con indicatore
- [ ] Click su giorno funziona (apre modale)

#### ✅ Interazioni - Click Giorno Vuoto
- [ ] Click su giorno senza prenotazione
- [ ] Modale "Nuova Prenotazione" si apre
- [ ] Campo Check-in pre-compilato con data cliccata
- [ ] Campo Check-out pre-compilato con giorno successivo
- [ ] Form validato correttamente

#### ✅ Interazioni - Click Prenotazione Esistente
- [ ] Click su prenotazione nel calendario
- [ ] Modale "Modifica Prenotazione" si apre
- [ ] Tutti i campi pre-compilati con dati corretti
- [ ] Modifica e salvataggio funziona
- [ ] Calendario si aggiorna dopo salvataggio
- [ ] Nessun errore console

#### ✅ CRUD Completo
- [ ] Creare nuova prenotazione da modale
- [ ] Prenotazione appare sul calendario
- [ ] Modificare prenotazione esistente
- [ ] Calendario riflette modifiche
- [ ] Eliminare prenotazione (da vista lista)
- [ ] Calendario si aggiorna

#### ✅ Toggle Vista
- [ ] Pulsante "📅 Calendario" attivo di default
- [ ] Pulsante "📋 Lista" switch a vista lista
- [ ] Vista lista mostra prenotazioni in tabella
- [ ] Tornare a calendario funziona

#### ✅ Blocco Date
- [ ] Click pulsante "🔒 Blocca Date"
- [ ] Modale blocco date si apre
- [ ] Selezionare range date + motivo
- [ ] Salvataggio crea booking status "blocked"
- [ ] Calendario mostra blocco con 🔒 e colore grigio

#### ✅ Filtri
- [ ] Filtro canale (All, Booking.com, Airbnb, etc)
- [ ] Filtro stato (All, Confermato, In attesa, etc)
- [ ] Search bar per nome ospite
- [ ] Filtri applicati correttamente

#### ✅ Mobile Responsive
- [ ] Aprire su mobile (DevTools responsive mode)
- [ ] Calendario si adatta a larghezza schermo
- [ ] Giorni leggibili (font size adeguato)
- [ ] Modali responsive
- [ ] Nessun overflow orizzontale

#### ✅ Performance
- [ ] Caricamento calendario < 500ms
- [ ] Navigation tra mesi fluida (no lag)
- [ ] Apertura modale immediata
- [ ] Nessun console warning/error

---

## 🐛 Bug da Verificare

1. **Sovrapposizione prenotazioni**: Se 2 bookings nello stesso giorno, vengono mostrati entrambi o solo il primo?
2. **Validazione date**: Cosa succede se tento di creare booking con checkOut < checkIn?
3. **Disponibilità**: Sistema verifica correttamente overlap tra booking?
4. **Timezone**: Date vengono salvate correttamente senza drift UTC?

---

## 📊 Risultato Atteso

✅ **Calendario completamente funzionale:**
- Rendering perfetto senza errori
- Navigation fluida
- Interazioni intuitive (click → modale con pre-fill)
- Color-coding immediato per stati
- Integrazione con EventBus reattiva
- Stats real-time
- Mobile friendly

❌ **Se questi test falliscono, NON procedere con commit**

---

## 🚀 Next Steps (dopo test OK)

1. Polish CSS (tooltips su hover booking?)
2. Animazioni smooth (fade-in giorni?)
3. Export calendario come PDF?
4. Sync con Google Calendar?
5. Notifiche email automatiche (EmailJS)?

