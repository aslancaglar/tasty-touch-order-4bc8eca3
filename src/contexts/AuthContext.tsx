import { createContext, useContext, useEffect, useState } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { logSecurityEvent, handleError } from "@/utils/error-handler";

type AuthContextType = {
  session: Session | null;
  user: User | null;
  isAdmin: boolean | null;
  loading: boolean;
  adminCheckCompleted: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Session security constants - imported from security config
import { SECURITY_CONFIG } from "@/config/security";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [adminCheckCompleted, setAdminCheckCompleted] = useState(false);
  const [lastAdminCheck, setLastAdminCheck] = useState<number>(0);

  // Enhanced session validation with security logging
  const validateSession = (currentSession: Session | null): boolean => {
    if (!currentSession) return false;
    
    const now = Date.now();
    const sessionTime = new Date(currentSession.expires_at || 0).getTime();
    
    // Check if session is expired
    if (sessionTime <= now + SECURITY_CONFIG.SESSION.REFRESH_THRESHOLD) {
      logSecurityEvent('Session expired', {
        expiresAt: currentSession.expires_at,
        timeToExpiry: sessionTime - now,
        userId: currentSession.user?.id
      });
      return false;
    }
    
    // Check for session age (prevent indefinite sessions)
    const sessionAge = now - new Date(currentSession.user?.created_at || 0).getTime();
    if (sessionAge > SECURITY_CONFIG.SESSION.MAX_DURATION_MS) {
      logSecurityEvent('Session too old', {
        sessionAge: sessionAge,
        userId: currentSession.user?.id
      });
      return false;
    }
    
    return true;
  };

  // Enhanced admin status check with better error handling
  const checkAdminStatus = async (userId: string): Promise<boolean> => {
    if (!userId) return false;
    
    const now = Date.now();
    
    // Use cached result if recent enough
    if (now - lastAdminCheck < SECURITY_CONFIG.SESSION.ADMIN_CHECK_CACHE && isAdmin !== null) {
      return isAdmin;
    }
    
    try {
      console.log("Checking admin status for user:", userId);
      
      // Use the new secure RLS policies
      const { data, error } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', userId)
        .single();
      
      if (error) {
        const errorDetails = handleError(error, 'Admin status check');
        logSecurityEvent('Admin check failed', {
          ...errorDetails,
          userId: userId
        });
        return false;
      }
      
      const adminStatus = data?.is_admin || false;
      setLastAdminCheck(now);
      
      console.log("Admin check result:", adminStatus);
      logSecurityEvent('Admin status verified', {
        userId: userId,
        isAdmin: adminStatus
      });
      
      return adminStatus;
    } catch (error) {
      const errorDetails = handleError(error, 'Admin status check exception');
      logSecurityEvent('Admin check exception', {
        ...errorDetails,
        userId: userId
      });
      return false;
    }
  };

  useEffect(() => {
    console.log("Setting up AuthProvider with enhanced security...");
    
    const handleAuthChange = (event: string, currentSession: Session | null) => {
      console.log("Auth state change event:", event);
      
      // Log all auth events for security monitoring
      logSecurityEvent('Auth state change', {
        event: event,
        userId: currentSession?.user?.id,
        timestamp: new Date().toISOString()
      });
      
      // Only validate session for existing sessions, not on sign-in events
      if (currentSession && event !== 'SIGNED_IN' && !validateSession(currentSession)) {
        logSecurityEvent('Invalid session detected during auth change', { 
          event: event,
          userId: currentSession?.user?.id 
        });
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
        logSecurityEvent('User signed out', { 
          timestamp: new Date().toISOString() 
        });
      }
      
      // Log sign-in events with enhanced details
      if (event === 'SIGNED_IN' && currentSession?.user) {
        logSecurityEvent('User signed in', { 
          userId: currentSession.user.id,
          email: currentSession.user.email,
          timestamp: new Date().toISOString(),
          provider: currentSession.user.app_metadata?.provider
        });
      }
    };
    
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthChange);

    // Check for existing session with enhanced validation
    const initSession = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        console.log("Initial session check:", currentSession ? "Session found" : "No session");
        
        if (currentSession) {
          // Validate the session
          if (!validateSession(currentSession)) {
            logSecurityEvent('Invalid initial session', {
              userId: currentSession?.user?.id
            });
            await supabase.auth.signOut();
            setSession(null);
            setUser(null);
            setIsAdmin(false);
            setAdminCheckCompleted(true);
            return;
          }
          
          setSession(currentSession);
          setUser(currentSession.user);
          
          // Check admin status with the new secure function
          const adminStatus = await checkAdminStatus(currentSession.user.id);
          setIsAdmin(adminStatus);
          setAdminCheckCompleted(true);
        } else {
          setIsAdmin(false);
          setAdminCheckCompleted(true);
        }
        
        setLoading(false);
      } catch (error) {
        const errorDetails = handleError(error, 'Session initialization');
        logSecurityEvent('Session initialization failed', errorDetails);
        
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
      logSecurityEvent('Sign out initiated', { 
        userId: user?.id,
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
        throw error;
      }
      
      // Clear all state
      setSession(null);
      setUser(null);
      setIsAdmin(false);
      setLastAdminCheck(0);
      
      console.log("Sign out complete");
      logSecurityEvent('Sign out completed', {
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      const errorDetails = handleError(error, 'Sign out exception');
      logSecurityEvent('Sign out exception', errorDetails);
      
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
