
import { createContext, useContext, useEffect, useState } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

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

  // Process session and update all related state
  const processSession = async (currentSession: Session | null, source: string) => {
    console.log(`Processing session from ${source}:`, currentSession ? "Session present" : "No session");
    
    // Update session and user state immediately
    setSession(currentSession);
    setUser(currentSession?.user ?? null);
    
    // Handle no session case
    if (!currentSession?.user) {
      console.log("No session/user, clearing admin state");
      setIsAdmin(false);
      setAdminCheckCompleted(true);
      setLoading(false);
      setInitialized(true);
      return;
    }
    
    // Check admin status for authenticated users
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
      setInitialized(true);
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
        setInitialized(true);
      }, 10000); // 10 second timeout
    };
    
    const clearLoadingTimeout = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = undefined;
      }
    };

    setLoadingTimeout();
    
    // Single auth state change handler - this will handle both initial session and future changes
    const handleAuthChange = async (event: string, currentSession: Session | null) => {
      console.log("Auth state change event:", event, currentSession ? "Session present" : "No session");
      
      clearLoadingTimeout();
      
      try {
        await processSession(currentSession, `auth-change-${event}`);
      } catch (error) {
        console.error("Error processing session in auth change:", error);
        setSession(null);
        setUser(null);
        setIsAdmin(false);
        setAdminCheckCompleted(true);
        setLoading(false);
        setInitialized(true);
      }
    };
    
    // Set up auth state listener - this will automatically get initial session
    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthChange);

    // Fallback: if no auth event fires within 2 seconds, manually get session
    const fallbackTimeout = setTimeout(async () => {
      if (!initialized) {
        console.log("Fallback: manually getting session after 2 seconds");
        try {
          const { data: { session: currentSession }, error } = await supabase.auth.getSession();
          
          if (error) {
            console.error("Error getting fallback session:", error);
            clearLoadingTimeout();
            setSession(null);
            setUser(null);
            setIsAdmin(false);
            setAdminCheckCompleted(true);
            setLoading(false);
            setInitialized(true);
            return;
          }
          
          console.log("Fallback session retrieved:", currentSession ? "Session found" : "No session");
          clearLoadingTimeout();
          await processSession(currentSession, "fallback-manual");
        } catch (error) {
          console.error("Error during fallback session retrieval:", error);
          clearLoadingTimeout();
          setSession(null);
          setUser(null);
          setIsAdmin(false);
          setAdminCheckCompleted(true);
          setLoading(false);
          setInitialized(true);
        }
      }
    }, 2000);

    return () => {
      console.log("Cleaning up AuthProvider...");
      clearLoadingTimeout();
      clearTimeout(fallbackTimeout);
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
    adminCheckCompleted,
    initialized 
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
