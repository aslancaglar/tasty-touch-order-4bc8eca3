
// Centralized error handling utilities for security and consistency

export interface ErrorDetails {
  code?: string;
  message: string;
  context?: Record<string, any>;
  timestamp?: string;
  userId?: string;
}

export class SecurityError extends Error {
  code: string;
  context: Record<string, any>;
  
  constructor(message: string, code: string = 'SECURITY_ERROR', context: Record<string, any> = {}) {
    super(message);
    this.name = 'SecurityError';
    this.code = code;
    this.context = context;
  }
}

export class ValidationError extends Error {
  code: string;
  field?: string;
  
  constructor(message: string, field?: string) {
    super(message);
    this.name = 'ValidationError';
    this.code = 'VALIDATION_ERROR';
    this.field = field;
  }
}

// Security event logging with enhanced protection
export const logSecurityEvent = (event: string, details: Record<string, any> = {}) => {
  // Sanitize sensitive data from details
  const sanitizedDetails = Object.entries(details).reduce((acc, [key, value]) => {
    const sensitiveKeys = ['password', 'token', 'key', 'secret', 'auth', 'session'];
    const isSensitive = sensitiveKeys.some(pattern => 
      key.toLowerCase().includes(pattern)
    );
    
    if (isSensitive) {
      acc[key] = '[REDACTED]';
    } else if (typeof value === 'string' && value.length > 20) {
      // Potentially sensitive long strings
      acc[key] = `[TRUNCATED:${value.length}chars]`;
    } else {
      acc[key] = value;
    }
    return acc;
  }, {} as Record<string, any>);

  const logEntry = {
    event,
    timestamp: new Date().toISOString(),
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 100) : 'unknown',
    url: typeof window !== 'undefined' ? window.location.href : 'unknown',
    ...sanitizedDetails
  };
  
  // Only log in development or for critical security events
  if (process.env.NODE_ENV === 'development' || 
      ['rate_limit_exceeded', 'xss_attempt', 'injection_attempt'].includes(event)) {
    console.warn(`[Security Event] ${event}`, logEntry);
  }
  
  // In production, send only critical events to monitoring service
  if (process.env.NODE_ENV === 'production') {
    // Example: Send to monitoring service for critical events only
    // monitoringService.logSecurityEvent(logEntry);
  }
};

// Standardized error handling
export const handleError = (error: unknown, context: string = 'Unknown'): ErrorDetails => {
  const timestamp = new Date().toISOString();
  
  if (error instanceof SecurityError) {
    logSecurityEvent(`Security Error in ${context}`, {
      code: error.code,
      message: error.message,
      context: error.context
    });
    
    return {
      code: error.code,
      message: 'A security issue was detected. Please try again.',
      timestamp,
      context: { originalContext: context }
    };
  }
  
  if (error instanceof ValidationError) {
    return {
      code: error.code,
      message: error.message,
      timestamp,
      context: { field: error.field, originalContext: context }
    };
  }
  
  if (error instanceof Error) {
    console.error(`[Error] ${context}:`, error);
    
    return {
      code: 'GENERIC_ERROR',
      message: error.message || 'An unexpected error occurred',
      timestamp,
      context: { originalContext: context }
    };
  }
  
  // Unknown error type
  console.error(`[Unknown Error] ${context}:`, error);
  
  return {
    code: 'UNKNOWN_ERROR',
    message: 'An unexpected error occurred',
    timestamp,
    context: { originalContext: context, originalError: String(error) }
  };
};

// Input sanitization utilities
export const sanitizeInput = (input: string, maxLength: number = 1000): string => {
  if (typeof input !== 'string') {
    throw new ValidationError('Input must be a string');
  }
  
  return input
    .trim()
    .substring(0, maxLength)
    .replace(/[<>]/g, ''); // Basic XSS prevention
};

// Safe JSON parsing
export const safeJsonParse = <T>(jsonString: string, fallback: T): T => {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    logSecurityEvent('JSON Parse Error', { error: String(error) });
    return fallback;
  }
};

// Rate limiting helper (simple client-side implementation)
class RateLimiter {
  private attempts: Map<string, number[]> = new Map();
  
  isAllowed(key: string, maxAttempts: number = 5, windowMs: number = 60000): boolean {
    const now = Date.now();
    const attempts = this.attempts.get(key) || [];
    
    // Remove old attempts outside the time window
    const recentAttempts = attempts.filter(time => now - time < windowMs);
    
    if (recentAttempts.length >= maxAttempts) {
      logSecurityEvent('Rate limit exceeded', { key, attempts: recentAttempts.length });
      return false;
    }
    
    recentAttempts.push(now);
    this.attempts.set(key, recentAttempts);
    return true;
  }
}

export const rateLimiter = new RateLimiter();

// Secure error logging function for backward compatibility
export const logError = (message: string, error?: any) => {
  // Sanitize error details before logging
  const sanitizedError = error instanceof Error 
    ? { name: error.name, message: error.message, stack: error.stack?.slice(0, 500) }
    : String(error).slice(0, 200);
    
  if (process.env.NODE_ENV === 'development') {
    console.error(message, sanitizedError);
  }
  
  logSecurityEvent('Error logged', { 
    message: message.slice(0, 200), 
    error: sanitizedError 
  });
};
