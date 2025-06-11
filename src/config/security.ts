
export const SECURITY_CONFIG = {
  // Rate limiting configuration
  RATE_LIMITING: {
    MAX_REQUESTS_PER_MINUTE: 60,
    MAX_LOGIN_ATTEMPTS: 5,
    LOCKOUT_DURATION_MINUTES: 15,
  },
  
  // Session security configuration
  SESSION: {
    REFRESH_THRESHOLD: 5 * 60 * 1000, // 5 minutes before expiry
    MAX_DURATION_MS: 24 * 60 * 60 * 1000, // 24 hours
    ADMIN_CHECK_CACHE: 5 * 60 * 1000, // 5 minutes
  },
  
  // Security monitoring configuration
  MONITORING: {
    ENABLED: true,
    LOG_SECURITY_EVENTS: true,
    ALERT_THRESHOLD_HIGH: 10,
    ALERT_THRESHOLD_CRITICAL: 20,
    LOG_RETENTION_HOURS: 24,
  },
  
  // Input validation settings
  VALIDATION: {
    MAX_INPUT_LENGTH: 10000,
    ALLOWED_FILE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
    MAX_FILE_SIZE_MB: 10,
  },
  
  // Input length limits
  INPUT: {
    MAX_TEXT_LENGTH: 10000,
    MAX_NAME_LENGTH: 255,
    MAX_DESCRIPTION_LENGTH: 5000,
  },
  
  // Network security
  NETWORK: {
    TIMEOUT_MS: 30000,
    MAX_RETRIES: 3,
  }
};

// Security patterns for validation
export const SECURITY_PATTERNS = {
  XSS: [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
  ],
  SQL_INJECTION: [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE)\b)|(\-\-)|(\;)/gi,
    /(\s|^)(OR|AND)\s+[\w'"=\s]+(\s|$)/gi,
  ],
  PATH_TRAVERSAL: [
    /\.\.[\\/]/g,
    /[\\/]\.\.[\\/]/g,
  ],
};

// Rate limiting store
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Security event logging
export const logSecurityEvent = (event: string, details: Record<string, any> = {}) => {
  if (!SECURITY_CONFIG.MONITORING.LOG_SECURITY_EVENTS) return;
  
  const timestamp = new Date().toISOString();
  console.log(`[SECURITY] ${timestamp}: ${event}`, details);
  
  // Store in session storage for development monitoring
  if (typeof window !== 'undefined') {
    try {
      const events = JSON.parse(sessionStorage.getItem('security_events') || '[]');
      events.push({ timestamp, event, details });
      
      // Keep only last 100 events
      if (events.length > 100) {
        events.splice(0, events.length - 100);
      }
      
      sessionStorage.setItem('security_events', JSON.stringify(events));
    } catch (error) {
      console.warn('Could not store security event:', error);
    }
  }
};

// Rate limiting function
export const checkRateLimit = (identifier: string, maxRequests?: number): boolean => {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute window
  const limit = maxRequests || SECURITY_CONFIG.RATE_LIMITING.MAX_REQUESTS_PER_MINUTE;
  
  const entry = rateLimitStore.get(identifier);
  
  if (!entry || now > entry.resetTime) {
    // New window or expired entry
    rateLimitStore.set(identifier, {
      count: 1,
      resetTime: now + windowMs
    });
    return true;
  }
  
  if (entry.count >= limit) {
    logSecurityEvent('Rate limit exceeded', { 
      identifier, 
      attempts: entry.count,
      limit 
    });
    return false;
  }
  
  entry.count++;
  return true;
};

// Input sanitization
export const sanitizeInput = (input: string): string => {
  if (!input || typeof input !== 'string') return '';
  
  // Basic XSS prevention
  return input
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .substring(0, SECURITY_CONFIG.VALIDATION.MAX_INPUT_LENGTH)
    .trim();
};

// Basic input validation function
export const validateInput = (input: string, type: string = 'text'): boolean => {
  if (!input) return false;
  
  // Check for security patterns
  for (const pattern of SECURITY_PATTERNS.XSS) {
    if (pattern.test(input)) return false;
  }
  
  for (const pattern of SECURITY_PATTERNS.SQL_INJECTION) {
    if (pattern.test(input)) return false;
  }
  
  for (const pattern of SECURITY_PATTERNS.PATH_TRAVERSAL) {
    if (pattern.test(input)) return false;
  }
  
  return true;
};

// Validate file uploads
export const validateFileUpload = (file: File): { valid: boolean; error?: string } => {
  if (!SECURITY_CONFIG.VALIDATION.ALLOWED_FILE_TYPES.includes(file.type)) {
    return { valid: false, error: 'File type not allowed' };
  }
  
  if (file.size > SECURITY_CONFIG.VALIDATION.MAX_FILE_SIZE_MB * 1024 * 1024) {
    return { valid: false, error: 'File size too large' };
  }
  
  return { valid: true };
};

// Network request wrapper with security features
export const secureNetworkRequest = async (
  url: string, 
  options: RequestInit = {}
): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(), 
    SECURITY_CONFIG.NETWORK.TIMEOUT_MS
  );
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    logSecurityEvent('Network request failed', { url, error: error.message });
    throw error;
  }
};

export default SECURITY_CONFIG;
