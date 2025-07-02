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
    // Prevent infinite loops by not logging security events during security monitoring
    const logEntry = {
      event: `Security Event: ${event.type}`,
      severity: event.severity,
      ...event.details,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };
    
    // Direct console output without going through intercepted methods
    if (rateLimiter.isAllowed('security-events', 10, 60000)) {
      // Use original console methods to prevent circular calls
      const originalWarn = console.warn;
      originalWarn.call(console, `[Security Event] ${event.type}`, logEntry);
    }
  }, []);

  useEffect(() => {
    // Store original console methods to prevent circular calls
    const originalConsole = {
      log: console.log,
      warn: console.warn,
      error: console.error,
      info: console.info
    };
    
    // Disable console monitoring to prevent infinite loops
    // This was causing the stack overflow by intercepting its own logs
    
    let consoleAccessCount = 0;

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
      // Restore original localStorage
      localStorage.getItem = originalStorage;
      window.removeEventListener('beforeunload', handleNavigation);
      window.removeEventListener('popstate', handleNavigation);
    };
  }, [reportSecurityEvent]);

  return { reportSecurityEvent };
};