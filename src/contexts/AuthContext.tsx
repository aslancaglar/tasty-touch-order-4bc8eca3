
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

  // Simplified admin check
  const checkAdminStatus = async (userId: string): Promise<boolean> => {
    if (!userId) {
      console.log("No userId provided for admin check");
      return false;
    }
    
    try {
      console.log("Checking admin status for user:", userId);
      
      const { data, error } = await supabase
        .rpc('is_admin_user', { user_id: userId });
      
      if (error) {
        console.error("Admin check failed:", error);
        return false;
      }
      
      const adminStatus = data || false;
      console.log("Admin check result:", adminStatus);
      return adminStatus;
    } catch (error) {
      console.error("Admin check exception:", error);
      return false;
    }
  };

  useEffect(() => {
    console.log("Setting up AuthProvider...");
    
    let timeoutId: NodeJS.Timeout;
    
    // Set timeout protection to prevent infinite loading
    const setLoadingTimeout = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        console.warn("Auth initialization timeout - forcing completion");
        setLoading(false);
        setAdminCheckCompleted(true);
      }, 10000); // 10 second timeout
    };
    
    const clearLoadingTimeout = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = undefined;
      }
    };

    setLoadingTimeout();
    
    const handleAuthChange = async (event: string, currentSession: Session | null) => {
      console.log("Auth state change event:", event, currentSession ? "Session present" : "No session");
      
      // Clear any existing timeout
      clearLoadingTimeout();
      
      // Update session and user state immediately
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      
      // Handle logout events or no session
      if (event === 'SIGNED_OUT' || !currentSession) {
        console.log("User signed out or no session, clearing admin state");
        setIsAdmin(false);
        setAdminCheckCompleted(true);
        setLoading(false);
        return;
      }
      
      // Handle sign-in events - check admin status
      if (currentSession?.user && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
        try {
          console.log("Checking admin status for user:", currentSession.user.id);
          setAdminCheckCompleted(false);
          const adminStatus = await checkAdminStatus(currentSession.user.id);
          setIsAdmin(adminStatus);
          console.log("Admin status set to:", adminStatus);
        } catch (error) {
          console.error("Error checking admin status:", error);
          setIsAdmin(false);
        } finally {
          setAdminCheckCompleted(true);
          setLoading(false);
        }
      } else if (currentSession?.user) {
        // Session exists but not a fresh sign-in, still need to check admin status
        try {
          console.log("Existing session found, checking admin status");
          setAdminCheckCompleted(false);
          const adminStatus = await checkAdminStatus(currentSession.user.id);
          setIsAdmin(adminStatus);
          console.log("Admin status set to:", adminStatus);
        } catch (error) {
          console.error("Error checking admin status:", error);
          setIsAdmin(false);
        } finally {
          setAdminCheckCompleted(true);
          setLoading(false);
        }
      } else {
        // No user, complete loading
        setIsAdmin(false);
        setAdminCheckCompleted(true);
        setLoading(false);
      }
    };
    
    // Set up auth state listener - this will handle both initial session and changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthChange);

    // Get initial session - this will trigger the auth state change handler
    supabase.auth.getSession().then(({ data: { session: currentSession }, error }) => {
      if (error) {
        console.error("Error getting initial session:", error);
        clearLoadingTimeout();
        setSession(null);
        setUser(null);
        setIsAdmin(false);
        setAdminCheckCompleted(true);
        setLoading(false);
        return;
      }
      
      console.log("Initial session retrieved:", currentSession ? "Session found" : "No session");
      // The auth state change handler will be triggered automatically
      // so we don't need to manually call handleAuthChange here
    });

    return () => {
      console.log("Cleaning up AuthProvider...");
      clearLoadingTimeout();
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
      console.log("Signing out...");
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error("Sign out failed:", error);
        throw error;
      }
      
      // State will be cleared by the auth state change handler
      console.log("Sign out complete");
    } catch (error) {
      console.error("Sign out exception:", error);
      
      // Force clear state even on error
      setSession(null);
      setUser(null);
      setIsAdmin(false);
      setAdminCheckCompleted(true);
      setLoading(false);
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

  console.log("AuthProvider state:", { 
    hasUser: !!user, 
    isAdmin, 
    loading, 
    adminCheckCompleted 
  });

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
