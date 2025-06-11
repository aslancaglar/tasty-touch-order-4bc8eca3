
import { useState, useCallback, useMemo } from 'react';
import { validateFormData, generateCSRFToken, validateCSRFToken, ValidationError } from '@/utils/input-validation';
import { logSecurityEvent } from '@/config/security';

interface UseSecureFormConfig {
  schema: Record<string, {
    type: 'text' | 'name' | 'description' | 'email' | 'url' | 'number';
    required?: boolean;
    min?: number;
    max?: number;
    allowDecimals?: boolean;
  }>;
  onSubmit: (data: Record<string, any>) => Promise<void> | void;
  enableCSRF?: boolean;
}

export const useSecureForm = ({ schema, onSubmit, enableCSRF = true }: UseSecureFormConfig) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Generate CSRF token
  const csrfToken = useMemo(() => {
    return enableCSRF ? generateCSRFToken() : '';
  }, [enableCSRF]);

  const validateField = useCallback((name: string, value: any): string | null => {
    const fieldSchema = schema[name];
    if (!fieldSchema) return null;

    try {
      if (fieldSchema.type === 'number') {
        // Handle numeric validation in the component
        return null;
      } else {
        validateFormData({ [name]: value }, { [name]: fieldSchema });
        return null;
      }
    } catch (error) {
      if (error instanceof ValidationError) {
        return error.message;
      }
      return 'Validation failed';
    }
  }, [schema]);

  const handleSubmit = useCallback(async (data: Record<string, any>) => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    setErrors({});

    try {
      // Validate CSRF token if enabled
      if (enableCSRF) {
        const submittedToken = data.csrfToken;
        if (!submittedToken || !validateCSRFToken(submittedToken, csrfToken)) {
          logSecurityEvent('CSRF token validation failed', { 
            hasToken: !!submittedToken,
            tokenMatch: submittedToken === csrfToken 
          });
          throw new ValidationError('Security validation failed');
        }
        // Remove CSRF token from data before validation
        delete data.csrfToken;
      }

      // Validate all form data
      const validatedData = validateFormData(data, schema);
      
      // Log successful validation
      logSecurityEvent('Form validation successful', { 
        fields: Object.keys(validatedData),
        enableCSRF 
      });

      // Submit the form
      await onSubmit(validatedData);
    } catch (error) {
      if (error instanceof ValidationError) {
        // Handle field-specific errors
        const fieldMatch = error.message.match(/^(\w+):\s*(.+)/);
        if (fieldMatch) {
          setErrors({ [fieldMatch[1]]: fieldMatch[2] });
        } else {
          setErrors({ general: error.message });
        }
      } else {
        console.error('Form submission error:', error);
        setErrors({ general: 'An unexpected error occurred' });
      }
      
      logSecurityEvent('Form submission failed', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        enableCSRF 
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, schema, onSubmit, enableCSRF, csrfToken]);

  return {
    csrfToken,
    isSubmitting,
    errors,
    validateField,
    handleSubmit,
  };
};
