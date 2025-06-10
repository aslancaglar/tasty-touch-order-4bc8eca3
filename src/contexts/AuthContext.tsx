import { createContext, useContext, useEffect, useState } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { logSecurityEvent, handleError } from "@/utils/error-handler";
import { SECURITY_CONFIG } from "@/config/security";

type AuthContextType = {
  session: Session | null;
  user: User | null;
  isAdmin: boolean | null;
  loading: boolean;
  adminCheckCompleted: boolean;
  signOut: () => Promise<void>;
  userRole: 'admin' | 'owner' | null;
  validateSession: () => Promise<boolean>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [adminCheckCompleted, setAdminCheckCompleted] = useState(false);
  const [lastAdminCheck, setLastAdminCheck] = useState<number>(0);
  const [userRole, setUserRole] = useState<'admin' | 'owner' | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<number>(0);

  // Simplified and more reliable session validation
  const validateSession = async (currentSession: Session | null = session): Promise<boolean> => {
    if (!currentSession) return false;
    
    const now = Date.now();
    const sessionAge = now - sessionStartTime;
    
    // Skip validation for very fresh sessions (less than 5 minutes)
    if (sessionAge < 300000) {
      console.log('Skipping validation for fresh session (less than 5 minutes)');
      return true;
    }
    
    // Check if session is expired with correct timestamp handling
    const sessionExpiryMs = currentSession.expires_at ? currentSession.expires_at * 1000 : 0;
    
    console.log('Session validation:', {
      now,
      expiresAt: currentSession.expires_at,
      sessionExpiryMs,
      timeToExpiry: sessionExpiryMs - now,
      sessionAge,
      isExpired: sessionExpiryMs <= now
    });
    
    // Check if session is expired (no buffer needed for admin operations)
    if (sessionExpiryMs <= now) {
      logSecurityEvent('Session expired', {
        expiresAt: currentSession.expires_at,
        timeToExpiry: sessionExpiryMs - now
      });
      return false;
    }

    // Only use database validation for much older sessions to reduce noise
    if (sessionAge > 1800000) { // 30 minutes
      try {
        const { data, error } = await supabase.rpc('validate_session_security');
        if (error) {
          console.error('Database session validation error:', error);
          return false; // Don't log as security event for DB errors
        }
        return data === true;
      } catch (error) {
        console.error('Session validation exception:', error);
        return false; // Don't log as security event for exceptions
      }
    }
    
    return true;
  };

  // Enhanced admin status check using new RLS-compliant function
  const checkAdminStatus = async (userId: string): Promise<boolean> => {
    if (!userId) return false;
    
    const now = Date.now();
    
    // Use cached result if recent enough
    if (now - lastAdminCheck < SECURITY_CONFIG.SESSION.ADMIN_CHECK_CACHE && isAdmin !== null) {
      return isAdmin;
    }
    
    try {
      console.log("Checking admin status for user:", userId);
      
      // Use the new RLS-compliant function
      const { data, error } = await supabase
        .rpc('is_current_user_admin');
      
      if (error) {
        const errorDetails = handleError(error, 'Admin status check');
        logSecurityEvent('Admin check failed', errorDetails);
        return false;
      }
      
      const adminStatus = data || false;
      setLastAdminCheck(now);
      
      // Also get user role
      const { data: roleData, error: roleError } = await supabase
        .rpc('get_current_user_role');
      
      if (!roleError && roleData) {
        setUserRole(roleData as 'admin' | 'owner');
      } else {
        setUserRole(adminStatus ? 'admin' : 'owner');
      }
      
      console.log("Admin check result:", adminStatus, "Role:", roleData);
      return adminStatus;
    } catch (error) {
      const errorDetails = handleError(error, 'Admin status check exception');
      logSecurityEvent('Admin check exception', errorDetails);
      return false;
    }
  };

  // Session validation API for external use
  const validateSessionAPI = async (): Promise<boolean> => {
    if (!session) return false;
    return await validateSession(session);
  };

  useEffect(() => {
    console.log("Setting up AuthProvider with enhanced security and RLS...");
    
    const handleAuthChange = async (event: string, currentSession: Session | null) => {
      console.log("Auth state change event:", event);
      
      // Update session and user state immediately
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      
      // Handle different auth events
      if (event === 'SIGNED_OUT') {
        setIsAdmin(false);
        setUserRole(null);
        setAdminCheckCompleted(true);
        setLoading(false);
        setLastAdminCheck(0);
        setSessionStartTime(0);
        localStorage.removeItem('session_start');
        logSecurityEvent('User signed out', { 
          timestamp: new Date().toISOString(),
          reason: 'User initiated or session expired'
        });
      } else if (event === 'SIGNED_IN' && currentSession?.user) {
        // Set session start time for new sessions
        const startTime = Date.now();
        setSessionStartTime(startTime);
        localStorage.setItem('session_start', startTime.toString());
        logSecurityEvent('User signed in', { 
          userId: currentSession.user.id,
          timestamp: new Date().toISOString(),
          sessionExpiry: currentSession.expires_at
        });
      } else if (event === 'TOKEN_REFRESHED' && currentSession) {
        // Don't validate on token refresh - this is a normal operation
        console.log('Token refreshed successfully');
      }
    };
    
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthChange);

    // Enhanced session initialization
    const initSession = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        console.log("Initial session check:", currentSession ? "Session found" : "No session");
        
        if (currentSession) {
          // Set session start time from localStorage or current time
          const storedStartTime = localStorage.getItem('session_start');
          const startTime = storedStartTime ? parseInt(storedStartTime) : Date.now();
          setSessionStartTime(startTime);
          
          // If no stored start time, this is a fresh session
          if (!storedStartTime) {
            localStorage.setItem('session_start', startTime.toString());
          }
          
          setSession(currentSession);
          setUser(currentSession.user);
          
          // Check admin status using new RLS-compliant method
          const adminStatus = await checkAdminStatus(currentSession.user.id);
          setIsAdmin(adminStatus);
          setAdminCheckCompleted(true);
        } else {
          setIsAdmin(false);
          setUserRole(null);
          setAdminCheckCompleted(true);
        }
        
        setLoading(false);
      } catch (error) {
        const errorDetails = handleError(error, 'Enhanced session initialization');
        logSecurityEvent('Session initialization failed', errorDetails);
        
        // Enhanced failure handling
        setSession(null);
        setUser(null);
        setIsAdmin(false);
        setUserRole(null);
        setAdminCheckCompleted(true);
        setLoading(false);
        setSessionStartTime(0);
        localStorage.removeItem('session_start');
      }
    };
    
    initSession();

    // Reduce frequency of periodic session validation to prevent noise
    const validationInterval = setInterval(async () => {
      if (session) {
        const sessionAge = Date.now() - sessionStartTime;
        if (sessionAge > 1800000) { // Only validate sessions older than 30 minutes
          const isValid = await validateSession(session);
          if (!isValid) {
            logSecurityEvent('Session validation failed during periodic check');
            await supabase.auth.signOut();
          }
        }
      }
    }, 300000); // Check every 5 minutes instead of every minute

    return () => {
      console.log("Cleaning up enhanced AuthProvider...");
      subscription.unsubscribe();
      clearInterval(validationInterval);
    };
  }, []);

  // Enhanced admin status updates
  useEffect(() => {
    const updateAdminStatus = async () => {
      if (user && !loading) {
        console.log("User state changed, updating admin status with RLS compliance for:", user.id);
        
        try {
          setAdminCheckCompleted(false);
          const adminStatus = await checkAdminStatus(user.id);
          setIsAdmin(adminStatus);
        } finally {
          setAdminCheckCompleted(true);
        }
      }
    };
    
    updateAdminStatus();
  }, [user, loading]);

  // Enhanced sign out with security logging
  const signOut = async () => {
    try {
      console.log("Initiating secure sign out...");
      logSecurityEvent('Sign out initiated', { 
        userId: user?.id,
        timestamp: new Date().toISOString(),
        sessionDuration: sessionStartTime ? Date.now() - sessionStartTime : 0
      });
      
      // Enhanced sign out with timeout protection
      const { error } = await Promise.race([
        supabase.auth.signOut(),
        new Promise<{error: Error}>((_, reject) => 
          setTimeout(() => reject({ error: new Error("Sign out timed out") }), 5000)
        )
      ]);
      
      if (error) {
        const errorDetails = handleError(error, 'Sign out');
        logSecurityEvent('Sign out failed', errorDetails);
        throw error;
      }
      
      // Enhanced state cleanup
      setSession(null);
      setUser(null);
      setIsAdmin(false);
      setUserRole(null);
      setLastAdminCheck(0);
      setSessionStartTime(0);
      localStorage.removeItem('session_start');
      
      console.log("Secure sign out complete");
    } catch (error) {
      const errorDetails = handleError(error, 'Sign out exception');
      logSecurityEvent('Sign out exception', errorDetails);
      
      // Force cleanup even on error
      setSession(null);
      setUser(null);
      setIsAdmin(false);
      setUserRole(null);
      setLastAdminCheck(0);
      setSessionStartTime(0);
      localStorage.removeItem('session_start');
    }
  };

  const value = {
    session,
    user,
    isAdmin,
    loading,
    adminCheckCompleted,
    signOut,
    userRole,
    validateSession: validateSessionAPI,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
