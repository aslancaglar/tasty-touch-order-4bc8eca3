
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
  const isSessionValid = (currentSession: Session | null): boolean => {
    if (!currentSession) return false;
    
    const now = Date.now();
    const sessionTime = new Date(currentSession.expires_at || 0).getTime();
    
    // Only check if session is expired with a small buffer
    return sessionTime > now + 30000; // 30 second buffer
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
    console.log("Setting up AuthProvider...");
    
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log("Auth state change event:", event);
        
        // Update session and user state
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        
        // Handle different auth events
        if (event === 'SIGNED_OUT') {
          setIsAdmin(false);
          setAdminCheckCompleted(true);
          setLoading(false);
          setLastAdminCheck(0);
          logSecurityEvent('User signed out', { timestamp: new Date().toISOString() });
        } else if (event === 'SIGNED_IN' && currentSession?.user) {
          logSecurityEvent('User signed in', { 
            userId: currentSession.user.id,
            timestamp: new Date().toISOString()
          });
          
          // Check admin status for signed in user
          setAdminCheckCompleted(false);
          const adminStatus = await checkAdminStatus(currentSession.user.id);
          setIsAdmin(adminStatus);
          setAdminCheckCompleted(true);
          setLoading(false);
        } else if (currentSession && isSessionValid(currentSession)) {
          // Valid existing session - check admin status if needed
          if (!adminCheckCompleted || isAdmin === null) {
            setAdminCheckCompleted(false);
            const adminStatus = await checkAdminStatus(currentSession.user.id);
            setIsAdmin(adminStatus);
            setAdminCheckCompleted(true);
          }
          setLoading(false);
        } else {
          // No valid session
          setIsAdmin(false);
          setAdminCheckCompleted(true);
          setLoading(false);
        }
      }
    );

    // Check for existing session on initialization
    const initSession = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        console.log("Initial session check:", currentSession ? "Session found" : "No session");
        
        if (currentSession && isSessionValid(currentSession)) {
          setSession(currentSession);
          setUser(currentSession.user);
          
          // Check admin status
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

  const signOut = async () => {
    try {
      console.log("Signing out...");
      logSecurityEvent('Sign out initiated', { 
        userId: user?.id,
        timestamp: new Date().toISOString()
      });
      
      const { error } = await supabase.auth.signOut();
      
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
