import { SECURITY_PATTERNS, validateInput, sanitizeInput } from '@/config/security';
import { logSecurityEvent } from '@/utils/error-handler';

export interface SanitizationResult {
  sanitized: string;
  isValid: boolean;
  threats: string[];
}

export const enhancedInputSanitization = (
  input: string, 
  type: 'text' | 'name' | 'description' = 'text',
  context?: string
): SanitizationResult => {
  const threats: string[] = [];
  
  // Check for XSS patterns
  for (const pattern of SECURITY_PATTERNS.XSS) {
    if (pattern.test(input)) {
      threats.push('XSS attempt detected');
      logSecurityEvent('XSS attempt in user input', { 
        input: input.substring(0, 100), 
        context,
        pattern: pattern.toString()
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
        pattern: pattern.toString()
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
        pattern: pattern.toString()
      });
      break;
    }
  }
  
  // Validate input length and basic format
  const isValid = validateInput(input, type) && threats.length === 0;
  
  // Sanitize the input
  const sanitized = sanitizeInput(input);
  
  return {
    sanitized,
    isValid,
    threats
  };
};

export const useEnhancedInputValidation = (
  onSecurityThreat?: (threats: string[]) => void
) => {
  const validateAndSanitize = (
    input: string, 
    type: 'text' | 'name' | 'description' = 'text',
    context?: string
  ): SanitizationResult => {
    const result = enhancedInputSanitization(input, type, context);
    
    if (result.threats.length > 0 && onSecurityThreat) {
      onSecurityThreat(result.threats);
    }
    
    return result;
  };
  
  return { validateAndSanitize };
};