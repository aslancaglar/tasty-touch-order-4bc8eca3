
import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Shield, AlertTriangle } from 'lucide-react';
import { logSecurityEvent } from '@/config/security';

interface SecurityValidationWrapperProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requiredRole?: 'admin' | 'owner';
  restaurantId?: string;
  className?: string;
}

const SecurityValidationWrapper: React.FC<SecurityValidationWrapperProps> = ({
  children,
  requireAuth = false,
  requiredRole,
  restaurantId,
  className = ""
}) => {
  const [securityStatus, setSecurityStatus] = React.useState<'loading' | 'authorized' | 'unauthorized'>('loading');
  const [errorMessage, setErrorMessage] = React.useState<string>('');

  React.useEffect(() => {
    const validateSecurity = async () => {
      try {
        // Basic auth check
        if (requireAuth) {
          // This would integrate with your auth system
          const isAuthenticated = true; // Replace with actual auth check
          
          if (!isAuthenticated) {
            setSecurityStatus('unauthorized');
            setErrorMessage('Authentication required');
            logSecurityEvent('Unauthorized access attempt', { component: 'SecurityValidationWrapper' });
            return;
          }
        }

        // Role-based access control
        if (requiredRole) {
          // This would integrate with your role system
          const hasRole = true; // Replace with actual role check
          
          if (!hasRole) {
            setSecurityStatus('unauthorized');
            setErrorMessage(`${requiredRole} role required`);
            logSecurityEvent('Insufficient permissions', { 
              component: 'SecurityValidationWrapper',
              requiredRole,
              restaurantId 
            });
            return;
          }
        }

        setSecurityStatus('authorized');
      } catch (error) {
        setSecurityStatus('unauthorized');
        setErrorMessage('Security validation failed');
        logSecurityEvent('Security validation error', { 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    };

    validateSecurity();
  }, [requireAuth, requiredRole, restaurantId]);

  if (securityStatus === 'loading') {
    return (
      <div className={`flex items-center justify-center p-4 ${className}`}>
        <Shield className="animate-spin h-6 w-6 text-blue-600" />
        <span className="ml-2">Validating permissions...</span>
      </div>
    );
  }

  if (securityStatus === 'unauthorized') {
    return (
      <Alert variant="destructive" className={className}>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Access Denied</AlertTitle>
        <AlertDescription>{errorMessage}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className={className}>
      {children}
    </div>
  );
};

export default SecurityValidationWrapper;
