
// Security configuration and constants

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
  },
  
  // Rate limiting
  RATE_LIMIT: {
    MAX_REQUESTS_PER_MINUTE: 100,
    WINDOW_SIZE: 60 * 1000, // 1 minute
    MAX_LOGIN_ATTEMPTS: 5,
    LOGIN_LOCKOUT_DURATION: 15 * 60 * 1000, // 15 minutes
  },
  
  // Input validation
  INPUT: {
    MAX_TEXT_LENGTH: 1000,
    MAX_DESCRIPTION_LENGTH: 5000,
    MAX_NAME_LENGTH: 255,
  },
  
  // CSRF protection
  CSRF: {
    TOKEN_LENGTH: 32,
    HEADER_NAME: 'X-CSRF-Token',
    COOKIE_NAME: 'csrf-token',
  },
  
  // Content Security Policy directives
  CSP: {
    DEFAULT_SRC: ["'self'"],
    SCRIPT_SRC: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
    STYLE_SRC: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
    IMG_SRC: ["'self'", "data:", "https:", "blob:"],
    FONT_SRC: ["'self'", "https://fonts.gstatic.com"],
    CONNECT_SRC: ["'self'", "https://*.supabase.co"],
    OBJECT_SRC: ["'none'"],
    BASE_URI: ["'self'"],
    FORM_ACTION: ["'self'"],
  }
} as const;

// Security headers that should be implemented server-side
export const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
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
    /onmouseout=/i,
    /onfocus=/i,
    /onblur=/i,
    /onchange=/i,
    /onsubmit=/i,
    /onkeydown=/i,
    /onkeyup=/i,
    /onkeypress=/i,
    /eval\(/i,
    /expression\(/i,
    /document\.cookie/i,
    /window\.location/i,
    /document\.write/i,
    /innerHTML/i,
    /<iframe/i,
    /<object/i,
    /<embed/i,
    /<link/i,
    /<meta/i,
    /<style/i,
  ],
  SQL_INJECTION: [
    /union\s+select/i,
    /drop\s+table/i,
    /insert\s+into/i,
    /delete\s+from/i,
    /update\s+set/i,
    /alter\s+table/i,
    /create\s+table/i,
    /exec\s*\(/i,
    /execute\s*\(/i,
    /sp_executesql/i,
    /xp_cmdshell/i,
    /sp_oa/i,
    /--/,
    /\/\*/,
    /\*\//,
    /;\s*drop/i,
    /;\s*delete/i,
    /;\s*update/i,
    /;\s*insert/i,
  ],
  PATH_TRAVERSAL: [
    /\.\.\//,
    /\.\.\\/,
    /%2e%2e%2f/i,
    /%2e%2e%5c/i,
    /\.\.%2f/i,
    /\.\.%5c/i,
    /%252e%252e%252f/i,
    /%252e%252e%255c/i,
    /\.\.\x2f/i,
    /\.\.\x5c/i,
  ],
  COMMAND_INJECTION: [
    /;\s*rm\s+/i,
    /;\s*cat\s+/i,
    /;\s*ls\s+/i,
    /;\s*wget\s+/i,
    /;\s*curl\s+/i,
    /\|\s*rm\s+/i,
    /\|\s*cat\s+/i,
    /\|\s*ls\s+/i,
    /&&\s*rm\s+/i,
    /&&\s*cat\s+/i,
    /`.*`/,
    /\$\(.*\)/,
  ],
} as const;

// Security event logging function - re-export from error-handler
export { logSecurityEvent } from '@/utils/error-handler';

// Enhanced security validation functions
export const validateInput = (input: string, type: 'text' | 'name' | 'description' | 'email' | 'url' = 'text'): boolean => {
  if (typeof input !== 'string') return false;
  
  const maxLength = {
    text: SECURITY_CONFIG.INPUT.MAX_TEXT_LENGTH,
    name: SECURITY_CONFIG.INPUT.MAX_NAME_LENGTH,
    description: SECURITY_CONFIG.INPUT.MAX_DESCRIPTION_LENGTH,
    email: SECURITY_CONFIG.INPUT.MAX_NAME_LENGTH,
    url: SECURITY_CONFIG.INPUT.MAX_TEXT_LENGTH,
  }[type];
  
  if (input.length > maxLength) return false;
  
  // Check for suspicious patterns
  for (const patternGroup of Object.values(SECURITY_PATTERNS)) {
    for (const pattern of patternGroup) {
      if (pattern.test(input)) return false;
    }
  }
  
  return true;
};

export const sanitizeInput = (input: string): string => {
  return input
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/[<>'"&]/g, '') // Remove potentially dangerous characters
    .replace(/javascript:/gi, '') // Remove javascript: protocols
    .replace(/vbscript:/gi, '') // Remove vbscript: protocols
    .replace(/data:/gi, '') // Remove data: protocols
    .trim();
};

// Enhanced XSS prevention for dynamic content
export const sanitizeForHTML = (input: string): string => {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

// URL validation and sanitization
export const sanitizeURL = (url: string): string => {
  try {
    const parsedURL = new URL(url);
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(parsedURL.protocol)) {
      throw new Error('Invalid protocol');
    }
    return parsedURL.toString();
  } catch {
    return '';
  }
};
