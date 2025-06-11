
import { useState, useCallback } from 'react';
import { validateFormData, generateCSRFToken, ValidationError, SecurityError } from '@/utils/input-validation';
import { logSecurityEvent } from '@/config/security';
import { toast } from '@/hooks/use-toast';

interface FormSchema {
  [key: string]: {
    type: 'text' | 'name' | 'description' | 'email' | 'url' | 'number';
    required?: boolean;
    min?: number;
    max?: number;
    allowDecimals?: boolean;
  };
}

interface UseSecureFormOptions {
  schema: FormSchema;
  onSubmit: (data: Record<string, any>) => Promise<void> | void;
  enableCSRF?: boolean;
}

export const useSecureForm = ({ schema, onSubmit, enableCSRF = true }: UseSecureFormOptions) => {
  const [csrfToken] = useState(() => enableCSRF ? generateCSRFToken() : '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateField = useCallback((name: string, value: any) => {
    const fieldSchema = schema[name];
    if (!fieldSchema) return null;

    try {
      if (fieldSchema.type === 'number') {
        validateFormData({ [name]: value }, { [name]: fieldSchema });
      } else {
        validateFormData({ [name]: value }, { [name]: fieldSchema });
      }
      return null;
    } catch (error) {
      if (error instanceof ValidationError || error instanceof SecurityError) {
        return error.message;
      }
      return 'Invalid input';
    }
  }, [schema]);

  const handleSubmit = useCallback(async (formData: Record<string, any>) => {
    setIsSubmitting(true);
    setErrors({});

    try {
      // CSRF validation
      if (enableCSRF && formData.csrfToken !== csrfToken) {
        logSecurityEvent('CSRF token mismatch', { 
          expected: csrfToken.substring(0, 8) + '...', 
          received: formData.csrfToken?.substring(0, 8) + '...' 
        });
        throw new SecurityError('Security validation failed', 'CSRF_MISMATCH');
      }

      // Validate all form data
      const validatedData = validateFormData(formData, schema);

      // Call the submit handler
      await onSubmit(validatedData);

      toast({
        title: "Success",
        description: "Form submitted successfully",
      });
    } catch (error) {
      console.error('Form submission error:', error);
      
      if (error instanceof ValidationError) {
        toast({
          title: "Validation Error",
          description: error.message,
          variant: "destructive",
        });
      } else if (error instanceof SecurityError) {
        toast({
          title: "Security Error",
          description: "A security issue was detected. Please try again.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "An unexpected error occurred. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [schema, onSubmit, enableCSRF, csrfToken]);

  return {
    csrfToken,
    isSubmitting,
    errors,
    validateField,
    handleSubmit,
  };
};
