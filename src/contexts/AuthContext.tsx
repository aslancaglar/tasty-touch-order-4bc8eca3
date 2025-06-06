
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
  const [initialized, setInitialized] = useState(false);

  // Function to check admin status
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
        const errorDetails = handleError(error, 'Admin status check');
        logSecurityEvent('Admin check failed', errorDetails);
        return false;
      }
      
      const adminStatus = data?.is_admin || false;
      console.log("Admin check result:", adminStatus);
      return adminStatus;
    } catch (error) {
      const errorDetails = handleError(error, 'Admin status check exception');
      logSecurityEvent('Admin check exception', errorDetails);
      return false;
    }
  };

  useEffect(() => {
    console.log("Setting up AuthProvider...");
    
    // Set up auth state listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log("Auth state change event:", event, currentSession ? "Session present" : "No session");
        
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        
        if (currentSession?.user) {
          // User is logged in, check admin status
          setAdminCheckCompleted(false);
          try {
            const adminStatus = await checkAdminStatus(currentSession.user.id);
            setIsAdmin(adminStatus);
          } catch (error) {
            console.error("Error checking admin status:", error);
            setIsAdmin(false);
          } finally {
            setAdminCheckCompleted(true);
          }
          
          logSecurityEvent('Auth state updated', { 
            event,
            userId: currentSession.user.id,
            timestamp: new Date().toISOString()
          });
        } else {
          // User is logged out
          setIsAdmin(false);
          setAdminCheckCompleted(true);
          
          if (event === 'SIGNED_OUT') {
            logSecurityEvent('User signed out', { 
              event,
              timestamp: new Date().toISOString()
            });
          }
        }
        
        if (!initialized) {
          setLoading(false);
          setInitialized(true);
        }
      }
    );

    // Check for existing session after setting up the listener
    const initSession = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        console.log("Initial session check:", currentSession ? "Session found" : "No session");
        
        // The onAuthStateChange will handle the session update
        if (!currentSession && !initialized) {
          // No session and not initialized yet, complete initialization
          setLoading(false);
          setInitialized(true);
          setAdminCheckCompleted(true);
        }
      } catch (error) {
        const errorDetails = handleError(error, 'Session initialization');
        logSecurityEvent('Session initialization failed', errorDetails);
        
        // Fail safely
        setSession(null);
        setUser(null);
        setIsAdmin(false);
        setAdminCheckCompleted(true);
        setLoading(false);
        setInitialized(true);
      }
    };
    
    initSession();

    // Set up a timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      if (!initialized) {
        console.warn("Auth initialization timeout, completing with defaults");
        setLoading(false);
        setInitialized(true);
        setAdminCheckCompleted(true);
      }
    }, 5000); // 5 second timeout

    return () => {
      console.log("Cleaning up AuthProvider...");
      subscription.unsubscribe();
      clearTimeout(timeoutId);
    };
  }, [initialized]);

  const signOut = async () => {
    try {
      console.log("Signing out...");
      logSecurityEvent('Sign out initiated', { 
        userId: user?.id,
        timestamp: new Date().toISOString()
      });
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        const errorDetails = handleError(error, 'Sign out');
        logSecurityEvent('Sign out failed', errorDetails);
        throw error;
      }
      
      console.log("Sign out complete");
    } catch (error) {
      const errorDetails = handleError(error, 'Sign out exception');
      logSecurityEvent('Sign out exception', errorDetails);
      
      // Clear state even on error
      setSession(null);
      setUser(null);
      setIsAdmin(false);
      setAdminCheckCompleted(true);
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
