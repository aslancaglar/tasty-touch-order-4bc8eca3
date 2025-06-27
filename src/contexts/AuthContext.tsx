
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

  // Cache admin status to avoid repeated checks
  const [adminStatusCache, setAdminStatusCache] = useState<{ [key: string]: boolean }>({});

  // Enhanced admin status check with security logging
  const checkAdminStatus = async (userId: string): Promise<boolean> => {
    if (!userId) return false;
    
    // Check cache first
    if (adminStatusCache[userId] !== undefined) {
      console.log("Admin status from cache:", adminStatusCache[userId]);
      return adminStatusCache[userId];
    }
    
    try {
      console.log("Checking admin status for user:", userId);
      
      // Use the enhanced security function
      const { data, error } = await supabase.rpc('get_current_user_admin_status');
      
      if (error) {
        console.warn("Admin check failed:", error.message);
        // Log security event for failed admin checks
        await supabase.rpc('log_security_event', {
          event_type: 'admin_check_failed',
          event_data: { error: error.message, user_id: userId }
        });
        
        // Cache false result to avoid repeated failed requests
        setAdminStatusCache(prev => ({ ...prev, [userId]: false }));
        return false;
      }
      
      const adminStatus = data || false;
      console.log("Admin status retrieved:", adminStatus);
      
      // Log successful admin status verification
      if (adminStatus) {
        await supabase.rpc('log_security_event', {
          event_type: 'admin_status_verified',
          event_data: { user_id: userId }
        });
      }
      
      // Cache the result
      setAdminStatusCache(prev => ({ ...prev, [userId]: adminStatus }));
      return adminStatus;
    } catch (error) {
      console.error("Admin check exception:", error);
      
      // Log security exception
      await supabase.rpc('log_security_event', {
        event_type: 'admin_check_exception',
        event_data: { error: String(error), user_id: userId }
      });
      
      // Cache false result for exceptions too
      setAdminStatusCache(prev => ({ ...prev, [userId]: false }));
      return false;
    }
  };

  // Initialize authentication state with enhanced security
  useEffect(() => {
    console.log("Initializing AuthProvider with security enhancements...");
    
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
          // Log successful session restoration
          await supabase.rpc('log_security_event', {
            event_type: 'session_restored',
            event_data: { user_id: currentSession.user.id }
          });

          // Check admin status for existing session
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
        } else {
          // No user, set defaults
          setIsAdmin(false);
          setAdminCheckCompleted(true);
        }
        
        if (isMounted) {
          setLoading(false);
        }

        // Set up auth state change listener with enhanced security
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
                await supabase.rpc('log_security_event', {
                  event_type: 'user_signed_out',
                  event_data: { timestamp: new Date().toISOString() }
                });
              }
              return;
            }

            // Handle sign in or token refresh
            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
              setSession(newSession);
              setUser(newSession.user);
              
              // Log authentication events
              await supabase.rpc('log_security_event', {
                event_type: event === 'SIGNED_IN' ? 'user_signed_in' : 'token_refreshed',
                event_data: { 
                  user_id: newSession.user.id,
                  timestamp: new Date().toISOString(),
                  email: newSession.user.email
                }
              });
              
              // Check admin status for new session
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
        
        // Log initialization errors
        await supabase.rpc('log_security_event', {
          event_type: 'auth_initialization_error',
          event_data: { error: String(error) }
        });
        
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
      
      // Log sign out attempt
      await supabase.rpc('log_security_event', {
        event_type: 'sign_out_initiated',
        event_data: { 
          user_id: user?.id,
          timestamp: new Date().toISOString()
        }
      });
      
      // Clear admin status cache
      setAdminStatusCache({});
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error("Sign out error:", error);
        
        // Log sign out failure
        await supabase.rpc('log_security_event', {
          event_type: 'sign_out_failed',
          event_data: { error: error.message, user_id: user?.id }
        });
        
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
