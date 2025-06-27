
// Security configuration and constants

// Import DOMPurify for HTML sanitization
import DOMPurify from 'dompurify';

export const SECURITY_CONFIG = {
  // File upload security
  UPLOAD: {
    MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
    ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'],
    ALLOWED_EXTENSIONS: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
    MAX_FILENAME_LENGTH: 100,
  },
  
  // Session security
  SESSION: {
    REFRESH_THRESHOLD: 5 * 60 * 1000, // 5 minutes before expiry
    MAX_DURATION: 24 * 60 * 60 * 1000, // 24 hours
    ADMIN_CHECK_CACHE: 5 * 60 * 1000, // 5 minutes
    JWT_EXPIRY_BUFFER: 2 * 60 * 1000, // 2 minutes buffer for JWT expiry
  },
  
  // Rate limiting
  RATE_LIMIT: {
    MAX_REQUESTS_PER_MINUTE: 100,
    WINDOW_SIZE: 60 * 1000, // 1 minute
    MAX_LOGIN_ATTEMPTS: 5,
    LOGIN_LOCKOUT_DURATION: 15 * 60 * 1000, // 15 minutes
    ADMIN_OPERATIONS_LIMIT: 30, // Admin operations per minute
    FORM_SUBMISSIONS_LIMIT: 10, // Form submissions per minute
  },
  
  // Input validation with enhanced rules
  INPUT: {
    MAX_TEXT_LENGTH: 1000,
    MAX_DESCRIPTION_LENGTH: 5000,
    MAX_NAME_LENGTH: 255,
    MIN_PASSWORD_LENGTH: 8,
    MAX_EMAIL_LENGTH: 254,
    PRICE_MIN: 0,
    PRICE_MAX: 99999.99,
    TAX_PERCENTAGE_MIN: 0,
    TAX_PERCENTAGE_MAX: 100,
    DISPLAY_ORDER_MIN: 0,
    DISPLAY_ORDER_MAX: 9999,
  },
  
  // Business rules validation
  BUSINESS_RULES: {
    MIN_CATEGORY_NAME_LENGTH: 2,
    MAX_MENU_ITEMS_PER_CATEGORY: 100,
    MAX_TOPPINGS_PER_CATEGORY: 50,
    TIME_FORMAT_REGEX: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
    CURRENCY_FORMAT_REGEX: /^\d+(\.\d{1,2})?$/,
    SLUG_REGEX: /^[a-z0-9-]+$/,
  },
  
  // Content Security Policy directives
  CSP: {
    DEFAULT_SRC: ["'self'"],
    SCRIPT_SRC: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
    STYLE_SRC: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
    IMG_SRC: ["'self'", "data:", "https:", "blob:"],
    FONT_SRC: ["'self'", "https://fonts.gstatic.com"],
    CONNECT_SRC: ["'self'", "https://*.supabase.co"],
  },

  // IP blocking configuration
  IP_BLOCKING: {
    MAX_VIOLATIONS_PER_IP: 10,
    BLOCK_DURATION: 24 * 60 * 60 * 1000, // 24 hours
    VIOLATION_WINDOW: 60 * 60 * 1000, // 1 hour
  }
} as const;

// Security headers that should be implemented server-side
export const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
} as const;

// Suspicious patterns for security monitoring
export const SECURITY_PATTERNS = {
  XSS: [
    /<script/i,
    /javascript:/i,
    /vbscript:/i,
    /onload=/i,
    /onerror=/i,
    /onclick=/i,
    /onmouseover=/i,
    /<iframe/i,
    /<object/i,
    /<embed/i,
  ],
  SQL_INJECTION: [
    /union\s+select/i,
    /drop\s+table/i,
    /insert\s+into/i,
    /delete\s+from/i,
    /update\s+set/i,
    /exec\s*\(/i,
    /sp_executesql/i,
  ],
  PATH_TRAVERSAL: [
    /\.\.\//,
    /\.\.\\/,
    /%2e%2e%2f/i,
    /%2e%2e%5c/i,
    /\.\.%2f/i,
  ],
  COMMAND_INJECTION: [
    /;\s*(rm|del|format|shutdown)/i,
    /\|\s*(nc|netcat|curl|wget)/i,
    /`[^`]*`/,
    /\$\([^)]*\)/,
  ],
} as const;

// Security event logging function - re-export from error-handler
export { logSecurityEvent } from '@/utils/error-handler';

// Enhanced security validation functions
export const validateInput = (input: string, type: 'text' | 'name' | 'description' = 'text'): boolean => {
  if (typeof input !== 'string') return false;
  
  const maxLength = {
    text: SECURITY_CONFIG.INPUT.MAX_TEXT_LENGTH,
    name: SECURITY_CONFIG.INPUT.MAX_NAME_LENGTH,
    description: SECURITY_CONFIG.INPUT.MAX_DESCRIPTION_LENGTH,
  }[type];
  
  if (input.length > maxLength) return false;
  
  // Check for suspicious patterns
  for (const patternCategory of Object.values(SECURITY_PATTERNS)) {
    for (const pattern of patternCategory) {
      if (pattern.test(input)) return false;
    }
  }
  
  return true;
};

export const sanitizeInput = (input: string): string => {
  // Use DOMPurify for comprehensive HTML sanitization
  const sanitized = DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [], // No HTML tags allowed
    ALLOWED_ATTR: [], // No attributes allowed
    KEEP_CONTENT: true, // Keep text content
  });
  
  return sanitized
    .replace(/[<>'"&]/g, '') // Additional character filtering
    .trim();
};

// Business rule validation functions
export const validatePrice = (price: string | number): boolean => {
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  return !isNaN(numPrice) && 
         numPrice >= SECURITY_CONFIG.INPUT.PRICE_MIN && 
         numPrice <= SECURITY_CONFIG.INPUT.PRICE_MAX &&
         SECURITY_CONFIG.BUSINESS_RULES.CURRENCY_FORMAT_REGEX.test(price.toString());
};

export const validateTaxPercentage = (tax: string | number): boolean => {
  const numTax = typeof tax === 'string' ? parseFloat(tax) : tax;
  return !isNaN(numTax) && 
         numTax >= SECURITY_CONFIG.INPUT.TAX_PERCENTAGE_MIN && 
         numTax <= SECURITY_CONFIG.INPUT.TAX_PERCENTAGE_MAX;
};

export const validateDisplayOrder = (order: string | number): boolean => {
  const numOrder = typeof order === 'string' ? parseInt(order) : order;
  return !isNaN(numOrder) && 
         numOrder >= SECURITY_CONFIG.INPUT.DISPLAY_ORDER_MIN && 
         numOrder <= SECURITY_CONFIG.INPUT.DISPLAY_ORDER_MAX;
};

export const validateTimeRange = (fromTime: string, untilTime: string): boolean => {
  const timeRegex = SECURITY_CONFIG.BUSINESS_RULES.TIME_FORMAT_REGEX;
  return timeRegex.test(fromTime) && timeRegex.test(untilTime);
};

export const validateSlug = (slug: string): boolean => {
  return SECURITY_CONFIG.BUSINESS_RULES.SLUG_REGEX.test(slug) && 
         slug.length >= 3 && 
         slug.length <= 50;
};

// Server-side validation function
export const validateFormData = (data: Record<string, any>, rules: Record<string, string[]>): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  for (const [field, fieldRules] of Object.entries(rules)) {
    const value = data[field];

    for (const rule of fieldRules) {
      switch (rule) {
        case 'required':
          if (!value || (typeof value === 'string' && value.trim() === '')) {
            errors.push(`${field} is required`);
          }
          break;
        case 'price':
          if (value && !validatePrice(value)) {
            errors.push(`${field} must be a valid price`);
          }
          break;
        case 'tax':
          if (value && !validateTaxPercentage(value)) {
            errors.push(`${field} must be a valid tax percentage`);
          }
          break;
        case 'display_order':
          if (value && !validateDisplayOrder(value)) {
            errors.push(`${field} must be a valid display order`);
          }
          break;
        case 'text':
          if (value && !validateInput(value, 'text')) {
            errors.push(`${field} contains invalid characters`);
          }
          break;
        case 'name':
          if (value && !validateInput(value, 'name')) {
            errors.push(`${field} contains invalid characters`);
          }
          break;
        case 'description':
          if (value && !validateInput(value, 'description')) {
            errors.push(`${field} contains invalid characters`);
          }
          break;
      }
    }
  }

  return { isValid: errors.length === 0, errors };
};
