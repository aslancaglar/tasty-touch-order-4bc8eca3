
import { useEffect, useState, useCallback } from 'react';
import { logSecurityEvent, checkRateLimit, SECURITY_CONFIG } from '@/config/security';
import { useAuth } from '@/contexts/AuthContext';

interface SecurityMetrics {
  failedAttempts: number;
  suspiciousActivity: number;
  rateLimitViolations: number;
  lastIncident: Date | null;
}

interface SecurityMonitorConfig {
  trackFailedLogins?: boolean;
  trackRateLimits?: boolean;
  trackSuspiciousPatterns?: boolean;
  alertThreshold?: number;
}

export const useSecurityMonitor = (config: SecurityMonitorConfig = {}) => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<SecurityMetrics>({
    failedAttempts: 0,
    suspiciousActivity: 0,
    rateLimitViolations: 0,
    lastIncident: null
  });

  const {
    trackFailedLogins = true,
    trackRateLimits = true,
    trackSuspiciousPatterns = true,
    alertThreshold = SECURITY_CONFIG.MONITORING.ALERT_THRESHOLD_CRITICAL
  } = config;

  // Track security events
  const trackSecurityEvent = useCallback((
    eventType: 'failed_login' | 'rate_limit' | 'suspicious_activity',
    details: Record<string, any> = {}
  ) => {
    const now = new Date();
    
    setMetrics(prev => {
      const updated = { ...prev, lastIncident: now };
      
      switch (eventType) {
        case 'failed_login':
          if (trackFailedLogins) {
            updated.failedAttempts += 1;
          }
          break;
        case 'rate_limit':
          if (trackRateLimits) {
            updated.rateLimitViolations += 1;
          }
          break;
        case 'suspicious_activity':
          if (trackSuspiciousPatterns) {
            updated.suspiciousActivity += 1;
          }
          break;
      }
      
      return updated;
    });

    // Log the security event
    logSecurityEvent(`Security monitor: ${eventType}`, {
      eventType,
      userId: user?.id,
      timestamp: now.toISOString(),
      userAgent: navigator.userAgent,
      ...details
    });

    // Check if we've exceeded alert threshold
    const totalEvents = metrics.failedAttempts + metrics.suspiciousActivity + metrics.rateLimitViolations;
    if (totalEvents >= alertThreshold) {
      logSecurityEvent('CRITICAL: Security alert threshold exceeded', {
        totalEvents: totalEvents + 1,
        threshold: alertThreshold,
        userId: user?.id,
        metrics: metrics
      });
    }
  }, [user?.id, metrics, alertThreshold, trackFailedLogins, trackRateLimits, trackSuspiciousPatterns]);

  // Rate limiting check with monitoring
  const checkRateLimitWithMonitoring = useCallback((
    identifier: string,
    maxRequests?: number
  ): boolean => {
    const allowed = checkRateLimit(identifier, maxRequests);
    
    if (!allowed) {
      trackSecurityEvent('rate_limit', {
        identifier,
        maxRequests: maxRequests || SECURITY_CONFIG.RATE_LIMITING.MAX_REQUESTS_PER_MINUTE
      });
    }
    
    return allowed;
  }, [trackSecurityEvent]);

  // Monitor suspicious patterns in user behavior
  useEffect(() => {
    if (!trackSuspiciousPatterns) return;

    const monitorSuspiciousActivity = () => {
      // Monitor rapid navigation patterns
      let navigationCount = 0;
      const resetNavigationCount = () => navigationCount = 0;
      
      const handleNavigation = () => {
        navigationCount++;
        if (navigationCount > 20) { // Suspicious if more than 20 navigations per minute
          trackSecurityEvent('suspicious_activity', {
            pattern: 'rapid_navigation',
            count: navigationCount
          });
        }
      };

      // Monitor for potential bot behavior
      const handleMouseMove = () => {
        // Reset navigation count on mouse movement (sign of human activity)
        if (navigationCount > 0) {
          navigationCount = Math.max(0, navigationCount - 1);
        }
      };

      window.addEventListener('popstate', handleNavigation);
      window.addEventListener('mousemove', handleMouseMove);
      
      const interval = setInterval(resetNavigationCount, 60000); // Reset every minute

      return () => {
        window.removeEventListener('popstate', handleNavigation);
        window.removeEventListener('mousemove', handleMouseMove);
        clearInterval(interval);
      };
    };

    const cleanup = monitorSuspiciousActivity();
    return cleanup;
  }, [trackSuspiciousPatterns, trackSecurityEvent]);

  // Reset metrics periodically
  useEffect(() => {
    const resetInterval = setInterval(() => {
      setMetrics(prev => ({
        ...prev,
        failedAttempts: Math.max(0, prev.failedAttempts - 1),
        suspiciousActivity: Math.max(0, prev.suspiciousActivity - 1),
        rateLimitViolations: Math.max(0, prev.rateLimitViolations - 1)
      }));
    }, SECURITY_CONFIG.MONITORING.LOG_RETENTION_HOURS * 60 * 60 * 1000); // Decay metrics over time

    return () => clearInterval(resetInterval);
  }, []);

  return {
    metrics,
    trackSecurityEvent,
    checkRateLimit: checkRateLimitWithMonitoring,
    isSecurityAlertActive: 
      (metrics.failedAttempts + metrics.suspiciousActivity + metrics.rateLimitViolations) >= alertThreshold
  };
};
