/**
 * XSS Sanitizer
 * Utility for sanitizing user input to prevent XSS attacks
 * 
 * NOTE: This is a basic implementation. For production, consider:
 * npm install dompurify
 * 
 * FASE 2: Replace with DOMPurify
 * import DOMPurify from 'dompurify';
 */

/**
 * Escape HTML special characters
 * Use this when you MUST use innerHTML
 */
export function escapeHtml(text) {
  if (typeof text !== 'string') return text;
  
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Sanitize HTML string (basic)
 * Removes script tags and dangerous attributes
 */
export function sanitizeHtml(html) {
  if (typeof html !== 'string') return html;
  
  // Remove script tags and their contents
  let sanitized = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  
  // Remove event handlers (onload, onclick, etc.)
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
  
  // Remove javascript: and data: URLs
  sanitized = sanitized.replace(/(javascript|data):/gi, '');
  
  // Remove dangerous tags
  const dangerousTags = ['iframe', 'object', 'embed', 'form', 'input', 'textarea'];
  dangerousTags.forEach(tag => {
    const regex = new RegExp(`<${tag}[^>]*>[\\s\\S]*?<\\/${tag}>`, 'gi');
    sanitized = sanitized.replace(regex, '');
    const voidRegex = new RegExp(`<${tag}[^>]*\\/?>`, 'gi');
    sanitized = sanitized.replace(voidRegex, '');
  });
  
  return sanitized;
}

/**
 * Sanitize URL
 * Only allows http:, https:, mailto:, tel:
 */
export function sanitizeUrl(url) {
  if (typeof url !== 'string') return '#';
  
  const allowedProtocols = ['http:', 'https:', 'mailto:', 'tel:', '#'];
  const trimmed = url.trim().toLowerCase();
  
  // Check if URL starts with allowed protocol
  const isAllowed = allowedProtocols.some(protocol => 
    trimmed.startsWith(protocol)
  );
  
  // Check for javascript: or data: injection
  const isDangerous = /^(javascript|data|vbscript):/i.test(trimmed);
  
  if (isDangerous || (!isAllowed && trimmed.includes(':'))) {
    console.warn('[XSS] Blocked dangerous URL:', url);
    return '#';
  }
  
  return url;
}

/**
 * Set text content safely (recommended over innerHTML)
 */
export function setSafeText(element, text) {
  if (!element) return;
  element.textContent = text;
}

/**
 * Set HTML content safely (sanitized)
 * Prefer setSafeText() when possible
 */
export function setSafeHtml(element, html) {
  if (!element) return;
  element.innerHTML = sanitizeHtml(html);
}

/**
 * Validate and sanitize input for dangerous patterns
 */
export function validateInput(input, options = {}) {
  const { 
    maxLength = 1000, 
    allowHtml = false,
    required = false 
  } = options;
  
  if (!input) {
    return required ? null : '';
  }
  
  let sanitized = input;
  
  // Trim
  sanitized = sanitized.trim();
  
  // Max length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }
  
  // Remove HTML if not allowed
  if (!allowHtml) {
    sanitized = sanitized.replace(/<[^>]*>/g, '');
  } else {
    sanitized = sanitizeHtml(sanitized);
  }
  
  return sanitized;
}

/**
 * Middleware pattern for sanitizing form data
 */
export function createSanitizer(config = {}) {
  return function sanitizeForm(formData) {
    const sanitized = {};
    
    for (const [key, value] of Object.entries(formData)) {
      sanitized[key] = validateInput(value, config[key] || {});
    }
    
    return sanitized;
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// AUDIT: Log all innerHTML usage in development
// ═══════════════════════════════════════════════════════════════════════════

if (process.env.NODE_ENV === 'development') {
  // Override innerHTML setter to warn about usage
  const originalDescriptor = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
  
  Object.defineProperty(Element.prototype, 'innerHTML', {
    set: function(value) {
      // Only log if not already sanitized
      if (typeof value === 'string' && !value.includes('data-sanitized')) {
        console.warn('[XSS AUDIT] innerHTML used without sanitization:', {
          element: this.tagName,
          class: this.className,
          preview: value.substring(0, 100),
        });
      }
      originalDescriptor.set.call(this, value);
    },
    get: originalDescriptor.get,
  });
}
