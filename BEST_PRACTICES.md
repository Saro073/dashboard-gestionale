# Best Practices - Dashboard Gestionale

## 🛡️ Error Handling

### ErrorHandler Centralizzato

Usa `ErrorHandler` in `js/utils.js` per gestione errori consistente:

```javascript
// Gestione errori manuale
try {
  // operazione rischiosa
  const result = someOperation();
} catch (error) {
  ErrorHandler.handle(error, 'ModuleName.methodName', true);
  // true = mostra notifica utente
}

// Wrapper async automatico
const safeOperation = ErrorHandler.wrap(async () => {
  // operazione async
  return await fetchData();
}, 'ModuleName.operationName');

// Uso
const result = await safeOperation();
```

### Logging Standards

- **Console errors**: Solo tramite `ErrorHandler.handle()`
- **Context string**: Formato `ModuleName.methodName`
- **User notification**: `showToUser=true` per errori critici
- **Future**: Logging remoto via `ErrorHandler.handle()`

## 📦 Backup & Restore

### Creazione Backup

```javascript
// Manuale
BackupModule.downloadBackup();

// Automatico (TODO)
BackupModule.enableAutoBackup();
```

### Ripristino

```javascript
// Da file
const result = await BackupModule.handleFileUpload(file);

// Da oggetto
const result = await BackupModule.restoreBackup(backupData);
```

⚠️ **IMPORTANTE**: Ripristino sovrascrive TUTTI i dati. Viene creato backup emergenza automatico.

## 📊 Export Contabilità

### Export CSV per Commercialista

```javascript
// Esporta mese corrente
AccountingModule.exportToCSV(2025, 0); // Gennaio

// Esporta anno completo
AccountingModule.exportToCSV(2025);

// Riepilogo testuale
AccountingModule.exportSummary(2025);
```

### Formato CSV

Colonne: Data | Tipo | Categoria | Descrizione | Importo | Metodo | N° Ricevuta | Note | Creatore

## 🎨 UI/UX Best Practices

### Mobile Responsive

- **Breakpoint tablet**: `@media (max-width: 1024px)` → hamburger menu
- **Breakpoint mobile**: `@media (max-width: 768px)` → layout singola colonna
- **Sidebar**: Auto-close alla navigazione su mobile

### Modali

```javascript
// Apri
document.getElementById('modalId').classList.add('active');

// Chiudi
document.getElementById('modalId').classList.remove('active');
```

### Notifiche

```javascript
NotificationService.success('Operazione completata');
NotificationService.error('Errore imprevisto');
NotificationService.info('Info utile');
```

## 🗂️ Data Management

### localStorage Keys

Definiti in `js/config.js`:
- `dashboard_contacts`
- `dashboard_tasks`
- `dashboard_bookings`
- `dashboard_accounting`
- etc.

### Activity Log

```javascript
ActivityLog.log(
  CONFIG.ACTION_TYPES.CREATE,  // CREATE | UPDATE | DELETE | DOWNLOAD | UPLOAD
  CONFIG.ENTITY_TYPES.CONTACT, // CONTACT | TASK | BOOKING | TRANSACTION
  entityId,
  { customData: 'optional' }
);
```

## 🔐 Permissions

```javascript
// Check permessi
if (PermissionsManager.canCreateUsers()) {
  // admin only
}

if (PermissionsManager.canDeleteContact(contactId)) {
  // check ownership
}
```

## 📱 Mobile Development

### Testing

Testa su:
- iPad (1024x768)
- Tablet Android (768x1024)
- iPhone (375x667)
- Android phone (360x640)

### Hamburger Menu

Automatico su `max-width: 1024px`:
- Click menu toggle → sidebar slide-in
- Click overlay → chiudi
- Click nav item → naviga + chiudi (mobile)

## 🧹 Code Cleanup

### File Obsoleti da Rimuovere

❌ `js/app-contacts-patch.js`
❌ `js/app-notes-urgent-patch.js`
❌ `js/app-supervisor-patch.js`
❌ `js/app-tasks-attachments.js`

✅ Funzionalità già integrate nei moduli principali

## 🚀 Performance

### Debouncing

```javascript
// Search input
input.addEventListener('input', 
  Utils.debounce(() => performSearch(), 300)
);
```

### Lazy Loading

Rendering condizionale:
```javascript
if (!container.isConnected) return; // DOM non montato
```

## 🎯 Future Improvements

### High Priority
- [ ] Backup automatico giornaliero/settimanale
- [ ] Remote error logging
- [ ] PWA offline support

### Medium Priority
- [ ] Calendario integrato vista mensile
- [ ] Gestione pulizie automatica
- [ ] Bulk actions (selezione multipla)

### Low Priority
- [ ] Dark mode auto (system preference)
- [ ] Push notifications
- [ ] Native mobile app

## 📚 Risorse

- **Router**: `js/core/Router.js` → SPA navigation
- **EventBus**: `js/core/EventBus.js` → Pub/sub pattern
- **Utils**: `js/utils.js` → Helper functions
- **Config**: `js/config.js` → Costanti globali
