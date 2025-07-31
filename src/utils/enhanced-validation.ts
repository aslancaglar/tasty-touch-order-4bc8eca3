import { SECURITY_PATTERNS, SECURITY_CONFIG } from '@/config/security';
import { logSecurityEvent } from '@/utils/error-handler';
import DOMPurify from 'dompurify';

export interface ValidationResult {
  isValid: boolean;
  sanitized: string;
  threats: string[];
  metadata?: any;
}

export interface FileValidationResult {
  isValid: boolean;
  threats: string[];
  metadata: {
    fileType: string;
    fileSize: number;
    fileName: string;
  };
}

export class EnhancedValidator {
  
  /**
   * Enhanced input validation with multiple security checks
   */
  static validateInput(
    input: string,
    type: 'text' | 'name' | 'description' | 'email' | 'url' = 'text',
    context?: string
  ): ValidationResult {
    const threats: string[] = [];
    let sanitized = input;

    // Basic sanitization first
    sanitized = DOMPurify.sanitize(sanitized, { 
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: [],
      RETURN_DOM: false,
      RETURN_DOM_FRAGMENT: false
    });

    // Check for XSS patterns
    for (const pattern of SECURITY_PATTERNS.XSS) {
      if (pattern.test(input)) {
        threats.push('XSS attempt detected');
        logSecurityEvent('XSS attempt in user input', {
          input: input.substring(0, 100),
          context,
          pattern: pattern.toString(),
          type
        });
        break;
      }
    }

    // Check for SQL injection patterns
    for (const pattern of SECURITY_PATTERNS.SQL_INJECTION) {
      if (pattern.test(input)) {
        threats.push('SQL injection attempt detected');
        logSecurityEvent('SQL injection attempt in user input', {
          input: input.substring(0, 100),
          context,
          pattern: pattern.toString(),
          type
        });
        break;
      }
    }

    // Check for path traversal patterns
    for (const pattern of SECURITY_PATTERNS.PATH_TRAVERSAL) {
      if (pattern.test(input)) {
        threats.push('Path traversal attempt detected');
        logSecurityEvent('Path traversal attempt in user input', {
          input: input.substring(0, 100),
          context,
          pattern: pattern.toString(),
          type
        });
        break;
      }
    }

    // Type-specific validation
    const typeValidation = this.validateByType(sanitized, type);
    if (!typeValidation.isValid) {
      threats.push(...typeValidation.threats);
    }

    // Length validation
    const maxLength = this.getMaxLength(type);
    if (sanitized.length > maxLength) {
      threats.push(`Input exceeds maximum length of ${maxLength} characters`);
      sanitized = sanitized.substring(0, maxLength);
    }

    // Advanced pattern detection
    const advancedThreats = this.detectAdvancedThreats(input);
    threats.push(...advancedThreats);

    return {
      isValid: threats.length === 0,
      sanitized,
      threats,
      metadata: {
        originalLength: input.length,
        sanitizedLength: sanitized.length,
        type,
        context
      }
    };
  }

  /**
   * Enhanced file upload validation
   */
  static validateFile(file: File, context?: string): FileValidationResult {
    const threats: string[] = [];
    const metadata = {
      fileType: file.type,
      fileSize: file.size,
      fileName: file.name
    };

    // Check file size
    if (file.size > SECURITY_CONFIG.UPLOAD.MAX_FILE_SIZE) {
      threats.push(`File size exceeds maximum of ${SECURITY_CONFIG.UPLOAD.MAX_FILE_SIZE / (1024 * 1024)}MB`);
    }

    // Check file type
    if (!SECURITY_CONFIG.UPLOAD.ALLOWED_IMAGE_TYPES.includes(file.type as any)) {
      threats.push('File type not allowed');
      logSecurityEvent('Invalid file type upload attempt', {
        fileType: file.type,
        fileName: file.name,
        context,
        allowedTypes: SECURITY_CONFIG.UPLOAD.ALLOWED_IMAGE_TYPES
      });
    }

    // Check file extension
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!extension || !SECURITY_CONFIG.UPLOAD.ALLOWED_EXTENSIONS.includes(extension as any)) {
      threats.push('File extension not allowed');
      logSecurityEvent('Invalid file extension upload attempt', {
        extension,
        fileName: file.name,
        context,
        allowedExtensions: SECURITY_CONFIG.UPLOAD.ALLOWED_EXTENSIONS
      });
    }

    // Check filename
    if (file.name.length > SECURITY_CONFIG.UPLOAD.MAX_FILENAME_LENGTH) {
      threats.push(`Filename exceeds maximum length of ${SECURITY_CONFIG.UPLOAD.MAX_FILENAME_LENGTH} characters`);
    }

    // Check for suspicious patterns in filename
    const suspiciousPatterns = [
      /\.\./,           // Path traversal
      /%00/,            // Null byte
      /[<>:"\\|?*]/,    // Invalid filename characters
      /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i  // Reserved Windows names
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(file.name)) {
        threats.push('Suspicious filename pattern detected');
        logSecurityEvent('Suspicious filename pattern', {
          fileName: file.name,
          pattern: pattern.toString(),
          context
        });
        break;
      }
    }

    return {
      isValid: threats.length === 0,
      threats,
      metadata
    };
  }

  /**
   * Validate multi-language inputs
   */
  static validateMultiLanguageInput(
    inputs: Record<string, string>,
    type: 'text' | 'name' | 'description' = 'text',
    context?: string
  ): Record<string, ValidationResult> {
    const results: Record<string, ValidationResult> = {};

    for (const [language, input] of Object.entries(inputs)) {
      if (input && input.trim()) {
        results[language] = this.validateInput(
          input,
          type,
          `${context}_${language}`
        );
      }
    }

    return results;
  }

  /**
   * Type-specific validation
   */
  private static validateByType(input: string, type: string): { isValid: boolean; threats: string[] } {
    const threats: string[] = [];

    switch (type) {
      case 'email':
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(input)) {
          threats.push('Invalid email format');
        }
        break;

      case 'url':
        try {
          const url = new URL(input);
          if (!['http:', 'https:'].includes(url.protocol)) {
            threats.push('Invalid URL protocol');
          }
        } catch {
          threats.push('Invalid URL format');
        }
        break;

      case 'name':
        // Names should not contain numbers or special characters (basic check)
        if (/[0-9<>{}[\]\\]/.test(input)) {
          threats.push('Invalid characters in name');
        }
        break;
    }

    return {
      isValid: threats.length === 0,
      threats
    };
  }

  /**
   * Get maximum length for input type
   */
  private static getMaxLength(type: string): number {
    switch (type) {
      case 'name':
        return SECURITY_CONFIG.INPUT.MAX_NAME_LENGTH;
      case 'description':
        return SECURITY_CONFIG.INPUT.MAX_DESCRIPTION_LENGTH;
      default:
        return SECURITY_CONFIG.INPUT.MAX_TEXT_LENGTH;
    }
  }

  /**
   * Detect advanced threat patterns
   */
  private static detectAdvancedThreats(input: string): string[] {
    const threats: string[] = [];

    // Check for encoded attacks
    const encodedPatterns = [
      /%3C%73%63%72%69%70%74/i,  // Encoded <script
      /%22%3E%3C/i,              // Encoded "><
      /&#x/i,                    // Hex entities
      /&#\d/i                    // Decimal entities
    ];

    for (const pattern of encodedPatterns) {
      if (pattern.test(input)) {
        threats.push('Encoded attack pattern detected');
        break;
      }
    }

    // Check for excessive repetition (potential DoS)
    const repetitionPattern = /(.)\1{50,}/;
    if (repetitionPattern.test(input)) {
      threats.push('Excessive character repetition detected');
    }

    // Check for suspicious Unicode characters
    const suspiciousUnicode = /[\u200B-\u200F\u202A-\u202E\uFEFF]/;
    if (suspiciousUnicode.test(input)) {
      threats.push('Suspicious Unicode characters detected');
    }

    return threats;
  }

  /**
   * Validate CSRF token
   */
  static validateCSRFToken(token: string, expectedToken: string): boolean {
    if (!token || !expectedToken) {
      return false;
    }

    // Constant-time comparison to prevent timing attacks
    if (token.length !== expectedToken.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < token.length; i++) {
      result |= token.charCodeAt(i) ^ expectedToken.charCodeAt(i);
    }

    return result === 0;
  }

  /**
   * Generate CSRF token
   */
  static generateCSRFToken(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }
}