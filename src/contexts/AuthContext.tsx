
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
const ADMIN_CHECK_CACHE_DURATION = 2 * 60 * 1000; // 2 minutes cache

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [adminCheckCompleted, setAdminCheckCompleted] = useState(false);
  const [lastAdminCheck, setLastAdminCheck] = useState<number>(0);

  // Simple session validation - just check if session exists and is not expired
  const validateSession = (currentSession: Session | null): boolean => {
    if (!currentSession) return false;
    
    const now = Date.now();
    const sessionTime = new Date(currentSession.expires_at || 0).getTime();
    
    // Check if session is expired (with small buffer)
    if (sessionTime <= now + 30000) { // 30 seconds buffer
      logSecurityEvent('Session expired', {
        expiresAt: currentSession.expires_at,
        timeToExpiry: sessionTime - now
      });
      return false;
    }
    
    return true;
  };

  // Improved admin check with better caching
  const checkAdminStatus = async (userId: string, forceRefresh: boolean = false): Promise<boolean> => {
    if (!userId) {
      console.log("No userId provided for admin check");
      return false;
    }
    
    const now = Date.now();
    
    // Use cached result if recent enough and not forcing refresh
    if (!forceRefresh && now - lastAdminCheck < ADMIN_CHECK_CACHE_DURATION && isAdmin !== null) {
      console.log("Using cached admin status:", isAdmin);
      return isAdmin;
    }
    
    try {
      console.log("Performing fresh admin status check for user:", userId);
      
      // Use the database function to avoid RLS recursion
      const { data, error } = await supabase
        .rpc('is_admin_user', { user_id: userId });
      
      if (error) {
        const errorDetails = handleError(error, 'Admin status check');
        logSecurityEvent('Admin check failed', errorDetails);
        console.error("Admin check failed:", error);
        return false;
      }
      
      const adminStatus = data || false;
      setLastAdminCheck(now);
      
      console.log("Fresh admin check result:", adminStatus);
      return adminStatus;
    } catch (error) {
      const errorDetails = handleError(error, 'Admin status check exception');
      logSecurityEvent('Admin check exception', errorDetails);
      console.error("Admin check exception:", error);
      return false;
    }
  };

  useEffect(() => {
    console.log("Setting up AuthProvider...");
    
    const handleAuthChange = async (event: string, currentSession: Session | null) => {
      console.log("Auth state change event:", event, currentSession ? "Session present" : "No session");
      
      // Only validate session for existing sessions, not on sign-in events
      if (currentSession && event !== 'SIGNED_IN' && !validateSession(currentSession)) {
        logSecurityEvent('Invalid session detected', { event });
        console.log("Invalid session detected, signing out");
        // Force logout for invalid sessions
        await supabase.auth.signOut();
        return;
      }
      
      // Update session and user state
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      
      // Handle logout events
      if (event === 'SIGNED_OUT') {
        console.log("User signed out, clearing admin state");
        setIsAdmin(false);
        setAdminCheckCompleted(true);
        setLoading(false);
        setLastAdminCheck(0);
        logSecurityEvent('User signed out', { timestamp: new Date().toISOString() });
        return;
      }
      
      // Handle sign-in events - check admin status
      if (currentSession?.user) {
        if (event === 'SIGNED_IN') {
          logSecurityEvent('User signed in', { 
            userId: currentSession.user.id,
            timestamp: new Date().toISOString()
          });
        }
        
        try {
          console.log("Checking admin status for user:", currentSession.user.id);
          setAdminCheckCompleted(false);
          const adminStatus = await checkAdminStatus(currentSession.user.id, true); // Force refresh on auth change
          setIsAdmin(adminStatus);
          console.log("Admin status set to:", adminStatus);
        } catch (error) {
          console.error("Error checking admin status:", error);
          setIsAdmin(false);
        } finally {
          setAdminCheckCompleted(true);
          setLoading(false);
        }
      } else {
        // No user, complete loading
        setIsAdmin(false);
        setAdminCheckCompleted(true);
        setLoading(false);
      }
    };
    
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthChange);

    // Check for existing session
    const initSession = async () => {
      try {
        console.log("Checking for existing session...");
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        console.log("Initial session check:", currentSession ? "Session found" : "No session");
        
        if (currentSession) {
          // Validate the session
          if (!validateSession(currentSession)) {
            logSecurityEvent('Invalid initial session', {});
            console.log("Initial session invalid, signing out");
            await supabase.auth.signOut();
            setSession(null);
            setUser(null);
            setIsAdmin(false);
            setAdminCheckCompleted(true);
            setLoading(false);
            return;
          }
          
          setSession(currentSession);
          setUser(currentSession.user);
          
          try {
            console.log("Checking admin status for existing session user:", currentSession.user.id);
            const adminStatus = await checkAdminStatus(currentSession.user.id, true); // Force refresh on init
            setIsAdmin(adminStatus);
            console.log("Initial admin status set to:", adminStatus);
          } catch (error) {
            console.error("Error checking initial admin status:", error);
            setIsAdmin(false);
          } finally {
            setAdminCheckCompleted(true);
          }
        } else {
          console.log("No initial session found");
          setIsAdmin(false);
          setAdminCheckCompleted(true);
        }
        
        setLoading(false);
      } catch (error) {
        const errorDetails = handleError(error, 'Session initialization');
        logSecurityEvent('Session initialization failed', errorDetails);
        console.error("Session initialization failed:", error);
        
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
  }, []); // Remove all dependencies to prevent re-runs

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
        console.error("Sign out failed:", error);
        throw error;
      }
      
      // Clear all state
      setSession(null);
      setUser(null);
      setIsAdmin(false);
      setLastAdminCheck(0);
      setAdminCheckCompleted(true);
      
      console.log("Sign out complete");
    } catch (error) {
      const errorDetails = handleError(error, 'Sign out exception');
      logSecurityEvent('Sign out exception', errorDetails);
      console.error("Sign out exception:", error);
      
      // Clear state even on error
      setSession(null);
      setUser(null);
      setIsAdmin(false);
      setLastAdminCheck(0);
      setAdminCheckCompleted(true);
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

  console.log("AuthProvider state:", { 
    hasUser: !!user, 
    isAdmin, 
    loading, 
    adminCheckCompleted 
  });

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
