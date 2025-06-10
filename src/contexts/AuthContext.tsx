
import { createContext, useContext, useEffect, useState } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { logSecurityEvent, handleError } from "@/utils/error-handler";
import { logAuthEvent } from "@/utils/audit-logger";

type AuthContextType = {
  session: Session | null;
  user: User | null;
  isAdmin: boolean | null;
  loading: boolean;
  adminCheckCompleted: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Session security constants
const SESSION_REFRESH_THRESHOLD = 5 * 60 * 1000; // 5 minutes before expiry
const MAX_SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours
const ADMIN_CHECK_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [adminCheckCompleted, setAdminCheckCompleted] = useState(false);
  const [lastAdminCheck, setLastAdminCheck] = useState<number>(0);

  // Enhanced session validation with audit logging
  const validateSession = (currentSession: Session | null): boolean => {
    if (!currentSession) return false;
    
    const now = Date.now();
    const sessionTime = new Date(currentSession.expires_at || 0).getTime();
    
    // Only check if session is expired (with small buffer)
    if (sessionTime <= now + 60000) { // 1 minute buffer
      logSecurityEvent('Session expired', {
        expiresAt: currentSession.expires_at,
        timeToExpiry: sessionTime - now
      });
      
      logAuthEvent('session_expired', currentSession.user?.id, {
        expiresAt: currentSession.expires_at,
        timeToExpiry: sessionTime - now
      });
      
      return false;
    }
    
    return true;
  };

  // Function to check admin status with caching and audit logging
  const checkAdminStatus = async (userId: string): Promise<boolean> => {
    if (!userId) return false;
    
    const now = Date.now();
    
    // Use cached result if recent enough
    if (now - lastAdminCheck < ADMIN_CHECK_CACHE_DURATION && isAdmin !== null) {
      return isAdmin;
    }
    
    try {
      console.log("Checking admin status for user:", userId);
      
      logAuthEvent('admin_check_initiated', userId);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', userId)
        .single();
      
      if (error) {
        const errorDetails = handleError(error, 'Admin status check');
        logSecurityEvent('Admin check failed', errorDetails);
        logAuthEvent('admin_check_failed', userId, { error: error.message });
        return false;
      }
      
      const adminStatus = data?.is_admin || false;
      setLastAdminCheck(now);
      
      logAuthEvent('admin_check_completed', userId, { 
        isAdmin: adminStatus,
        cached: false 
      });
      
      console.log("Admin check result:", adminStatus);
      return adminStatus;
    } catch (error) {
      const errorDetails = handleError(error, 'Admin status check exception');
      logSecurityEvent('Admin check exception', errorDetails);
      logAuthEvent('admin_check_exception', userId, { error: String(error) });
      return false;
    }
  };

  useEffect(() => {
    console.log("Setting up AuthProvider with enhanced security...");
    
    const handleAuthChange = (event: string, currentSession: Session | null) => {
      console.log("Auth state change event:", event);
      
      // Log all auth state changes
      logAuthEvent(`auth_state_change_${event}`, currentSession?.user?.id, {
        event,
        sessionExists: !!currentSession,
        timestamp: new Date().toISOString()
      });
      
      // Only validate session for existing sessions, not on sign-in events
      if (currentSession && event !== 'SIGNED_IN' && !validateSession(currentSession)) {
        logSecurityEvent('Invalid session detected', { event });
        logAuthEvent('invalid_session_detected', currentSession.user?.id, { event });
        // Force logout for invalid sessions
        supabase.auth.signOut();
        return;
      }
      
      // Update session and user state
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      
      // Handle logout events
      if (event === 'SIGNED_OUT') {
        setIsAdmin(false);
        setAdminCheckCompleted(true);
        setLoading(false);
        setLastAdminCheck(0);
        logSecurityEvent('User signed out', { timestamp: new Date().toISOString() });
        logAuthEvent('user_signed_out', undefined, { 
          timestamp: new Date().toISOString() 
        });
      }
      
      // Log sign-in events
      if (event === 'SIGNED_IN' && currentSession?.user) {
        logSecurityEvent('User signed in', { 
          userId: currentSession.user.id,
          timestamp: new Date().toISOString()
        });
        logAuthEvent('user_signed_in', currentSession.user.id, {
          email: currentSession.user.email,
          timestamp: new Date().toISOString(),
          provider: currentSession.user.app_metadata?.provider
        });
      }
    };
    
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthChange);

    // Check for existing session
    const initSession = async () => {
      try {
        logAuthEvent('session_initialization_started');
        
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        console.log("Initial session check:", currentSession ? "Session found" : "No session");
        
        if (currentSession) {
          // Validate the session only if it's older than a few seconds
          const sessionAge = Date.now() - new Date(currentSession.expires_at || 0).getTime() + (currentSession.expires_in || 3600) * 1000;
          
          if (sessionAge > 10000 && !validateSession(currentSession)) { // Only validate if session is older than 10 seconds
            logSecurityEvent('Invalid initial session', {});
            logAuthEvent('invalid_initial_session', currentSession.user?.id);
            await supabase.auth.signOut();
            setSession(null);
            setUser(null);
            setIsAdmin(false);
            setAdminCheckCompleted(true);
            return;
          }
          
          setSession(currentSession);
          setUser(currentSession.user);
          
          logAuthEvent('existing_session_restored', currentSession.user.id, {
            sessionAge,
            email: currentSession.user.email
          });
          
          // Check admin status
          const adminStatus = await checkAdminStatus(currentSession.user.id);
          setIsAdmin(adminStatus);
          setAdminCheckCompleted(true);
        } else {
          setIsAdmin(false);
          setAdminCheckCompleted(true);
          logAuthEvent('no_existing_session');
        }
        
        setLoading(false);
        logAuthEvent('session_initialization_completed');
      } catch (error) {
        const errorDetails = handleError(error, 'Session initialization');
        logSecurityEvent('Session initialization failed', errorDetails);
        logAuthEvent('session_initialization_failed', undefined, {
          error: String(error)
        });
        
        // Fail safely
        setSession(null);
        setUser(null);
        setIsAdmin(false);
        setAdminCheckCompleted(true);
        setLoading(false);
      }
    };
    
    initSession();

    return () => {
      console.log("Cleaning up AuthProvider...");
      subscription.unsubscribe();
    };
  }, []);

  // Update admin status when user changes
  useEffect(() => {
    const updateAdminStatus = async () => {
      if (user && !loading) {
        console.log("User state changed, updating admin status for:", user.id);
        
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

  const signOut = async () => {
    try {
      console.log("Signing out...");
      const userId = user?.id;
      
      logSecurityEvent('Sign out initiated', { 
        userId,
        timestamp: new Date().toISOString()
      });
      
      logAuthEvent('sign_out_initiated', userId, {
        timestamp: new Date().toISOString()
      });
      
      // Use timeout to prevent deadlocks
      const { error } = await Promise.race([
        supabase.auth.signOut(),
        new Promise<{error: Error}>((_, reject) => 
          setTimeout(() => reject({ error: new Error("Sign out timed out") }), 5000)
        )
      ]);
      
      if (error) {
        const errorDetails = handleError(error, 'Sign out');
        logSecurityEvent('Sign out failed', errorDetails);
        logAuthEvent('sign_out_failed', userId, {
          error: error.message
        });
        throw error;
      }
      
      // Clear all state
      setSession(null);
      setUser(null);
      setIsAdmin(false);
      setLastAdminCheck(0);
      
      logAuthEvent('sign_out_completed', userId);
      console.log("Sign out complete");
    } catch (error) {
      const errorDetails = handleError(error, 'Sign out exception');
      logSecurityEvent('Sign out exception', errorDetails);
      logAuthEvent('sign_out_exception', user?.id, {
        error: String(error)
      });
      
      // Clear state even on error
      setSession(null);
      setUser(null);
      setIsAdmin(false);
      setLastAdminCheck(0);
    }
  };

  const value = {
    session,
    user,
    isAdmin,
    loading,
    adminCheckCompleted,
    signOut,
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
