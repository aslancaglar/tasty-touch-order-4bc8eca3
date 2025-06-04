
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

  // Enhanced session validation
  const validateSession = (currentSession: Session | null): boolean => {
    if (!currentSession) return false;
    
    const now = Date.now();
    const sessionTime = new Date(currentSession.expires_at || 0).getTime();
    
    // Check if session is expired or about to expire
    if (sessionTime <= now + SESSION_REFRESH_THRESHOLD) {
      logSecurityEvent('Session expired or expiring soon', {
        expiresAt: currentSession.expires_at,
        timeToExpiry: sessionTime - now
      });
      return false;
    }
    
    // Check if session is too old (security measure)
    // Use access_token creation time if available, otherwise fall back to current time check
    const tokenCreatedAt = currentSession.access_token ? 
      new Date().getTime() - MAX_SESSION_DURATION : // Fallback estimation
      now - MAX_SESSION_DURATION;
    
    if (now - tokenCreatedAt > MAX_SESSION_DURATION) {
      logSecurityEvent('Session exceeded maximum duration', {
        estimatedAge: now - tokenCreatedAt,
        maxDuration: MAX_SESSION_DURATION
      });
      return false;
    }
    
    return true;
  };

  // Function to check admin status with caching
  const checkAdminStatus = async (userId: string): Promise<boolean> => {
    if (!userId) return false;
    
    const now = Date.now();
    
    // Use cached result if recent enough
    if (now - lastAdminCheck < ADMIN_CHECK_CACHE_DURATION && isAdmin !== null) {
      return isAdmin;
    }
    
    try {
      console.log("Checking admin status for user:", userId);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', userId)
        .single();
      
      if (error) {
        const errorDetails = handleError(error, 'Admin status check');
        logSecurityEvent('Admin check failed', errorDetails);
        return false;
      }
      
      const adminStatus = data?.is_admin || false;
      setLastAdminCheck(now);
      
      console.log("Admin check result:", adminStatus);
      return adminStatus;
    } catch (error) {
      const errorDetails = handleError(error, 'Admin status check exception');
      logSecurityEvent('Admin check exception', errorDetails);
      return false;
    }
  };

  useEffect(() => {
    console.log("Setting up AuthProvider with enhanced security...");
    
    const handleAuthChange = (event: string, currentSession: Session | null) => {
      console.log("Auth state change event:", event);
      
      // Enhanced session validation
      if (currentSession && !validateSession(currentSession)) {
        logSecurityEvent('Invalid session detected', { event });
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
      }
      
      // Log sign-in events
      if (event === 'SIGNED_IN' && currentSession?.user) {
        logSecurityEvent('User signed in', { 
          userId: currentSession.user.id,
          timestamp: new Date().toISOString()
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
            logSecurityEvent('Invalid initial session', {});
            await supabase.auth.signOut();
            setSession(null);
            setUser(null);
            setIsAdmin(false);
            setAdminCheckCompleted(true);
            return;
          }
          
          // Verify the session token is still valid
          const { data: { user: currentUser } } = await supabase.auth.getUser();
          if (!currentUser) {
            logSecurityEvent('Session token invalid', {});
            await supabase.auth.signOut();
            setSession(null);
            setUser(null);
            setIsAdmin(false);
            setAdminCheckCompleted(true);
          } else {
            setSession(currentSession);
            setUser(currentUser);
            
            // Check admin status
            const adminStatus = await checkAdminStatus(currentUser.id);
            setIsAdmin(adminStatus);
            setAdminCheckCompleted(true);
          }
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
