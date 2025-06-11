
import * as React from "react"
import { cn } from "@/lib/utils"
import { validateAndSanitizeInput, ValidationError, SecurityError } from "@/utils/input-validation"
import { logSecurityEvent } from "@/config/security"

export interface SecureInputProps extends Omit<React.ComponentProps<"input">, 'onChange'> {
  validationType?: 'text' | 'name' | 'description' | 'email' | 'url';
  required?: boolean;
  onSecureChange?: (value: string, isValid: boolean) => void;
  showValidation?: boolean;
}

const SecureInput = React.forwardRef<HTMLInputElement, SecureInputProps>(
  ({ 
    className, 
    type = "text", 
    validationType = 'text',
    required = false,
    onSecureChange,
    showValidation = true,
    ...props 
  }, ref) => {
    const [error, setError] = React.useState<string>('');
    const [isValid, setIsValid] = React.useState(true);

    const handleChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      
      try {
        const sanitizedValue = validateAndSanitizeInput(value, validationType, required);
        setError('');
        setIsValid(true);
        onSecureChange?.(sanitizedValue, true);
      } catch (err) {
        if (err instanceof ValidationError) {
          setError(err.message);
          setIsValid(false);
          onSecureChange?.(value, false);
        } else if (err instanceof SecurityError) {
          logSecurityEvent('Security validation failed in SecureInput', {
            component: 'SecureInput',
            validationType,
            errorCode: err.code
          });
          setError('Invalid input detected');
          setIsValid(false);
          onSecureChange?.(value, false);
        }
      }
    }, [validationType, required, onSecureChange]);

    return (
      <div className="space-y-1">
        <input
          type={type}
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
            !isValid && showValidation && "border-red-500 focus-visible:ring-red-500",
            className
          )}
          ref={ref}
          onChange={handleChange}
          {...props}
        />
        {error && showValidation && (
          <p className="text-sm text-red-500">{error}</p>
        )}
      </div>
    )
  }
)
SecureInput.displayName = "SecureInput"

export { SecureInput }
