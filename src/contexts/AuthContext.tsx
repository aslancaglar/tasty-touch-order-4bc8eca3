
import { createContext, useContext, useEffect, useState } from "react";
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

  // Server-side admin status check with no caching
  const checkAdminStatus = async (userId: string): Promise<boolean> => {
    if (!userId) return false;
    
    try {
      console.log("Server-side admin check for user:", userId);
      
      const { data, error } = await supabase
        .rpc('get_current_user_admin_status');
      
      if (error) {
        console.warn("Admin check failed:", error.message);
        await logSecurityEvent('Admin status check failed', {
          userId,
          error: error.message,
          timestamp: new Date().toISOString()
        });
        return false;
      }
      
      const adminStatus = data === true;
      console.log("Server-side admin status:", adminStatus);
      
      return adminStatus;
    } catch (error) {
      console.error("Admin check exception:", error);
      await logSecurityEvent('Admin status check exception', {
        userId,
        error: String(error),
        timestamp: new Date().toISOString()
      });
      return false;
    }
  };

  // Enhanced session validation with timeout checks
  const validateSession = async (): Promise<boolean> => {
    if (!session) return false;

    try {
      // Check if session is expired or about to expire
      const expiresAt = new Date(session.expires_at || 0).getTime();
      const now = Date.now();
      const fiveMinutes = 5 * 60 * 1000;

      if (expiresAt <= now) {
        console.log("Session expired, signing out");
        await signOut();
        return false;
      }

      // Refresh if expiring within 5 minutes
      if (expiresAt - now < fiveMinutes) {
        console.log("Session expiring soon, refreshing");
        const { data, error } = await supabase.auth.refreshSession();
        
        if (error) {
          console.error("Session refresh failed:", error);
          await logSecurityEvent('Session refresh failed', {
            userId: user?.id,
            error: error.message,
            timestamp: new Date().toISOString()
          });
          await signOut();
          return false;
        }

        if (data.session) {
          setSession(data.session);
          setUser(data.session.user);
        }
      }

      return true;
    } catch (error) {
      console.error("Session validation error:", error);
      await logSecurityEvent('Session validation error', {
        userId: user?.id,
        error: String(error),
        timestamp: new Date().toISOString()
      });
      return false;
    }
  };

  // Initialize authentication state
  useEffect(() => {
    console.log("Initializing AuthProvider...");
    
    let isMounted = true;
    let initializationTimeout: NodeJS.Timeout;
    let sessionValidationInterval: NodeJS.Timeout;
    
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
          // Validate session first
          setSession(currentSession);
          setUser(currentSession.user);
          
          const isValidSession = await validateSession();
          if (isValidSession) {
            // Check admin status for existing session - NO CACHING
            try {
              setAdminCheckCompleted(false);
              const adminStatus = await checkAdminStatus(currentSession.user.id);
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
          }
        } else {
          // No user, set defaults
          setIsAdmin(false);
          setAdminCheckCompleted(true);
        }
        
        if (isMounted) {
          setLoading(false);
        }

        // Set up periodic session validation (every 5 minutes)
        sessionValidationInterval = setInterval(async () => {
          if (session) {
            await validateSession();
          }
        }, 5 * 60 * 1000);

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
                await logSecurityEvent('User signed out', { 
                  event, 
                  timestamp: new Date().toISOString() 
                });
              }
              return;
            }

            // Handle sign in or token refresh
            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
              setSession(newSession);
              setUser(newSession.user);
              
              // Check admin status for new session - ALWAYS SERVER-SIDE
              try {
                setAdminCheckCompleted(false);
                const adminStatus = await checkAdminStatus(newSession.user.id);
                if (isMounted) {
                  setIsAdmin(adminStatus);
                  setAdminCheckCompleted(true);
                  setLoading(false);
                }
              } catch (error) {
                console.error("Error checking admin status on auth change:", error);
                if (isMounted) {
                  setIsAdmin(false);
                  setAdminCheckCompleted(true);
                  setLoading(false);
                }
              }
              
              if (event === 'SIGNED_IN') {
                await logSecurityEvent('User signed in', { 
                  userId: newSession.user.id,
                  timestamp: new Date().toISOString()
                });
              }
            }
          }
        );

        return () => {
          subscription.unsubscribe();
          if (initializationTimeout) {
            clearTimeout(initializationTimeout);
          }
          if (sessionValidationInterval) {
            clearInterval(sessionValidationInterval);
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
      if (sessionValidationInterval) {
        clearInterval(sessionValidationInterval);
      }
    };
  }, []);

  const signOut = async () => {
    try {
      console.log("Signing out...");
      await logSecurityEvent('Sign out initiated', { 
        userId: user?.id,
        timestamp: new Date().toISOString()
      });
      
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
