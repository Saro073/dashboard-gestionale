# Test Plan - Contact Integration in Bookings

## Overview
This document describes the testing procedure for the booking-contact integration feature (commit 517b21f).

## Architecture Changes

### Data Model Migration
**OLD**: `{ guestName, guestEmail, guestPhone }`  
**NEW**: `{ contactId, guestFirstName, guestLastName, guestEmail, guestPhone, guestPrivateAddress, guestBusinessAddress }`

### Hybrid Linking Approach
- **Primary**: `contactId` links to ContactsModule registry
- **Fallback**: Snapshot data (firstName/lastName/email/phone/addresses) preserved in booking
- **Automatic**: `getOrCreateContact()` searches existing or creates new contact
- **Resilient**: `getGuestInfo()` retrieves from contact or falls back to snapshot

## Test Scenarios

### 1. Autocomplete Search
**Steps:**
1. Login (admin/admin)
2. Navigate to "Prenotazioni" section
3. Click "Nuova Prenotazione"
4. Type in "Cerca contatto esistente" field (minimum 2 characters)

**Expected:**
- Dropdown shows max 5 matching contacts
- Matches by firstName, lastName, email, or phone
- Shows contact name, email (📧), phone (📞)
- Debounced search (300ms delay)
- Hides dropdown when typing <2 characters

**Test Cases:**
- Empty database → no suggestions
- Type "mar" → matches "Mario Rossi" by name
- Type "mario@" → matches by email
- Type "+39" → matches by phone

---

### 2. Select Existing Contact
**Steps:**
1. Open booking modal
2. Search for existing contact (e.g., "Mario")
3. Click on suggestion in dropdown

**Expected:**
- Form fields auto-filled:
  - Nome: "Mario"
  - Cognome: "Rossi"
  - Email: "mario@example.com"
  - Telefono: "+39 123 456789"
  - Indirizzo privato: street, zip, city, country
  - Indirizzo aziendale (if exists)
- Search field cleared
- Dropdown hidden
- Success notification: "Cliente 'Mario Rossi' selezionato"

---

### 3. Create Booking with Linked Contact
**Steps:**
1. Select existing contact via autocomplete
2. Fill booking details (checkIn, checkOut, guests, channel, amount)
3. Click "Salva"

**Expected:**
- Booking created with `contactId` set
- Snapshot data saved (firstName, lastName, email, phone, addresses)
- BookingsHandlers.selectedContactId reset to null
- Modal closed, form reset
- Calendar updated (shows booking)
- Booking list shows name with 🔗 icon (link indicator)

**Validation:**
- Check localStorage: `bookings[0].contactId` should be set
- Check localStorage: `bookings[0].guestFirstName` = "Mario"
- Calendar shows "Mario Ro..." in day cell

---

### 4. Create Booking with Manual Entry (New Contact)
**Steps:**
1. Open booking modal (don't use autocomplete)
2. Manually type:
   - Nome: "Giuseppe"
   - Cognome: "Verdi"
   - Email: "giuseppe@test.it"
   - Telefono: "+39 333 111222"
   - Via: "Via Roma 10"
   - CAP: "00100"
   - Città: "Roma"
3. Fill booking details and save

**Expected:**
- `getOrCreateContact()` searches contacts by email/phone
- No match found → creates new contact in ContactsModule
- New contact saved with:
  - firstName: "Giuseppe"
  - lastName: "Verdi"
  - emails: [{ value: "giuseppe@test.it", label: "Principale" }]
  - phones: [{ value: "+39 333 111222", label: "Cellulare" }]
  - address: { street: "Via Roma 10", zip: "00100", city: "Roma", country: "Italia" }
- Booking created with new `contactId`
- Navigate to "Contatti" → verify "Giuseppe Verdi" appears

---

### 5. Edit Existing Booking
**Steps:**
1. Create booking (linked or manual)
2. Click "Modifica" on booking card
3. Verify form pre-fills all fields

**Expected:**
- If booking has `contactId`:
  - `getGuestInfo()` retrieves from ContactsModule
  - Form shows current contact data (live)
- If `contactId` null or contact deleted:
  - `getGuestInfo()` falls back to snapshot data
  - Form shows snapshot firstName/lastName/etc
- All address fields populated (private + business)
- Edit works: changes saved to booking snapshot (NOT contact)

**Edge Case - Deleted Contact:**
1. Create booking linked to contact
2. Delete that contact from ContactsModule
3. Edit booking → should still show snapshot data
4. No 🔗 icon in list (contactId points to deleted)

---

### 6. Display Bookings List
**Steps:**
1. Navigate to "Prenotazioni"
2. View booking cards

**Expected:**
- Each booking calls `getGuestInfo()`:
  - Shows `firstName + lastName` as fullName
  - Shows 🔗 icon if `contactId` exists
  - Shows email (📧) and phone (📞) if present
- Old bookings (guestName only): display as-is via fallback
- Status badges, payment indicator work correctly

---

### 7. Calendar Display
**Steps:**
1. Navigate to calendar view
2. Check day cells with bookings
3. Check "Prima settimana [next month]" preview

**Expected:**
- Day cells show truncated guest name (first 8 chars)
- Tooltip on hover shows full guest name
- Next-week preview tooltip shows guest name
- Uses `getGuestInfo()` for both (consistent with list)

---

### 8. Data Migration (Old Bookings)
**Steps:**
1. Manually create old-format booking in localStorage:
   ```javascript
   {
     id: 999,
     guestName: "Anna Bianchi",
     guestEmail: "anna@email.com",
     checkIn: "2025-01-15",
     checkOut: "2025-01-18",
     // ... other fields
   }
   ```
2. Refresh page (triggers `migrateOldBookings()`)

**Expected:**
- Migration splits "Anna Bianchi":
  - `guestFirstName`: "Anna"
  - `guestLastName`: "Bianchi"
- If contact with matching email exists:
  - `contactId` set automatically
  - Linked to existing contact
- If no match:
  - `contactId` null
  - Snapshot preserved
- Old `guestName` maintained for backward compatibility
- Console log: "[BookingsModule] Migrated X bookings, linked Y to contacts"

**Test Cases:**
- Single word name: "Mario" → firstName="Mario", lastName=""
- Multiple spaces: "Anna Maria De Luca" → firstName="Anna", lastName="Maria De Luca"
- Email match: existing contact → linked
- No email: migration successful, no linking

---

### 9. Validation & Error Handling
**Steps:**
1. Try creating booking without firstName
2. Try creating booking without lastName
3. Try creating booking with invalid email format

**Expected:**
- `validateBooking()` accepts both formats:
  - Old: requires `guestName`
  - New: requires `guestFirstName` OR `guestLastName`
- Email validation uses `CONFIG.VALIDATION.EMAIL_REGEX`
- Error notifications shown via `NotificationService`
- Form not submitted if validation fails

---

### 10. Accounting Integration
**Steps:**
1. Create booking, mark as paid later
2. Edit booking, check "Pagato" checkbox
3. Save

**Expected:**
- AccountingModule creates transaction:
  - Description: "Prenotazione: [fullName from getGuestInfo()]"
  - Amount: booking.totalAmount
  - Date: booking.checkIn
  - Category: "booking"
- Navigate to "Contabilità" → verify transaction appears
- Transaction uses `getGuestInfo()` for correct name

---

### 11. EventBus Reactivity
**Steps:**
1. Create booking → verify stats update
2. Edit booking → verify calendar updates
3. Delete booking → verify list refreshes

**Expected:**
- `EVENTS.BOOKING_CREATED` emitted after save
- `EVENTS.BOOKING_UPDATED` emitted after edit
- `EVENTS.BOOKING_DELETED` emitted after delete
- app.js EventBus listeners trigger:
  - `updateStats()` (dashboard stats)
  - `CalendarComponent.render()` (calendar refresh)
  - `BookingsHandlers.renderBookings()` (list refresh)

---

### 12. Backward Compatibility
**Steps:**
1. Keep old bookings untouched (don't edit)
2. Display old bookings in list and calendar

**Expected:**
- Old format still works:
  - `guestName` displayed if firstName/lastName missing
  - `guestEmail` displayed if exists
- No errors in console
- No data loss
- Migration runs silently on app init

---

### 13. Mobile Responsive
**Steps:**
1. Resize browser to <1024px (mobile view)
2. Test booking modal on small screen

**Expected:**
- Autocomplete dropdown width adapts (100%)
- Form fields stack vertically
- <details> collapsible sections expand properly
- Touch-friendly click targets (min 44px)

---

## Manual Test Checklist

### Setup
- [ ] Server running (python3 -m http.server 8001)
- [ ] Browser open (http://localhost:8001)
- [ ] Login as admin (admin/admin)
- [ ] Clear localStorage (optional, for clean test)

### Test Execution
- [ ] Autocomplete search (empty, partial, full match)
- [ ] Select existing contact from dropdown
- [ ] Create booking with linked contact (verify contactId)
- [ ] Create booking with manual entry (verify new contact created)
- [ ] Edit booking (verify fields pre-fill)
- [ ] Display booking list (verify 🔗 icon for linked)
- [ ] Calendar day cells (verify guest name display)
- [ ] Data migration (add old booking manually, refresh)
- [ ] Validation errors (empty fields, invalid email)
- [ ] Mark booking as paid (verify accounting transaction)
- [ ] Delete contact, edit linked booking (verify fallback)
- [ ] Check console for errors (should be none)

### Expected Outcomes
- ✅ Zero console errors
- ✅ All CRUD operations work
- ✅ Autocomplete filters correctly
- ✅ Contacts created automatically
- ✅ Old bookings display correctly
- ✅ EventBus reactivity works (stats/calendar update)
- ✅ Migration runs once on init

---

## Debugging Tips

### Check localStorage
```javascript
// View all bookings
JSON.parse(localStorage.getItem('bookings'))

// View all contacts
JSON.parse(localStorage.getItem('contacts'))

// Check specific booking
BookingsModule.getById(1)

// Get guest info (with fallback)
BookingsModule.getGuestInfo(BookingsModule.getById(1))
```

### Force Migration
```javascript
BookingsModule.migrateOldBookings()
```

### Clear localStorage
```javascript
localStorage.clear()
location.reload()
```

### Test getOrCreateContact()
```javascript
const result = BookingsModule.getOrCreateContact({
  firstName: 'Test',
  lastName: 'User',
  email: 'test@example.com',
  phone: '+39 123 456789',
  privateAddress: { street: 'Via Test', city: 'Roma', zip: '00100', country: 'Italia' }
})
console.log(result.contactId)  // Should return new or existing contactId
```

---

## Known Limitations

1. **Autocomplete debounce**: 300ms delay (configurable in code)
2. **Max suggestions**: 5 contacts shown (prevents UI overflow)
3. **Snapshot not live**: Editing booking doesn't update original contact
4. **Single email/phone**: Only first email/phone from contact used
5. **Migration idempotent**: Safe to run multiple times (skips already migrated)

---

## Rollback Plan

If critical issues found:
```bash
git revert 517b21f
git push origin main
```

This reverts to previous booking model (single guestName field) while preserving commits history.
