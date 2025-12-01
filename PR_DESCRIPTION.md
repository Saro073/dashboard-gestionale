Titolo suggerito:
chore: archive legacy root app.js; implement editNote + contact improvements

Descrizione PR:

Questa PR esegue le seguenti modifiche:

- Sposta/Archivia il file root `app.js` nella cartella `legacy/app.legacy.js` e rimuove il file root.
- Aggiorna `js/app.js` (il runtime vero dell'app caricato da `index.html`) per:
  - Implementare `editNote` con `currentEditingNoteId` per modificare le note.
  - Aggiungere il supporto multi-email / multi-phone nella UI dei contatti e i metodi per aggiungere/rimuovere campi input.
  - Usare `StorageManager`, `AuthManager`, `ContactsModule`, `NotesModule`, `TasksModule`, `DocumentsModule` per la persistenza e permessi coerenti.
  - Esporre `window.app` per mantenere la compatibilità degli handler inline.
- Esegue la migrazione contatti legacy all'inizializzazione (`ContactsModule.migrateOldContacts()`), assicurando compatibilità del vecchio schema.

Checklist di test (QA):
- [ ] Avviare il server locale (python3 -m http.server 8000) e aprire http://localhost:8000
- [ ] Login con admin/admin123
- [ ] Aggiungere e modificare contatti con più email/telefono, verificare la persistenza
- [ ] Creare, modificare e cancellare note con flag urgente; verificare che `editNote` lavori
- [ ] Controllare statistiche in Overview e Activity Log

Note per il reviewer:
- L'implementazione tiene il codice modulare nel `js/app.js`; il file legacy è archiviato in `/legacy`.
- Eventuali modifiche non desiderate possono essere rimosse e ripristinate dal commit precedente.
