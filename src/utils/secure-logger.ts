// Secure logging utility that filters sensitive information

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export const LOG_LEVELS = {
  DEBUG: 'debug' as LogLevel,
  INFO: 'info' as LogLevel,
  WARN: 'warn' as LogLevel,
  ERROR: 'error' as LogLevel
};

// Sensitive keys that should be filtered from logs
const SENSITIVE_KEYS = [
  'password',
  'token',
  'access_token',
  'refresh_token',
  'secret',
  'key',
  'authorization',
  'auth',
  'apikey',
  'api_key',
  'private',
  'jwt',
  'session',
  'cookie',
  'userId',
  'user_id',
  'email',
  'phone',
  'address'
];

/**
 * Sanitizes an object by removing or masking sensitive information
 */
const sanitizeData = (data: any, depth = 0): any => {
  // Prevent infinite recursion
  if (depth > 5) return '[Object too deep]';
  
  if (data === null || data === undefined) return data;
  
  if (typeof data === 'string') {
    // Mask potential sensitive strings
    if (data.length > 20 && /^[A-Za-z0-9+/=]+$/.test(data)) {
      return '[REDACTED_TOKEN]';
    }
    return data;
  }
  
  if (typeof data === 'number' || typeof data === 'boolean') {
    return data;
  }
  
  if (Array.isArray(data)) {
    return data.map(item => sanitizeData(item, depth + 1));
  }
  
  if (typeof data === 'object') {
    const sanitized: any = {};
    
    for (const key in data) {
      if (data.hasOwnProperty(key)) {
        const lowerKey = key.toLowerCase();
        const isSensitive = SENSITIVE_KEYS.some(sensitiveKey => 
          lowerKey.includes(sensitiveKey)
        );
        
        if (isSensitive) {
          sanitized[key] = '[REDACTED]';
        } else {
          sanitized[key] = sanitizeData(data[key], depth + 1);
        }
      }
    }
    
    return sanitized;
  }
  
  return data;
};

/**
 * Secure logging function that filters sensitive information
 */
export const secureLog = (
  level: LogLevel,
  message: string,
  data?: any,
  context?: string
) => {
  // In production, only log warnings and errors
  if (process.env.NODE_ENV === 'production' && 
      level !== LOG_LEVELS.WARN && level !== LOG_LEVELS.ERROR) {
    return;
  }
  
  const sanitizedData = data ? sanitizeData(data) : undefined;
  const logContext = context ? `[${context}]` : '';
  
  const logMessage = `${logContext} ${message}`;
  
  switch (level) {
    case LOG_LEVELS.DEBUG:
      if (sanitizedData) {
        console.debug(logMessage, sanitizedData);
      } else {
        console.debug(logMessage);
      }
      break;
    case LOG_LEVELS.INFO:
      if (sanitizedData) {
        console.info(logMessage, sanitizedData);
      } else {
        console.info(logMessage);
      }
      break;
    case LOG_LEVELS.WARN:
      if (sanitizedData) {
        console.warn(logMessage, sanitizedData);
      } else {
        console.warn(logMessage);
      }
      break;
    case LOG_LEVELS.ERROR:
      if (sanitizedData) {
        console.error(logMessage, sanitizedData);
      } else {
        console.error(logMessage);
      }
      break;
  }
};

// Convenience methods
export const secureDebug = (message: string, data?: any, context?: string) =>
  secureLog(LOG_LEVELS.DEBUG, message, data, context);

export const secureInfo = (message: string, data?: any, context?: string) =>
  secureLog(LOG_LEVELS.INFO, message, data, context);

export const secureWarn = (message: string, data?: any, context?: string) =>
  secureLog(LOG_LEVELS.WARN, message, data, context);

export const secureError = (message: string, data?: any, context?: string) =>
  secureLog(LOG_LEVELS.ERROR, message, data, context);