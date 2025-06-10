
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Shield, WifiOff, Lock } from 'lucide-react';
import { logSecurityEvent } from '@/config/security';
import { useAuth } from '@/contexts/AuthContext';

interface SecurityThreat {
  type: 'network' | 'session' | 'injection' | 'rate_limit' | 'auth' | 'rls';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: number;
}

const SecurityMonitor = () => {
  const [threats, setThreats] = useState<SecurityThreat[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const { validateSession, user } = useAuth();
  const location = useLocation();

  // Check if current route is a kiosk route
  const isKioskRoute = location.pathname.startsWith('/r/');

  useEffect(() => {
    // Network monitoring
    const handleOnline = () => {
      setIsOnline(true);
      logSecurityEvent('Network connection restored');
    };

    const handleOffline = () => {
      setIsOnline(false);
      logSecurityEvent('Network connection lost');
      addThreat({
        type: 'network',
        severity: 'medium',
        message: 'Network connection lost. Data may not be synchronized.',
        timestamp: Date.now()
      });
    };

    // Much more selective security monitoring - only for critical threats
    const checkUrlSecurity = () => {
      const url = window.location.href;
      const suspiciousPatterns = [
        /<script/i,
        /javascript:/i,
        /vbscript:/i,
        /onload=/i,
        /onerror=/i,
      ];

      for (const pattern of suspiciousPatterns) {
        if (pattern.test(url)) {
          addThreat({
            type: 'injection',
            severity: 'critical',
            message: 'Potential security attack detected in URL. Please report this immediately.',
            timestamp: Date.now()
          });
          logSecurityEvent('Security attack detected', { url, pattern: pattern.source });
          break;
        }
      }
    };

    // Very limited session monitoring - only for critical session issues
    const monitorSessionSecurity = async () => {
      if (user && !isKioskRoute) {
        try {
          // Only validate sessions older than 30 minutes to reduce noise
          const sessionStart = parseInt(localStorage.getItem('session_start') || '0');
          const sessionAge = Date.now() - sessionStart;
          
          // Only show session alerts for very old sessions
          if (sessionAge > 1800000) { // 30 minutes
            const isValid = await validateSession();
            if (!isValid) {
              addThreat({
                type: 'session',
                severity: 'high',
                message: 'Session has expired. Please log in again.',
                timestamp: Date.now()
              });
              logSecurityEvent('Session expired in security monitor');
            }
          }
        } catch (error) {
          // Don't create threats for auth system errors
          console.log('Auth system check completed', { error });
        }
      }
    };

    // Minimal rate limiting detection
    let requestCount = 0;
    const requestWindow = 60000; // 1 minute
    let windowStart = Date.now();

    const originalFetch = window.fetch;
    window.fetch = (...args) => {
      const now = Date.now();
      
      // Reset window if needed
      if (now - windowStart > requestWindow) {
        requestCount = 0;
        windowStart = now;
      }
      
      requestCount++;
      
      // Only alert for very high request rates
      if (requestCount > 200) {
        addThreat({
          type: 'rate_limit',
          severity: 'high',
          message: 'Very high request rate detected. Possible automated attack.',
          timestamp: Date.now()
        });
        logSecurityEvent('Very high request rate detected', { 
          requestCount, 
          timeWindow: requestWindow,
          possibleAttack: true
        });
      }
      
      return originalFetch.apply(window, args);
    };

    // Set up event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Run initial security checks only if not on kiosk routes
    if (!isKioskRoute) {
      checkUrlSecurity();
    }
    
    // Much less frequent session monitoring
    const sessionCheckInterval = setInterval(monitorSessionSecurity, 300000); // Every 5 minutes

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.fetch = originalFetch;
      clearInterval(sessionCheckInterval);
    };
  }, [user, validateSession, isKioskRoute]);

  const addThreat = (threat: SecurityThreat) => {
    setThreats(prev => {
      const newThreats = [threat, ...prev].slice(0, 2); // Reduce to max 2 threats
      return newThreats;
    });

    // Auto-remove threats faster to reduce noise
    const removeDelay = threat.severity === 'low' ? 10000 : 
                       threat.severity === 'medium' ? 20000 : 
                       threat.severity === 'high' ? 30000 : 60000; // Faster removal

    setTimeout(() => {
      setThreats(prev => prev.filter(t => t.timestamp !== threat.timestamp));
    }, removeDelay);
  };

  const dismissThreat = (timestamp: number) => {
    setThreats(prev => prev.filter(t => t.timestamp !== timestamp));
  };

  // Hide security alerts on kiosk routes completely
  if (isKioskRoute) {
    return null;
  }

  // In production, only show critical threats
  if (process.env.NODE_ENV === 'production' && threats.length === 0) {
    return null;
  }

  // Filter to only show high and critical threats
  const filteredThreats = threats.filter(t => t.severity === 'high' || t.severity === 'critical');

  // Don't show anything if no serious threats
  if (filteredThreats.length === 0 && isOnline) {
    return null;
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <Lock className="h-4 w-4" />;
      case 'high':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Shield className="h-4 w-4" />;
    }
  };

  const getSeverityVariant = (severity: string) => {
    return (severity === 'high' || severity === 'critical') ? 'destructive' : 'warning';
  };

  return (
    <div className="fixed bottom-4 left-4 z-50 space-y-2 max-w-sm">
      {/* Network Status - only show if offline */}
      {!isOnline && (
        <Alert variant="warning">
          <WifiOff className="h-4 w-4" />
          <AlertTitle>Offline</AlertTitle>
          <AlertDescription>
            You're currently offline. Some features may not work.
          </AlertDescription>
        </Alert>
      )}

      {/* Only show critical security threats */}
      {filteredThreats.map((threat) => (
        <Alert 
          key={threat.timestamp}
          variant={getSeverityVariant(threat.severity)}
          className="cursor-pointer"
          onClick={() => dismissThreat(threat.timestamp)}
        >
          {getSeverityIcon(threat.severity)}
          <AlertTitle>
            Security Alert ({threat.severity.toUpperCase()})
          </AlertTitle>
          <AlertDescription>
            {threat.message}
            <br />
            <small className="text-xs opacity-75">
              Click to dismiss • {new Date(threat.timestamp).toLocaleTimeString()}
            </small>
          </AlertDescription>
        </Alert>
      ))}
    </div>
  );
};

export default SecurityMonitor;
