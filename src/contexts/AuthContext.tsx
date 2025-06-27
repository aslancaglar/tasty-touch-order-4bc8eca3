
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

  // Enhanced admin status check with proper error handling
  const checkAdminStatus = async (userId: string): Promise<boolean> => {
    if (!userId) {
      console.log("No userId provided for admin check");
      return false;
    }
    
    try {
      console.log("Checking admin status for user:", userId);
      
      const { data, error } = await supabase.rpc('get_current_user_admin_status');
      
      if (error) {
        console.warn("Admin check failed:", error.message);
        await supabase.rpc('log_security_event', {
          event_type: 'admin_check_failed',
          event_data: { error: error.message, user_id: userId }
        });
        return false;
      }
      
      const adminStatus = data === true;
      console.log("Admin status result:", adminStatus);
      
      // Log successful admin status verification
      if (adminStatus) {
        await supabase.rpc('log_security_event', {
          event_type: 'admin_status_verified',
          event_data: { user_id: userId }
        });
      }
      
      return adminStatus;
    } catch (error) {
      console.error("Admin check exception:", error);
      
      await supabase.rpc('log_security_event', {
        event_type: 'admin_check_exception',
        event_data: { error: String(error), user_id: userId }
      });
      
      return false;
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
            console.warn("Auth initialization timeout");
            setLoading(false);
            setAdminCheckCompleted(true);
          }
        }, 10000);

        // Get current session
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Error getting session:", error);
          if (isMounted) {
            setSession(null);
            setUser(null);
            setIsAdmin(false);
            setAdminCheckCompleted(true);
            setLoading(false);
          }
          return;
        }
        
        if (!isMounted) return;
        
        console.log("Current session:", currentSession?.user?.id || 'no session');
        
        // Set session and user immediately
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        
        if (currentSession?.user) {
          // Log session restoration
          await supabase.rpc('log_security_event', {
            event_type: 'session_restored',
            event_data: { user_id: currentSession.user.id }
          });

          // Check admin status and wait for completion
          console.log("Checking admin status for existing session...");
          setAdminCheckCompleted(false);
          
          try {
            const adminStatus = await checkAdminStatus(currentSession.user.id);
            
            if (isMounted) {
              console.log("Setting admin status:", adminStatus);
              setIsAdmin(adminStatus);
              setAdminCheckCompleted(true);
              setLoading(false);
            }
          } catch (error) {
            console.error("Error during admin status check:", error);
            if (isMounted) {
              setIsAdmin(false);
              setAdminCheckCompleted(true);
              setLoading(false);
            }
          }
        } else {
          // No user session
          setIsAdmin(false);
          setAdminCheckCompleted(true);
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
              
              // For sign in events, check admin status
              if (event === 'SIGNED_IN') {
                console.log("New sign in - checking admin status...");
                setAdminCheckCompleted(false);
                
                try {
                  const adminStatus = await checkAdminStatus(newSession.user.id);
                  
                  if (isMounted) {
                    console.log("New user admin status:", adminStatus);
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
      if (user?.id) {
        await supabase.rpc('log_security_event', {
          event_type: 'sign_out_initiated',
          event_data: { 
            user_id: user.id,
            timestamp: new Date().toISOString()
          }
        });
      }
      
      // Clear local state immediately to prevent UI issues
      setSession(null);
      setUser(null);
      setIsAdmin(false);
      setAdminCheckCompleted(true);
      setLoading(false);
      
      // Attempt to sign out from Supabase
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.warn("Sign out error (but local state cleared):", error);
        
        if (user?.id) {
          await supabase.rpc('log_security_event', {
            event_type: 'sign_out_warning',
            event_data: { error: error.message, user_id: user.id, note: 'Local state cleared successfully' }
          });
        }
        
        // Don't throw the error since we've already cleared local state
        // The user will be effectively signed out from the UI perspective
        return;
      }
      
      console.log("Sign out complete");
    } catch (error) {
      console.warn("Sign out exception (but local state cleared):", error);
      
      // Even if there's an exception, we've already cleared the local state
      // so the user will appear signed out in the UI
      if (user?.id) {
        await supabase.rpc('log_security_event', {
          event_type: 'sign_out_exception',
          event_data: { error: String(error), user_id: user.id, note: 'Local state cleared successfully' }
        });
      }
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
