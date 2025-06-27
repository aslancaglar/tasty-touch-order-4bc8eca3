
import { createContext, useContext, useEffect, useState, useRef } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { logSecurityEvent } from "@/utils/error-handler";

type AuthContextType = {
  session: Session | null;
  user: User | null;
  isAdmin: boolean | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshAuth: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  // Refs to prevent race conditions
  const initRef = useRef(false);
  const currentUserIdRef = useRef<string | null>(null);
  const adminCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const debugLog = (message: string, data?: any) => {
    console.log(`[AuthContext] ${message}`, data || '');
  };

  // Simplified admin status check
  const checkAdminStatus = async (userId: string): Promise<boolean> => {
    try {
      debugLog("Checking admin status", { userId });
      
      const { data, error } = await supabase.rpc('get_current_user_admin_status');
      
      if (error) {
        debugLog("Admin check failed", { error: error.message });
        return false;
      }
      
      const adminStatus = Boolean(data);
      debugLog("Admin status retrieved", { userId, status: adminStatus });
      
      return adminStatus;
    } catch (error) {
      debugLog("Admin check exception", { error });
      return false;
    }
  };

  // Centralized session update logic
  const updateSessionState = async (newSession: Session | null, source: string) => {
    debugLog(`Updating session from ${source}`, { userId: newSession?.user?.id });

    setSession(newSession);
    setUser(newSession?.user ?? null);
    currentUserIdRef.current = newSession?.user?.id ?? null;

    if (!newSession?.user) {
      setIsAdmin(false);
      setLoading(false);
      debugLog("Session cleared");
      return;
    }

    const userId = newSession.user.id;

    try {
      // Clear any pending admin check
      if (adminCheckTimeoutRef.current) {
        clearTimeout(adminCheckTimeoutRef.current);
      }

      // Quick timeout for admin check to prevent hanging
      const adminCheckPromise = checkAdminStatus(userId);
      const timeoutPromise = new Promise<boolean>((_, reject) => {
        adminCheckTimeoutRef.current = setTimeout(() => {
          reject(new Error('Admin check timeout'));
        }, 5000);
      });

      const adminStatus = await Promise.race([adminCheckPromise, timeoutPromise]);
      
      // Clear timeout if successful
      if (adminCheckTimeoutRef.current) {
        clearTimeout(adminCheckTimeoutRef.current);
        adminCheckTimeoutRef.current = null;
      }

      // Only update if this is still the current user
      if (currentUserIdRef.current === userId) {
        setIsAdmin(adminStatus);
        setLoading(false);
        debugLog("Auth state updated", { userId, isAdmin: adminStatus });
      }
    } catch (error) {
      debugLog("Admin check timeout or error", { error });
      // Only update if this is still the current user
      if (currentUserIdRef.current === userId) {
        setIsAdmin(false);
        setLoading(false);
      }
    }
  };

  // Manual refresh function
  const refreshAuth = async () => {
    debugLog("Manual refresh initiated");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await updateSessionState(session, "manual refresh");
    } catch (error) {
      debugLog("Manual refresh failed", { error });
      setSession(null);
      setUser(null);
      setIsAdmin(false);
      setLoading(false);
    }
  };

  // Initialize auth state - React StrictMode compatible
  useEffect(() => {
    if (initRef.current) {
      debugLog("Initialization already completed");
      return;
    }

    debugLog("Initializing auth state");
    initRef.current = true;

    let isMounted = true;

    const initAuth = async () => {
      try {
        // Set up auth state listener first
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, newSession) => {
            if (!isMounted) return;
            
            debugLog("Auth state change", { event, userId: newSession?.user?.id });
            
            if (event === 'SIGNED_OUT' || !newSession?.user) {
              setSession(null);
              setUser(null);
              setIsAdmin(false);
              setLoading(false);
              currentUserIdRef.current = null;
              
              if (event === 'SIGNED_OUT') {
                logSecurityEvent('User signed out', { 
                  event, 
                  timestamp: new Date().toISOString() 
                });
              }
              return;
            }

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

        // Then get initial session
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        
        if (isMounted) {
          await updateSessionState(initialSession, "initialization");
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
          setLoading(false);
        }
      }
    };

    initAuth();

    return () => {
      isMounted = false;
      if (adminCheckTimeoutRef.current) {
        clearTimeout(adminCheckTimeoutRef.current);
      }
    };
  }, []);

  // Optimized tab focus handling
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user && !loading) {
        debugLog("Tab became visible - refreshing auth");
        setTimeout(() => refreshAuth(), 100);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user, loading]);

  const signOut = async () => {
    try {
      debugLog("Signing out");
      logSecurityEvent('Sign out initiated', { 
        userId: user?.id,
        timestamp: new Date().toISOString()
      });
      
      currentUserIdRef.current = null;
      const { error } = await supabase.auth.signOut();
      
      if (error) throw error;
      debugLog("Sign out complete");
    } catch (error) {
      debugLog("Sign out error", { error });
      throw error;
    }
  };

  const value = {
    session,
    user,
    isAdmin,
    loading,
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
