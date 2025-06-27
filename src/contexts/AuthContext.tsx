
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

  // Refs to prevent race conditions
  const initializationInProgress = useRef(false);
  const adminCheckInProgress = useRef(false);
  const currentUserId = useRef<string | null>(null);
  const initializationTimeout = useRef<NodeJS.Timeout | null>(null);
  const adminCheckTimeout = useRef<NodeJS.Timeout | null>(null);

  // Cache admin status to avoid repeated checks
  const [adminStatusCache, setAdminStatusCache] = useState<{ [key: string]: boolean }>({});

  // Enhanced debug logging
  const debugLog = (message: string, data?: any) => {
    console.log(`[AuthContext] ${message}`, data || '');
  };

  // Check admin status with enhanced error handling and timeout
  const checkAdminStatus = async (userId: string): Promise<boolean> => {
    if (!userId || adminCheckInProgress.current) {
      debugLog("Admin check skipped", { userId: !!userId, inProgress: adminCheckInProgress.current });
      return false;
    }

    // Check cache first
    if (adminStatusCache[userId] !== undefined) {
      debugLog("Admin status from cache", { userId, status: adminStatusCache[userId] });
      return adminStatusCache[userId];
    }
    
    adminCheckInProgress.current = true;
    
    try {
      debugLog("Checking admin status", { userId });
      
      // Set timeout for admin check
      if (adminCheckTimeout.current) {
        clearTimeout(adminCheckTimeout.current);
      }
      
      const checkPromise = supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', userId)
        .single();
      
      // Race the admin check against a timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        adminCheckTimeout.current = setTimeout(() => {
          reject(new Error('Admin check timeout'));
        }, 5000); // 5 second timeout
      });
      
      const { data, error } = await Promise.race([checkPromise, timeoutPromise]);
      
      if (adminCheckTimeout.current) {
        clearTimeout(adminCheckTimeout.current);
        adminCheckTimeout.current = null;
      }
      
      if (error) {
        debugLog("Admin check failed", { error: error.message });
        // Cache false result to avoid repeated failed requests
        setAdminStatusCache(prev => ({ ...prev, [userId]: false }));
        return false;
      }
      
      const adminStatus = data?.is_admin || false;
      debugLog("Admin status retrieved", { userId, status: adminStatus });
      
      // Cache the result
      setAdminStatusCache(prev => ({ ...prev, [userId]: adminStatus }));
      return adminStatus;
    } catch (error) {
      debugLog("Admin check exception", { error });
      // Cache false result for exceptions too
      setAdminStatusCache(prev => ({ ...prev, [userId]: false }));
      return false;
    } finally {
      adminCheckInProgress.current = false;
      if (adminCheckTimeout.current) {
        clearTimeout(adminCheckTimeout.current);
        adminCheckTimeout.current = null;
      }
    }
  };

  // Enhanced session update with race condition protection
  const updateSessionState = async (newSession: Session | null, source: string) => {
    debugLog(`Updating session state from ${source}`, { 
      userId: newSession?.user?.id, 
      currentUserId: currentUserId.current 
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

    // Check admin status for authenticated user
    try {
      setAdminCheckCompleted(false);
      const adminStatus = await checkAdminStatus(newSession.user.id);
      
      // Verify this is still the current user (prevent race conditions)
      if (currentUserId.current === newSession.user.id) {
        setIsAdmin(adminStatus);
        setAdminCheckCompleted(true);
        setLoading(false);
        debugLog("Admin check completed", { userId: newSession.user.id, isAdmin: adminStatus });
      } else {
        debugLog("Admin check result discarded - user changed", { 
          checkedUserId: newSession.user.id, 
          currentUserId: currentUserId.current 
        });
      }
    } catch (error) {
      debugLog("Error checking admin status", { error });
      // Only update state if this is still the current user
      if (currentUserId.current === newSession.user.id) {
        setIsAdmin(false);
        setAdminCheckCompleted(true);
        setLoading(false);
      }
    }
  };

  // Refresh authentication state manually
  const refreshAuth = async () => {
    debugLog("Manual auth refresh triggered");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await updateSessionState(session, "manual refresh");
    } catch (error) {
      debugLog("Manual auth refresh failed", { error });
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
        }, 15000); // 15 second timeout

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
              await updateSessionState(newSession, `auth_${event.toLowerCase()}`);
              
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

  // Handle tab focus to refresh auth state
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user) {
        debugLog("Tab became visible - refreshing auth state");
        // Small delay to allow for any pending auth state changes
        setTimeout(() => {
          refreshAuth();
        }, 100);
      }
    };

    const handleFocus = () => {
      if (user) {
        debugLog("Window focused - refreshing auth state");
        setTimeout(() => {
          refreshAuth();
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
    refreshAuth,
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
