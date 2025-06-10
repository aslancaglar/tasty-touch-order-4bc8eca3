
import { useState, useEffect, useCallback } from 'react';
import { logSecurityEvent } from '@/config/security';

interface SecurityMetrics {
  validationErrors: number;
  securityViolations: number;
  authenticatedRequests: number;
  failedAuthAttempts: number;
}

interface SecurityEvent {
  id: string;
  type: 'validation_error' | 'security_violation' | 'auth_failure' | 'suspicious_activity';
  message: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  metadata?: Record<string, any>;
}

export const useSecurityMonitor = () => {
  const [metrics, setMetrics] = useState<SecurityMetrics>({
    validationErrors: 0,
    securityViolations: 0,
    authenticatedRequests: 0,
    failedAuthAttempts: 0,
  });

  const [recentEvents, setRecentEvents] = useState<SecurityEvent[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);

  const recordSecurityEvent = useCallback((event: Omit<SecurityEvent, 'id' | 'timestamp'>) => {
    const newEvent: SecurityEvent = {
      ...event,
      id: crypto.randomUUID(),
      timestamp: new Date(),
    };

    setRecentEvents(prev => [newEvent, ...prev.slice(0, 49)]); // Keep last 50 events

    // Update metrics
    setMetrics(prev => ({
      ...prev,
      validationErrors: event.type === 'validation_error' ? prev.validationErrors + 1 : prev.validationErrors,
      securityViolations: event.type === 'security_violation' ? prev.securityViolations + 1 : prev.securityViolations,
      failedAuthAttempts: event.type === 'auth_failure' ? prev.failedAuthAttempts + 1 : prev.failedAuthAttempts,
    }));

    // Log to security system
    logSecurityEvent(event.message, {
      type: event.type,
      severity: event.severity,
      ...event.metadata,
    });
  }, []);

  const startMonitoring = useCallback(() => {
    setIsMonitoring(true);
    
    // Monitor for client-side security events
    const handleError = (event: ErrorEvent) => {
      if (event.error?.name === 'SecurityError' || event.error?.name === 'ValidationError') {
        recordSecurityEvent({
          type: 'security_violation',
          message: event.error.message,
          severity: 'high',
          metadata: {
            filename: event.filename,
            lineno: event.lineno,
            stack: event.error.stack,
          },
        });
      }
    };

    window.addEventListener('error', handleError);

    return () => {
      window.removeEventListener('error', handleError);
      setIsMonitoring(false);
    };
  }, [recordSecurityEvent]);

  const getSecurityScore = useCallback(() => {
    const total = metrics.validationErrors + metrics.securityViolations + metrics.failedAuthAttempts;
    if (total === 0) return 100;
    
    // Simple scoring algorithm - can be enhanced
    const score = Math.max(0, 100 - (total * 2));
    return score;
  }, [metrics]);

  const getCriticalEvents = useCallback(() => {
    return recentEvents.filter(event => event.severity === 'critical' || event.severity === 'high');
  }, [recentEvents]);

  useEffect(() => {
    const cleanup = startMonitoring();
    return cleanup;
  }, [startMonitoring]);

  return {
    metrics,
    recentEvents,
    isMonitoring,
    recordSecurityEvent,
    getSecurityScore,
    getCriticalEvents,
  };
};
