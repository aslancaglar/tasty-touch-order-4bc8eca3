
import React, { useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { validateAndSanitizeInput, validateNumericInput, ValidationError, SecurityError } from '@/utils/input-validation';
import { logSecurityEvent } from '@/config/security';
import { cn } from '@/lib/utils';

interface SecureInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  validationType?: 'text' | 'name' | 'description' | 'email' | 'url' | 'number';
  onSecureChange?: (value: string, isValid: boolean) => void;
  showValidation?: boolean;
  min?: number;
  max?: number;
  allowDecimals?: boolean;
}

export const SecureInput = React.forwardRef<HTMLInputElement, SecureInputProps>(
  ({ 
    validationType = 'text', 
    onSecureChange, 
    showValidation = false,
    min,
    max,
    allowDecimals,
    className,
    ...props 
  }, ref) => {
    const [validationError, setValidationError] = useState<string | null>(null);
    const [isValid, setIsValid] = useState(true);

    const handleChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = event.target.value;
      let processedValue = rawValue;
      let valid = true;
      let error: string | null = null;

      try {
        if (validationType === 'number') {
          if (rawValue.trim() === '') {
            processedValue = '';
            if (props.required) {
              valid = false;
              error = 'This field is required';
            }
          } else {
            const numValue = validateNumericInput(rawValue, min, max, allowDecimals);
            processedValue = numValue.toString();
          }
        } else {
          processedValue = validateAndSanitizeInput(rawValue, validationType, props.required);
        }
      } catch (err) {
        valid = false;
        if (err instanceof ValidationError || err instanceof SecurityError) {
          error = err.message;
          
          // Log security errors
          if (err instanceof SecurityError) {
            logSecurityEvent('Input security violation', {
              validationType,
              inputLength: rawValue.length,
              errorCode: err.code,
              fieldName: props.name || 'unknown'
            });
          }
        } else {
          error = 'Invalid input';
        }
        
        // For security errors, clear the input
        if (err instanceof SecurityError) {
          processedValue = '';
        }
      }

      // Update the actual input value
      event.target.value = processedValue;

      setValidationError(error);
      setIsValid(valid);

      // Call the secure change handler
      if (onSecureChange) {
        onSecureChange(processedValue, valid);
      }
    }, [validationType, onSecureChange, props.required, props.name, min, max, allowDecimals]);

    return (
      <div className="space-y-1">
        <Input
          {...props}
          ref={ref}
          onChange={handleChange}
          className={cn(
            className,
            !isValid && showValidation && "border-red-500 focus:border-red-500",
            isValid && showValidation && "border-green-500 focus:border-green-500"
          )}
          aria-invalid={!isValid}
          aria-describedby={validationError ? `${props.id}-error` : undefined}
        />
        
        {showValidation && validationError && (
          <p 
            id={`${props.id}-error`}
            className="text-sm text-red-600"
            role="alert"
          >
            {validationError}
          </p>
        )}
      </div>
    );
  }
);

SecureInput.displayName = "SecureInput";
