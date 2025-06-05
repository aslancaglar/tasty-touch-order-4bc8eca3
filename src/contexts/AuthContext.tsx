
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

// Admin check cache duration - 5 minutes
const ADMIN_CHECK_CACHE_DURATION = 5 * 60 * 1000;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [adminCheckCompleted, setAdminCheckCompleted] = useState(false);
  const [lastAdminCheck, setLastAdminCheck] = useState<number>(0);

  // Simplified session validation - only check if session exists and is not expired
  const validateSession = (currentSession: Session | null): boolean => {
    if (!currentSession) {
      console.log("[AuthProvider] No session to validate");
      return false;
    }
    
    const now = Date.now();
    const sessionExpiryTime = new Date(currentSession.expires_at || 0).getTime();
    
    // Check if session is expired (with small 1-minute buffer)
    if (sessionExpiryTime <= now + 60000) {
      console.log("[AuthProvider] Session expired", {
        expiresAt: currentSession.expires_at,
        timeToExpiry: sessionExpiryTime - now
      });
      logSecurityEvent('Session expired', {
        expiresAt: currentSession.expires_at,
        timeToExpiry: sessionExpiryTime - now
      });
      return false;
    }
    
    console.log("[AuthProvider] Session is valid");
    return true;
  };

  // Function to check admin status with caching
  const checkAdminStatus = async (userId: string): Promise<boolean> => {
    if (!userId) {
      console.log("[AuthProvider] No userId provided for admin check");
      return false;
    }
    
    const now = Date.now();
    
    // Use cached result if recent enough
    if (now - lastAdminCheck < ADMIN_CHECK_CACHE_DURATION && isAdmin !== null) {
      console.log("[AuthProvider] Using cached admin status:", isAdmin);
      return isAdmin;
    }
    
    try {
      console.log("[AuthProvider] Checking admin status for user:", userId);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', userId)
        .single();
      
      if (error) {
        const errorDetails = handleError(error, 'Admin status check');
        logSecurityEvent('Admin check failed', errorDetails);
        console.error("[AuthProvider] Admin check failed:", errorDetails);
        return false;
      }
      
      const adminStatus = data?.is_admin || false;
      setLastAdminCheck(now);
      
      console.log("[AuthProvider] Admin check result:", adminStatus);
      return adminStatus;
    } catch (error) {
      const errorDetails = handleError(error, 'Admin status check exception');
      logSecurityEvent('Admin check exception', errorDetails);
      console.error("[AuthProvider] Admin check exception:", errorDetails);
      return false;
    }
  };

  useEffect(() => {
    console.log("[AuthProvider] Setting up AuthProvider...");
    
    const handleAuthChange = async (event: string, currentSession: Session | null) => {
      console.log("[AuthProvider] Auth state change event:", event, "Session exists:", !!currentSession);
      
      // For existing sessions (not fresh sign-ins), validate them
      if (currentSession && event !== 'SIGNED_IN') {
        if (!validateSession(currentSession)) {
          console.log("[AuthProvider] Invalid session detected, signing out");
          logSecurityEvent('Invalid session detected', { event });
          await supabase.auth.signOut();
          return;
        }
      }
      
      // Update session and user state
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      
      // Handle logout events
      if (event === 'SIGNED_OUT') {
        console.log("[AuthProvider] User signed out");
        setIsAdmin(false);
        setAdminCheckCompleted(true);
        setLoading(false);
        setLastAdminCheck(0);
        logSecurityEvent('User signed out', { timestamp: new Date().toISOString() });
        return;
      }
      
      // Handle sign-in events
      if (event === 'SIGNED_IN' && currentSession?.user) {
        console.log("[AuthProvider] User signed in:", currentSession.user.id);
        logSecurityEvent('User signed in', { 
          userId: currentSession.user.id,
          timestamp: new Date().toISOString()
        });
      }
      
      // Check admin status for authenticated users
      if (currentSession?.user) {
        console.log("[AuthProvider] Checking admin status for authenticated user");
        setAdminCheckCompleted(false);
        try {
          const adminStatus = await checkAdminStatus(currentSession.user.id);
          setIsAdmin(adminStatus);
        } catch (error) {
          console.error("[AuthProvider] Error checking admin status:", error);
          setIsAdmin(false);
        } finally {
          setAdminCheckCompleted(true);
          setLoading(false);
        }
      } else {
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
        console.log("[AuthProvider] Checking for existing session...");
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        console.log("[AuthProvider] Initial session check:", currentSession ? "Session found" : "No session");
        
        if (currentSession) {
          // Only validate session if it's been around for a while (not a fresh session)
          // This prevents invalidating sessions that were just created
          const sessionCreatedTime = new Date(currentSession.expires_at || 0).getTime() - ((currentSession.expires_in || 3600) * 1000);
          const sessionAge = Date.now() - sessionCreatedTime;
          
          // Only validate if session is older than 30 seconds
          if (sessionAge > 30000 && !validateSession(currentSession)) {
            console.log("[AuthProvider] Invalid initial session, signing out");
            logSecurityEvent('Invalid initial session', {});
            await supabase.auth.signOut();
            setSession(null);
            setUser(null);
            setIsAdmin(false);
            setAdminCheckCompleted(true);
            setLoading(false);
            return;
          }
          
          console.log("[AuthProvider] Valid session found, setting up user state");
          setSession(currentSession);
          setUser(currentSession.user);
          
          // Check admin status
          setAdminCheckCompleted(false);
          try {
            const adminStatus = await checkAdminStatus(currentSession.user.id);
            setIsAdmin(adminStatus);
          } catch (error) {
            console.error("[AuthProvider] Error checking admin status during init:", error);
            setIsAdmin(false);
          } finally {
            setAdminCheckCompleted(true);
          }
        } else {
          console.log("[AuthProvider] No session found");
          setIsAdmin(false);
          setAdminCheckCompleted(true);
        }
        
        setLoading(false);
      } catch (error) {
        const errorDetails = handleError(error, 'Session initialization');
        logSecurityEvent('Session initialization failed', errorDetails);
        console.error("[AuthProvider] Session initialization failed:", errorDetails);
        
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
      console.log("[AuthProvider] Cleaning up AuthProvider...");
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
      console.log("[AuthProvider] Signing out...");
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
        console.error("[AuthProvider] Sign out failed:", errorDetails);
        throw error;
      }
      
      // Clear all state
      setSession(null);
      setUser(null);
      setIsAdmin(false);
      setLastAdminCheck(0);
      
      console.log("[AuthProvider] Sign out complete");
    } catch (error) {
      const errorDetails = handleError(error, 'Sign out exception');
      logSecurityEvent('Sign out exception', errorDetails);
      console.error("[AuthProvider] Sign out exception:", errorDetails);
      
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
