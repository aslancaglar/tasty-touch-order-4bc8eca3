
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

  // Simplified session validation
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
    
    // Check if session is expired
    if (sessionExpiryMs <= now) {
      logSecurityEvent('Session expired', {
        expiresAt: currentSession.expires_at,
        timeToExpiry: sessionExpiryMs - now
      });
      return false;
    }

    return true;
  };

  // Check admin status using the profiles table directly
  const checkAdminStatus = async (userId: string): Promise<boolean> => {
    if (!userId) return false;
    
    const now = Date.now();
    
    // Use cached result if recent enough
    if (now - lastAdminCheck < SECURITY_CONFIG.SESSION.ADMIN_CHECK_CACHE && isAdmin !== null) {
      return isAdmin;
    }
    
    try {
      console.log("Checking admin status for user:", userId);
      
      // Query the profiles table directly to check admin status
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', userId)
        .single();
      
      if (profileError) {
        console.error("Profile query failed:", profileError);
        const errorDetails = handleError(profileError, 'Admin status check - profile query');
        logSecurityEvent('Admin check failed', errorDetails);
        return false;
      }
      
      const adminStatus = profileData?.is_admin || false;
      setLastAdminCheck(now);
      setUserRole(adminStatus ? 'admin' : 'owner');
      
      console.log("Admin status check result:", adminStatus);
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
    console.log("Setting up AuthProvider...");
    
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
        
        // Check admin status for new sessions
        setAdminCheckCompleted(false);
        try {
          const adminStatus = await checkAdminStatus(currentSession.user.id);
          setIsAdmin(adminStatus);
          console.log("New session admin status:", adminStatus);
        } catch (error) {
          console.error("Error checking admin status on sign in:", error);
          setIsAdmin(false);
        } finally {
          setAdminCheckCompleted(true);
        }
      } else if (event === 'TOKEN_REFRESHED' && currentSession) {
        // Don't validate on token refresh - this is a normal operation
        console.log('Token refreshed successfully');
      }
    };
    
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthChange);

    // Initialize session
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
          
          // Check admin status
          setAdminCheckCompleted(false);
          try {
            const adminStatus = await checkAdminStatus(currentSession.user.id);
            setIsAdmin(adminStatus);
            console.log("Initial admin status:", adminStatus);
          } catch (error) {
            console.error("Error during initial admin check:", error);
            setIsAdmin(false);
          } finally {
            setAdminCheckCompleted(true);
          }
        } else {
          setIsAdmin(false);
          setUserRole(null);
          setAdminCheckCompleted(true);
        }
        
        setLoading(false);
      } catch (error) {
        const errorDetails = handleError(error, 'Session initialization');
        logSecurityEvent('Session initialization failed', errorDetails);
        
        // Failure handling
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

    // Periodic session validation (reduced frequency)
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
    }, 300000); // Check every 5 minutes

    return () => {
      console.log("Cleaning up AuthProvider...");
      subscription.unsubscribe();
      clearInterval(validationInterval);
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
          console.log("Updated admin status:", adminStatus);
        } catch (error) {
          console.error("Error updating admin status:", error);
          setIsAdmin(false);
        } finally {
          setAdminCheckCompleted(true);
        }
      }
    };
    
    updateAdminStatus();
  }, [user, loading]);

  // Sign out with security logging
  const signOut = async () => {
    try {
      console.log("Initiating sign out...");
      logSecurityEvent('Sign out initiated', { 
        userId: user?.id,
        timestamp: new Date().toISOString(),
        sessionDuration: sessionStartTime ? Date.now() - sessionStartTime : 0
      });
      
      // Sign out with timeout protection
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
      
      // State cleanup
      setSession(null);
      setUser(null);
      setIsAdmin(false);
      setUserRole(null);
      setLastAdminCheck(0);
      setSessionStartTime(0);
      localStorage.removeItem('session_start');
      
      console.log("Sign out complete");
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
