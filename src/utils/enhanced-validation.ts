
import { SECURITY_CONFIG, SECURITY_PATTERNS, validateInput as basicValidateInput, sanitizeInput as basicSanitizeInput } from '@/config/security';
import { logSecurityEventAudit } from './audit-logger';

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  customValidator?: (value: string) => boolean | string;
  sanitize?: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  sanitizedValue?: string;
  errors: string[];
}

export class EnhancedValidator {
  private static instance: EnhancedValidator;

  public static getInstance(): EnhancedValidator {
    if (!EnhancedValidator.instance) {
      EnhancedValidator.instance = new EnhancedValidator();
    }
    return EnhancedValidator.instance;
  }

  // Comprehensive input validation
  public validateField(
    value: string,
    fieldName: string,
    rules: ValidationRule = {}
  ): ValidationResult {
    const errors: string[] = [];
    let sanitizedValue = value;

    // Basic sanitization first
    if (rules.sanitize !== false) {
      sanitizedValue = this.sanitizeInput(value);
    }

    // Required check
    if (rules.required && (!sanitizedValue || sanitizedValue.trim().length === 0)) {
      errors.push(`${fieldName} is required`);
      return { isValid: false, errors };
    }

    // Skip other validations if field is empty and not required
    if (!sanitizedValue && !rules.required) {
      return { isValid: true, sanitizedValue, errors: [] };
    }

    // Length validations
    if (rules.minLength && sanitizedValue.length < rules.minLength) {
      errors.push(`${fieldName} must be at least ${rules.minLength} characters`);
    }

    if (rules.maxLength && sanitizedValue.length > rules.maxLength) {
      errors.push(`${fieldName} must not exceed ${rules.maxLength} characters`);
    }

    // Pattern validation
    if (rules.pattern && !rules.pattern.test(sanitizedValue)) {
      errors.push(`${fieldName} format is invalid`);
    }

    // Custom validation
    if (rules.customValidator) {
      const customResult = rules.customValidator(sanitizedValue);
      if (typeof customResult === 'string') {
        errors.push(customResult);
      } else if (!customResult) {
        errors.push(`${fieldName} is invalid`);
      }
    }

    // Security pattern checks
    const securityIssues = this.checkSecurityPatterns(sanitizedValue);
    if (securityIssues.length > 0) {
      errors.push(...securityIssues);
      
      // Log security violations
      logSecurityEventAudit('Input validation security violation', undefined, {
        fieldName,
        violations: securityIssues,
        originalValue: value.substring(0, 100), // Log first 100 chars only
      });
    }

    return {
      isValid: errors.length === 0,
      sanitizedValue,
      errors,
    };
  }

  // Enhanced sanitization
  public sanitizeInput(input: string): string {
    if (typeof input !== 'string') {
      return '';
    }

    return input
      .trim()
      // Remove null bytes
      .replace(/\0/g, '')
      // Remove control characters (except tab, newline, carriage return)
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      // Remove potential XSS vectors
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/vbscript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      // Normalize whitespace
      .replace(/\s+/g, ' ');
  }

  // Check for security patterns
  private checkSecurityPatterns(input: string): string[] {
    const violations: string[] = [];

    // XSS patterns
    for (const pattern of SECURITY_PATTERNS.XSS) {
      if (pattern.test(input)) {
        violations.push('Potential XSS content detected');
        break;
      }
    }

    // SQL injection patterns
    for (const pattern of SECURITY_PATTERNS.SQL_INJECTION) {
      if (pattern.test(input)) {
        violations.push('Potential SQL injection detected');
        break;
      }
    }

    // Path traversal patterns
    for (const pattern of SECURITY_PATTERNS.PATH_TRAVERSAL) {
      if (pattern.test(input)) {
        violations.push('Potential path traversal detected');
        break;
      }
    }

    return violations;
  }

  // Predefined validation rules for common fields
  public getEmailRules(): ValidationRule {
    return {
      required: true,
      maxLength: 254,
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      customValidator: (value) => {
        // Additional email validation
        const parts = value.split('@');
        if (parts.length !== 2) return false;
        
        const [local, domain] = parts;
        if (local.length > 64 || domain.length > 253) return false;
        
        return true;
      },
    };
  }

  public getPasswordRules(): ValidationRule {
    return {
      required: true,
      minLength: 8,
      maxLength: 128,
      customValidator: (value) => {
        const hasUppercase = /[A-Z]/.test(value);
        const hasLowercase = /[a-z]/.test(value);
        const hasNumber = /\d/.test(value);
        const hasSymbol = /[!@#$%^&*(),.?":{}|<>]/.test(value);

        const criteriaMet = [hasUppercase, hasLowercase, hasNumber, hasSymbol].filter(Boolean).length;

        if (criteriaMet < 3) {
          return 'Password must contain at least 3 of: uppercase, lowercase, number, symbol';
        }

        return true;
      },
    };
  }

  public getNameRules(): ValidationRule {
    return {
      required: true,
      minLength: 1,
      maxLength: SECURITY_CONFIG.INPUT.MAX_NAME_LENGTH,
      pattern: /^[a-zA-Z0-9\s\-_'.]+$/,
    };
  }

  public getDescriptionRules(): ValidationRule {
    return {
      required: false,
      maxLength: SECURITY_CONFIG.INPUT.MAX_DESCRIPTION_LENGTH,
    };
  }

  // Validate multiple fields at once
  public validateForm(
    data: Record<string, string>,
    rules: Record<string, ValidationRule>
  ): { isValid: boolean; sanitizedData: Record<string, string>; errors: Record<string, string[]> } {
    const errors: Record<string, string[]> = {};
    const sanitizedData: Record<string, string> = {};
    let isValid = true;

    for (const [fieldName, value] of Object.entries(data)) {
      const fieldRules = rules[fieldName] || {};
      const result = this.validateField(value, fieldName, fieldRules);

      if (!result.isValid) {
        errors[fieldName] = result.errors;
        isValid = false;
      }

      sanitizedData[fieldName] = result.sanitizedValue || value;
    }

    return { isValid, sanitizedData, errors };
  }
}

export const enhancedValidator = EnhancedValidator.getInstance();

// Convenience functions
export const validateEmail = (email: string) => 
  enhancedValidator.validateField(email, 'email', enhancedValidator.getEmailRules());

export const validatePassword = (password: string) => 
  enhancedValidator.validateField(password, 'password', enhancedValidator.getPasswordRules());

export const validateName = (name: string) => 
  enhancedValidator.validateField(name, 'name', enhancedValidator.getNameRules());

export const sanitizeInput = (input: string) => 
  enhancedValidator.sanitizeInput(input);
