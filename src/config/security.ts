
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
  
  // Session security with enhanced timeouts
  SESSION: {
    REFRESH_THRESHOLD: 5 * 60 * 1000, // 5 minutes before expiry
    MAX_DURATION: 8 * 60 * 60 * 1000, // 8 hours (reduced from 24)
    ADMIN_CHECK_INTERVAL: 60 * 1000, // 1 minute (no caching)
    JWT_EXPIRY_BUFFER: 2 * 60 * 1000, // 2 minutes buffer for JWT expiry
    IDLE_TIMEOUT: 30 * 60 * 1000, // 30 minutes idle timeout
  },
  
  // Enhanced rate limiting with server-side enforcement
  RATE_LIMIT: {
    MAX_REQUESTS_PER_MINUTE: 60, // Reduced from 100
    WINDOW_SIZE: 60 * 1000, // 1 minute
    MAX_LOGIN_ATTEMPTS: 3, // Reduced from 5
    LOGIN_LOCKOUT_DURATION: 30 * 60 * 1000, // 30 minutes (increased)
    ADMIN_OPERATIONS_LIMIT: 20, // Reduced from 30
    FORM_SUBMISSIONS_LIMIT: 5, // Reduced from 10
    API_CALLS_LIMIT: 100, // New: API calls per minute
  },
  
  // Enhanced input validation with stricter rules
  INPUT: {
    MAX_TEXT_LENGTH: 500, // Reduced from 1000
    MAX_DESCRIPTION_LENGTH: 2000, // Reduced from 5000
    MAX_NAME_LENGTH: 100, // Reduced from 255
    MIN_PASSWORD_LENGTH: 12, // Increased from 8
    MAX_EMAIL_LENGTH: 254,
    PRICE_MIN: 0,
    PRICE_MAX: 9999.99, // Reduced from 99999.99
    TAX_PERCENTAGE_MIN: 0,
    TAX_PERCENTAGE_MAX: 50, // Reduced from 100
    DISPLAY_ORDER_MIN: 0,
    DISPLAY_ORDER_MAX: 999, // Reduced from 9999
    // New validation rules
    MIN_SEARCH_LENGTH: 2,
    MAX_SEARCH_LENGTH: 50,
    PHONE_REGEX: /^\+?[\d\s\-\(\)]{10,15}$/,
    URL_REGEX: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
  },
  
  // Enhanced business rules validation
  BUSINESS_RULES: {
    MIN_CATEGORY_NAME_LENGTH: 3, // Increased from 2
    MAX_MENU_ITEMS_PER_CATEGORY: 50, // Reduced from 100
    MAX_TOPPINGS_PER_CATEGORY: 25, // Reduced from 50
    TIME_FORMAT_REGEX: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
    CURRENCY_FORMAT_REGEX: /^\d{1,4}(\.\d{1,2})?$/, // Enhanced with limits
    SLUG_REGEX: /^[a-z0-9-]{3,50}$/, // Enhanced with length limits
    // New business rules
    MIN_ORDER_VALUE: 0.01,
    MAX_ORDER_VALUE: 999.99,
    MAX_ORDER_ITEMS: 20,
    MIN_TABLE_NUMBER: 1,
    MAX_TABLE_NUMBER: 999,
  },
  
  // Content Security Policy directives
  CSP: {
    DEFAULT_SRC: ["'self'"],
    SCRIPT_SRC: ["'self'"],
    STYLE_SRC: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
    IMG_SRC: ["'self'", "data:", "https:", "blob:"],
    FONT_SRC: ["'self'", "https://fonts.gstatic.com"],
    CONNECT_SRC: ["'self'", "https://*.supabase.co"],
    OBJECT_SRC: ["'none'"],
    BASE_URI: ["'self'"],
    FORM_ACTION: ["'self'"],
  },

  // Enhanced IP blocking configuration
  IP_BLOCKING: {
    MAX_VIOLATIONS_PER_IP: 5, // Reduced from 10
    BLOCK_DURATION: 24 * 60 * 60 * 1000, // 24 hours
    VIOLATION_WINDOW: 60 * 60 * 1000, // 1 hour
    // New IP blocking rules
    MAX_REQUESTS_PER_IP_PER_MINUTE: 100,
    SUSPICIOUS_ACTIVITY_THRESHOLD: 3,
    PERMANENT_BAN_THRESHOLD: 10,
  },

  // New: Data protection settings
  DATA_PROTECTION: {
    AUDIT_LOG_RETENTION_DAYS: 90,
    ERROR_LOG_RETENTION_DAYS: 30,
    SESSION_LOG_RETENTION_DAYS: 7,
    BACKUP_RETENTION_DAYS: 30,
    ENCRYPT_SENSITIVE_FIELDS: true,
    MASK_PII_IN_LOGS: true,
  },
} as const;

// Security headers that should be implemented server-side
export const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Permitted-Cross-Domain-Policies': 'none',
} as const;

// Enhanced suspicious patterns for security monitoring
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
    /eval\(/i,
    /expression\(/i,
    /document\.cookie/i,
    /document\.write/i,
  ],
  SQL_INJECTION: [
    /union\s+select/i,
    /drop\s+table/i,
    /insert\s+into/i,
    /delete\s+from/i,
    /update\s+set/i,
    /exec\s*\(/i,
    /sp_executesql/i,
    /xp_cmdshell/i,
    /;\s*--/,
    /'\s*or\s*'1'\s*=\s*'1/i,
  ],
  PATH_TRAVERSAL: [
    /\.\.\//,
    /\.\.\\/,
    /%2e%2e%2f/i,
    /%2e%2e%5c/i,
    /\.\.%2f/i,
    /\.\.%5c/i,
  ],
  COMMAND_INJECTION: [
    /;\s*(rm|del|format|shutdown)/i,
    /\|\s*(nc|netcat|curl|wget)/i,
    /`[^`]*`/,
    /\$\([^)]*\)/,
    /&&\s*(rm|del)/i,
  ],
  // New patterns
  LDAP_INJECTION: [
    /\*\)\(|\(\*/,
    /\)\(|\(\(/,
  ],
  XML_INJECTION: [
    /<\?xml/i,
    /<!ENTITY/i,
    /<!DOCTYPE/i,
  ],
} as const;

// Security event logging function - re-export from error-handler
export { logSecurityEvent } from '@/utils/error-handler';

// Enhanced security validation functions with stricter rules
export const validateInput = (input: string, type: 'text' | 'name' | 'description' | 'search' | 'phone' | 'url' = 'text'): { valid: boolean; message: string } => {
  if (typeof input !== 'string') return { valid: false, message: 'Invalid input type' };
  
  // Check length limits
  const limits = {
    text: SECURITY_CONFIG.INPUT.MAX_TEXT_LENGTH,
    name: SECURITY_CONFIG.INPUT.MAX_NAME_LENGTH,
    description: SECURITY_CONFIG.INPUT.MAX_DESCRIPTION_LENGTH,
    search: SECURITY_CONFIG.INPUT.MAX_SEARCH_LENGTH,
    phone: 15,
    url: 500,
  };
  
  const minLimits = {
    text: 1,
    name: 2,
    description: 1,
    search: SECURITY_CONFIG.INPUT.MIN_SEARCH_LENGTH,
    phone: 10,
    url: 5,
  };
  
  if (input.length > limits[type]) {
    return { valid: false, message: `Input too long (max ${limits[type]} characters)` };
  }
  
  if (input.length < minLimits[type]) {
    return { valid: false, message: `Input too short (min ${minLimits[type]} characters)` };
  }
  
  // Type-specific validation
  if (type === 'phone' && !SECURITY_CONFIG.INPUT.PHONE_REGEX.test(input)) {
    return { valid: false, message: 'Invalid phone number format' };
  }
  
  if (type === 'url' && !SECURITY_CONFIG.INPUT.URL_REGEX.test(input)) {
    return { valid: false, message: 'Invalid URL format' };
  }
  
  // Check for suspicious patterns
  for (const [patternType, patterns] of Object.entries(SECURITY_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(input)) {
        return { valid: false, message: `Potentially malicious content detected (${patternType})` };
      }
    }
  }
  
  return { valid: true, message: '' };
};

export const sanitizeInput = (input: string): string => {
  // Use DOMPurify for comprehensive HTML sanitization
  const sanitized = DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [], // No HTML tags allowed
    ALLOWED_ATTR: [], // No attributes allowed
    KEEP_CONTENT: true, // Keep text content
    ALLOW_DATA_ATTR: false,
    ALLOW_UNKNOWN_PROTOCOLS: false,
  });
  
  return sanitized
    .replace(/[<>'"&]/g, '') // Additional character filtering
    .replace(/\x00/g, '') // Remove null bytes
    .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control characters
    .trim();
};

// Enhanced business rule validation functions
export const validatePrice = (price: string | number): { valid: boolean; message: string } => {
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  
  if (isNaN(numPrice)) {
    return { valid: false, message: 'Price must be a valid number' };
  }
  
  if (numPrice < SECURITY_CONFIG.INPUT.PRICE_MIN) {
    return { valid: false, message: `Price must be at least ${SECURITY_CONFIG.INPUT.PRICE_MIN}` };
  }
  
  if (numPrice > SECURITY_CONFIG.INPUT.PRICE_MAX) {
    return { valid: false, message: `Price cannot exceed ${SECURITY_CONFIG.INPUT.PRICE_MAX}` };
  }
  
  if (!SECURITY_CONFIG.BUSINESS_RULES.CURRENCY_FORMAT_REGEX.test(price.toString())) {
    return { valid: false, message: 'Invalid price format' };
  }
  
  return { valid: true, message: '' };
};

export const validateTaxPercentage = (tax: string | number): { valid: boolean; message: string } => {
  const numTax = typeof tax === 'string' ? parseFloat(tax) : tax;
  
  if (isNaN(numTax)) {
    return { valid: false, message: 'Tax percentage must be a valid number' };
  }
  
  if (numTax < SECURITY_CONFIG.INPUT.TAX_PERCENTAGE_MIN || numTax > SECURITY_CONFIG.INPUT.TAX_PERCENTAGE_MAX) {
    return { valid: false, message: `Tax percentage must be between ${SECURITY_CONFIG.INPUT.TAX_PERCENTAGE_MIN}% and ${SECURITY_CONFIG.INPUT.TAX_PERCENTAGE_MAX}%` };
  }
  
  return { valid: true, message: '' };
};

export const validateDisplayOrder = (order: string | number): { valid: boolean; message: string } => {
  const numOrder = typeof order === 'string' ? parseInt(order) : order;
  
  if (isNaN(numOrder)) {
    return { valid: false, message: 'Display order must be a valid number' };
  }
  
  if (numOrder < SECURITY_CONFIG.INPUT.DISPLAY_ORDER_MIN || numOrder > SECURITY_CONFIG.INPUT.DISPLAY_ORDER_MAX) {
    return { valid: false, message: `Display order must be between ${SECURITY_CONFIG.INPUT.DISPLAY_ORDER_MIN} and ${SECURITY_CONFIG.INPUT.DISPLAY_ORDER_MAX}` };
  }
  
  return { valid: true, message: '' };
};

export const validateTimeRange = (fromTime: string, untilTime: string): { valid: boolean; message: string } => {
  const timeRegex = SECURITY_CONFIG.BUSINESS_RULES.TIME_FORMAT_REGEX;
  
  if (!timeRegex.test(fromTime)) {
    return { valid: false, message: 'Invalid start time format' };
  }
  
  if (!timeRegex.test(untilTime)) {
    return { valid: false, message: 'Invalid end time format' };
  }
  
  return { valid: true, message: '' };
};

export const validateSlug = (slug: string): { valid: boolean; message: string } => {
  if (!SECURITY_CONFIG.BUSINESS_RULES.SLUG_REGEX.test(slug)) {
    return { valid: false, message: 'Slug must be 3-50 characters, lowercase letters, numbers, and hyphens only' };
  }
  
  return { valid: true, message: '' };
};

// Enhanced server-side validation function with detailed error reporting
export const validateFormData = (data: Record<string, any>, rules: Record<string, string[]>): { isValid: boolean; errors: string[]; warnings: string[] } => {
  const errors: string[] = [];
  const warnings: string[] = [];

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
          if (value) {
            const validation = validatePrice(value);
            if (!validation.valid) {
              errors.push(`${field}: ${validation.message}`);
            }
          }
          break;
        case 'tax':
          if (value) {
            const validation = validateTaxPercentage(value);
            if (!validation.valid) {
              errors.push(`${field}: ${validation.message}`);
            }
          }
          break;
        case 'display_order':
          if (value) {
            const validation = validateDisplayOrder(value);
            if (!validation.valid) {
              errors.push(`${field}: ${validation.message}`);
            }
          }
          break;
        case 'text':
          if (value) {
            const validation = validateInput(value, 'text');
            if (!validation.valid) {
              errors.push(`${field}: ${validation.message}`);
            }
          }
          break;
        case 'name':
          if (value) {
            const validation = validateInput(value, 'name');
            if (!validation.valid) {
              errors.push(`${field}: ${validation.message}`);
            }
          }
          break;
        case 'description':
          if (value) {
            const validation = validateInput(value, 'description');
            if (!validation.valid) {
              errors.push(`${field}: ${validation.message}`);
            }
          }
          break;
        case 'phone':
          if (value) {
            const validation = validateInput(value, 'phone');
            if (!validation.valid) {
              errors.push(`${field}: ${validation.message}`);
            }
          }
          break;
        case 'url':
          if (value) {
            const validation = validateInput(value, 'url');
            if (!validation.valid) {
              errors.push(`${field}: ${validation.message}`);
            }
          }
          break;
        case 'slug':
          if (value) {
            const validation = validateSlug(value);
            if (!validation.valid) {
              errors.push(`${field}: ${validation.message}`);
            }
          }
          break;
      }
    }
  }

  return { isValid: errors.length === 0, errors, warnings };
};

// New: Data protection utilities
export const maskSensitiveData = (data: any): any => {
  if (!SECURITY_CONFIG.DATA_PROTECTION.MASK_PII_IN_LOGS) {
    return data;
  }

  const sensitiveFields = ['email', 'phone', 'password', 'token', 'key', 'secret'];
  const masked = { ...data };

  for (const key of Object.keys(masked)) {
    if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
      const value = masked[key];
      if (typeof value === 'string' && value.length > 0) {
        masked[key] = value.substring(0, 2) + '*'.repeat(value.length - 2);
      }
    }
  }

  return masked;
};

export const shouldRetainData = (timestamp: Date, retentionDays: number): boolean => {
  const retentionMs = retentionDays * 24 * 60 * 60 * 1000;
  return Date.now() - timestamp.getTime() < retentionMs;
};
