
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
        console.error("Admin check error:", error);
        return false;
      }
      
      const adminStatus = data?.is_admin || false;
      console.log("Admin check result:", adminStatus);
      return adminStatus;
    } catch (error) {
      console.error("Admin check exception:", error);
      return false;
    }
  };

  useEffect(() => {
    console.log("AuthProvider initializing...");
    
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Error getting session:", error);
          setSession(null);
          setUser(null);
          setIsAdmin(false);
          setAdminCheckCompleted(true);
          setLoading(false);
          return;
        }

        console.log("Initial session:", currentSession ? "Found" : "None");
        
        if (currentSession?.user) {
          setSession(currentSession);
          setUser(currentSession.user);
          
          // Check admin status
          const adminStatus = await checkAdminStatus(currentSession.user.id);
          setIsAdmin(adminStatus);
          setAdminCheckCompleted(true);
        } else {
          setSession(null);
          setUser(null);
          setIsAdmin(false);
          setAdminCheckCompleted(true);
        }
        
        setLoading(false);
      } catch (error) {
        console.error("Session initialization error:", error);
        setSession(null);
        setUser(null);
        setIsAdmin(false);
        setAdminCheckCompleted(true);
        setLoading(false);
      }
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log("Auth state change:", event);
        
        if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          setIsAdmin(false);
          setAdminCheckCompleted(true);
          setLoading(false);
          logSecurityEvent('User signed out', { timestamp: new Date().toISOString() });
        } else if (event === 'SIGNED_IN' && currentSession?.user) {
          setSession(currentSession);
          setUser(currentSession.user);
          setAdminCheckCompleted(false);
          
          logSecurityEvent('User signed in', { 
            userId: currentSession.user.id,
            timestamp: new Date().toISOString()
          });
          
          // Check admin status
          try {
            const adminStatus = await checkAdminStatus(currentSession.user.id);
            setIsAdmin(adminStatus);
          } catch (error) {
            console.error("Error checking admin status:", error);
            setIsAdmin(false);
          }
          
          setAdminCheckCompleted(true);
          setLoading(false);
        } else if (event === 'TOKEN_REFRESHED' && currentSession) {
          console.log("Token refreshed");
          setSession(currentSession);
          setUser(currentSession.user);
          // Don't need to recheck admin status on token refresh
          setLoading(false);
        } else {
          // Handle other events or no session
          setSession(currentSession);
          setUser(currentSession?.user ?? null);
          
          if (!currentSession) {
            setIsAdmin(false);
            setAdminCheckCompleted(true);
          }
          
          setLoading(false);
        }
      }
    );

    // Get initial session
    getInitialSession();

    return () => {
      console.log("Cleaning up AuthProvider...");
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
      
      // Clear all state
      setSession(null);
      setUser(null);
      setIsAdmin(false);
      setAdminCheckCompleted(true);
      
      console.log("Sign out complete");
    } catch (error) {
      console.error("Sign out exception:", error);
      
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
