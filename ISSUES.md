# 📋 Issues & Feedback Tracker

**Documento vivo** dove annotare bug, feature requests e improvement ideas mentre usi il dashboard.  
Diventa il tuo **personal roadmap**!

---

## 🐛 BUGS TROVATI

Formato:
```
- [ ] [SEVERITY] Descrizione breve
  Date: YYYY-MM-DD
  Steps: Come riprodurre
  Expected: Cosa dovrebbe fare
  Actual: Cosa fa invece
  Notes: Informazioni aggiuntive
```

### Lista

*(Aggiorna mentre trovi problemi)*

---

## ✨ FEATURE REQUESTS

Cose che vorresti aggiungere/migliorare:

*(Aggiungi durante uso)*

---

## 🚀 IMPROVEMENTS PRIORITY

Ordina per importanza:

**🔴 HIGH** - Bloccante, uso impossibile senza
**🟡 MEDIUM** - Comodo, migliora UX
**🟢 LOW** - Carino, non urgente

### Esempi:
```
- [ ] 🔴 Dark mode toggle non funziona (browser black but buttons still light)
  Impact: UX, eye strain
  Effort: 2h
  
- [ ] 🟡 Aggiungere autocomplete città/provincie
  Impact: Data entry speed +30%
  Effort: 3h
  
- [ ] 🟢 Emoji nel booking status (✅🕐❌)
  Impact: Visual clarity
  Effort: 30min
```

---

## 📊 TESTING LOG

Traccia cosa hai testato:

```
DATE       | TEST                    | RESULT | NOTES
-----------|-------------------------|--------|---------------------------
2025-12-11 | Login/Setup             | ✅     | Password validation working
2025-12-11 | Create booking          | ✅     | Auto-cleaning created ✅
2025-12-11 | Accounting transaction  | ✅     | CSV export works
2025-12-11 | Mobile sidebar toggle   | ⚠️     | Hamburger doesn't close after nav
2025-12-11 | Dark mode               | ❌     | Colors wrong in dark theme
```

---

## 🎯 CHECKLIST QUOTIDIANO (first week)

- [ ] Day 1: Setup completo, login, prime 5 azioni
- [ ] Day 2-3: Creare booking real, verify cleaning, test notification
- [ ] Day 4: Accounting + CSV export, Analytics
- [ ] Day 5: Backup/restore, User management
- [ ] Day 6: Mobile testing, multiple users
- [ ] Day 7: Review tutto, consolidate feedback

---

## 📌 INSIGHTS DURANTE L'USO

Cose che noti interessanti:

```
- Il calendario è intuitivo ✅
- Forms non hanno visual feedback durante save (felt broken)
- Notifications late 5-10 seconds (email sync?)
- Dark mode toggle position hard to find
- Need export per contatto (client invoice)
```

---

## 🔄 WEEKLY REVIEW

Ogni settimana:

1. **Consolidate Issues** - Raggruppa bug simili
2. **Prioritize** - Cosa è più importante?
3. **Plan Next Work** - Top 3-5 improvements
4. **Document** - Annota cosa hai imparato sul codice

---

## NOTE SVILUPPO

Durante fix/improvements:

```
Commit: [feat/fix/improvement] Descrizione
Branch: Opzionale (se locale version control)
Time: Ore spese
Status: In Progress / Done / Testing
```

Esempio:
```
Commit: fix: Dark mode colors in accounting section
Time: 1h 20min
Status: Done
Result: All colors now readable in dark mode
Related Issue: Bug #1
```

---

## 🎓 LEARNINGS

Cosa impari usando il dashboard:

```
- Come il sistema bookings/cleaning sync automatically
- Setup flow è intuitivo (non confuso)
- Data ownership model prevents accidental deletes ✅
- Notification latency è acceptable
```

---

## 💡 FUTURE IDEAS

Pensieri per improvements futuri:

```
- WhatsApp integration per notifiche
- Booking import da Airbnb CSV
- Auto-invoice generation
- Smart pricing suggestions
- Occupancy forecasting
```

---

## 📍 LAST UPDATED

- **Date**: [Update quando modifichi questo file]
- **Status**: [In Active Use / Testing Phase / Ready for Features]
- **Next Review**: [Data prossima review]

---

## 🗂️ COME USARE QUESTO FILE

1. **Durante l'uso**: Aggiungi bug/feature mentre succede
2. **Fine giornata**: Consolida osservazioni
3. **Fine settimana**: Prioritizza per week
4. **Next sprint**: I top 3-5 improvements diventano focus

### Template per Issue nuova:
```
- [ ] [SEVERITY] Titolo breve
  Date: YYYY-MM-DD | Time: HH:MM
  Reproducer: Step 1, Step 2, Step 3
  Expected: ...
  Actual: ...
  Impact: [High/Medium/Low]
  Effort: [0.5h/2h/4h estimate]
```

---

**Non scrivere qui in modo formale!** Questa è TUA nota di lavoro personale. 
Scrivi come pensi, in italiano/inglese mix, abbreviazioni welcome. 
L'importante è avere track di cosa trovi e cosa vuoi migliorare.

---

💪 **Buon testing! Annota tutto. Questo diventa il tuo roadmap!**
