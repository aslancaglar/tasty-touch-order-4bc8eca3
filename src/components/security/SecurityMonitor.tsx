
import { useEffect, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Shield, WifiOff, Eye } from 'lucide-react';
import { logSecurityEvent } from '@/utils/error-handler';
import { SECURITY_PATTERNS } from '@/config/security';

interface SecurityThreat {
  id: string;
  type: 'network' | 'session' | 'injection' | 'rate_limit' | 'monitoring';
  severity: 'low' | 'medium' | 'high';
  message: string;
  timestamp: number;
  details?: any;
}

const SecurityMonitor = () => {
  const [threats, setThreats] = useState<SecurityThreat[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [monitoringEnabled, setMonitoringEnabled] = useState(true);

  useEffect(() => {
    if (!monitoringEnabled) return;

    // Monitor network status
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
        details: { timestamp: Date.now() }
      });
    };

    // Monitor for potential XSS attempts in URL
    const checkUrlSecurity = () => {
      const url = window.location.href;
      
      for (const pattern of SECURITY_PATTERNS.XSS) {
        if (pattern.test(url)) {
          addThreat({
            type: 'injection',
            severity: 'high',
            message: 'Potential XSS attempt detected in URL',
            details: { url: url.substring(0, 100) }
          });
          logSecurityEvent('XSS attempt detected in URL', { url });
          break;
        }
      }
    };

    // Monitor localStorage for suspicious content
    const checkLocalStorageSecurity = () => {
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          const value = localStorage.getItem(key || '');
          
          if (value) {
            for (const pattern of SECURITY_PATTERNS.XSS) {
              if (pattern.test(value)) {
                addThreat({
                  type: 'injection',
                  severity: 'high',
                  message: 'Suspicious content detected in local storage',
                  details: { key }
                });
                logSecurityEvent('Suspicious localStorage content', { key });
                break;
              }
            }
          }
        }
      } catch (error) {
        console.warn('Could not check localStorage security:', error);
      }
    };

    // Monitor for rapid requests (basic rate limiting detection)
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
      
      // Check for suspicious request patterns
      if (requestCount > 100) { // More than 100 requests per minute
        addThreat({
          type: 'rate_limit',
          severity: 'medium',
          message: 'High request rate detected. Possible automated activity.',
          details: { requestCount, timeWindow: requestWindow }
        });
        logSecurityEvent('High request rate detected', { 
          requestCount, 
          timeWindow: requestWindow 
        });
      }
      
      return originalFetch.apply(window, args);
    };

    // Monitor for DevTools usage (security awareness)
    const checkDevTools = () => {
      const threshold = 160;
      let devtools = {
        opened: false,
        orientation: null as string | null
      };

      const checkOrientation = () => {
        if (window.outerHeight - window.innerHeight > threshold) {
          if (!devtools.opened) {
            devtools.opened = true;
            devtools.orientation = 'horizontal';
            addThreat({
              type: 'monitoring',
              severity: 'low',
              message: 'Developer tools detected. Ensure you trust this environment.',
              details: { orientation: 'horizontal' }
            });
            logSecurityEvent('Developer tools opened', { orientation: 'horizontal' });
          }
        } else if (window.outerWidth - window.innerWidth > threshold) {
          if (!devtools.opened) {
            devtools.opened = true;
            devtools.orientation = 'vertical';
            addThreat({
              type: 'monitoring',
              severity: 'low',
              message: 'Developer tools detected. Ensure you trust this environment.',
              details: { orientation: 'vertical' }
            });
            logSecurityEvent('Developer tools opened', { orientation: 'vertical' });
          }
        } else {
          devtools.opened = false;
          devtools.orientation = null;
        }
      };

      checkOrientation();
      const devToolsTimer = setInterval(checkOrientation, 500);
      
      return () => clearInterval(devToolsTimer);
    };

    // Initialize monitoring
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    checkUrlSecurity();
    checkLocalStorageSecurity();
    
    const cleanupDevTools = checkDevTools();

    // Periodic security checks
    const securityCheckInterval = setInterval(() => {
      checkUrlSecurity();
      checkLocalStorageSecurity();
    }, 30000); // Every 30 seconds

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.fetch = originalFetch;
      cleanupDevTools();
      clearInterval(securityCheckInterval);
    };
  }, [monitoringEnabled]);

  const addThreat = (threat: Omit<SecurityThreat, 'id' | 'timestamp'>) => {
    const newThreat: SecurityThreat = {
      id: `threat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      ...threat
    };

    setThreats(prev => {
      const newThreats = [newThreat, ...prev].slice(0, 5); // Keep only last 5
      return newThreats;
    });

    // Auto-remove low severity threats after 30 seconds
    if (threat.severity === 'low') {
      setTimeout(() => {
        setThreats(prev => prev.filter(t => t.id !== newThreat.id));
      }, 30000);
    }
  };

  const dismissThreat = (threatId: string) => {
    setThreats(prev => prev.filter(t => t.id !== threatId));
  };

  const getSeverityIcon = (severity: SecurityThreat['severity']) => {
    switch (severity) {
      case 'high':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'medium':
        return <Shield className="h-4 w-4 text-yellow-500" />;
      case 'low':
        return <Eye className="h-4 w-4 text-blue-500" />;
      default:
        return <Shield className="h-4 w-4" />;
    }
  };

  const getSeverityColor = (severity: SecurityThreat['severity']) => {
    switch (severity) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      case 'low':
        return 'secondary';
      default:
        return 'default';
    }
  };

  // Show network status if offline
  if (!isOnline) {
    return (
      <div className="fixed top-4 right-4 z-50 max-w-sm">
        <Alert variant="destructive">
          <WifiOff className="h-4 w-4" />
          <AlertTitle>Network Offline</AlertTitle>
          <AlertDescription>
            You are currently offline. Some features may not work properly.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Hide security threats in production for better UX
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  // Show active threats
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {threats.map((threat) => (
        <Alert
          key={threat.id}
          variant={getSeverityColor(threat.severity) as any}
          className="relative pr-8"
        >
          {getSeverityIcon(threat.severity)}
          <AlertTitle className="text-sm font-medium">
            Security Alert ({threat.severity.toUpperCase()})
          </AlertTitle>
          <AlertDescription className="text-sm">
            {threat.message}
          </AlertDescription>
          <button
            onClick={() => dismissThreat(threat.id)}
            className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
            aria-label="Dismiss threat"
          >
            ×
          </button>
        </Alert>
      ))}
    </div>
  );
};

export default SecurityMonitor;
