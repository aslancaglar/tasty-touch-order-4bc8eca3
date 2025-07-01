/**
 * Security utility functions for input validation and sanitization
 */
import DOMPurify from 'dompurify';

// Input validation patterns
export const VALIDATION_PATTERNS = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  slug: /^[a-z0-9-]+$/,
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  phoneNumber: /^\+?[\d\s-()]+$/,
  alphanumeric: /^[a-zA-Z0-9\s]+$/,
  price: /^\d+(\.\d{1,2})?$/,
  tableNumber: /^[a-zA-Z0-9-]+$/,
};

// Input length limits
export const LENGTH_LIMITS = {
  name: { min: 1, max: 100 },
  description: { min: 0, max: 500 },
  email: { min: 5, max: 254 },
  password: { min: 8, max: 128 },
  slug: { min: 3, max: 50 },
  location: { min: 0, max: 200 },
  tableNumber: { min: 1, max: 10 },
  specialInstructions: { min: 0, max: 200 },
};

// Price and quantity limits
export const BUSINESS_LIMITS = {
  price: { min: 0, max: 1000 },
  quantity: { min: 1, max: 50 },
  orderTotal: { min: 0.01, max: 10000 },
  taxPercentage: { min: 0, max: 50 },
};

/**
 * Sanitize HTML content to prevent XSS
 */
export const sanitizeHtml = (dirty: string): string => {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
    ALLOWED_ATTR: [],
  });
};

/**
 * Validate and sanitize text input
 */
export const sanitizeTextInput = (
  input: string, 
  limits: { min: number; max: number },
  pattern?: RegExp
): { isValid: boolean; sanitized: string; error?: string } => {
  if (typeof input !== 'string') {
    return { isValid: false, sanitized: '', error: 'Input must be a string' };
  }

  const trimmed = input.trim();
  
  // Length validation
  if (trimmed.length < limits.min) {
    return { 
      isValid: false, 
      sanitized: trimmed, 
      error: `Input too short (minimum ${limits.min} characters)` 
    };
  }
  
  if (trimmed.length > limits.max) {
    return { 
      isValid: false, 
      sanitized: trimmed, 
      error: `Input too long (maximum ${limits.max} characters)` 
    };
  }

  // Pattern validation
  if (pattern && !pattern.test(trimmed)) {
    return { 
      isValid: false, 
      sanitized: trimmed, 
      error: 'Input format is invalid' 
    };
  }

  // Sanitize HTML
  const sanitized = sanitizeHtml(trimmed);
  
  return { isValid: true, sanitized };
};

/**
 * Validate email address
 */
export const validateEmail = (email: string): { isValid: boolean; error?: string } => {
  const result = sanitizeTextInput(email, LENGTH_LIMITS.email, VALIDATION_PATTERNS.email);
  return { isValid: result.isValid, error: result.error };
};

/**
 * Validate price input
 */
export const validatePrice = (price: number): { isValid: boolean; error?: string } => {
  if (typeof price !== 'number' || isNaN(price)) {
    return { isValid: false, error: 'Price must be a valid number' };
  }

  if (price < BUSINESS_LIMITS.price.min || price > BUSINESS_LIMITS.price.max) {
    return { 
      isValid: false, 
      error: `Price must be between ${BUSINESS_LIMITS.price.min} and ${BUSINESS_LIMITS.price.max}` 
    };
  }

  return { isValid: true };
};

/**
 * Validate quantity input
 */
export const validateQuantity = (quantity: number): { isValid: boolean; error?: string } => {
  if (!Number.isInteger(quantity) || quantity < BUSINESS_LIMITS.quantity.min || quantity > BUSINESS_LIMITS.quantity.max) {
    return { 
      isValid: false, 
      error: `Quantity must be between ${BUSINESS_LIMITS.quantity.min} and ${BUSINESS_LIMITS.quantity.max}` 
    };
  }

  return { isValid: true };
};

/**
 * Validate UUID format
 */
export const validateUuid = (uuid: string): { isValid: boolean; error?: string } => {
  if (!VALIDATION_PATTERNS.uuid.test(uuid)) {
    return { isValid: false, error: 'Invalid UUID format' };
  }
  return { isValid: true };
};

/**
 * Rate limiting check for client-side
 */
export const checkClientRateLimit = (
  key: string,
  maxAttempts: number = 5,
  windowMs: number = 60000
): boolean => {
  const now = Date.now();
  const storageKey = `rate_limit_${key}`;
  
  try {
    const stored = localStorage.getItem(storageKey);
    const data = stored ? JSON.parse(stored) : { count: 0, windowStart: now };
    
    // Reset if window expired
    if (now - data.windowStart > windowMs) {
      data.count = 1;
      data.windowStart = now;
    } else {
      data.count++;
    }
    
    localStorage.setItem(storageKey, JSON.stringify(data));
    
    return data.count <= maxAttempts;
  } catch (error) {
    console.warn('Rate limit check failed:', error);
    return true; // Allow on error to prevent blocking legitimate users
  }
};

/**
 * Escape special characters for SQL-like operations (client-side search)
 */
export const escapeSearchQuery = (query: string): string => {
  return query
    .replace(/[%_\\]/g, '\\$&')
    .replace(/'/g, "''")
    .trim();
};

/**
 * Generate secure random string for CSRF tokens
 */
export const generateSecureToken = (): string => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

/**
 * Content Security Policy violations logger
 */
export const logCSPViolation = (violation: SecurityPolicyViolationEvent): void => {
  console.warn('CSP Violation:', {
    blockedURI: violation.blockedURI,
    violatedDirective: violation.violatedDirective,
    originalPolicy: violation.originalPolicy,
    sourceFile: violation.sourceFile,
    lineNumber: violation.lineNumber,
  });
  
  // In production, you might want to send this to your security monitoring service
};

/**
 * Initialize security event listeners
 */
export const initializeSecurityListeners = (): void => {
  // CSP violation reporting
  document.addEventListener('securitypolicyviolation', logCSPViolation);
  
  // Log potential XSS attempts
  const originalConsoleError = console.error;
  console.error = (...args) => {
    const message = args.join(' ').toLowerCase();
    if (message.includes('script') || message.includes('eval') || message.includes('onclick')) {
      console.warn('Potential security issue detected:', args);
    }
    originalConsoleError.apply(console, args);
  };
};