
import { SECURITY_CONFIG, SECURITY_PATTERNS, ValidationError, SecurityError, logSecurityEvent } from '@/config/security';
import DOMPurify from 'dompurify';

// Enhanced input validation with security patterns
export const validateAndSanitizeInput = (
  input: string,
  type: 'text' | 'name' | 'description' | 'email' | 'url' = 'text',
  required: boolean = false
): string => {
  // Check if input is required
  if (required && (!input || input.trim().length === 0)) {
    throw new ValidationError('This field is required');
  }

  // Return empty string if input is empty and not required
  if (!input || input.trim().length === 0) {
    return '';
  }

  // Type checking
  if (typeof input !== 'string') {
    logSecurityEvent('Invalid input type detected', { inputType: typeof input, expectedType: 'string' });
    throw new ValidationError('Input must be a string');
  }

  // Length validation
  const maxLength = {
    text: SECURITY_CONFIG.INPUT.MAX_TEXT_LENGTH,
    name: SECURITY_CONFIG.INPUT.MAX_NAME_LENGTH,
    description: SECURITY_CONFIG.INPUT.MAX_DESCRIPTION_LENGTH,
    email: SECURITY_CONFIG.INPUT.MAX_NAME_LENGTH,
    url: SECURITY_CONFIG.INPUT.MAX_TEXT_LENGTH,
  }[type];

  if (input.length > maxLength) {
    throw new ValidationError(`Input exceeds maximum length of ${maxLength} characters`);
  }

  // Security pattern detection
  for (const pattern of SECURITY_PATTERNS.XSS) {
    if (pattern.test(input)) {
      logSecurityEvent('XSS pattern detected', { input: input.substring(0, 100), pattern: pattern.source });
      throw new SecurityError('Potentially malicious content detected', 'XSS_DETECTED');
    }
  }

  for (const pattern of SECURITY_PATTERNS.SQL_INJECTION) {
    if (pattern.test(input)) {
      logSecurityEvent('SQL injection pattern detected', { input: input.substring(0, 100), pattern: pattern.source });
      throw new SecurityError('Potentially malicious content detected', 'SQL_INJECTION_DETECTED');
    }
  }

  for (const pattern of SECURITY_PATTERNS.PATH_TRAVERSAL) {
    if (pattern.test(input)) {
      logSecurityEvent('Path traversal pattern detected', { input: input.substring(0, 100), pattern: pattern.source });
      throw new SecurityError('Potentially malicious content detected', 'PATH_TRAVERSAL_DETECTED');
    }
  }

  // Specific validation based on type
  switch (type) {
    case 'email':
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(input)) {
        throw new ValidationError('Invalid email format');
      }
      break;
    case 'url':
      try {
        new URL(input);
      } catch {
        throw new ValidationError('Invalid URL format');
      }
      break;
  }

  // Sanitize input using DOMPurify
  const sanitized = DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  });

  // Additional manual sanitization
  return sanitized
    .replace(/[<>'"]/g, '') // Remove potentially dangerous characters
    .trim();
};

// Validate numeric inputs
export const validateNumericInput = (
  input: string | number,
  min?: number,
  max?: number,
  allowDecimals: boolean = true
): number => {
  const numValue = typeof input === 'string' ? parseFloat(input) : input;
  
  if (isNaN(numValue)) {
    throw new ValidationError('Input must be a valid number');
  }

  if (!allowDecimals && numValue % 1 !== 0) {
    throw new ValidationError('Input must be a whole number');
  }

  if (min !== undefined && numValue < min) {
    throw new ValidationError(`Value must be at least ${min}`);
  }

  if (max !== undefined && numValue > max) {
    throw new ValidationError(`Value must not exceed ${max}`);
  }

  return numValue;
};

// CSRF token utilities
export const generateCSRFToken = (): string => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

export const validateCSRFToken = (token: string, sessionToken: string): boolean => {
  return token === sessionToken && token.length === 64;
};

// Form validation wrapper
export const validateFormData = (
  data: Record<string, any>,
  schema: Record<string, {
    type: 'text' | 'name' | 'description' | 'email' | 'url' | 'number';
    required?: boolean;
    min?: number;
    max?: number;
    allowDecimals?: boolean;
  }>
): Record<string, any> => {
  const validatedData: Record<string, any> = {};

  for (const [key, value] of Object.entries(data)) {
    const fieldSchema = schema[key];
    if (!fieldSchema) continue;

    try {
      if (fieldSchema.type === 'number') {
        validatedData[key] = validateNumericInput(
          value,
          fieldSchema.min,
          fieldSchema.max,
          fieldSchema.allowDecimals
        );
      } else {
        validatedData[key] = validateAndSanitizeInput(
          value,
          fieldSchema.type,
          fieldSchema.required
        );
      }
    } catch (error) {
      throw new ValidationError(`${key}: ${error.message}`);
    }
  }

  return validatedData;
};
