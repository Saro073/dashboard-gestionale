// ==================== XSS SANITIZER ====================
/**
 * Simple XSS sanitization utility
 * Escapes HTML characters to prevent injection
 */

const Sanitizer = {
  /**
   * Escape HTML special characters
   * Prevents XSS by converting dangerous chars to entities
   * @param {string} str - String to escape
   * @returns {string} - Escaped string
   */
  escapeHtml(str) {
    if (typeof str !== 'string') return str;
    
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    
    return str.replace(/[&<>"']/g, char => map[char]);
  },

  /**
   * Sanitize user input for safe display
   * @param {string} input - User input
   * @returns {string} - Sanitized text
   */
  sanitize(input) {
    if (!input) return '';
    
    // Trim whitespace
    let text = String(input).trim();
    
    // Escape HTML
    text = this.escapeHtml(text);
    
    // Remove null bytes
    text = text.replace(/\0/g, '');
    
    // Limit length (prevent DoS)
    text = text.substring(0, 5000);
    
    return text;
  },

  /**
   * Sanitize object recursively
   * @param {object} obj - Object to sanitize
   * @returns {object} - Sanitized object
   */
  sanitizeObject(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    
    const sanitized = Array.isArray(obj) ? [] : {};
    
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = obj[key];
        
        if (typeof value === 'string') {
          sanitized[key] = this.sanitize(value);
        } else if (typeof value === 'object' && value !== null) {
          sanitized[key] = this.sanitizeObject(value);
        } else {
          sanitized[key] = value;
        }
      }
    }
    
    return sanitized;
  }
};

window.Sanitizer = Sanitizer;
