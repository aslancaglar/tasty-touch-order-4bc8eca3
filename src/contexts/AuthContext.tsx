
import { createContext, useContext, useEffect, useState, useRef, useCallback } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { logSecurityEvent, handleError } from "@/utils/error-handler";
import { 
  getCachedAdminStatus, 
  setCachedAdminStatus, 
  clearStaleAuthCache,
  initializeAuthCacheCleanup,
  scheduleBackgroundRefresh,
  invalidateCacheEntry,
  forceInvalidateAllSessions
} from "@/utils/auth-cache-utils";

type AuthContextType = {
  session: Session | null;
  user: User | null;
  isAdmin: boolean | null;
  loading: boolean;
  adminCheckCompleted: boolean;
  signOut: () => Promise<void>;
  forceSessionInvalidation: () => Promise<void>;
  securityMetrics: {
    sessionAge: number | null;
    lastActivity: number;
    sessionChanges: number;
  };
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [adminCheckCompleted, setAdminCheckCompleted] = useState(false);
  const [securityMetrics, setSecurityMetrics] = useState({
    sessionAge: null as number | null,
    lastActivity: Date.now(),
    sessionChanges: 0
  });

  // Refs for tracking state and preventing race conditions
  const isCheckingAdmin = useRef(false);
  const lastAdminCheckUserId = useRef<string | null>(null);
  const adminCheckTimeoutRef = useRef<NodeJS.Timeout>();
  const emergencyTimeoutRef = useRef<NodeJS.Timeout>();
  const backgroundRefreshRef = useRef<NodeJS.Timeout>();
  const sessionStartTime = useRef<number | null>(null);
  const sessionChangeCount = useRef(0);
  
  // Initialize cache cleanup
  useEffect(() => {
    initializeAuthCacheCleanup();
    
    // Security monitoring: Check for suspicious localStorage manipulation
    const checkLocalStorageIntegrity = () => {
      try {
        const authData = localStorage.getItem('supabase.auth.token');
        if (authData && session) {
          const parsedAuth = JSON.parse(authData);
          const currentTokenHash = btoa(session.access_token).slice(0, 16);
          const storedTokenHash = btoa(parsedAuth.access_token || '').slice(0, 16);
          
          if (currentTokenHash !== storedTokenHash) {
            logSecurityEvent('Token mismatch detected between session and localStorage', {
              userId: user?.id,
              sessionId: session.access_token.slice(-8)
            });
            
            // Force session refresh
            forceSessionInvalidation();
          }
        }
      } catch (error) {
        logSecurityEvent('localStorage integrity check failed', { error: String(error) });
      }
    };
    
    const integrityInterval = setInterval(checkLocalStorageIntegrity, 60000); // Check every minute
    
    return () => clearInterval(integrityInterval);
  }, [session, user]);

  // Enhanced admin status check with security monitoring
  const checkAdminStatus = async (userId: string, sessionId?: string, isBackground = false): Promise<boolean> => {
    if (!userId) return false;
    
    // Security: Log admin status checks for monitoring
    if (!isBackground) {
      logSecurityEvent('Admin status check initiated', {
        userId,
        sessionId: sessionId?.slice(-8),
        timestamp: Date.now()
      });
    }
    
    // Prevent concurrent checks for the same user (unless it's background)
    if (!isBackground && isCheckingAdmin.current && lastAdminCheckUserId.current === userId) {
      console.log("[AuthContext] Admin check already in progress, using cache");
      const cached = getCachedAdminStatus(userId, sessionId);
      return cached !== null ? cached : false;
    }
    
    // Check cache first - now with enhanced security validation
    const cachedStatus = getCachedAdminStatus(userId, sessionId);
    if (cachedStatus !== null && !isBackground) {
      console.log("[AuthContext] Using cached admin status:", cachedStatus);
      
      // Schedule background refresh if needed
      scheduleBackgroundRefresh(userId, async () => {
        await checkAdminStatus(userId, sessionId, true);
      });
      
      return cachedStatus;
    }
    
    try {
      if (!isBackground) {
        isCheckingAdmin.current = true;
        lastAdminCheckUserId.current = userId;
      }
      
      console.log(`[AuthContext] ${isBackground ? 'Background' : 'Foreground'} checking admin status for user:`, userId);
      
      // Shorter timeout for background checks
      const timeoutDuration = isBackground ? 5000 : 10000;
      const timeoutPromise = new Promise<never>((_, reject) => {
        const timeoutRef = setTimeout(() => {
          reject(new Error(`Admin check timeout (${timeoutDuration}ms)`));
        }, timeoutDuration);
        
        if (!isBackground) {
          adminCheckTimeoutRef.current = timeoutRef;
        }
      });
      
      const adminCheckPromise = supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', userId)
        .single();
      
      const { data, error } = await Promise.race([adminCheckPromise, timeoutPromise]);
      
      if (!isBackground && adminCheckTimeoutRef.current) {
        clearTimeout(adminCheckTimeoutRef.current);
      }
      
      if (error) {
        console.warn(`[AuthContext] ${isBackground ? 'Background' : 'Foreground'} admin check failed:`, error.message);
        
        // Security: Log failed admin checks
        logSecurityEvent('Admin status check failed', {
          userId,
          error: error.message,
          isBackground
        });
        
        // For background checks, don't update cache on failure
        if (!isBackground) {
          // Use cached value if available, otherwise default to false
          const fallbackStatus = getCachedAdminStatus(userId, sessionId) ?? false;
          setCachedAdminStatus(userId, fallbackStatus, sessionId);
          return fallbackStatus;
        }
        return false;
      }
      
      const adminStatus = data?.is_admin || false;
      console.log(`[AuthContext] ${isBackground ? 'Background' : 'Foreground'} admin status retrieved:`, adminStatus);
      
      // Cache the result with enhanced security
      setCachedAdminStatus(userId, adminStatus, sessionId);
      
      return adminStatus;
    } catch (error) {
      console.error(`[AuthContext] ${isBackground ? 'Background' : 'Foreground'} admin check exception:`, error);
      
      // Security: Log admin check exceptions
      logSecurityEvent('Admin status check exception', {
        userId,
        error: String(error),
        isBackground
      });
      
      if (!isBackground) {
        // Graceful degradation: use cached value if available
        const fallbackStatus = getCachedAdminStatus(userId, sessionId) ?? false;
        setCachedAdminStatus(userId, fallbackStatus, sessionId);
        return fallbackStatus;
      }
      return false;
    } finally {
      if (!isBackground) {
        isCheckingAdmin.current = false;
        lastAdminCheckUserId.current = null;
        if (adminCheckTimeoutRef.current) {
          clearTimeout(adminCheckTimeoutRef.current);
        }
      }
    }
  };

  // Force session invalidation for security
  const forceSessionInvalidation = useCallback(async () => {
    try {
      console.log("[AuthContext] Force invalidating session for security...");
      
      // Clear all caches
      forceInvalidateAllSessions();
      
      // Sign out from Supabase  
      await supabase.auth.signOut();
      
      // Reset state
      setSession(null);
      setUser(null);
      setIsAdmin(false);
      setAdminCheckCompleted(true);
      setLoading(false);
      
      // Reset security metrics
      setSecurityMetrics({
        sessionAge: null,
        lastActivity: Date.now(),
        sessionChanges: 0
      });
      
      sessionStartTime.current = null;
      sessionChangeCount.current = 0;
      
      logSecurityEvent('Session force invalidated', {
        reason: 'security_check',
        timestamp: Date.now()
      });
      
      console.log("[AuthContext] Force session invalidation complete");
    } catch (error) {
      console.error("[AuthContext] Force session invalidation error:", error);
      logSecurityEvent('Force session invalidation failed', { error: String(error) });
    }
  }, []);

  // Progressive timeout logic with user feedback
  const [authFeedback, setAuthFeedback] = useState<string>("");
  const [timeoutProgress, setTimeoutProgress] = useState(0);

  const startProgressiveTimeout = useCallback(() => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += 1;
      setTimeoutProgress(progress);
      
      if (progress === 5) {
        setAuthFeedback("This is taking longer than usual...");
      } else if (progress === 10) {
        setAuthFeedback("Still working on authentication...");
      } else if (progress === 15) {
        setAuthFeedback("Almost there...");
      }
      
      if (progress >= 20) {
        clearInterval(interval);
        setAuthFeedback("Authentication timeout - please refresh");
        // Emergency fallback
        if (loading) {
          console.warn("[AuthContext] Emergency timeout reached, forcing completion");
          setLoading(false);
          setAdminCheckCompleted(true);
        }
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [loading]);

  // Update security metrics
  const updateSecurityMetrics = useCallback((newSession?: Session | null) => {
    const now = Date.now();
    
    if (newSession && !sessionStartTime.current) {
      sessionStartTime.current = now;
    }
    
    const sessionAge = sessionStartTime.current ? now - sessionStartTime.current : null;
    
    setSecurityMetrics(prev => ({
      sessionAge,
      lastActivity: now,
      sessionChanges: prev.sessionChanges
    }));
  }, []);

  // Initialize authentication state with enhanced security monitoring
  useEffect(() => {
    console.log("[AuthContext] Initializing AuthProvider...");
    
    let isMounted = true;
    const cleanupProgressiveTimeout = startProgressiveTimeout();
    
    const initializeAuth = async () => {
      try {
        // Get current session first
        const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error("[AuthContext] Error getting session:", sessionError);
          logSecurityEvent('Session retrieval error', { error: sessionError.message });
        }
        
        if (!isMounted) return;
        
        console.log("[AuthContext] Initial session:", currentSession?.user?.id || 'no session');
        
        // Set initial state immediately
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        setAuthFeedback("");
        setTimeoutProgress(0);
        updateSecurityMetrics(currentSession);
        
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
              // Graceful degradation
              const cachedStatus = getCachedAdminStatus(currentSession.user.id, currentSession.access_token);
              setIsAdmin(cachedStatus !== null ? cachedStatus : false);
              setAdminCheckCompleted(true);
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

        // Set up auth state change listener with enhanced security monitoring
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, newSession) => {
            if (!isMounted) return;
            
            console.log("[AuthContext] Auth state change:", event, newSession?.user?.id || 'no user');
            sessionChangeCount.current++;
            
            // Security: Monitor for rapid session changes
            if (sessionChangeCount.current > 5) {
              logSecurityEvent('Rapid session changes detected', {
                changeCount: sessionChangeCount.current,
                event,
                userId: newSession?.user?.id
              });
            }
            
            // Handle sign out
            if (event === 'SIGNED_OUT' || !newSession?.user) {
              console.log("[AuthContext] Processing sign out");
              setSession(null);
              setUser(null);
              setIsAdmin(false);
              setAdminCheckCompleted(true);
              setLoading(false);
              setAuthFeedback("");
              setTimeoutProgress(0);
              
              // Clear cache for security
              if (user?.id) {
                invalidateCacheEntry(user.id);
              }
              
              // Reset security metrics
              setSecurityMetrics({
                sessionAge: null,
                lastActivity: Date.now(),
                sessionChanges: sessionChangeCount.current
              });
              sessionStartTime.current = null;
              
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
              setAuthFeedback("");
              setTimeoutProgress(0);
              updateSecurityMetrics(newSession);
              
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

            // Enhanced token refresh handling with security monitoring
            if (event === 'TOKEN_REFRESHED') {
              console.log("[AuthContext] Processing token refresh");
              setSession(newSession);
              setUser(newSession.user);
              updateSecurityMetrics(newSession);
              
              // Security: Monitor token refresh frequency
              const refreshCount = sessionChangeCount.current;
              if (refreshCount > 10) {
                logSecurityEvent('Excessive token refreshes detected', {
                  refreshCount,
                  userId: newSession.user.id,
                  sessionId: newSession.access_token.slice(-8)
                });
              }
              
              // Always use cached status for token refresh to maintain continuity
              const cachedStatus = getCachedAdminStatus(
                newSession.user.id, 
                newSession.access_token
              );
              
              if (cachedStatus !== null) {
                console.log("[AuthContext] Using cached admin status on token refresh:", cachedStatus);
                if (isMounted) {
                  setIsAdmin(cachedStatus);
                  setAdminCheckCompleted(true);
                  setLoading(false);
                }
                
                // Schedule background refresh for next time
                scheduleBackgroundRefresh(newSession.user.id, async () => {
                  await checkAdminStatus(newSession.user.id, newSession.access_token, true);
                });
              } else {
                // Only check if no cache exists
                console.log("[AuthContext] No cache for token refresh, checking admin status");
              }
            }
          }
        );

        return () => {
          subscription.unsubscribe();
        };
      } catch (error) {
        console.error("[AuthContext] Auth initialization error:", error);
        logSecurityEvent('Auth initialization failed', { error: String(error) });
        
        if (isMounted) {
          setSession(null);
          setUser(null);
          setIsAdmin(false);
          setAdminCheckCompleted(true);
          setLoading(false);
          setAuthFeedback("Authentication error occurred");
        }
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
      cleanupProgressiveTimeout();
      if (adminCheckTimeoutRef.current) {
        clearTimeout(adminCheckTimeoutRef.current);
      }
      if (emergencyTimeoutRef.current) {
        clearTimeout(emergencyTimeoutRef.current);
      }
      if (backgroundRefreshRef.current) {
        clearTimeout(backgroundRefreshRef.current);
      }
    };
  }, [startProgressiveTimeout, checkAdminStatus, updateSecurityMetrics, user?.id]);

  const signOut = async () => {
    try {
      console.log("[AuthContext] Signing out...");
      logSecurityEvent('Sign out initiated', { 
        userId: user?.id,
        timestamp: new Date().toISOString()
      });
      
      // Clear cache entries
      if (user?.id) {
        invalidateCacheEntry(user.id);
      }
      
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
    forceSessionInvalidation,
    securityMetrics
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
