
import { useEffect, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Shield, WifiOff } from 'lucide-react';
import { logSecurityEvent } from '@/utils/error-handler';
import { supabase } from '@/integrations/supabase/client';

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

  const addThreat = async (threat: SecurityThreat) => {
    setThreats(prev => {
      const newThreats = [threat, ...prev].slice(0, 5); // Keep only last 5
      return newThreats;
    });

    // Log to database
    try {
      await supabase.rpc('log_security_event', {
        _event_type: threat.type,
        _severity: threat.severity,
        _title: threat.message,
        _description: `Detected by SecurityMonitor at ${new Date(threat.timestamp).toISOString()}`,
        _source_ip: window.location.hostname,
        _metadata: { 
          user_agent: navigator.userAgent,
          url: window.location.href,
          timestamp: threat.timestamp
        }
      });
    } catch (error) {
      console.error('Failed to log security event:', error);
    }

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

  // Render security threats if any exist
  if (threats.length === 0 && isOnline) {
    return null; // No threats and online - don't show anything
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-md">
      {/* Show offline status */}
      {!isOnline && (
        <Alert className="border-orange-500 bg-orange-50">
          <WifiOff className="h-4 w-4" />
          <AlertTitle>Network Offline</AlertTitle>
          <AlertDescription>
            Application is running in offline mode. Some features may be limited.
          </AlertDescription>
        </Alert>
      )}
      
      {/* Show security threats */}
      {threats.map((threat) => (
        <Alert 
          key={threat.timestamp} 
          className={`${
            threat.severity === 'high' 
              ? 'border-red-500 bg-red-50' 
              : threat.severity === 'medium'
              ? 'border-yellow-500 bg-yellow-50'
              : 'border-blue-500 bg-blue-50'
          }`}
        >
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle className="flex justify-between items-center">
            <span>Security Alert - {threat.severity.toUpperCase()}</span>
            <button
              onClick={() => dismissThreat(threat.timestamp)}
              className="text-xs hover:font-bold"
            >
              ×
            </button>
          </AlertTitle>
          <AlertDescription>{threat.message}</AlertDescription>
        </Alert>
      ))}
    </div>
  );
};

export default SecurityMonitor;
