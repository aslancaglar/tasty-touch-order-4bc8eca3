
import { useEffect, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Shield, WifiOff } from 'lucide-react';
import { logSecurityEvent } from '@/utils/error-handler';

interface SecurityThreat {
  type: 'network' | 'session' | 'injection' | 'rate_limit';
  severity: 'low' | 'medium' | 'high';
  message: string;
  timestamp: number;
}

const SecurityMonitor = () => {
  const [threats, setThreats] = useState<SecurityThreat[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
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
        timestamp: Date.now()
      });
    };

    // Monitor for potential XSS attempts in URL
    const checkUrlSecurity = () => {
      const url = window.location.href;
      const suspiciousPatterns = [
        /<script/i,
        /javascript:/i,
        /vbscript:/i,
        /onload=/i,
        /onerror=/i
      ];

      for (const pattern of suspiciousPatterns) {
        if (pattern.test(url)) {
          addThreat({
            type: 'injection',
            severity: 'high',
            message: 'Potential XSS attempt detected in URL',
            timestamp: Date.now()
          });
          logSecurityEvent('XSS attempt detected', { url });
          break;
        }
      }
    };

    // Monitor console for potential attacks
    const originalConsoleLog = console.log;
    console.log = (...args) => {
      const message = args.join(' ').toLowerCase();
      if (message.includes('script') && message.includes('inject')) {
        addThreat({
          type: 'injection',
          severity: 'high',
          message: 'Potential script injection attempt detected',
          timestamp: Date.now()
        });
        logSecurityEvent('Script injection attempt', { message });
      }
      originalConsoleLog.apply(console, args);
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
          timestamp: Date.now()
        });
        logSecurityEvent('High request rate detected', { 
          requestCount, 
          timeWindow: requestWindow 
        });
      }
      
      return originalFetch.apply(window, args);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    checkUrlSecurity();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      console.log = originalConsoleLog;
      window.fetch = originalFetch;
    };
  }, []);

  const addThreat = (threat: SecurityThreat) => {
    setThreats(prev => {
      const newThreats = [threat, ...prev].slice(0, 5); // Keep only last 5
      return newThreats;
    });

    // Auto-remove low severity threats after 30 seconds
    if (threat.severity === 'low') {
      setTimeout(() => {
        setThreats(prev => prev.filter(t => t.timestamp !== threat.timestamp));
      }, 30000);
    }
  };

  const dismissThreat = (timestamp: number) => {
    setThreats(prev => prev.filter(t => t.timestamp !== timestamp));
  };

  // Only show critical security threats in production
  const criticalThreats = threats.filter(threat => threat.severity === 'high');
  
  if (criticalThreats.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm">
      {criticalThreats.map((threat) => (
        <Alert
          key={threat.timestamp}
          variant="destructive"
          className="mb-2 shadow-lg"
        >
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle className="flex items-center justify-between">
            Security Alert
            <button
              onClick={() => dismissThreat(threat.timestamp)}
              className="ml-2 text-sm opacity-70 hover:opacity-100"
            >
              ×
            </button>
          </AlertTitle>
          <AlertDescription className="text-sm">
            {threat.message}
          </AlertDescription>
        </Alert>
      ))}
    </div>
  );
};

export default SecurityMonitor;
