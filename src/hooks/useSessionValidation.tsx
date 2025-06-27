
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { SECURITY_CONFIG } from '@/config/security';
import { logSecurityEvent } from '@/utils/error-handler';

interface SessionValidationState {
  isValidSession: boolean;
  isTokenValid: boolean;
  expiresAt: number | null;
  lastValidated: number;
}

export const useSessionValidation = () => {
  const { user, session } = useAuth();
  const [sessionState, setSessionState] = useState<SessionValidationState>({
    isValidSession: false,
    isTokenValid: false,
    expiresAt: null,
    lastValidated: 0
  });

  // Validate JWT token expiry
  const validateTokenExpiry = useCallback((): boolean => {
    if (!session?.access_token) return false;

    try {
      // Decode JWT token to check expiry
      const tokenPayload = JSON.parse(atob(session.access_token.split('.')[1]));
      const expiryTime = tokenPayload.exp * 1000; // Convert to milliseconds
      const currentTime = Date.now();
      const bufferTime = SECURITY_CONFIG.SESSION.JWT_EXPIRY_BUFFER;

      // Check if token expires within buffer time
      return expiryTime > (currentTime + bufferTime);
    } catch (error) {
      logSecurityEvent('JWT token validation failed', { error: String(error) });
      return false;
    }
  }, [session]);

  // Server-side session validation
  const validateServerSession = useCallback(async (): Promise<boolean> => {
    if (!user) return false;

    try {
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        logSecurityEvent('Session validation failed', { error: error.message });
        return false;
      }

      return !!data.session && data.session.user.id === user.id;
    } catch (error) {
      logSecurityEvent('Session validation exception', { error: String(error) });
      return false;
    }
  }, [user]);

  // Check admin status server-side
  const validateAdminStatus = useCallback(async (): Promise<boolean> => {
    if (!user) return false;

    try {
      const { data, error } = await supabase
        .rpc('get_current_user_admin_status');

      if (error) {
        logSecurityEvent('Admin status check failed', { 
          userId: user.id, 
          error: error.message 
        });
        return false;
      }

      return data === true;
    } catch (error) {
      logSecurityEvent('Admin status check exception', { 
        userId: user.id, 
        error: String(error) 
      });
      return false;
    }
  }, [user]);

  // Refresh session if needed
  const refreshSession = useCallback(async (): Promise<boolean> => {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        logSecurityEvent('Session refresh failed', { error: error.message });
        return false;
      }

      logSecurityEvent('Session refreshed successfully', { userId: user?.id });
      return !!data.session;
    } catch (error) {
      logSecurityEvent('Session refresh exception', { error: String(error) });
      return false;
    }
  }, [user]);

  // Main validation function
  const validateSession = useCallback(async (): Promise<boolean> => {
    const now = Date.now();
    
    // Skip validation if recently validated
    if (now - sessionState.lastValidated < SECURITY_CONFIG.SESSION.ADMIN_CHECK_CACHE) {
      return sessionState.isValidSession;
    }

    const isTokenValid = validateTokenExpiry();
    const isServerSessionValid = await validateServerSession();

    // Refresh token if it's about to expire but server session is valid
    if (!isTokenValid && isServerSessionValid) {
      const refreshed = await refreshSession();
      if (!refreshed) {
        setSessionState(prev => ({
          ...prev,
          isValidSession: false,
          isTokenValid: false,
          lastValidated: now
        }));
        return false;
      }
    }

    const isValid = isTokenValid && isServerSessionValid;
    
    setSessionState({
      isValidSession: isValid,
      isTokenValid,
      expiresAt: session?.expires_at ? new Date(session.expires_at).getTime() : null,
      lastValidated: now
    });

    return isValid;
  }, [session, sessionState.lastValidated, validateTokenExpiry, validateServerSession, refreshSession]);

  // Validate admin operations
  const validateAdminOperation = useCallback(async (): Promise<boolean> => {
    const isSessionValid = await validateSession();
    if (!isSessionValid) return false;

    const isAdmin = await validateAdminStatus();
    if (!isAdmin) {
      logSecurityEvent('Unauthorized admin operation attempt', { 
        userId: user?.id,
        timestamp: new Date().toISOString()
      });
    }

    return isAdmin;
  }, [validateSession, validateAdminStatus, user]);

  // Auto-validate session on mount and user change
  useEffect(() => {
    if (user && session) {
      validateSession();
    }
  }, [user, session, validateSession]);

  return {
    ...sessionState,
    validateSession,
    validateAdminOperation,
    refreshSession,
    validateAdminStatus
  };
};
