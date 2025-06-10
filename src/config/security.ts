
// Security configuration and constants

export const SECURITY_CONFIG = {
  // File upload security
  UPLOAD: {
    MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
    ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'],
    ALLOWED_EXTENSIONS: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
    MAX_FILENAME_LENGTH: 100,
    SCAN_FOR_MALWARE: true, // Enable malware scanning
  },
  
  // Enhanced session security
  SESSION: {
    REFRESH_THRESHOLD: 5 * 60 * 1000, // 5 minutes before expiry
    MAX_DURATION: 24 * 60 * 60 * 1000, // 24 hours
    ADMIN_CHECK_CACHE: 5 * 60 * 1000, // 5 minutes
    INACTIVITY_TIMEOUT: 30 * 60 * 1000, // 30 minutes
    FORCE_REFRESH_INTERVAL: 60 * 60 * 1000, // 1 hour
  },
  
  // Enhanced rate limiting
  RATE_LIMIT: {
    MAX_REQUESTS_PER_MINUTE: 100,
    WINDOW_SIZE: 60 * 1000, // 1 minute
    MAX_LOGIN_ATTEMPTS: 5,
    LOGIN_LOCKOUT_DURATION: 15 * 60 * 1000, // 15 minutes
    MAX_FAILED_ATTEMPTS_PER_IP: 10,
    IP_LOCKOUT_DURATION: 60 * 60 * 1000, // 1 hour
  },
  
  // Enhanced input validation
  INPUT: {
    MAX_TEXT_LENGTH: 1000,
    MAX_DESCRIPTION_LENGTH: 5000,
    MAX_NAME_LENGTH: 255,
    MIN_PASSWORD_LENGTH: 8,
    MAX_PASSWORD_LENGTH: 128,
    REQUIRE_PASSWORD_COMPLEXITY: true,
  },
  
  // Enhanced Content Security Policy directives
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
    FRAME_ANCESTORS: ["'none'"],
  },
  
  // Audit logging configuration
  AUDIT: {
    LOG_LEVEL: process.env.NODE_ENV === 'production' ? 'medium' : 'low',
    MAX_LOG_SIZE: 1000,
    LOG_RETENTION_DAYS: 30,
    SENSITIVE_FIELDS: ['password', 'token', 'secret', 'key'],
  },
} as const;

// Enhanced security headers
export const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'X-Download-Options': 'noopen',
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
    /eval\(/i,
    /expression\(/i,
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
    /xp_cmdshell/i,
    /--/,
    /\/\*/,
  ],
  PATH_TRAVERSAL: [
    /\.\.\//,
    /\.\.\\/,
    /%2e%2e%2f/i,
    /%2e%2e%5c/i,
    /\.\.%2f/i,
    /\.\.%5c/i,
  ],
  LDAP_INJECTION: [
    /\*\)/,
    /\|\|/,
    /&\(/,
    /\|\(/,
  ],
  COMMAND_INJECTION: [
    /;\s*cat\s/i,
    /;\s*ls\s/i,
    /;\s*wget\s/i,
    /;\s*curl\s/i,
    /`.*`/,
    /\$\(.*\)/,
  ],
} as const;

// Enhanced security validation functions
export const validateInput = (input: string, type: 'text' | 'name' | 'description' | 'email' | 'password' = 'text'): boolean => {
  if (typeof input !== 'string') return false;
  
  const maxLength = {
    text: SECURITY_CONFIG.INPUT.MAX_TEXT_LENGTH,
    name: SECURITY_CONFIG.INPUT.MAX_NAME_LENGTH,
    description: SECURITY_CONFIG.INPUT.MAX_DESCRIPTION_LENGTH,
    email: 254, // RFC 5321 limit
    password: SECURITY_CONFIG.INPUT.MAX_PASSWORD_LENGTH,
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
    .replace(/[<>'"]/g, '') // Remove potentially dangerous characters
    .replace(/\0/g, '') // Remove null bytes
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control characters
    .trim();
};

// Enhanced password validation
export const validatePassword = (password: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (password.length < SECURITY_CONFIG.INPUT.MIN_PASSWORD_LENGTH) {
    errors.push(`Password must be at least ${SECURITY_CONFIG.INPUT.MIN_PASSWORD_LENGTH} characters`);
  }
  
  if (password.length > SECURITY_CONFIG.INPUT.MAX_PASSWORD_LENGTH) {
    errors.push(`Password must not exceed ${SECURITY_CONFIG.INPUT.MAX_PASSWORD_LENGTH} characters`);
  }
  
  if (SECURITY_CONFIG.INPUT.REQUIRE_PASSWORD_COMPLEXITY) {
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSymbol = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    const criteriaMet = [hasUppercase, hasLowercase, hasNumber, hasSymbol].filter(Boolean).length;
    
    if (criteriaMet < 3) {
      errors.push('Password must contain at least 3 of: uppercase letter, lowercase letter, number, symbol');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};

// Enhanced email validation
export const validateEmail = (email: string): boolean => {
  if (!email || email.length > 254) return false;
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return false;
  
  const [local, domain] = email.split('@');
  if (local.length > 64 || domain.length > 253) return false;
  
  return validateInput(email, 'email');
};
