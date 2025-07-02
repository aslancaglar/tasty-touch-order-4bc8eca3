/**
 * Secure logging utility that sanitizes sensitive information
 */

export interface SecureLogContext {
  component?: string;
  action?: string;
  userId?: string;
  sessionId?: string;
  timestamp?: string;
  severity?: 'info' | 'warn' | 'error' | 'debug';
}

// Patterns that should be redacted from logs
const SENSITIVE_PATTERNS = [
  /password/i,
  /token/i,
  /api[_-]?key/i,
  /secret/i,
  /auth/i,
  /session/i,
  /credential/i,
  /private[_-]?key/i
];

// Fields that should be completely redacted
const REDACTED_FIELDS = new Set([
  'password',
  'token',
  'apiKey',
  'api_key',
  'secret',
  'auth',
  'session',
  'credentials',
  'privateKey',
  'private_key'
]);

/**
 * Sanitizes an object by redacting sensitive information
 */
const sanitizeObject = (obj: any, depth = 0): any => {
  if (depth > 10) return '[MAX_DEPTH]'; // Prevent infinite recursion
  
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj === 'string') {
    // Check if string contains sensitive patterns
    const lower = obj.toLowerCase();
    if (SENSITIVE_PATTERNS.some(pattern => pattern.test(lower))) {
      return '[REDACTED]';
    }
    // Redact if it looks like a token or key (long alphanumeric strings)
    if (obj.length > 20 && /^[a-zA-Z0-9_-]+$/.test(obj)) {
      return '[REDACTED]';
    }
    return obj;
  }
  
  if (typeof obj === 'number' || typeof obj === 'boolean') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, depth + 1));
  }
  
  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      
      // Completely redact sensitive fields
      if (REDACTED_FIELDS.has(lowerKey) || 
          SENSITIVE_PATTERNS.some(pattern => pattern.test(lowerKey))) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = sanitizeObject(value, depth + 1);
      }
    }
    return sanitized;
  }
  
  return obj;
};

/**
 * Secure logger that redacts sensitive information
 */
export class SecureLogger {
  private static shouldLog(severity: string): boolean {
    // In production, only log warnings and errors
    if (process.env.NODE_ENV === 'production') {
      return severity === 'warn' || severity === 'error';
    }
    return true;
  }

  private static formatMessage(message: string, context?: SecureLogContext, data?: any): string {
    const timestamp = new Date().toISOString();
    const component = context?.component ? `[${context.component}]` : '';
    const action = context?.action ? `(${context.action})` : '';
    const userId = context?.userId ? `User:${context.userId.slice(0, 8)}...` : '';
    
    let logMessage = `${timestamp} ${component} ${action} ${message}`;
    
    if (userId) {
      logMessage += ` ${userId}`;
    }
    
    return logMessage;
  }

  static info(message: string, context?: SecureLogContext, data?: any): void {
    if (!this.shouldLog('info')) return;
    
    const formattedMessage = this.formatMessage(message, context, data);
    
    if (data) {
      const sanitizedData = sanitizeObject(data);
      console.info(formattedMessage, sanitizedData);
    } else {
      console.info(formattedMessage);
    }
  }

  static warn(message: string, context?: SecureLogContext, data?: any): void {
    if (!this.shouldLog('warn')) return;
    
    const formattedMessage = this.formatMessage(message, context, data);
    
    if (data) {
      const sanitizedData = sanitizeObject(data);
      console.warn(formattedMessage, sanitizedData);
    } else {
      console.warn(formattedMessage);
    }
  }

  static error(message: string, context?: SecureLogContext, data?: any): void {
    if (!this.shouldLog('error')) return;
    
    const formattedMessage = this.formatMessage(message, context, data);
    
    if (data) {
      const sanitizedData = sanitizeObject(data);
      console.error(formattedMessage, sanitizedData);
    } else {
      console.error(formattedMessage);
    }
  }

  static debug(message: string, context?: SecureLogContext, data?: any): void {
    if (!this.shouldLog('debug')) return;
    
    const formattedMessage = this.formatMessage(message, context, data);
    
    if (data) {
      const sanitizedData = sanitizeObject(data);
      console.debug(formattedMessage, sanitizedData);
    } else {
      console.debug(formattedMessage);
    }
  }

  /**
   * Security-specific logging for audit trails
   */
  static security(event: string, context?: SecureLogContext, data?: any): void {
    const securityContext = {
      ...context,
      component: 'SECURITY',
      severity: 'warn' as const
    };
    
    this.warn(`[SECURITY] ${event}`, securityContext, data);
  }
}

export default SecureLogger;