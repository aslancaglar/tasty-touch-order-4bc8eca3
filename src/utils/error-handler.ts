
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

// Security event logging
export const logSecurityEvent = (event: string, details: Record<string, any> = {}) => {
  const logEntry = {
    event,
    timestamp: new Date().toISOString(),
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
    url: typeof window !== 'undefined' ? window.location.href : 'unknown',
    ...details
  };
  
  // Use a direct console call to prevent infinite loops with security monitoring
  if (typeof console !== 'undefined' && console.warn) {
    console.warn(`[Security Event] ${event}`, logEntry);
  }
  
  // In production, you might want to send this to a monitoring service
  if (process.env.NODE_ENV === 'production') {
    // Example: Send to monitoring service
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
