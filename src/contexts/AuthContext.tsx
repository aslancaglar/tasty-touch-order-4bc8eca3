
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

  // Function to check admin status with better error handling
  const checkAdminStatus = async (userId: string): Promise<boolean> => {
    if (!userId) {
      console.log("No userId provided for admin check");
      return false;
    }
    
    try {
      console.log("Checking admin status for user:", userId);
      
      // Use maybeSingle() to handle missing profiles gracefully
      const { data, error } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', userId)
        .maybeSingle();
      
      if (error) {
        console.error("Error checking admin status:", error);
        const errorDetails = handleError(error, 'Admin status check');
        logSecurityEvent('Admin check failed', errorDetails);
        return false;
      }
      
      // If no profile exists, user is not admin
      if (!data) {
        console.log("No profile found for user, defaulting to non-admin");
        return false;
      }
      
      const adminStatus = data.is_admin || false;
      console.log("Admin check result:", adminStatus);
      return adminStatus;
    } catch (error) {
      console.error("Exception in admin status check:", error);
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
            console.log("Starting admin status check for user:", currentSession.user.id);
            const adminStatus = await checkAdminStatus(currentSession.user.id);
            console.log("Setting admin status to:", adminStatus);
            setIsAdmin(adminStatus);
            setAdminCheckCompleted(true);
          } catch (error) {
            console.error("Error in admin status check:", error);
            setIsAdmin(false);
            setAdminCheckCompleted(true);
          }
          
          logSecurityEvent('Auth state updated', { 
            event,
            userId: currentSession.user.id,
            timestamp: new Date().toISOString()
          });
        } else {
          // User is logged out
          console.log("User logged out, resetting admin status");
          setIsAdmin(false);
          setAdminCheckCompleted(true);
          
          if (event === 'SIGNED_OUT') {
            logSecurityEvent('User signed out', { 
              event,
              timestamp: new Date().toISOString()
            });
          }
        }
        
        // Complete initialization after processing auth state
        if (!initialized) {
          console.log("Completing auth initialization");
          setLoading(false);
          setInitialized(true);
        }
      }
    );

    // Check for existing session after setting up the listener
    const initSession = async () => {
      try {
        console.log("Checking for existing session...");
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        console.log("Initial session check:", currentSession ? "Session found" : "No session");
        
        // The onAuthStateChange will handle the session update, but we need to trigger it manually
        // if there's an existing session since the listener might not fire immediately
        if (currentSession && !initialized) {
          console.log("Found existing session, processing...");
          setSession(currentSession);
          setUser(currentSession.user);
          
          // Check admin status for existing session
          if (currentSession.user) {
            setAdminCheckCompleted(false);
            try {
              const adminStatus = await checkAdminStatus(currentSession.user.id);
              console.log("Initial admin status check result:", adminStatus);
              setIsAdmin(adminStatus);
            } catch (error) {
              console.error("Error in initial admin check:", error);
              setIsAdmin(false);
            } finally {
              setAdminCheckCompleted(true);
            }
          }
          
          setLoading(false);
          setInitialized(true);
        } else if (!currentSession && !initialized) {
          // No session and not initialized yet, complete initialization
          console.log("No existing session, completing initialization");
          setLoading(false);
          setInitialized(true);
          setAdminCheckCompleted(true);
        }
      } catch (error) {
        console.error("Error in session initialization:", error);
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

    // Reduced timeout and better logging
    const timeoutId = setTimeout(() => {
      if (!initialized) {
        console.warn("Auth initialization timeout (3s), completing with current state");
        console.log("Current state - Session:", !!session, "User:", !!user, "IsAdmin:", isAdmin);
        setLoading(false);
        setInitialized(true);
        if (!adminCheckCompleted) {
          setAdminCheckCompleted(true);
        }
      }
    }, 3000); // Reduced from 5 seconds to 3 seconds

    return () => {
      console.log("Cleaning up AuthProvider...");
      subscription.unsubscribe();
      clearTimeout(timeoutId);
    };
  }, [initialized, session, user, isAdmin, adminCheckCompleted]);

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

  console.log("AuthProvider render - Loading:", loading, "AdminCheckCompleted:", adminCheckCompleted, "IsAdmin:", isAdmin, "User:", !!user);

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
