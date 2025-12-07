# Dashboard Gestionale - AI Coding Instructions

## Architecture Overview

This is a **vanilla JavaScript SPA** for vacation rental management (`Ferienwohnung`) with a **hybrid modular architecture**. No build tools, no npm packages - just pure JS/HTML/CSS with localStorage persistence.

**Core Pattern**: Event-driven modules communicating through `EventBus` (pub/sub), coordinated by `DashboardApp` orchestrator in `js/app.js`.

```
js/
├── core/               # Architecture foundation
│   ├── EventBus.js    # Pub/sub communication (EVENTS.*)
│   └── Router.js      # Hash-based navigation (#section)
├── services/          # Cross-cutting concerns
│   ├── NotificationService.js  # Toast notifications
│   ├── EmailService.js         # EmailJS integration
│   └── TelegramService.js      # Telegram bot notifications
├── modules/           # Business logic (self-contained)
│   ├── bookings.js    # Vacation rental reservations
│   ├── contacts.js    # Multi-email/phone contacts
│   ├── accounting.js  # Income/expense tracking + CSV export
│   ├── cleaning.js    # Housekeeping schedules
│   ├── maintenance.js # Repair/maintenance tracking
│   └── ...
├── auth/              # Authentication & permissions
│   ├── auth.js        # AuthManager (session)
│   ├── users.js       # UserManager (CRUD)
│   └── permissions.js # Role-based access (admin/supervisor/user)
├── config.js          # CONFIG object (STORAGE_KEYS, ROLES, etc)
├── storage.js         # StorageManager (localStorage wrapper)
├── utils.js           # Utils + ErrorHandler
└── app.js             # DashboardApp orchestrator (3000+ lines)
```

## Development Workflow

**No build step**. Open `index.html` in browser or use:
```bash
python -m http.server 8000  # Then http://localhost:8000
```

**External dependencies** (CDN only):
- Chart.js v4.4.0 (analytics charts)
- EmailJS browser v3 (email notifications)

**Default credentials**: admin/admin (see `js/auth/users.js`)

## Critical Patterns

### 1. Event-Driven Communication
Modules communicate via `EventBus`. Always emit events after data mutations:

```javascript
// In module after creating/updating/deleting
EventBus.emit(EVENTS.CONTACT_CREATED, contact);
EventBus.emit(EVENTS.BOOKING_DELETED, { id: bookingId });

// In app.js or other modules, subscribe
EventBus.on(EVENTS.CONTACT_CREATED, (contact) => {
  this.updateStats();  // Reactive UI updates
});
```

**Event names** are in `js/config.js` under `EVENTS` constant. Use them, don't hardcode strings.

### 2. Module Structure (Template)
All modules in `js/modules/` follow this pattern:

```javascript
const MyModule = {
  getAll() {
    return StorageManager.load(CONFIG.STORAGE_KEYS.MY_DATA, []);
  },
  
  create(data) {
    const item = { id: Utils.generateId(), ...data, createdAt: new Date().toISOString() };
    const items = this.getAll();
    items.push(item);
    StorageManager.save(CONFIG.STORAGE_KEYS.MY_DATA, items);
    
    ActivityLog.log(CONFIG.ACTION_TYPES.CREATE, 'myEntity', item.id, { ...metadata });
    EventBus.emit(EVENTS.MY_ENTITY_CREATED, item);
    NotificationService.success('Item creato!');
    
    return { success: true, item };
  },
  
  update(id, changes) { /* ... similar pattern ... */ },
  delete(id) { /* ... */ }
};
```

**Always**: 
1. Validate input
2. Use `StorageManager` (never direct `localStorage`)
3. Use `Utils.generateId()` for IDs
4. Log activity with `ActivityLog.log()`
5. Emit `EventBus` event
6. Show `NotificationService` feedback
7. Return `{ success: boolean, ... }` object

### 3. Error Handling
Use centralized `ErrorHandler` in `js/utils.js`:

```javascript
// Synchronous errors
try {
  riskyOperation();
} catch (error) {
  ErrorHandler.handle(error, 'ModuleName.methodName', true);
  // true = show user notification
}

// Async operations
const safeOp = ErrorHandler.wrap(async () => {
  return await fetchData();
}, 'ModuleName.operationName');

const result = await safeOp();
```

**Never** use raw `console.error()` or `alert()`. Always use `ErrorHandler` or `NotificationService`.

### 4. Storage Keys
All localStorage keys defined in `CONFIG.STORAGE_KEYS`. Never hardcode strings:

```javascript
// ✅ Correct
StorageManager.load(CONFIG.STORAGE_KEYS.CONTACTS, []);

// ❌ Wrong
localStorage.getItem('contacts');
```

### 5. User Tracking & Permissions
Every created entity must track creator:

```javascript
const currentUser = AuthManager.getCurrentUser();
const item = {
  // ...
  createdBy: currentUser.id,
  createdByUsername: currentUser.username,
  createdAt: new Date().toISOString()
};
```

Check permissions before sensitive operations:

```javascript
if (!PermissionManager.check('canDeleteAllData')) {
  NotificationService.error('Permesso negato');
  return;
}
```

### 6. Contact Structure (Multi-value fields)
Contacts have **arrays** for emails/phones (migrated from single values):

```javascript
{
  id: 123,
  firstName: 'Mario',
  lastName: 'Rossi',
  emails: [
    { value: 'mario@email.com', label: 'Lavoro' },
    { value: 'mario.rossi@pec.it', label: 'PEC' }
  ],
  phones: [
    { value: '+39 123 456789', label: 'Cellulare' }
  ],
  address: { street, city, zip, province, country },
  category: 'cliente', // from CategoryManager
  // ...
}
```

### 7. Router & Navigation
Navigate programmatically with `Router.navigate()`:

```javascript
Router.navigate('contacts');  // Updates URL hash and shows section
```

In `index.html`, sections have `id="contactsSection"` and class `content-section`. Only one visible at a time.

### 8. Accounting & CSV Export
Accounting module exports CSV for accountant (commercialista):

```javascript
AccountingModule.exportToCSV(2025, 0);  // January 2025
AccountingModule.exportToCSV(2025);     // Full year 2025
AccountingModule.exportSummary(2025);   // Text summary
```

Format: `Data | Tipo | Categoria | Descrizione | Importo | Metodo | N° Ricevuta | Note | Creatore`

### 9. Backup & Restore
Full data backup/restore in `js/modules/backup.js`:

```javascript
BackupModule.downloadBackup();  // JSON with all localStorage data
BackupModule.restoreBackup(backupData);  // Overwrites ALL data (creates emergency backup)
```

## Language & Localization

**Italian language** throughout (comments, UI, notifications). Date format: DD/MM/YYYY (Italian locale). Currency: EUR (€).

When adding notifications, use Italian:
```javascript
NotificationService.success('Prenotazione creata con successo!');
NotificationService.error('Errore durante il salvataggio');
```

## File Locations for Common Tasks

- **Add new module**: Create `js/modules/mymodule.js`, follow pattern above
- **Add new event**: Define in `CONFIG.EVENTS` in `js/config.js`
- **Add new storage key**: Define in `CONFIG.STORAGE_KEYS` in `js/config.js`
- **Add new section**: Add HTML in `index.html`, update `Router.sections` array in `js/core/Router.js`, wire up in `app.js`
- **Modify UI**: All in `index.html` (single file) + `styles.css`

## Testing Strategy

Manual testing in browser. Key test scenarios:
1. Login flow (admin/admin)
2. CRUD operations in each module
3. EventBus reactivity (stats update after create/delete)
4. Backup/restore (download → modify data → restore)
5. Mobile responsive (hamburger menu at <1024px)
6. Dark mode toggle

## Common Pitfalls

1. **Don't** call `EventBus.emit()` in parallel with multiple tools - emit sequentially after storage save
2. **Don't** forget to update `app.js` event listeners when adding new modules
3. **Don't** modify `legacy/` folder - it's archived code
4. **Migration logic** in modules (e.g., `ContactsModule.migrateOldContacts()`) runs automatically - preserve it when editing
5. **`app.js` is massive** (3000+ lines) - it handles all UI rendering. Search for section names (e.g., "renderContacts") to find code
