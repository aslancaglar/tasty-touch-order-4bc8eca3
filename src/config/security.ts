
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
  
  // Content Security Policy directives
  CSP: {
    DEFAULT_SRC: ["'self'"],
    SCRIPT_SRC: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
    STYLE_SRC: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
    IMG_SRC: ["'self'", "data:", "https:", "blob:"],
    FONT_SRC: ["'self'", "https://fonts.gstatic.com"],
    CONNECT_SRC: ["'self'", "https://*.supabase.co"],
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
  ],
  SQL_INJECTION: [
    /union\s+select/i,
    /drop\s+table/i,
    /insert\s+into/i,
    /delete\s+from/i,
    /update\s+set/i,
  ],
  PATH_TRAVERSAL: [
    /\.\.\//,
    /\.\.\\/,
    /%2e%2e%2f/i,
    /%2e%2e%5c/i,
  ],
} as const;

// Security event logging function - re-export from error-handler
export { logSecurityEvent } from '@/utils/error-handler';

// Security validation functions
export const validateInput = (input: string, type: 'text' | 'name' | 'description' = 'text'): boolean => {
  if (typeof input !== 'string') return false;
  
  const maxLength = {
    text: SECURITY_CONFIG.INPUT.MAX_TEXT_LENGTH,
    name: SECURITY_CONFIG.INPUT.MAX_NAME_LENGTH,
    description: SECURITY_CONFIG.INPUT.MAX_DESCRIPTION_LENGTH,
  }[type];
  
  if (input.length > maxLength) return false;
  
  // Check for suspicious patterns
  for (const pattern of SECURITY_PATTERNS.XSS) {
    if (pattern.test(input)) return false;
  }
  
  return true;
};

export const sanitizeInput = (input: string): string => {
  return input
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/[<>'"]/g, '') // Remove potentially dangerous characters
    .trim();
};
