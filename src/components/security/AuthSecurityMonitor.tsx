
import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Shield, Clock, User } from 'lucide-react';
import { logSecurityEvent } from '@/utils/error-handler';

interface AuthAnomaly {
  type: 'rapid_requests' | 'session_hijack' | 'unusual_location' | 'token_manipulation' | 'concurrent_sessions';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: number;
  userId?: string;
  details: Record<string, any>;
}

interface AuthMetrics {
  loginAttempts: number;
  sessionChanges: number;
  tokenRefreshes: number;
  failedAttempts: number;
  lastActivity: number;
}

const AuthSecurityMonitor = () => {
  const { user, session } = useAuth();
  const [anomalies, setAnomalies] = useState<AuthAnomaly[]>([]);
  const [metrics, setMetrics] = useState<AuthMetrics>({
    loginAttempts: 0,
    sessionChanges: 0,
    tokenRefreshes: 0,
    failedAttempts: 0,
    lastActivity: Date.now()
  });

  // Track user activity patterns
  const activityRef = useRef({
    requestCount: 0,
    lastRequestTime: 0,
    sessionIds: new Set<string>(),
    userAgents: new Set<string>(),
    windowStart: Date.now()
  });

  useEffect(() => {
    // Monitor authentication events
    const monitorAuthEvents = () => {
      // Track session changes
      if (session) {
        const sessionId = session.access_token.slice(-8);
        
        if (!activityRef.current.sessionIds.has(sessionId)) {
          activityRef.current.sessionIds.add(sessionId);
          
          setMetrics(prev => ({
            ...prev,
            sessionChanges: prev.sessionChanges + 1,
            lastActivity: Date.now()
          }));
          
          // Check for concurrent sessions (potential hijacking)
          if (activityRef.current.sessionIds.size > 2) {
            addAnomaly({
              type: 'concurrent_sessions',
              severity: 'high',
              message: `Multiple concurrent sessions detected for user`,
              details: {
                sessionCount: activityRef.current.sessionIds.size,
                userId: user?.id
              }
            });
          }
        }
      }
    };

    // Monitor request patterns
    const monitorRequestPatterns = () => {
      const now = Date.now();
      const timeSinceLastRequest = now - activityRef.current.lastRequestTime;
      
      activityRef.current.requestCount++;
      activityRef.current.lastRequestTime = now;
      
      // Reset window every minute
      if (now - activityRef.current.windowStart > 60000) {
        if (activityRef.current.requestCount > 120) { // More than 2 requests per second
          addAnomaly({
            type: 'rapid_requests',
            severity: 'medium',
            message: `Unusually high request rate detected`,
            details: {
              requestCount: activityRef.current.requestCount,
              timeWindow: '1 minute',
              userId: user?.id
            }
          });
        }
        
        activityRef.current.requestCount = 0;
        activityRef.current.windowStart = now;
      }
    };

    // Check for token manipulation
    const monitorTokenIntegrity = () => {
      if (session?.access_token) {
        try {
          // Basic token format validation
          const tokenParts = session.access_token.split('.');
          if (tokenParts.length !== 3) {
            addAnomaly({
              type: 'token_manipulation',
              severity: 'critical',
              message: 'Malformed JWT token detected',
              details: {
                tokenStructure: 'invalid',
                userId: user?.id
              }
            });
          }
          
          // Check token expiration anomalies
          const payload = JSON.parse(atob(tokenParts[1]));
          const currentTime = Math.floor(Date.now() / 1000);
          const timeUntilExpiry = payload.exp - currentTime;
          
          // Unusually long or short token validity
          if (timeUntilExpiry > 86400) { // More than 24 hours
            addAnomaly({
              type: 'token_manipulation',
              severity: 'medium',
              message: 'Token with unusually long expiration detected',
              details: {
                expiresIn: timeUntilExpiry,
                userId: user?.id
              }
            });
          }
        } catch (error) {
          addAnomaly({
            type: 'token_manipulation',
            severity: 'high',
            message: 'Token parsing failed, possible manipulation',
            details: {
              error: String(error),
              userId: user?.id
            }
          });
        }
      }
    };

    // Monitor browser fingerprint changes
    const monitorBrowserFingerprint = () => {
      const userAgent = navigator.userAgent;
      
      if (!activityRef.current.userAgents.has(userAgent)) {
        activityRef.current.userAgents.add(userAgent);
        
        if (activityRef.current.userAgents.size > 1) {
          addAnomaly({
            type: 'session_hijack',
            severity: 'high',
            message: 'Different browser/device detected for same session',
            details: {
              userAgentCount: activityRef.current.userAgents.size,
              currentUserAgent: userAgent,
              userId: user?.id
            }
          });
        }
      }
    };

    // Set up monitoring intervals
    const authMonitorInterval = setInterval(monitorAuthEvents, 5000);
    const requestMonitorInterval = setInterval(monitorRequestPatterns, 1000);
    const tokenMonitorInterval = setInterval(monitorTokenIntegrity, 30000);
    const fingerprintMonitorInterval = setInterval(monitorBrowserFingerprint, 10000);

    // Monitor network requests
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      monitorRequestPatterns();
      
      try {
        const response = await originalFetch(...args);
        
        // Monitor for auth-related failures
        if (!response.ok && args[0]?.toString().includes('auth')) {
          setMetrics(prev => ({
            ...prev,
            failedAttempts: prev.failedAttempts + 1
          }));
          
          if (response.status === 401 || response.status === 403) {
            addAnomaly({
              type: 'session_hijack',
              severity: 'medium',
              message: 'Authentication failure detected',
              details: {
                status: response.status,
                url: args[0]?.toString(),
                userId: user?.id
              }
            });
          }
        }
        
        return response;
      } catch (error) {
        setMetrics(prev => ({
          ...prev,
          failedAttempts: prev.failedAttempts + 1
        }));
        throw error;
      }
    };

    return () => {
      clearInterval(authMonitorInterval);
      clearInterval(requestMonitorInterval);
      clearInterval(tokenMonitorInterval);
      clearInterval(fingerprintMonitorInterval);
      window.fetch = originalFetch;
    };
  }, [session, user]);

  const addAnomaly = (anomalyData: Omit<AuthAnomaly, 'timestamp'>) => {
    const anomaly: AuthAnomaly = {
      ...anomalyData,
      timestamp: Date.now()
    };
    
    setAnomalies(prev => [anomaly, ...prev].slice(0, 10)); // Keep last 10 anomalies
    
    // Log to security system
    logSecurityEvent(`Auth Anomaly: ${anomaly.message}`, {
      type: anomaly.type,
      severity: anomaly.severity,
      details: anomaly.details,
      userId: anomaly.userId
    });
    
    // Store for admin dashboard
    const existingEvents = JSON.parse(localStorage.getItem('security_events') || '[]');
    const securityEvent = {
      id: crypto.randomUUID(),
      type: 'authentication',
      severity: anomaly.severity,
      message: anomaly.message,
      details: anomaly.details,
      timestamp: anomaly.timestamp,
      userId: anomaly.userId,
      resolved: false
    };
    
    existingEvents.unshift(securityEvent);
    localStorage.setItem('security_events', JSON.stringify(existingEvents.slice(0, 100)));
  };

  const dismissAnomaly = (timestamp: number) => {
    setAnomalies(prev => prev.filter(a => a.timestamp !== timestamp));
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'border-red-500 bg-red-50';
      case 'high': return 'border-orange-500 bg-orange-50';
      case 'medium': return 'border-yellow-500 bg-yellow-50';
      default: return 'border-blue-500 bg-blue-50';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
      case 'high':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'medium':
        return <Shield className="h-4 w-4 text-yellow-500" />;
      default:
        return <Shield className="h-4 w-4 text-blue-500" />;
    }
  };

  // Only show critical and high severity anomalies to regular users
  const visibleAnomalies = anomalies.filter(a => 
    a.severity === 'critical' || a.severity === 'high'
  );

  if (visibleAnomalies.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md space-y-2">
      {visibleAnomalies.map((anomaly) => (
        <Alert 
          key={anomaly.timestamp}
          className={`${getSeverityColor(anomaly.severity)} border-2 shadow-lg`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-2">
              {getSeverityIcon(anomaly.severity)}
              <div className="flex-1">
                <AlertTitle className="text-sm font-semibold">
                  Security Alert
                </AlertTitle>
                <AlertDescription className="text-sm mt-1">
                  {anomaly.message}
                </AlertDescription>
                <div className="flex items-center text-xs text-gray-500 mt-2">
                  <Clock className="h-3 w-3 mr-1" />
                  {new Date(anomaly.timestamp).toLocaleTimeString()}
                  {anomaly.userId && (
                    <>
                      <User className="h-3 w-3 ml-2 mr-1" />
                      User: {anomaly.userId.slice(0, 8)}...
                    </>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={() => dismissAnomaly(anomaly.timestamp)}
              className="text-gray-500 hover:text-gray-700 ml-2"
            >
              ×
            </button>
          </div>
        </Alert>
      ))}
    </div>
  );
};

export default AuthSecurityMonitor;
