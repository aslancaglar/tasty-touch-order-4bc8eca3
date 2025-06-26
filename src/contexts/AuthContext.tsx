
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

  // Check admin status
  const checkAdminStatus = async (userId: string): Promise<boolean> => {
    if (!userId) return false;
    
    try {
      console.log("Checking admin status for user:", userId);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.warn("Admin check failed:", error.message);
        return false;
      }
      
      const adminStatus = data?.is_admin || false;
      console.log("Admin status:", adminStatus);
      return adminStatus;
    } catch (error) {
      console.error("Admin check exception:", error);
      return false;
    }
  };

  // Initialize authentication state
  useEffect(() => {
    console.log("Initializing AuthProvider...");
    
    let isMounted = true;
    
    const initializeAuth = async () => {
      try {
        // Get current session
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        
        if (!isMounted) return;
        
        if (currentSession?.user) {
          console.log("Valid session found during initialization");
          setSession(currentSession);
          setUser(currentSession.user);
          
          // Check admin status
          try {
            const adminStatus = await checkAdminStatus(currentSession.user.id);
            if (isMounted) {
              setIsAdmin(adminStatus);
              setAdminCheckCompleted(true);
            }
          } catch (error) {
            if (isMounted) {
              setIsAdmin(false);
              setAdminCheckCompleted(true);
            }
          }
        } else {
          console.log("No valid session found");
          setSession(null);
          setUser(null);
          setIsAdmin(false);
          setAdminCheckCompleted(true);
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
        if (isMounted) {
          setSession(null);
          setUser(null);
          setIsAdmin(false);
          setAdminCheckCompleted(true);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        if (!isMounted) return;
        
        console.log("Auth state change:", event, currentSession?.user?.id);
        
        if (event === 'SIGNED_OUT' || !currentSession?.user) {
          console.log("User signed out or no session");
          setSession(null);
          setUser(null);
          setIsAdmin(false);
          setAdminCheckCompleted(true);
          setLoading(false);
          logSecurityEvent('User signed out', { event, timestamp: new Date().toISOString() });
          return;
        }

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          console.log("User signed in or token refreshed");
          setSession(currentSession);
          setUser(currentSession.user);
          
          // Check admin status
          try {
            const adminStatus = await checkAdminStatus(currentSession.user.id);
            if (isMounted) {
              console.log("Setting admin status:", adminStatus);
              setIsAdmin(adminStatus);
              setAdminCheckCompleted(true);
            }
          } catch (error) {
            console.error("Error checking admin status:", error);
            if (isMounted) {
              setIsAdmin(false);
              setAdminCheckCompleted(true);
            }
          }
          
          if (event === 'SIGNED_IN') {
            logSecurityEvent('User signed in', { 
              userId: currentSession.user.id,
              timestamp: new Date().toISOString()
            });
          }
        }
        
        setLoading(false);
      }
    );

    // Initialize
    initializeAuth();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
      console.log("Signing out...");
      logSecurityEvent('Sign out initiated', { 
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
