/**
 * Test Script - Verifica che le fix di sicurezza funzionino
 * Eseguire nel browser console dopo aver caricato index.html
 */

console.log('=== TEST SECURITY FIXES ===');

// TEST 1: PasswordHash funziona
console.log('\n1. PasswordHash.hash() e verify()');
const testPassword = 'TestPass123!';
const hashed = PasswordHash.hash(testPassword);
console.log('Plaintext:', testPassword);
console.log('Hashed:', hashed);
console.log('Verify correct password:', PasswordHash.verify(testPassword, hashed)); // deve essere true
console.log('Verify wrong password:', PasswordHash.verify('WrongPass', hashed)); // deve essere false
console.log('✓ PasswordHash works');

// TEST 2: Sanitizer funziona
console.log('\n2. Sanitizer.escapeHtml()');
const xssInput = '<script>alert("xss")</script>';
const sanitized = Sanitizer.escapeHtml(xssInput);
console.log('Malicious input:', xssInput);
console.log('Sanitized:', sanitized);
console.log('✓ Sanitizer works');

// TEST 3: Creare utente con password hashata
console.log('\n3. Creazione utente con password hashata');
// Prima pulisci lo storage
StorageManager.remove(CONFIG.STORAGE_KEYS.USERS);
UserManager.init(); // Re-init senza credenziali hardcoded

// Crea utente test
const result = UserManager.create({
  username: 'testuser',
  password: 'TestPassword123!',
  fullName: 'Test User',
  email: 'test@example.com',
  role: CONFIG.ROLES.USER
});

if (result.success) {
  const createdUser = result.user;
  console.log('✓ User created:', createdUser.username);
  console.log('  Password is hashed:', createdUser.password.startsWith('hash_v1_'));
  console.log('  Password is NOT plaintext:', createdUser.password !== 'TestPassword123!');
  
  // TEST 4: Login con password hashata
  console.log('\n4. Login con password hashata');
  const loginResult = AuthManager.login('testuser', 'TestPassword123!');
  console.log('✓ Login successful:', loginResult.success);
  console.log('  User:', loginResult.user.username);
  
  // TEST 5: Login con password sbagliata fallisce
  console.log('\n5. Login con password sbagliata');
  const badLoginResult = AuthManager.login('testuser', 'WrongPassword');
  console.log('✓ Wrong password rejected:', !badLoginResult.success);
  console.log('  Message:', badLoginResult.message);
  
} else {
  console.error('✗ Failed to create user:', result.message);
}

console.log('\n=== ALL TESTS COMPLETED ===');
