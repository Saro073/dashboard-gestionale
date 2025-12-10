// ==================== SIMPLE PASSWORD HASHING ====================
/**
 * Simple password hashing utility
 * For DEVELOPMENT ONLY - not cryptographically secure
 * In PRODUCTION: Use bcryptjs or server-side hashing
 */

const PasswordHash = {
  /**
   * Simple hash function (development only)
   * Uses base64 + rotation for basic obfuscation
   * @param {string} password
   * @returns {string} - Hashed password
   */
  hash(password) {
    if (!password) return '';
    
    // Convert to base64
    const encoded = btoa(password);
    
    // Simple rotation (ROT13-like)
    const rotated = encoded.split('').map((char, i) => {
      const code = char.charCodeAt(0);
      const shift = (i % 13) + 1;
      return String.fromCharCode(code + shift);
    }).join('');
    
    // Add prefix to identify hashed passwords
    return `hash_v1_${rotated}`;
  },

  /**
   * Verify password against hash
   * @param {string} password - Plain password to verify
   * @param {string} hash - Stored hash
   * @returns {boolean} - True if matches
   */
  verify(password, hash) {
    if (!password || !hash) return false;
    
    // Hash the provided password
    const computedHash = this.hash(password);
    
    // Constant-time comparison (prevent timing attacks)
    return this._timingSafeEqual(computedHash, hash);
  },

  /**
   * Constant-time string comparison
   * @private
   */
  _timingSafeEqual(a, b) {
    if (a.length !== b.length) return false;
    
    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
  },

  /**
   * Determine if string is already hashed
   * @param {string} str
   * @returns {boolean}
   */
  isHashed(str) {
    return typeof str === 'string' && str.startsWith('hash_v1_');
  }
};

window.PasswordHash = PasswordHash;
