import { createContext, useContext, useEffect, useState, useRef } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { logSecurityEvent, handleError } from "@/utils/error-handler";
import { 
  getCachedAdminStatus, 
  setCachedAdminStatus, 
  clearStaleAuthCache,
  initializeAuthCacheCleanup
} from "@/utils/auth-cache-utils";

type AuthContextType = {
  session: Session | null;
  user: User | null;
  isAdmin: boolean | null;
  loading: boolean;
  adminCheckCompleted: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [adminCheckCompleted, setAdminCheckCompleted] = useState(false);

  // Ref to track if we're currently checking admin status
  const isCheckingAdmin = useRef(false);
  
  // Initialize cache cleanup
  useEffect(() => {
    initializeAuthCacheCleanup();
  }, []);

  // Enhanced admin status check with improved caching
  const checkAdminStatus = async (userId: string, sessionId?: string): Promise<boolean> => {
    if (!userId) return false;
    
    // Check cache first
    const cachedStatus = getCachedAdminStatus(userId, sessionId);
    if (cachedStatus !== null) {
      console.log("[AuthContext] Using cached admin status:", cachedStatus);
      return cachedStatus;
    }
    
    // Prevent concurrent admin checks for the same user
    if (isCheckingAdmin.current) {
      console.log("[AuthContext] Admin check already in progress, returning false");
      return false;
    }
    
    try {
      isCheckingAdmin.current = true;
      console.log("[AuthContext] Checking admin status for user:", userId);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.warn("[AuthContext] Admin check failed:", error.message);
        // Cache false result to avoid repeated failed requests
        setCachedAdminStatus(userId, false, sessionId);
        return false;
      }
      
      const adminStatus = data?.is_admin || false;
      console.log("[AuthContext] Admin status retrieved:", adminStatus);
      
      // Cache the result
      setCachedAdminStatus(userId, adminStatus, sessionId);
      
      return adminStatus;
    } catch (error) {
      console.error("[AuthContext] Admin check exception:", error);
      // Cache false result for exceptions too
      setCachedAdminStatus(userId, false, sessionId);
      return false;
    } finally {
      isCheckingAdmin.current = false;
    }
  };

  // Initialize authentication state
  useEffect(() => {
    console.log("[AuthContext] Initializing AuthProvider...");
    
    let isMounted = true;
    let initializationTimeout: NodeJS.Timeout;
    
    const initializeAuth = async () => {
      try {
        // Set timeout to prevent indefinite loading
        initializationTimeout = setTimeout(() => {
          if (isMounted && loading) {
            console.warn("[AuthContext] Auth initialization timeout - setting loading to false");
            setLoading(false);
            setAdminCheckCompleted(true);
          }
        }, 10000); // 10 second timeout

        // Get current session first
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        
        if (!isMounted) return;
        
        console.log("[AuthContext] Initial session:", currentSession?.user?.id || 'no session');
        
        // Set initial state immediately
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        
        if (currentSession?.user) {
          // Check admin status for existing session
          try {
            setAdminCheckCompleted(false);
            const adminStatus = await checkAdminStatus(
              currentSession.user.id, 
              currentSession.access_token
            );
            if (isMounted) {
              setIsAdmin(adminStatus);
              setAdminCheckCompleted(true);
              console.log("[AuthContext] Initial admin status set:", adminStatus);
            }
          } catch (error) {
            console.error("[AuthContext] Error checking initial admin status:", error);
            if (isMounted) {
              setIsAdmin(false);
              setAdminCheckCompleted(true);
            }
          }
        } else {
          // No user, set defaults
          setIsAdmin(false);
          setAdminCheckCompleted(true);
        }
        
        if (isMounted) {
          setLoading(false);
        }

        // Set up auth state change listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, newSession) => {
            if (!isMounted) return;
            
            console.log("[AuthContext] Auth state change:", event, newSession?.user?.id || 'no user');
            
            // Handle sign out
            if (event === 'SIGNED_OUT' || !newSession?.user) {
              console.log("[AuthContext] Processing sign out");
              setSession(null);
              setUser(null);
              setIsAdmin(false);
              setAdminCheckCompleted(true);
              setLoading(false);
              
              if (event === 'SIGNED_OUT') {
                logSecurityEvent('User signed out', { 
                  event, 
                  timestamp: new Date().toISOString() 
                });
              }
              return;
            }

            // Handle sign in - always check admin status
            if (event === 'SIGNED_IN') {
              console.log("[AuthContext] Processing sign in");
              setSession(newSession);
              setUser(newSession.user);
              
              try {
                setAdminCheckCompleted(false);
                const adminStatus = await checkAdminStatus(
                  newSession.user.id,
                  newSession.access_token
                );
                if (isMounted) {
                  setIsAdmin(adminStatus);
                  setAdminCheckCompleted(true);
                  setLoading(false);
                  console.log("[AuthContext] Sign in admin status set:", adminStatus);
                }
              } catch (error) {
                console.error("[AuthContext] Error checking admin status on sign in:", error);
                if (isMounted) {
                  setIsAdmin(false);
                  setAdminCheckCompleted(true);
                  setLoading(false);
                }
              }
              
              logSecurityEvent('User signed in', { 
                userId: newSession.user.id,
                timestamp: new Date().toISOString()
              });
            }

            // Handle token refresh - improved logic to prevent unnecessary state changes
            if (event === 'TOKEN_REFRESHED') {
              console.log("[AuthContext] Processing token refresh");
              setSession(newSession);
              setUser(newSession.user);
              
              // Check if we have valid cached admin status
              const cachedStatus = getCachedAdminStatus(
                newSession.user.id, 
                newSession.access_token
              );
              
              if (cachedStatus !== null) {
                // Use cached status without toggling adminCheckCompleted
                console.log("[AuthContext] Using cached admin status on token refresh:", cachedStatus);
                if (isMounted) {
                  setIsAdmin(cachedStatus);
                  // Keep adminCheckCompleted as true since we're using cache
                  if (!adminCheckCompleted) {
                    setAdminCheckCompleted(true);
                  }
                  setLoading(false);
                }
              } else {
                // Only fetch if no valid cache exists
                console.log("[AuthContext] No valid cache, checking admin status on token refresh");
                try {
                  setAdminCheckCompleted(false);
                  const adminStatus = await checkAdminStatus(
                    newSession.user.id,
                    newSession.access_token
                  );
                  if (isMounted) {
                    setIsAdmin(adminStatus);
                    setAdminCheckCompleted(true);
                    setLoading(false);
                    console.log("[AuthContext] Token refresh admin status set:", adminStatus);
                  }
                } catch (error) {
                  console.error("[AuthContext] Error checking admin status on token refresh:", error);
                  if (isMounted) {
                    // Keep existing admin status if check fails
                    setAdminCheckCompleted(true);
                    setLoading(false);
                  }
                }
              }
            }
          }
        );

        return () => {
          subscription.unsubscribe();
          if (initializationTimeout) {
            clearTimeout(initializationTimeout);
          }
        };
      } catch (error) {
        console.error("[AuthContext] Auth initialization error:", error);
        if (isMounted) {
          setSession(null);
          setUser(null);
          setIsAdmin(false);
          setAdminCheckCompleted(true);
          setLoading(false);
        }
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
      if (initializationTimeout) {
        clearTimeout(initializationTimeout);
      }
    };
  }, []);

  const signOut = async () => {
    try {
      console.log("[AuthContext] Signing out...");
      logSecurityEvent('Sign out initiated', { 
        userId: user?.id,
        timestamp: new Date().toISOString()
      });
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error("[AuthContext] Sign out error:", error);
        throw error;
      }
      
      console.log("[AuthContext] Sign out complete");
    } catch (error) {
      console.error("[AuthContext] Sign out exception:", error);
      throw error;
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
