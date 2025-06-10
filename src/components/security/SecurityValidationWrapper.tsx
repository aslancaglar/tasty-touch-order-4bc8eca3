
import React, { useEffect, useState } from 'react';
import { validateInput, sanitizeInput } from '@/config/security';
import { useSecurityMonitor } from '@/hooks/useSecurityMonitor';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, AlertTriangle } from 'lucide-react';

interface SecurityValidationWrapperProps {
  children: React.ReactNode;
  enableInputValidation?: boolean;
  enableRateLimit?: boolean;
  enableSecurityMonitoring?: boolean;
}

const SecurityValidationWrapper: React.FC<SecurityValidationWrapperProps> = ({
  children,
  enableInputValidation = true,
  enableRateLimit = true,
  enableSecurityMonitoring = true
}) => {
  const [securityWarnings, setSecurityWarnings] = useState<string[]>([]);
  const { metrics, isSecurityAlertActive } = useSecurityMonitor({
    trackFailedLogins: enableSecurityMonitoring,
    trackRateLimits: enableRateLimit,
    trackSuspiciousPatterns: enableSecurityMonitoring
  });

  // Monitor for potential XSS attempts in the DOM
  useEffect(() => {
    if (!enableInputValidation) return;

    const monitorInputs = () => {
      const inputs = document.querySelectorAll('input, textarea');
      
      inputs.forEach(input => {
        const handleInput = (event: Event) => {
          const target = event.target as HTMLInputElement;
          const value = target.value;
          
          // Check for suspicious patterns
          if (value.includes('<script') || value.includes('javascript:')) {
            setSecurityWarnings(prev => [
              ...prev.slice(-4), // Keep only last 5 warnings
              'Potentially malicious input detected and blocked'
            ]);
            
            // Sanitize the input
            target.value = sanitizeInput(value);
          }
        };
        
        input.addEventListener('input', handleInput);
      });
    };

    // Initial setup and re-setup when DOM changes
    monitorInputs();
    
    const observer = new MutationObserver(monitorInputs);
    observer.observe(document.body, { childList: true, subtree: true });
    
    return () => observer.disconnect();
  }, [enableInputValidation]);

  // Clear warnings after 10 seconds
  useEffect(() => {
    if (securityWarnings.length > 0) {
      const timer = setTimeout(() => {
        setSecurityWarnings([]);
      }, 10000);
      
      return () => clearTimeout(timer);
    }
  }, [securityWarnings]);

  return (
    <div className="security-validation-wrapper">
      {/* Security Alerts */}
      {isSecurityAlertActive && (
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Security monitoring has detected suspicious activity. Enhanced security measures are active.
          </AlertDescription>
        </Alert>
      )}
      
      {/* Security Warnings */}
      {securityWarnings.map((warning, index) => (
        <Alert key={index} variant="destructive" className="mb-2">
          <Shield className="h-4 w-4" />
          <AlertDescription>{warning}</AlertDescription>
        </Alert>
      ))}
      
      {/* Debug info in development */}
      {process.env.NODE_ENV === 'development' && enableSecurityMonitoring && (
        <div className="fixed bottom-4 right-4 bg-black/80 text-white p-2 rounded text-xs font-mono">
          Security Metrics: F:{metrics.failedAttempts} S:{metrics.suspiciousActivity} R:{metrics.rateLimitViolations}
        </div>
      )}
      
      {children}
    </div>
  );
};

export default SecurityValidationWrapper;
