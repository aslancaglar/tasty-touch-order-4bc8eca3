
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

  // Enhanced admin status cache with timestamp
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

  // Improved admin status check with better caching and persistence
  const checkAdminStatus = async (userId: string, forceRefresh = false): Promise<boolean> => {
    if (!userId || (adminCheckInProgress.current && !forceRefresh)) {
      debugLog("Admin check skipped", { userId: !!userId, inProgress: adminCheckInProgress.current });
      return false;
    }

    // Check cache first (valid for 5 minutes)
    const cached = adminStatusCache[userId];
    const cacheValid = cached && (Date.now() - cached.timestamp < 300000); // 5 minutes
    
    if (cacheValid && !forceRefresh) {
      debugLog("Admin status from cache", { userId, status: cached.status, verified: cached.verified });
      return cached.status;
    }
    
    adminCheckInProgress.current = true;
    
    try {
      debugLog("Checking admin status", { userId, forceRefresh });
      
      // Clear existing timeout
      if (adminCheckTimeout.current) {
        clearTimeout(adminCheckTimeout.current);
      }
      
      // Use the dedicated admin check function for better reliability
      const checkPromise = supabase.rpc('get_current_user_admin_status');
      
      // Race the admin check against a timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        adminCheckTimeout.current = setTimeout(() => {
          reject(new Error('Admin check timeout'));
        }, 8000); // 8 second timeout
      });
      
      const { data, error } = await Promise.race([checkPromise, timeoutPromise]);
      
      if (adminCheckTimeout.current) {
        clearTimeout(adminCheckTimeout.current);
        adminCheckTimeout.current = null;
      }
      
      if (error) {
        debugLog("Admin check failed", { error: error.message });
        // Don't cache failed results, return existing cache if available
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

  // Enhanced session update with better state management
  const updateSessionState = async (newSession: Session | null, source: string, preserveAdminStatus = false) => {
    debugLog(`Updating session state from ${source}`, { 
      userId: newSession?.user?.id, 
      currentUserId: currentUserId.current,
      preserveAdminStatus 
    });

    // Update basic session state immediately
    setSession(newSession);
    setUser(newSession?.user ?? null);
    currentUserId.current = newSession?.user?.id ?? null;

    if (!newSession?.user) {
      // No user, set defaults
      setIsAdmin(false);
      setAdminCheckCompleted(true);
      setLoading(false);
      debugLog("Session cleared - setting defaults");
      return;
    }

    const userId = newSession.user.id;

    // If preserving admin status and we have a cached verified status, use it
    if (preserveAdminStatus && adminStatusCache[userId]?.verified) {
      const cachedStatus = adminStatusCache[userId];
      const cacheAge = Date.now() - cachedStatus.timestamp;
      
      if (cacheAge < 600000) { // 10 minutes
        debugLog("Using preserved admin status", { userId, status: cachedStatus.status, cacheAge });
        setIsAdmin(cachedStatus.status);
        setAdminCheckCompleted(true);
        setLoading(false);
        return;
      }
    }

    // Check admin status for authenticated user
    try {
      setAdminCheckCompleted(false);
      const adminStatus = await checkAdminStatus(userId, source === 'manual refresh');
      
      // Verify this is still the current user (prevent race conditions)
      if (currentUserId.current === userId) {
        setIsAdmin(adminStatus);
        setAdminCheckCompleted(true);
        setLoading(false);
        debugLog("Admin check completed", { userId, isAdmin: adminStatus, source });
      } else {
        debugLog("Admin check result discarded - user changed", { 
          checkedUserId: userId, 
          currentUserId: currentUserId.current 
        });
      }
    } catch (error) {
      debugLog("Error checking admin status", { error });
      // Only update state if this is still the current user
      if (currentUserId.current === userId) {
        setIsAdmin(false);
        setAdminCheckCompleted(true);
        setLoading(false);
      }
    }
  };

  // Enhanced refresh with intelligent caching
  const refreshAuth = async (preserveAdminStatus = true) => {
    debugLog("Manual auth refresh triggered", { preserveAdminStatus });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await updateSessionState(session, "manual refresh", preserveAdminStatus);
    } catch (error) {
      debugLog("Manual auth refresh failed", { error });
      setSession(null);
      setUser(null);
      setIsAdmin(false);
      setAdminCheckCompleted(true);
      setLoading(false);
    }
  };

  // Initialize authentication state with improved error handling
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
        }, 20000); // 20 second timeout

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

  // Enhanced tab focus handling with throttling and smart refresh
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user) {
        const now = Date.now();
        const timeSinceLastSwitch = now - lastTabSwitchTime.current;
        
        // Throttle tab switch handling to prevent excessive refreshes
        if (timeSinceLastSwitch < 2000) {
          debugLog("Tab switch throttled - too recent");
          return;
        }
        
        lastTabSwitchTime.current = now;
        debugLog("Tab became visible - smart refresh");
        
        // Use smart refresh that preserves admin status
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
