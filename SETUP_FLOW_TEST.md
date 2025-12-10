# Setup Flow Testing Guide

## Overview
The first-user setup form is a critical security feature that ensures the initial administrator account is created securely with a strong password.

## Automatic Trigger
When the application loads and **no users exist** in localStorage:
- `init()` method in `js/app.js` detects `UserManager.getAll().length === 0`
- Automatically displays `setupScreen` instead of login screen
- This ensures fresh installations always show the setup form

## Setup Form Fields

### 1. Username (setupUsername)
- **Requirement**: Minimum 3 characters
- **Validation**: 
  - Not empty
  - Length >= 3
  - Must not already exist in system
- **Error Message**: 
  - "Nome utente deve avere almeno 3 caratteri"
  - "Nome utente già in uso"

### 2. Full Name (setupFullName)
- **Requirement**: Required field
- **Validation**: Not empty
- **Error Message**: "Nome completo è obbligatorio"

### 3. Email (setupEmail)
- **Requirement**: Valid email format
- **Validation**: Regex `^[^\s@]+@[^\s@]+\.[^\s@]+$`
- **Error Message**: "Email non valida"

### 4. Password (setupPassword)
- **Requirement**: Minimum 8 characters, 1 uppercase, 1 digit
- **Validation**:
  - Length >= 8
  - Contains at least one uppercase letter [A-Z]
  - Contains at least one digit [0-9]
- **Error Messages**:
  - "Password deve avere almeno 8 caratteri"
  - "Password deve contenere almeno una lettera maiuscola"
  - "Password deve contenere almeno un numero"

### 5. Password Confirmation (setupPasswordConfirm)
- **Requirement**: Must match password field exactly
- **Validation**: passwordConfirm === password
- **Error Message**: "Le password non corrispondono"

## Processing Flow

```
User submits setupForm
    ↓
handleSetup() called
    ↓
[Validate all fields]
    ↓
Check username uniqueness
    ↓
UserManager.create({
  username,
  fullName,
  email,
  password,
  role: CONFIG.ROLES.ADMIN  ← Always creates admin
})
    ↓
AuthManager._resetAttempts(username)  ← Clear rate limit
    ↓
AuthManager.login(username, password)
    ↓
Show success message (1.5 seconds)
    ↓
Redirect to dashboard
```

## Key Security Features

1. **Password Hashing**: UserManager.create() automatically hashes password using PasswordHash.hash()
2. **Admin Role**: First user always gets CONFIG.ROLES.ADMIN role
3. **Rate Limit Reset**: Login rate limit attempts cleared before auto-login
4. **Input Validation**: All fields validated before user creation
5. **Email Validation**: Ensures valid email format
6. **XSS Protection**: All inputs sanitized (handled by UserManager)
7. **Error Feedback**: Clear messages shown in setupError div
8. **Success Feedback**: Success message shown in setupSuccess div

## Testing Checklist

### Test 1: Fresh Installation (No Users)
- [ ] Clear localStorage completely
- [ ] Refresh page
- [ ] Verify setup screen appears instead of login screen
- [ ] Verify login screen is hidden

### Test 2: Valid Setup
- [ ] Fill all fields with valid data:
  - Username: `testadmin` (3+ chars)
  - Full Name: `Test Administrator`
  - Email: `admin@test.com`
  - Password: `SecurePass123`
  - Confirm: `SecurePass123`
- [ ] Click "Crea Account" button
- [ ] Verify success message appears
- [ ] Verify dashboard shows after 1.5 seconds
- [ ] Verify user is logged in (top-right username displayed)
- [ ] Verify user has admin role

### Test 3: Username Validation
- [ ] **Too short**: Enter `ab` → Error: "Nome utente deve avere almeno 3 caratteri"
- [ ] **Already exists**: Create user, clear localStorage except users, reload, try again → Error: "Nome utente già in uso"
- [ ] **Valid**: Enter `newadmin` (3+ chars) → Proceeds

### Test 4: Full Name Validation
- [ ] Leave empty → Error: "Nome completo è obbligatorio"
- [ ] Enter `John Doe` → Proceeds

### Test 5: Email Validation
- [ ] **Invalid formats**:
  - `invalid` → Error: "Email non valida"
  - `invalid@` → Error: "Email non valida"
  - `@invalid.com` → Error: "Email non valida"
- [ ] **Valid**: `admin@example.com` → Proceeds

### Test 6: Password Validation
- [ ] **Too short**: `Pass123` (7 chars) → Error: "Password deve avere almeno 8 caratteri"
- [ ] **No uppercase**: `password123` → Error: "Password deve contenere almeno una lettera maiuscola"
- [ ] **No digit**: `PasswordABC` → Error: "Password deve contenere almeno un numero"
- [ ] **Valid**: `SecurePass123` → Proceeds

### Test 7: Password Confirmation
- [ ] Enter password `SecurePass123`
- [ ] Enter confirmation `SecurePass12` (different) → Error: "Le password non corrispondono"
- [ ] Enter matching confirmation → Proceeds

### Test 8: After Successful Setup
- [ ] Logout and login with created credentials
- [ ] Verify password is hashed in localStorage (not plaintext)
- [ ] Verify user has ADMIN role
- [ ] Verify second login attempt works

### Test 9: Second User (Setup Form Should Not Appear)
- [ ] Create another user via Users Management
- [ ] Refresh page
- [ ] Verify login screen appears instead of setup screen
- [ ] Verify setup screen never appears again

### Test 10: Error Recovery
- [ ] Submit form with invalid data
- [ ] Verify error message displays
- [ ] Correct the error
- [ ] Resubmit successfully
- [ ] Verify form clears and success message shows

## HTML Elements Reference
```
id="setupScreen"              - Container (flex display)
id="setupForm"                - Form element
id="setupUsername"            - Username input
id="setupFullName"            - Full name input
id="setupEmail"               - Email input
id="setupPassword"            - Password input
id="setupPasswordConfirm"      - Password confirmation input
id="setupError"               - Error message div (red)
id="setupSuccess"             - Success message div (green)
```

## CSS Classes
```
.error-message   - Red text, red border (for setupError)
.success-message - Green text, green background (for setupSuccess)
```

## Related Code Files
- `js/app.js`: DashboardApp.init(), showSetup(), handleSetup(), setupEventListeners()
- `js/auth/users.js`: UserManager.create() with password hashing
- `js/auth/auth.js`: AuthManager.login() and rate limiting
- `js/security/hash.js`: PasswordHash.hash() and verify()
- `index.html`: setupScreen section with form
- `styles.css`: .success-message and #setupForm styling

## Troubleshooting

### Setup screen doesn't appear on fresh install
- Check browser console for errors
- Verify localStorage is cleared: `localStorage.clear()`
- Check that `UserManager.getAll()` returns empty array
- Verify setupScreen element exists in DOM: `document.getElementById('setupScreen')`

### Form submission does nothing
- Check browser console for JavaScript errors
- Verify setupForm event listener is registered
- Check that handleSetup() is being called
- Verify all input IDs match (setupUsername, setupPassword, etc.)

### Password validation too strict
- Current requirements: 8+ chars, 1 uppercase, 1 digit
- Regex patterns in handleSetup(): `/[A-Z]/` and `/\d/`
- Can be relaxed in handleSetup() if needed

### User created but login fails
- Check browser console for errors
- Verify UserManager.create() succeeded (check result.success)
- Verify password is hashed in localStorage
- Check AuthManager.login() error message

## Future Enhancements
- [ ] Show password strength indicator
- [ ] Allow customization of password policy
- [ ] Add optional CAPTCHA for bots
- [ ] Log setup event in ActivityLog
- [ ] Send welcome email to admin
- [ ] QR code for authenticator app (2FA)
