
import { createContext, useContext, useEffect, useState, useCallback } from "react";
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

// Constants for timeout and retry logic
const ADMIN_CHECK_TIMEOUT = 10000; // 10 seconds
const MAX_RETRY_ATTEMPTS = 3;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [adminCheckCompleted, setAdminCheckCompleted] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Function to check admin status with timeout and retry logic
  const checkAdminStatus = useCallback(async (userId: string, attempt: number = 1): Promise<boolean> => {
    if (!userId) {
      console.log("No userId provided for admin check");
      return false;
    }
    
    try {
      console.log(`Checking admin status for user: ${userId} (attempt ${attempt})`);
      
      // Create a timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Admin check timeout')), ADMIN_CHECK_TIMEOUT);
      });
      
      // Race between the actual query and timeout
      const adminCheckPromise = supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', userId)
        .single();
      
      const { data, error } = await Promise.race([adminCheckPromise, timeoutPromise]);
      
      if (error) {
        console.error(`Admin check error (attempt ${attempt}):`, error);
        
        // Retry logic for network errors
        if (attempt < MAX_RETRY_ATTEMPTS && (error.message?.includes('network') || error.message?.includes('timeout'))) {
          console.log(`Retrying admin check in 2 seconds... (attempt ${attempt + 1})`);
          await new Promise(resolve => setTimeout(resolve, 2000));
          return checkAdminStatus(userId, attempt + 1);
        }
        
        return false;
      }
      
      const adminStatus = data?.is_admin || false;
      console.log(`Admin check result: ${adminStatus}`);
      return adminStatus;
    } catch (error) {
      console.error(`Admin check exception (attempt ${attempt}):`, error);
      
      // Retry on timeout or network errors
      if (attempt < MAX_RETRY_ATTEMPTS) {
        console.log(`Retrying admin check due to error... (attempt ${attempt + 1})`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        return checkAdminStatus(userId, attempt + 1);
      }
      
      setAuthError(`Failed to verify admin status after ${MAX_RETRY_ATTEMPTS} attempts`);
      return false;
    }
  }, []);

  // Retry authentication function
  const retryAuth = useCallback(async () => {
    console.log("Retrying authentication...");
    setAuthError(null);
    setRetryCount(prev => prev + 1);
    setLoading(true);
    setAdminCheckCompleted(false);
    
    try {
      const { data: { session: currentSession }, error } = await supabase.auth.getSession();
      
      if (error) {
        throw error;
      }
      
      if (currentSession?.user) {
        setSession(currentSession);
        setUser(currentSession.user);
        
        const adminStatus = await checkAdminStatus(currentSession.user.id);
        setIsAdmin(adminStatus);
      } else {
        setSession(null);
        setUser(null);
        setIsAdmin(false);
      }
    } catch (error) {
      console.error("Retry auth error:", error);
      setAuthError("Authentication retry failed. Please refresh the page.");
    } finally {
      setAdminCheckCompleted(true);
      setLoading(false);
    }
  }, [checkAdminStatus]);

  useEffect(() => {
    console.log("AuthProvider initializing...");
    let isMounted = true;
    
    // Get initial session
    const getInitialSession = async () => {
      try {
        console.log("Getting initial session...");
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();
        
        if (!isMounted) {
          console.log("Component unmounted, skipping session setup");
          return;
        }
        
        if (error) {
          console.error("Error getting session:", error);
          setAuthError("Failed to load authentication session");
          setSession(null);
          setUser(null);
          setIsAdmin(false);
          setAdminCheckCompleted(true);
          setLoading(false);
          return;
        }

        console.log("Initial session:", currentSession ? "Found" : "None");
        
        if (currentSession?.user) {
          setSession(currentSession);
          setUser(currentSession.user);
          
          // Check admin status with proper error handling
          try {
            const adminStatus = await checkAdminStatus(currentSession.user.id);
            if (isMounted) {
              setIsAdmin(adminStatus);
              setAdminCheckCompleted(true);
            }
          } catch (error) {
            console.error("Admin check failed during initialization:", error);
            if (isMounted) {
              setIsAdmin(false);
              setAdminCheckCompleted(true);
              setAuthError("Failed to verify admin status");
            }
          }
        } else {
          setSession(null);
          setUser(null);
          setIsAdmin(false);
          setAdminCheckCompleted(true);
        }
        
        if (isMounted) {
          setLoading(false);
        }
      } catch (error) {
        console.error("Session initialization error:", error);
        if (isMounted) {
          setAuthError("Failed to initialize authentication");
          setSession(null);
          setUser(null);
          setIsAdmin(false);
          setAdminCheckCompleted(true);
          setLoading(false);
        }
      }
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        if (!isMounted) {
          console.log("Component unmounted, ignoring auth state change");
          return;
        }
        
        console.log("Auth state change:", event);
        setAuthError(null); // Clear any previous errors
        
        if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          setIsAdmin(false);
          setAdminCheckCompleted(true);
          setLoading(false);
          logSecurityEvent('User signed out', { timestamp: new Date().toISOString() });
        } else if (event === 'SIGNED_IN' && currentSession?.user) {
          setSession(currentSession);
          setUser(currentSession.user);
          setAdminCheckCompleted(false);
          
          logSecurityEvent('User signed in', { 
            userId: currentSession.user.id,
            timestamp: new Date().toISOString()
          });
          
          // Check admin status with proper error handling
          try {
            const adminStatus = await checkAdminStatus(currentSession.user.id);
            if (isMounted) {
              setIsAdmin(adminStatus);
              setAdminCheckCompleted(true);
              setLoading(false);
            }
          } catch (error) {
            console.error("Error checking admin status during sign in:", error);
            if (isMounted) {
              setIsAdmin(false);
              setAdminCheckCompleted(true);
              setLoading(false);
              setAuthError("Failed to verify admin status");
            }
          }
        } else if (event === 'TOKEN_REFRESHED' && currentSession) {
          console.log("Token refreshed");
          setSession(currentSession);
          setUser(currentSession.user);
          setLoading(false);
        } else {
          // Handle other events or no session
          setSession(currentSession);
          setUser(currentSession?.user ?? null);
          
          if (!currentSession) {
            setIsAdmin(false);
            setAdminCheckCompleted(true);
          }
          
          setLoading(false);
        }
      }
    );

    // Get initial session
    getInitialSession();

    return () => {
      console.log("Cleaning up AuthProvider...");
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [checkAdminStatus]);

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
