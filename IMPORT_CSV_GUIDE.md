# 📥 Guida Import CSV - Dashboard Tasks

## 🎯 Funzionalità Implementata

Sistema completo di import CSV per caricare task dalla Roadmap Google Sheets nella dashboard.

## 📋 Formato CSV Supportato

Il CSV deve seguire la struttura della tua Roadmap:

```
Done, Priorità, Stato, Periodo, Attività
```

### Colonne nel dettaglio:

1. **Done** (Completato)
   - Valori accettati: `true`, `false`, `yes`, `no`, `si`, `sì`, `1`, `0`, `x`, `✓`, `✔`, `☑`
   - Esempio: `true` oppure `✓`

2. **Priorità**
   - Valori: `Bassa`, `Media`, `Alta`, `Critica`
   - Case-insensitive (anche minuscolo funziona)
   - Esempio: `Alta` o `alta`

3. **Stato**
   - Emoji: `✅` (completato), `🔄` (in corso), `❌` (da fare), `⏸️` (in pausa), `⏹️` (annullato)
   - Testo: `Completato`, `In corso`, `Da fare`, `In pausa`, `Annullato`
   - Esempio: `✅` oppure `Completato`

4. **Periodo**
   - Formato range: `09-15 Dicembre 2025`
   - Formato mese: `Dicembre 2025`
   - Formato trimestre: `Q1 2026`
   - Esempio: `09-15 Dicembre 2025`

5. **Attività**
   - Testo libero
   - Tag categoria: `[SOCIAL MEDIA]`, `[COMPLETATO]`, etc. (automaticamente estratti)
   - Hashtag: `#marketing`, `#urgente` (automaticamente estratti come tags)
   - Esempio: `[SOCIAL MEDIA] Creare contenuti Instagram #marketing`

## 🚀 Come Usare

### 1. Esporta da Google Sheets

1. Apri la tua Roadmap su Google Sheets
2. File → Download → Valori separati da virgola (.csv)
3. Salva il file sul tuo computer

### 2. Importa nella Dashboard

1. Fai login nella dashboard
2. Vai nella sezione **Tasks**
3. Click sul pulsante **📥 Importa CSV**
4. Seleziona il file CSV appena scaricato
5. Visualizza l'**anteprima** dei task (fino a 10 mostrati)
6. Configura opzioni:
   - ✓ **Salta duplicati**: evita reimport di task già presenti
   - ✓ **Assegna tutti i task a me**: ti assegna automaticamente tutti i task
7. Click **Importa Task**

### 3. Verifica Risultato

- Statistiche import mostrate: `15 task importati, 3 saltati (duplicati)`
- Task visibili nella lista con:
  - ✓ Priorità corretta (colori badge)
  - 📅 Date scadenza
  - 📂 Categorie estratte
  - 🏷️ Tags

## 📊 Mapping Automatico

Il parser CSV converte automaticamente:

| Google Sheets | Dashboard Tasks |
|---------------|-----------------|
| `Done` | `completed` (boolean) |
| `Priorità` | `priority` (1-4) |
| `Stato` emoji/testo | `status` (todo/in-progress/completed/paused/cancelled) |
| `Periodo` | `startDate` + `endDate` (ISO dates) |
| `Attività` | `title` + `description` + `category` + `tags` |

## 🔄 Gestione Duplicati

Con **merge mode** attivo (default):
- Task con stesso titolo + source `roadmap-import` **non vengono reimportati**
- Previene duplicazioni accidentali
- Utile per aggiornamenti incrementali

## 🎨 Esempio CSV

```csv
Done,Priorità,Stato,Periodo,Attività
true,Alta,✅,09-15 Dicembre 2025,[COMPLETATO] Setup profili social media #instagram #facebook
false,Critica,🔄,16-22 Dicembre 2025,[SOCIAL MEDIA] Creare piano editoriale Q1 2026
false,Media,❌,Gennaio 2026,[MARKETING] Campagna sponsorizzata Google Ads
```

## 🛠️ File Modificati

### Nuovi File:
- `js/modules/import-csv.js` - Parser CSV intelligente (520 righe)

### File Modificati:
- `index.html` - Aggiunto pulsante "Importa CSV" e modal import
- `styles.css` - Stili per modal import e preview task
- `js/app.js` - Handlers per file selection, preview, conferma import
- `js/core/EventBus.js` - Aggiunto evento `TASKS_IMPORTED`

## 🧪 Test Manuale

1. ✅ Export CSV da Google Sheets
2. ✅ Click "Importa CSV" nella dashboard
3. ✅ Seleziona file → verifica preview (stats + primi 10 task)
4. ✅ Conferma import → verifica notifica successo
5. ✅ Controlla lista task: priorità, date, categorie corrette
6. ✅ Tenta re-import stesso CSV → verifica "X saltati (duplicati)"
7. ✅ Verifica task completati hanno checkbox ✓

## 🐛 Troubleshooting

**Preview vuota dopo selezione file:**
- Verifica che CSV abbia header corretti o almeno 5 colonne
- Controlla console browser per errori parsing

**Task importati senza date:**
- Formato periodo non riconosciuto
- Usa formato: `09-15 Dicembre 2025` o `Dicembre 2025`

**Priorità tutte "Media":**
- Verifica colonna Priorità contenga testo: Bassa/Media/Alta/Critica

**Duplicati sempre importati:**
- Assicurati "Salta duplicati" sia attivo
- Duplicati rilevati solo per task con `source: 'roadmap-import'`

## 🚀 Prossimi Passi

1. **Export dalla dashboard** - Aggiungere export task → CSV per backup
2. **Sync bidirezionale** - Opzionale: Google Sheets API per sync real-time
3. **Filtri avanzati** - Vista timeline/gantt per roadmap strategica
4. **Bulk edit** - Modifica multipla task importati

## 📝 Note Tecniche

- **Parser CSV custom**: gestisce virgolette, line breaks, escape
- **Date parsing intelligente**: italiano (Dicembre), range (09-15), trimestri (Q1)
- **Emoji → text mapping**: converte emoji stato in testo normalizzato
- **Category extraction**: regex `\[CATEGORIA\]` per tag strutturati
- **Hashtag parsing**: `#tag` estratti automaticamente
- **Resilienza**: righe malformate saltate con warning, import continua
