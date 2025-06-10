
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { logSecurityEvent, handleError } from '@/utils/error-handler';
import { SECURITY_CONFIG } from '@/config/security';

interface SecurityContextType {
  sessionSecure: boolean;
  lastActivity: number;
  updateActivity: () => void;
  checkSessionSecurity: () => boolean;
}

const SecurityContext = createContext<SecurityContextType | undefined>(undefined);

export const useSecurityContext = () => {
  const context = useContext(SecurityContext);
  if (!context) {
    throw new Error('useSecurityContext must be used within SecurityProvider');
  }
  return context;
};

interface SecurityProviderProps {
  children: React.ReactNode;
}

export const SecurityProvider: React.FC<SecurityProviderProps> = ({ children }) => {
  const { user, session, signOut } = useAuth();
  const [sessionSecure, setSessionSecure] = useState(true);
  const [lastActivity, setLastActivity] = useState(Date.now());

  // Enhanced session security checks
  const checkSessionSecurity = (): boolean => {
    if (!session || !user) return true; // No session to validate

    const now = Date.now();
    const sessionAge = now - new Date(session.expires_at || 0).getTime() + (session.expires_in || 3600) * 1000;
    
    // Check for session age (max 24 hours)
    if (sessionAge > SECURITY_CONFIG.SESSION.MAX_DURATION) {
      logSecurityEvent('Session expired due to age', {
        sessionAge,
        maxDuration: SECURITY_CONFIG.SESSION.MAX_DURATION,
        userId: user.id
      });
      signOut();
      return false;
    }

    // Check for inactivity (30 minutes)
    const inactiveTime = now - lastActivity;
    const maxInactivity = 30 * 60 * 1000; // 30 minutes
    
    if (inactiveTime > maxInactivity) {
      logSecurityEvent('Session expired due to inactivity', {
        inactiveTime,
        maxInactivity,
        userId: user.id
      });
      signOut();
      return false;
    }

    return true;
  };

  const updateActivity = () => {
    setLastActivity(Date.now());
  };

  // Monitor user activity
  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    const activityHandler = () => {
      updateActivity();
    };

    events.forEach(event => {
      document.addEventListener(event, activityHandler, true);
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, activityHandler, true);
      });
    };
  }, []);

  // Regular security checks
  useEffect(() => {
    if (!user || !session) return;

    const securityInterval = setInterval(() => {
      const secure = checkSessionSecurity();
      setSessionSecure(secure);
    }, 60000); // Check every minute

    return () => clearInterval(securityInterval);
  }, [user, session, lastActivity]);

  // Log security events
  useEffect(() => {
    if (user) {
      logSecurityEvent('Security provider initialized', {
        userId: user.id,
        timestamp: new Date().toISOString()
      });
    }
  }, [user]);

  const value = {
    sessionSecure,
    lastActivity,
    updateActivity,
    checkSessionSecurity,
  };

  return (
    <SecurityContext.Provider value={value}>
      {children}
    </SecurityContext.Provider>
  );
};
