
import { SECURITY_CONFIG, SECURITY_PATTERNS } from '@/config/security';
import { ValidationError, logSecurityEvent } from '@/utils/error-handler';

export interface ValidationResult {
  valid: boolean;
  error?: string;
  sanitized?: string;
}

export const validateAndSanitizeInput = (
  input: string,
  type: 'text' | 'name' | 'description' | 'email' = 'text'
): ValidationResult => {
  if (typeof input !== 'string') {
    return { valid: false, error: 'Input must be a string' };
  }

  const maxLength = {
    text: SECURITY_CONFIG.INPUT.MAX_TEXT_LENGTH,
    name: SECURITY_CONFIG.INPUT.MAX_NAME_LENGTH,
    description: SECURITY_CONFIG.INPUT.MAX_DESCRIPTION_LENGTH,
    email: 254 // RFC 5321 limit
  }[type];

  // Length validation
  if (input.length > maxLength) {
    return { 
      valid: false, 
      error: `Input exceeds maximum length of ${maxLength} characters` 
    };
  }

  // Check for suspicious patterns
  for (const pattern of SECURITY_PATTERNS.XSS) {
    if (pattern.test(input)) {
      logSecurityEvent('XSS pattern detected', { input: input.substring(0, 100) });
      return { valid: false, error: 'Invalid characters detected' };
    }
  }

  for (const pattern of SECURITY_PATTERNS.SQL_INJECTION) {
    if (pattern.test(input)) {
      logSecurityEvent('SQL injection pattern detected', { input: input.substring(0, 100) });
      return { valid: false, error: 'Invalid characters detected' };
    }
  }

  for (const pattern of SECURITY_PATTERNS.PATH_TRAVERSAL) {
    if (pattern.test(input)) {
      logSecurityEvent('Path traversal pattern detected', { input: input.substring(0, 100) });
      return { valid: false, error: 'Invalid characters detected' };
    }
  }

  // Sanitize input
  const sanitized = input
    .trim()
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/[<>'"]/g, ''); // Remove potentially dangerous characters

  return { valid: true, sanitized };
};

export const validateEmail = (email: string): ValidationResult => {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  
  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Invalid email format' };
  }

  return validateAndSanitizeInput(email, 'email');
};

export const validatePassword = (password: string): ValidationResult => {
  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters long' };
  }

  if (!/\d/.test(password)) {
    return { valid: false, error: 'Password must contain at least one number' };
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one special character' };
  }

  return { valid: true };
};
