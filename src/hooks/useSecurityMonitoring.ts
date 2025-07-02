import { useEffect, useCallback } from 'react';
import { logSecurityEvent } from '@/utils/error-handler';
import { rateLimiter } from '@/lib/utils';

interface SecurityEvent {
  type: 'suspicious_activity' | 'rate_limit' | 'injection_attempt' | 'unauthorized_access';
  severity: 'low' | 'medium' | 'high';
  details: Record<string, any>;
}

export const useSecurityMonitoring = () => {
  const reportSecurityEvent = useCallback((event: SecurityEvent) => {
    logSecurityEvent(`Security Event: ${event.type}`, {
      severity: event.severity,
      ...event.details,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    });

    // Rate limit security event reporting to prevent spam
    if (rateLimiter.isAllowed('security-events', 10, 60000)) {
      console.warn(`Security Event [${event.severity}]:`, event.type, event.details);
    }
  }, []);

  useEffect(() => {
    // Monitor for suspicious console access
    let consoleAccessCount = 0;
    const originalConsole = { ...console };
    
    ['log', 'warn', 'error', 'info'].forEach(method => {
      const originalMethod = originalConsole[method as keyof Console] as Function;
      (console as any)[method] = (...args: any[]) => {
        consoleAccessCount++;
        if (consoleAccessCount > 50) { // Threshold for suspicious activity
          reportSecurityEvent({
            type: 'suspicious_activity',
            severity: 'medium',
            details: { 
              type: 'excessive_console_access',
              count: consoleAccessCount 
            }
          });
          consoleAccessCount = 0; // Reset counter
        }
        return originalMethod.apply(console, args);
      };
    });

    // Monitor for rapid navigation attempts
    let navigationCount = 0;
    const handleNavigation = () => {
      navigationCount++;
      if (navigationCount > 20) { // Rapid navigation threshold
        reportSecurityEvent({
          type: 'suspicious_activity',
          severity: 'low',
          details: { 
            type: 'rapid_navigation',
            count: navigationCount 
          }
        });
        navigationCount = 0;
      }
    };

    // Monitor for potential session hijacking
    const originalStorage = localStorage.getItem;
    localStorage.getItem = function(key: string) {
      if (key.includes('auth') || key.includes('session')) {
        if (!rateLimiter.isAllowed('auth-storage-access', 30, 60000)) {
          reportSecurityEvent({
            type: 'suspicious_activity',
            severity: 'high',
            details: { 
              type: 'excessive_auth_storage_access',
              key 
            }
          });
        }
      }
      return originalStorage.call(this, key);
    };

    window.addEventListener('beforeunload', handleNavigation);
    window.addEventListener('popstate', handleNavigation);

    return () => {
      // Restore original console
      Object.assign(console, originalConsole);
      localStorage.getItem = originalStorage;
      window.removeEventListener('beforeunload', handleNavigation);
      window.removeEventListener('popstate', handleNavigation);
    };
  }, [reportSecurityEvent]);

  return { reportSecurityEvent };
};