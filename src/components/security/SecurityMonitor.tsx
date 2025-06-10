
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
    // Enhanced network monitoring
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

    // Enhanced security monitoring for new RLS implementation
    const checkUrlSecurity = () => {
      const url = window.location.href;
      const suspiciousPatterns = [
        /<script/i,
        /javascript:/i,
        /vbscript:/i,
        /onload=/i,
        /onerror=/i,
        /union\s+select/i,
        /drop\s+table/i,
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

    // Enhanced session monitoring with RLS compliance
    const monitorSessionSecurity = async () => {
      if (user) {
        try {
          const isValid = await validateSession();
          if (!isValid) {
            addThreat({
              type: 'session',
              severity: 'high',
              message: 'Session security validation failed. Please log in again.',
              timestamp: Date.now()
            });
            logSecurityEvent('Session validation failed in security monitor');
          }
        } catch (error) {
          addThreat({
            type: 'auth',
            severity: 'high',
            message: 'Authentication system error detected.',
            timestamp: Date.now()
          });
          logSecurityEvent('Auth system error in security monitor', { error });
        }
      }
    };

    // Enhanced console monitoring for RLS bypass attempts
    const originalConsoleLog = console.log;
    console.log = (...args) => {
      const message = args.join(' ').toLowerCase();
      const suspiciousTerms = [
        'bypass rls',
        'disable row level security',
        'auth.uid() is null',
        'superuser',
        'security definer',
        'elevation',
        'privilege escalation'
      ];

      for (const term of suspiciousTerms) {
        if (message.includes(term)) {
          addThreat({
            type: 'rls',
            severity: 'critical',
            message: 'Potential security bypass attempt detected in console.',
            timestamp: Date.now()
          });
          logSecurityEvent('Security bypass attempt detected', { message, term });
          break;
        }
      }
      originalConsoleLog.apply(console, args);
    };

    // Enhanced fetch monitoring for RLS compliance
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
      
      // Enhanced rate limiting detection
      if (requestCount > 100) {
        addThreat({
          type: 'rate_limit',
          severity: 'high',
          message: 'Suspicious request rate detected. Possible automated attack.',
          timestamp: Date.now()
        });
        logSecurityEvent('High request rate detected', { 
          requestCount, 
          timeWindow: requestWindow,
          possibleAttack: true
        });
      }

      // Monitor for potential RLS bypass attempts in requests
      const url = args[0]?.toString() || '';
      if (url.includes('rpc') && url.includes('bypass')) {
        addThreat({
          type: 'rls',
          severity: 'critical',
          message: 'Potential RLS bypass attempt detected in API request.',
          timestamp: Date.now()
        });
        logSecurityEvent('RLS bypass attempt in API request', { url });
      }
      
      return originalFetch.apply(window, args);
    };

    // Set up event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Run initial security checks
    checkUrlSecurity();
    
    // Set up periodic session monitoring
    const sessionCheckInterval = setInterval(monitorSessionSecurity, 30000); // Every 30 seconds

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      console.log = originalConsoleLog;
      window.fetch = originalFetch;
      clearInterval(sessionCheckInterval);
    };
  }, [user, validateSession]);

  const addThreat = (threat: SecurityThreat) => {
    setThreats(prev => {
      const newThreats = [threat, ...prev].slice(0, 5); // Keep only last 5
      return newThreats;
    });

    // Auto-remove based on severity
    const removeDelay = threat.severity === 'low' ? 30000 : 
                       threat.severity === 'medium' ? 60000 : 
                       threat.severity === 'high' ? 120000 : 300000; // Critical stays for 5 minutes

    setTimeout(() => {
      setThreats(prev => prev.filter(t => t.timestamp !== threat.timestamp));
    }, removeDelay);
  };

  const dismissThreat = (timestamp: number) => {
    setThreats(prev => prev.filter(t => t.timestamp !== timestamp));
  };

  // Hide security alerts on kiosk routes
  if (isKioskRoute) {
    return null;
  }

  // Enhanced visibility logic for production
  if (process.env.NODE_ENV === 'production' && threats.length === 0) {
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
      {/* Network Status */}
      {!isOnline && (
        <Alert variant="warning">
          <WifiOff className="h-4 w-4" />
          <AlertTitle>Offline</AlertTitle>
          <AlertDescription>
            You're currently offline. Security monitoring is limited.
          </AlertDescription>
        </Alert>
      )}

      {/* Enhanced Security Threats */}
      {threats.map((threat) => (
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
              Type: {threat.type} • Click to dismiss • {new Date(threat.timestamp).toLocaleTimeString()}
            </small>
          </AlertDescription>
        </Alert>
      ))}

      {/* Enhanced Development Mode Indicator */}
      {process.env.NODE_ENV === 'development' && threats.length > 0 && (
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertTitle>Development Mode</AlertTitle>
          <AlertDescription>
            Enhanced security monitoring with RLS compliance is active.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default SecurityMonitor;
