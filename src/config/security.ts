
// Configuration options for input validation and security
export const SECURITY_CONFIG = {
  INPUT: {
    MAX_TEXT_LENGTH: 1000,
    MAX_NAME_LENGTH: 100,
    MAX_DESCRIPTION_LENGTH: 2000,
    MAX_URL_LENGTH: 2000,
    MAX_EMAIL_LENGTH: 254,
  },
  RATE_LIMITING: {
    MAX_REQUESTS_PER_MINUTE: 60,
    MAX_VALIDATION_ERRORS_PER_MINUTE: 10,
    LOCKOUT_DURATION_MS: 300000, // 5 minutes
  },
  MONITORING: {
    LOG_RETENTION_HOURS: 24,
    MAX_EVENTS_IN_MEMORY: 100,
    ALERT_THRESHOLD_CRITICAL: 5,
  },
  CSRF: {
    TOKEN_LENGTH: 64,
    TOKEN_EXPIRY_MS: 3600000, // 1 hour
  },
  SESSION: {
    MAX_DURATION_MS: 86400000, // 24 hours
    IDLE_TIMEOUT_MS: 3600000, // 1 hour
    ROTATION_INTERVAL_MS: 1800000, // 30 minutes
  }
};

// Enhanced security patterns
export const SECURITY_PATTERNS = {
  XSS: [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /<iframe\b[^>]*>/gi,
    /javascript:/gi,
    /vbscript:/gi,
    /onload\s*=/gi,
    /onerror\s*=/gi,
    /onclick\s*=/gi,
    /onmouseover\s*=/gi,
    /<img[^>]+src[^>]*=["'][^"']*javascript:/gi,
    /<object\b[^>]*>/gi,
    /<embed\b[^>]*>/gi,
    /<link[^>]+href[^>]*=["'][^"']*javascript:/gi,
  ],
  SQL_INJECTION: [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,
    /(--|\#|\/\*|\*\/)/gi,
    /(\b(OR|AND)\b\s+\w+\s*=\s*\w+)/gi,
    /('|('')|"|("")|(\%27)|(\%22))/gi,
    /(\%3D)/gi, // URL encoded =
    /(\%20(OR|AND))/gi,
    /(WAITFOR|DELAY)\s/gi,
    /(CAST\s*\()/gi,
    /(CONVERT\s*\()/gi,
  ],
  PATH_TRAVERSAL: [
    /(\.\.[\/\\])+/g,
    /(\.\.%2F)+/gi,
    /(\.\.%5C)+/gi,
    /(%2E%2E%2F)+/gi,
    /(%2E%2E%5C)+/gi,
    /(\.\.\\)+/g,
  ],
  COMMAND_INJECTION: [
    /(\||&|;|`|\$\(|\$\{)/g,
    /(nc|netcat|wget|curl|ping|nslookup|dig)\s/gi,
    /(rm|del|format|fdisk)\s/gi,
  ],
  SUSPICIOUS_PATTERNS: [
    /(password|passwd|pwd)\s*[:=]/gi,
    /(api_key|apikey|token|secret)\s*[:=]/gi,
    /(eval|exec|system|shell_exec)\s*\(/gi,
    /base64_decode\s*\(/gi,
  ]
};

// Rate limiting store
const rateLimitStore = new Map<string, { count: number; resetTime: number; isLocked: boolean }>();

export const checkRateLimit = (identifier: string, maxRequests = SECURITY_CONFIG.RATE_LIMITING.MAX_REQUESTS_PER_MINUTE): boolean => {
  const now = Date.now();
  const windowMs = 60000; // 1 minute
  
  const current = rateLimitStore.get(identifier) || { count: 0, resetTime: now + windowMs, isLocked: false };
  
  // Check if locked
  if (current.isLocked && now < current.resetTime) {
    return false;
  }
  
  // Reset if window expired
  if (now > current.resetTime) {
    current.count = 0;
    current.resetTime = now + windowMs;
    current.isLocked = false;
  }
  
  current.count++;
  
  // Lock if exceeded
  if (current.count > maxRequests) {
    current.isLocked = true;
    current.resetTime = now + SECURITY_CONFIG.RATE_LIMITING.LOCKOUT_DURATION_MS;
    logSecurityEvent('Rate limit exceeded', { identifier, count: current.count });
    return false;
  }
  
  rateLimitStore.set(identifier, current);
  return true;
};

// Enhanced security event logging with severity levels
export const logSecurityEvent = (message: string, data: Record<string, any> = {}) => {
  const event = {
    timestamp: new Date().toISOString(),
    message,
    ...data,
  };

  console.warn(`SECURITY EVENT: ${message}`, event);
};

// Add aliases for backward compatibility
export const validateInput = (input: string) => {
  // Basic validation - can be enhanced
  return input && typeof input === 'string' && input.trim().length > 0;
};

export const sanitizeInput = (input: string) => {
  // Basic sanitization - can be enhanced
  return input.replace(/[<>]/g, '').trim();
};
