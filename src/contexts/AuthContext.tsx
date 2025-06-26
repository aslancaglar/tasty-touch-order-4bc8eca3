
import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { logSecurityEvent, handleError } from "@/utils/error-handler";

type AuthContextType = {
  session: Session | null;
  user: User | null;
  isAdmin: boolean | null;
  loading: boolean;
  adminCheckCompleted: boolean;
  authError: string | null;
  signOut: () => Promise<void>;
  retryAuth: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false); // Start as false, only set to true when actually loading
  const [adminCheckCompleted, setAdminCheckCompleted] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  
  const mountedRef = useRef(true);
  const initializedRef = useRef(false);

  // Simplified admin check function
  const checkAdminStatus = useCallback(async (userId: string): Promise<boolean> => {
    if (!userId || !mountedRef.current) return false;
    
    try {
      console.log(`Checking admin status for user: ${userId}`);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.error('Admin check error:', error);
        if (error.code === 'PGRST116') {
          console.log("Profile not found, assuming non-admin user");
          return false;
        }
        return false;
      }
      
      const adminStatus = data?.is_admin || false;
      console.log(`Admin check result: ${adminStatus}`);
      return adminStatus;
    } catch (error) {
      console.error('Admin check exception:', error);
      return false;
    }
  }, []);

  // Retry authentication function
  const retryAuth = useCallback(async () => {
    console.log("Retrying authentication...");
    setAuthError(null);
    setLoading(true);
    setAdminCheckCompleted(false);
    
    try {
      const { data: { session: currentSession }, error } = await supabase.auth.getSession();
      
      if (error) throw error;
      
      if (currentSession?.user && mountedRef.current) {
        setSession(currentSession);
        setUser(currentSession.user);
        
        const adminStatus = await checkAdminStatus(currentSession.user.id);
        if (mountedRef.current) {
          setIsAdmin(adminStatus);
          setAdminCheckCompleted(true);
        }
      } else if (mountedRef.current) {
        setSession(null);
        setUser(null);
        setIsAdmin(false);
        setAdminCheckCompleted(true);
      }
    } catch (error) {
      console.error("Retry auth error:", error);
      if (mountedRef.current) {
        setAuthError("Authentication retry failed. Please refresh the page.");
        setAdminCheckCompleted(true);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [checkAdminStatus]);

  useEffect(() => {
    mountedRef.current = true;
    
    // Only initialize once
    if (initializedRef.current) {
      console.log("AuthProvider already initialized, skipping...");
      return;
    }
    
    initializedRef.current = true;
    console.log("AuthProvider initializing...");
    
    let authSubscription: any = null;

    // Handle auth state changes - simplified without extra loading states
    const handleAuthChange = async (event: string, currentSession: Session | null) => {
      if (!mountedRef.current) return;
      
      console.log("Auth state change:", event);
      setAuthError(null);
      
      if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
        setIsAdmin(false);
        setAdminCheckCompleted(true);
        logSecurityEvent('User signed out', { timestamp: new Date().toISOString() });
        return;
      }
      
      if (currentSession?.user) {
        setSession(currentSession);
        setUser(currentSession.user);
        
        if (event === 'SIGNED_IN') {
          logSecurityEvent('User signed in', { 
            userId: currentSession.user.id,
            timestamp: new Date().toISOString()
          });
        }
        
        // Check admin status without showing loading state
        try {
          const adminStatus = await checkAdminStatus(currentSession.user.id);
          if (mountedRef.current) {
            setIsAdmin(adminStatus);
            setAdminCheckCompleted(true);
          }
        } catch (error) {
          console.error("Error checking admin status:", error);
          if (mountedRef.current) {
            setIsAdmin(false);
            setAdminCheckCompleted(true);
          }
        }
      } else {
        setSession(null);
        setUser(null);
        setIsAdmin(false);
        setAdminCheckCompleted(true);
      }
    };

    // Set up auth listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthChange);
    authSubscription = subscription;

    // Get initial session - no loading state needed
    const initializeAuth = async () => {
      try {
        console.log("Getting initial session...");
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();
        
        if (!mountedRef.current) return;
        
        if (error) {
          console.error("Error getting session:", error);
          setAuthError("Failed to load authentication session");
          setSession(null);
          setUser(null);
          setIsAdmin(false);
          setAdminCheckCompleted(true);
          return;
        }

        console.log("Initial session:", currentSession ? "Found" : "None");
        
        if (currentSession?.user) {
          setSession(currentSession);
          setUser(currentSession.user);
          
          try {
            const adminStatus = await checkAdminStatus(currentSession.user.id);
            if (mountedRef.current) {
              setIsAdmin(adminStatus);
              setAdminCheckCompleted(true);
            }
          } catch (error) {
            console.error("Admin check failed during initialization:", error);
            if (mountedRef.current) {
              setIsAdmin(false);
              setAdminCheckCompleted(true);
            }
          }
        } else {
          setSession(null);
          setUser(null);
          setIsAdmin(false);
          setAdminCheckCompleted(true);
        }
      } catch (error) {
        console.error("Session initialization error:", error);
        if (mountedRef.current) {
          setAuthError("Failed to initialize authentication");
          setSession(null);
          setUser(null);
          setIsAdmin(false);
          setAdminCheckCompleted(true);
        }
      }
    };

    // Initialize auth
    initializeAuth();

    return () => {
      console.log("Cleaning up AuthProvider...");
      mountedRef.current = false;
      initializedRef.current = false;
      
      if (authSubscription) {
        authSubscription.unsubscribe();
      }
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
        console.error("Sign out error:", error);
        throw error;
      }
      
      // Clear all state
      setSession(null);
      setUser(null);
      setIsAdmin(false);
      setAdminCheckCompleted(true);
      setAuthError(null);
      
      console.log("Sign out complete");
    } catch (error) {
      console.error("Sign out exception:", error);
      
      // Clear state even on error
      setSession(null);
      setUser(null);
      setIsAdmin(false);
      setAdminCheckCompleted(true);
      setAuthError("Sign out failed, but session cleared");
    }
  };

  const value = {
    session,
    user,
    isAdmin,
    loading,
    adminCheckCompleted,
    authError,
    signOut,
    retryAuth,
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
