
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

// Constants for timeout and retry logic
const ADMIN_CHECK_TIMEOUT = 8000; // Reduced from 10 seconds
const MAX_RETRY_ATTEMPTS = 2; // Reduced from 3

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [adminCheckCompleted, setAdminCheckCompleted] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  
  // Use refs to prevent multiple initializations
  const initializationRef = useRef(false);
  const adminCheckRef = useRef<{ [key: string]: Promise<boolean> }>({});

  // Function to check admin status with timeout and retry logic
  const checkAdminStatus = useCallback(async (userId: string, attempt: number = 1): Promise<boolean> => {
    if (!userId) {
      console.log("No userId provided for admin check");
      return false;
    }
    
    // Use cached promise if already checking this user
    const cacheKey = `${userId}-${attempt}`;
    if (adminCheckRef.current[cacheKey]) {
      return adminCheckRef.current[cacheKey];
    }
    
    const promise = (async () => {
      try {
        console.log(`Checking admin status for user: ${userId} (attempt ${attempt})`);
        
        const { data, error } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', userId)
          .single();
        
        if (error) {
          console.error(`Admin check error (attempt ${attempt}):`, error);
          
          // For certain errors, don't retry and assume non-admin
          if (error.code === 'PGRST116') { // Row not found
            console.log("Profile not found, assuming non-admin user");
            return false;
          }
          
          // Retry logic for network errors
          if (attempt < MAX_RETRY_ATTEMPTS && (error.message?.includes('network') || error.message?.includes('timeout'))) {
            console.log(`Retrying admin check in 1.5 seconds... (attempt ${attempt + 1})`);
            await new Promise(resolve => setTimeout(resolve, 1500));
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
          await new Promise(resolve => setTimeout(resolve, 1500));
          return checkAdminStatus(userId, attempt + 1);
        }
        
        return false;
      } finally {
        // Clean up cache
        delete adminCheckRef.current[cacheKey];
      }
    })();
    
    adminCheckRef.current[cacheKey] = promise;
    return promise;
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
    // Prevent multiple initializations in React strict mode
    if (initializationRef.current) {
      console.log("AuthProvider already initialized, skipping...");
      return;
    }
    
    initializationRef.current = true;
    console.log("AuthProvider initializing...");
    
    let isMounted = true;
    let authSubscription: any = null;
    
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
    const setupAuthListener = () => {
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
      
      authSubscription = subscription;
    };

    // Set up listener first, then get initial session
    setupAuthListener();
    getInitialSession();

    return () => {
      console.log("Cleaning up AuthProvider...");
      isMounted = false;
      initializationRef.current = false;
      
      if (authSubscription) {
        authSubscription.unsubscribe();
      }
      
      // Clear admin check cache
      adminCheckRef.current = {};
    };
  }, []); // Empty dependency array to prevent re-initialization

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
