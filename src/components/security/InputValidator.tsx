import { useState, useEffect } from 'react';
import { sanitizeInput, rateLimiter } from '@/lib/utils';
import { validateInput, SECURITY_CONFIG } from '@/config/security';

interface SecurityEvent {
  type: 'suspicious_activity' | 'rate_limit' | 'injection_attempt' | 'unauthorized_access' | 'input_validation';
  severity: 'low' | 'medium' | 'high';
  details: Record<string, any>;
}

interface InputValidatorProps {
  children: React.ReactNode;
  onSecurityViolation?: (event: SecurityEvent) => void;
}

export const InputValidator = ({ children, onSecurityViolation }: InputValidatorProps) => {
  const [violations, setViolations] = useState<string[]>([]);

  useEffect(() => {
    // Monitor form submissions and inputs
    const handleFormSubmit = (event: Event) => {
      const form = event.target as HTMLFormElement;
      const formData = new FormData(form);
      
      // Rate limit form submissions
      if (!rateLimiter.isAllowed('form-submit', 5, 60000)) {
        event.preventDefault();
        onSecurityViolation?.({
          type: 'rate_limit',
          severity: 'medium',
          details: { type: 'form_submission' }
        });
        return;
      }

      // Validate all inputs
      for (const [key, value] of formData.entries()) {
        if (typeof value === 'string') {
          if (!validateInput(value)) {
            event.preventDefault();
            setViolations(prev => [...prev, `Invalid input in field: ${key}`]);
            onSecurityViolation?.({
              type: 'input_validation',
              severity: 'high',
              details: { field: key, value }
            });
            return;
          }
        }
      }
    };

    // Monitor input changes
    const handleInput = (event: Event) => {
      const input = event.target as HTMLInputElement;
      if (input.value && !validateInput(input.value, 'text')) {
        input.value = sanitizeInput(input.value);
      }
    };

    document.addEventListener('submit', handleFormSubmit);
    document.addEventListener('input', handleInput);

    return () => {
      document.removeEventListener('submit', handleFormSubmit);
      document.removeEventListener('input', handleInput);
    };
  }, [onSecurityViolation]);

  return (
    <div>
      {children}
      {violations.length > 0 && (
        <div className="fixed bottom-4 right-4 bg-destructive text-destructive-foreground p-4 rounded-lg shadow-lg max-w-sm">
          <h4 className="font-semibold mb-2">Security Violations Detected</h4>
          <ul className="text-sm space-y-1">
            {violations.map((violation, index) => (
              <li key={index}>• {violation}</li>
            ))}
          </ul>
          <button 
            onClick={() => setViolations([])}
            className="mt-2 text-xs underline"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
};