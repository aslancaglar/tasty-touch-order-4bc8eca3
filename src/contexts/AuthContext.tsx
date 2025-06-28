import { createContext, useContext, useEffect, useState, useRef } from "react";
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [adminCheckCompleted, setAdminCheckCompleted] = useState(false);

  // Enhanced caching with timestamps and session tracking
  const [adminStatusCache, setAdminStatusCache] = useState<{ 
    [key: string]: { 
      status: boolean; 
      timestamp: number;
      sessionId?: string;
    } 
  }>({});
  
  // Ref to track if we're currently checking admin status
  const isCheckingAdmin = useRef(false);
  
  // Cache duration - 5 minutes
  const CACHE_DURATION = 5 * 60 * 1000;

  // Enhanced admin status check with better caching
  const checkAdminStatus = async (userId: string, sessionId?: string): Promise<boolean> => {
    if (!userId) return false;
    
    const cacheKey = userId;
    const cached = adminStatusCache[cacheKey];
    const now = Date.now();
    
    // Check if we have valid cached data
    if (cached && 
        (now - cached.timestamp) < CACHE_DURATION && 
        cached.sessionId === sessionId) {
      console.log("Admin status from valid cache:", cached.status);
      return cached.status;
    }
    
    // Prevent concurrent admin checks for the same user
    if (isCheckingAdmin.current) {
      console.log("Admin check already in progress, using cached value or false");
      return cached?.status || false;
    }
    
    try {
      isCheckingAdmin.current = true;
      console.log("Checking admin status for user:", userId);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.warn("Admin check failed:", error.message);
        // Cache false result to avoid repeated failed requests
        setAdminStatusCache(prev => ({ 
          ...prev, 
          [cacheKey]: { 
            status: false, 
            timestamp: now,
            sessionId 
          } 
        }));
        return false;
      }
      
      const adminStatus = data?.is_admin || false;
      console.log("Admin status retrieved:", adminStatus);
      
      // Cache the result with session info
      setAdminStatusCache(prev => ({ 
        ...prev, 
        [cacheKey]: { 
          status: adminStatus, 
          timestamp: now,
          sessionId 
        } 
      }));
      
      return adminStatus;
    } catch (error) {
      console.error("Admin check exception:", error);
      // Cache false result for exceptions too
      setAdminStatusCache(prev => ({ 
        ...prev, 
        [cacheKey]: { 
          status: false, 
          timestamp: now,
          sessionId 
        } 
      }));
      return false;
    } finally {
      isCheckingAdmin.current = false;
    }
  };

  // Initialize authentication state
  useEffect(() => {
    console.log("Initializing AuthProvider...");
    
    let isMounted = true;
    let initializationTimeout: NodeJS.Timeout;
    
    const initializeAuth = async () => {
      try {
        // Set timeout to prevent indefinite loading
        initializationTimeout = setTimeout(() => {
          if (isMounted && loading) {
            console.warn("Auth initialization timeout - setting loading to false");
            setLoading(false);
            setAdminCheckCompleted(true);
          }
        }, 10000); // 10 second timeout

        // Get current session first
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        
        if (!isMounted) return;
        
        console.log("Initial session:", currentSession?.user?.id || 'no session');
        
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
            }
          } catch (error) {
            console.error("Error checking initial admin status:", error);
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
            
            console.log("Auth state change:", event, newSession?.user?.id || 'no user');
            
            // Handle sign out
            if (event === 'SIGNED_OUT' || !newSession?.user) {
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
                }
              } catch (error) {
                console.error("Error checking admin status on sign in:", error);
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

            // Handle token refresh - only check if cache is stale or session changed
            if (event === 'TOKEN_REFRESHED') {
              setSession(newSession);
              setUser(newSession.user);
              
              const cacheKey = newSession.user.id;
              const cached = adminStatusCache[cacheKey];
              const now = Date.now();
              
              // Only re-check admin status if cache is stale or session changed
              const shouldRecheck = !cached || 
                                  (now - cached.timestamp) > CACHE_DURATION ||
                                  cached.sessionId !== newSession.access_token;
              
              if (shouldRecheck) {
                console.log("Cache stale or session changed, rechecking admin status");
                try {
                  setAdminCheckCompleted(false);
                  const adminStatus = await checkAdminStatus(
                    newSession.user.id,
                    newSession.access_token
                  );
                  if (isMounted) {
                    setIsAdmin(adminStatus);
                    setAdminCheckCompleted(true);
                  }
                } catch (error) {
                  console.error("Error checking admin status on token refresh:", error);
                  if (isMounted) {
                    // Keep existing admin status if check fails
                    setAdminCheckCompleted(true);
                  }
                }
              } else {
                console.log("Using cached admin status on token refresh:", cached.status);
                // Use cached status and ensure completion flag is set
                if (isMounted) {
                  setIsAdmin(cached.status);
                  setAdminCheckCompleted(true);
                }
              }
              
              // Always ensure loading is false for token refresh
              if (isMounted) {
                setLoading(false);
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
        console.error("Auth initialization error:", error);
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
      console.log("Signing out...");
      logSecurityEvent('Sign out initiated', { 
        userId: user?.id,
        timestamp: new Date().toISOString()
      });
      
      // Clear admin status cache
      setAdminStatusCache({});
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error("Sign out error:", error);
        throw error;
      }
      
      console.log("Sign out complete");
    } catch (error) {
      console.error("Sign out exception:", error);
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
