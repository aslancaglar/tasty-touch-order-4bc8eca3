
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
  refreshAuth: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [adminCheckCompleted, setAdminCheckCompleted] = useState(false);

  // Refs to prevent race conditions and improve state management
  const initializationInProgress = useRef(false);
  const adminCheckInProgress = useRef(false);
  const currentUserId = useRef<string | null>(null);
  const initializationTimeout = useRef<NodeJS.Timeout | null>(null);
  const adminCheckTimeout = useRef<NodeJS.Timeout | null>(null);
  const lastTabSwitchTime = useRef<number>(0);

  // Enhanced admin status cache with persistence
  const [adminStatusCache, setAdminStatusCache] = useState<{ 
    [key: string]: { 
      status: boolean; 
      timestamp: number; 
      verified: boolean; 
    } 
  }>({});

  // Enhanced debug logging
  const debugLog = (message: string, data?: any) => {
    console.log(`[AuthContext] ${message}`, data || '');
  };

  // Improved admin status check that respects existing verified status
  const checkAdminStatus = async (userId: string, forceRefresh = false): Promise<boolean> => {
    if (!userId) {
      debugLog("Admin check skipped - no userId");
      return false;
    }

    // Check cache first (valid for 10 minutes for verified users)
    const cached = adminStatusCache[userId];
    const cacheValidTime = cached?.verified ? 600000 : 300000; // 10 min for verified, 5 min for unverified
    const cacheValid = cached && (Date.now() - cached.timestamp < cacheValidTime);
    
    if (cacheValid && !forceRefresh) {
      debugLog("Admin status from cache", { userId, status: cached.status, verified: cached.verified });
      return cached.status;
    }

    // Don't start multiple admin checks for the same user
    if (adminCheckInProgress.current && !forceRefresh) {
      debugLog("Admin check already in progress");
      return cached?.status || false;
    }
    
    adminCheckInProgress.current = true;
    
    try {
      debugLog("Checking admin status", { userId, forceRefresh });
      
      // Clear existing timeout
      if (adminCheckTimeout.current) {
        clearTimeout(adminCheckTimeout.current);
      }
      
      // Use the dedicated admin check function
      const checkPromise = supabase.rpc('get_current_user_admin_status');
      
      // Race the admin check against a timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        adminCheckTimeout.current = setTimeout(() => {
          reject(new Error('Admin check timeout'));
        }, 8000);
      });
      
      const { data, error } = await Promise.race([checkPromise, timeoutPromise]);
      
      if (adminCheckTimeout.current) {
        clearTimeout(adminCheckTimeout.current);
        adminCheckTimeout.current = null;
      }
      
      if (error) {
        debugLog("Admin check failed", { error: error.message });
        // Return cached status if available, otherwise false
        if (cached) {
          debugLog("Using cached admin status due to error", { userId, status: cached.status });
          return cached.status;
        }
        return false;
      }
      
      const adminStatus = Boolean(data);
      debugLog("Admin status retrieved", { userId, status: adminStatus });
      
      // Cache the result with verification flag
      setAdminStatusCache(prev => ({ 
        ...prev, 
        [userId]: { 
          status: adminStatus, 
          timestamp: Date.now(), 
          verified: true 
        } 
      }));
      
      return adminStatus;
    } catch (error) {
      debugLog("Admin check exception", { error });
      // Return cached status if available, otherwise false
      if (cached) {
        debugLog("Using cached admin status due to exception", { userId, status: cached.status });
        return cached.status;
      }
      return false;
    } finally {
      adminCheckInProgress.current = false;
      if (adminCheckTimeout.current) {
        clearTimeout(adminCheckTimeout.current);
        adminCheckTimeout.current = null;
      }
    }
  };

  // Enhanced session update that prevents unnecessary admin re-checks
  const updateSessionState = async (newSession: Session | null, source: string, skipAdminCheck = false) => {
    debugLog(`Updating session state from ${source}`, { 
      userId: newSession?.user?.id, 
      currentUserId: currentUserId.current,
      skipAdminCheck 
    });

    const newUserId = newSession?.user?.id ?? null;
    const userChanged = currentUserId.current !== newUserId;

    // Update basic session state immediately
    setSession(newSession);
    setUser(newSession?.user ?? null);
    currentUserId.current = newUserId;

    if (!newSession?.user) {
      // No user, set defaults
      setIsAdmin(false);
      setAdminCheckCompleted(true);
      setLoading(false);
      debugLog("Session cleared - setting defaults");
      return;
    }

    // If user hasn't changed and we should skip admin check (like tab switches), preserve existing state
    if (!userChanged && skipAdminCheck && adminCheckCompleted && isAdmin !== null) {
      debugLog("Preserving existing admin status - no re-check needed", { 
        userId: newUserId, 
        isAdmin, 
        source 
      });
      setLoading(false);
      return;
    }

    // Check if we have a recent verified admin status for this user
    const cached = adminStatusCache[newUserId];
    const cacheAge = cached ? Date.now() - cached.timestamp : Infinity;
    const hasRecentVerifiedStatus = cached?.verified && cacheAge < 600000; // 10 minutes

    if (hasRecentVerifiedStatus && !userChanged) {
      debugLog("Using recent verified admin status", { 
        userId: newUserId, 
        status: cached.status, 
        cacheAge 
      });
      setIsAdmin(cached.status);
      setAdminCheckCompleted(true);
      setLoading(false);
      return;
    }

    // Check admin status for new users or when forced
    try {
      setAdminCheckCompleted(false);
      const adminStatus = await checkAdminStatus(newUserId, source === 'manual refresh');
      
      // Verify this is still the current user (prevent race conditions)
      if (currentUserId.current === newUserId) {
        setIsAdmin(adminStatus);
        setAdminCheckCompleted(true);
        setLoading(false);
        debugLog("Admin check completed", { userId: newUserId, isAdmin: adminStatus, source });
      } else {
        debugLog("Admin check result discarded - user changed", { 
          checkedUserId: newUserId, 
          currentUserId: currentUserId.current 
        });
      }
    } catch (error) {
      debugLog("Error checking admin status", { error });
      // Only update state if this is still the current user
      if (currentUserId.current === newUserId) {
        setIsAdmin(false);
        setAdminCheckCompleted(true);
        setLoading(false);
      }
    }
  };

  // Smart refresh that preserves admin status for tab switches
  const refreshAuth = async (isTabSwitch = false) => {
    debugLog("Auth refresh triggered", { isTabSwitch });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      // Skip admin check for tab switches to prevent unnecessary verification UI
      await updateSessionState(session, isTabSwitch ? "tab switch" : "manual refresh", isTabSwitch);
    } catch (error) {
      debugLog("Auth refresh failed", { error });
      setSession(null);
      setUser(null);
      setIsAdmin(false);
      setAdminCheckCompleted(true);
      setLoading(false);
    }
  };

  // Initialize authentication state
  useEffect(() => {
    if (initializationInProgress.current) {
      debugLog("Initialization already in progress");
      return;
    }

    debugLog("Initializing AuthProvider...");
    initializationInProgress.current = true;
    
    let isMounted = true;
    
    const initializeAuth = async () => {
      try {
        // Set overall timeout to prevent indefinite loading
        if (initializationTimeout.current) {
          clearTimeout(initializationTimeout.current);
        }
        
        initializationTimeout.current = setTimeout(() => {
          if (isMounted && loading) {
            debugLog("Auth initialization timeout - forcing completion");
            setLoading(false);
            setAdminCheckCompleted(true);
          }
        }, 20000);

        // Get current session first
        debugLog("Getting initial session");
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        
        if (!isMounted) {
          debugLog("Component unmounted during initialization");
          return;
        }
        
        debugLog("Initial session retrieved", { userId: currentSession?.user?.id || 'none' });
        
        // Update session state
        await updateSessionState(currentSession, "initialization");

        // Set up auth state change listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, newSession) => {
            if (!isMounted) {
              debugLog("Auth state change ignored - component unmounted");
              return;
            }
            
            debugLog("Auth state change", { event, userId: newSession?.user?.id || 'none' });
            
            // Handle sign out
            if (event === 'SIGNED_OUT' || !newSession?.user) {
              setSession(null);
              setUser(null);
              setIsAdmin(false);
              setAdminCheckCompleted(true);
              setLoading(false);
              currentUserId.current = null;
              
              if (event === 'SIGNED_OUT') {
                logSecurityEvent('User signed out', { 
                  event, 
                  timestamp: new Date().toISOString() 
                });
              }
              return;
            }

            // Handle sign in or token refresh
            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
              // For token refresh, preserve admin status to avoid re-verification
              const preserveStatus = event === 'TOKEN_REFRESHED';
              await updateSessionState(newSession, `auth_${event.toLowerCase()}`, preserveStatus);
              
              if (event === 'SIGNED_IN') {
                logSecurityEvent('User signed in', { 
                  userId: newSession.user.id,
                  timestamp: new Date().toISOString()
                });
              }
            }
          }
        );

        // Clear initialization timeout on success
        if (initializationTimeout.current) {
          clearTimeout(initializationTimeout.current);
          initializationTimeout.current = null;
        }

        return () => {
          subscription.unsubscribe();
        };
      } catch (error) {
        debugLog("Auth initialization error", { error });
        if (isMounted) {
          setSession(null);
          setUser(null);
          setIsAdmin(false);
          setAdminCheckCompleted(true);
          setLoading(false);
          currentUserId.current = null;
        }
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
      initializationInProgress.current = false;
      if (initializationTimeout.current) {
        clearTimeout(initializationTimeout.current);
        initializationTimeout.current = null;
      }
      if (adminCheckTimeout.current) {
        clearTimeout(adminCheckTimeout.current);
        adminCheckTimeout.current = null;
      }
    };
  }, []);

  // Enhanced tab focus handling with smart refresh
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user) {
        const now = Date.now();
        const timeSinceLastSwitch = now - lastTabSwitchTime.current;
        
        // Throttle tab switch handling
        if (timeSinceLastSwitch < 2000) {
          debugLog("Tab switch throttled - too recent");
          return;
        }
        
        lastTabSwitchTime.current = now;
        debugLog("Tab became visible - smart refresh");
        
        // Use tab switch refresh that preserves admin status
        setTimeout(() => {
          refreshAuth(true);
        }, 100);
      }
    };

    const handleFocus = () => {
      if (user) {
        const now = Date.now();
        const timeSinceLastSwitch = now - lastTabSwitchTime.current;
        
        if (timeSinceLastSwitch < 2000) {
          debugLog("Window focus throttled - too recent");
          return;
        }
        
        lastTabSwitchTime.current = now;
        debugLog("Window focused - smart refresh");
        
        setTimeout(() => {
          refreshAuth(true);
        }, 100);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [user]);

  const signOut = async () => {
    try {
      debugLog("Signing out...");
      logSecurityEvent('Sign out initiated', { 
        userId: user?.id,
        timestamp: new Date().toISOString()
      });
      
      // Clear admin status cache
      setAdminStatusCache({});
      currentUserId.current = null;
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        debugLog("Sign out error", { error });
        throw error;
      }
      
      debugLog("Sign out complete");
    } catch (error) {
      debugLog("Sign out exception", { error });
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
    refreshAuth: () => refreshAuth(false),
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
