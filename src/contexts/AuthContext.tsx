
import { createContext, useContext, useEffect, useState, useRef, useCallback } from "react";
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

  // Refs for tracking state and preventing race conditions
  const isCheckingAdmin = useRef(false);
  const lastAdminCheckUserId = useRef<string | null>(null);
  const adminCheckTimeoutRef = useRef<NodeJS.Timeout>();
  const debounceTimeoutRef = useRef<NodeJS.Timeout>();
  const initializationTimeoutRef = useRef<NodeJS.Timeout>();
  
  // Initialize cache cleanup
  useEffect(() => {
    initializeAuthCacheCleanup();
  }, []);

  // Debounced admin status setter to prevent rapid state changes
  const setAdminStatusDebounced = useCallback((status: boolean, completed: boolean = true) => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    debounceTimeoutRef.current = setTimeout(() => {
      console.log("[AuthContext] Setting debounced admin status:", status, "completed:", completed);
      setIsAdmin(status);
      setAdminCheckCompleted(completed);
    }, 100); // 100ms debounce
  }, []);

  // Enhanced admin status check with improved error handling and caching
  const checkAdminStatus = async (userId: string, sessionId?: string): Promise<boolean> => {
    if (!userId) return false;
    
    // Prevent concurrent checks for the same user
    if (isCheckingAdmin.current && lastAdminCheckUserId.current === userId) {
      console.log("[AuthContext] Admin check already in progress for same user, returning cached or false");
      const cached = getCachedAdminStatus(userId, sessionId);
      return cached !== null ? cached : false;
    }
    
    // Check cache first - prioritize recent cache
    const cachedStatus = getCachedAdminStatus(userId, sessionId);
    if (cachedStatus !== null) {
      console.log("[AuthContext] Using cached admin status:", cachedStatus);
      return cachedStatus;
    }
    
    try {
      isCheckingAdmin.current = true;
      lastAdminCheckUserId.current = userId;
      console.log("[AuthContext] Checking admin status for user:", userId);
      
      // Set timeout for admin check to prevent hanging
      const timeoutPromise = new Promise<never>((_, reject) => {
        adminCheckTimeoutRef.current = setTimeout(() => {
          reject(new Error('Admin check timeout'));
        }, 8000); // 8 second timeout
      });
      
      const adminCheckPromise = supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', userId)
        .single();
      
      const { data, error } = await Promise.race([adminCheckPromise, timeoutPromise]);
      
      if (adminCheckTimeoutRef.current) {
        clearTimeout(adminCheckTimeoutRef.current);
      }
      
      if (error) {
        console.warn("[AuthContext] Admin check failed:", error.message);
        // Cache false result to avoid repeated failed requests
        setCachedAdminStatus(userId, false, sessionId);
        return false;
      }
      
      const adminStatus = data?.is_admin || false;
      console.log("[AuthContext] Admin status retrieved:", adminStatus);
      
      // Cache the result with extended validity for successful checks
      setCachedAdminStatus(userId, adminStatus, sessionId);
      
      return adminStatus;
    } catch (error) {
      console.error("[AuthContext] Admin check exception:", error);
      // Cache false result for exceptions
      setCachedAdminStatus(userId, false, sessionId);
      return false;
    } finally {
      isCheckingAdmin.current = false;
      lastAdminCheckUserId.current = null;
      if (adminCheckTimeoutRef.current) {
        clearTimeout(adminCheckTimeoutRef.current);
      }
    }
  };

  // Initialize authentication state with improved error handling
  useEffect(() => {
    console.log("[AuthContext] Initializing AuthProvider...");
    
    let isMounted = true;
    
    const initializeAuth = async () => {
      try {
        // Set overall initialization timeout to prevent indefinite loading
        initializationTimeoutRef.current = setTimeout(() => {
          if (isMounted && loading) {
            console.warn("[AuthContext] Auth initialization timeout - forcing completion");
            setLoading(false);
            setAdminCheckCompleted(true);
          }
        }, 12000); // 12 second timeout

        // Get current session first
        const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error("[AuthContext] Error getting session:", sessionError);
        }
        
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
              setAdminStatusDebounced(adminStatus, true);
              console.log("[AuthContext] Initial admin status set:", adminStatus);
            }
          } catch (error) {
            console.error("[AuthContext] Error checking initial admin status:", error);
            if (isMounted) {
              setAdminStatusDebounced(false, true);
            }
          }
        } else {
          // No user, set defaults immediately
          setIsAdmin(false);
          setAdminCheckCompleted(true);
        }
        
        if (isMounted) {
          setLoading(false);
        }

        // Set up auth state change listener with improved token refresh handling
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

            // Handle sign in
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
                  setAdminStatusDebounced(adminStatus, true);
                  setLoading(false);
                  console.log("[AuthContext] Sign in admin status set:", adminStatus);
                }
              } catch (error) {
                console.error("[AuthContext] Error checking admin status on sign in:", error);
                if (isMounted) {
                  setAdminStatusDebounced(false, true);
                  setLoading(false);
                }
              }
              
              logSecurityEvent('User signed in', { 
                userId: newSession.user.id,
                timestamp: new Date().toISOString()
              });
            }

            // Improved token refresh handling
            if (event === 'TOKEN_REFRESHED') {
              console.log("[AuthContext] Processing token refresh");
              setSession(newSession);
              setUser(newSession.user);
              
              // For token refresh, prioritize session continuity
              const cachedStatus = getCachedAdminStatus(
                newSession.user.id, 
                newSession.access_token
              );
              
              if (cachedStatus !== null) {
                // Use cached status and maintain continuity
                console.log("[AuthContext] Using cached admin status on token refresh:", cachedStatus);
                if (isMounted) {
                  // Don't change adminCheckCompleted if it's already true and we have cache
                  if (adminCheckCompleted) {
                    setIsAdmin(cachedStatus);
                  } else {
                    setAdminStatusDebounced(cachedStatus, true);
                  }
                  setLoading(false);
                }
              } else {
                // Only fetch if no valid cache exists and we're not already in a good state
                console.log("[AuthContext] No cache for token refresh, checking admin status");
                try {
                  // Don't reset adminCheckCompleted to false if we're already in a good state
                  const needsCheck = !adminCheckCompleted || isAdmin === null;
                  
                  if (needsCheck) {
                    setAdminCheckCompleted(false);
                  }
                  
                  const adminStatus = await checkAdminStatus(
                    newSession.user.id,
                    newSession.access_token
                  );
                  if (isMounted) {
                    setAdminStatusDebounced(adminStatus, true);
                    setLoading(false);
                    console.log("[AuthContext] Token refresh admin status set:", adminStatus);
                  }
                } catch (error) {
                  console.error("[AuthContext] Error checking admin status on token refresh:", error);
                  if (isMounted) {
                    // Maintain existing state if check fails during token refresh
                    if (!adminCheckCompleted) {
                      setAdminStatusDebounced(false, true);
                    }
                    setLoading(false);
                  }
                }
              }
            }
          }
        );

        return () => {
          subscription.unsubscribe();
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
      if (initializationTimeoutRef.current) {
        clearTimeout(initializationTimeoutRef.current);
      }
      if (adminCheckTimeoutRef.current) {
        clearTimeout(adminCheckTimeoutRef.current);
      }
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [setAdminStatusDebounced]);

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
