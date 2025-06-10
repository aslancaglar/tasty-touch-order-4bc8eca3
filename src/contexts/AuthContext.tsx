
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
  userRole: 'admin' | 'owner' | null;
  validateSession: () => Promise<boolean>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [adminCheckCompleted, setAdminCheckCompleted] = useState(false);
  const [userRole, setUserRole] = useState<'admin' | 'owner' | null>(null);

  // Simplified session validation
  const validateSession = async (): Promise<boolean> => {
    if (!session) return false;
    
    // For now, just check if session exists and is not expired
    const now = Date.now();
    const sessionExpiryMs = session.expires_at ? session.expires_at * 1000 : 0;
    
    if (sessionExpiryMs <= now) {
      console.log('Session expired');
      return false;
    }

    return true;
  };

  // Simple admin status check
  const checkAdminStatus = async (userId: string): Promise<boolean> => {
    if (!userId) {
      setAdminCheckCompleted(true);
      return false;
    }
    
    try {
      console.log("Checking admin status for user:", userId);
      
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.error("Profile query failed:", error);
        setAdminCheckCompleted(true);
        return false;
      }
      
      const adminStatus = profileData?.is_admin || false;
      setUserRole(adminStatus ? 'admin' : 'owner');
      
      console.log("Admin status result:", adminStatus);
      setAdminCheckCompleted(true);
      return adminStatus;
      
    } catch (error) {
      console.error("Admin check exception:", error);
      setAdminCheckCompleted(true);
      return false;
    }
  };

  useEffect(() => {
    console.log("Setting up AuthProvider...");
    
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      console.log("Auth state change event:", event);
      
      // Update session and user state immediately
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      
      if (event === 'SIGNED_OUT') {
        setIsAdmin(false);
        setUserRole(null);
        setAdminCheckCompleted(true);
        setLoading(false);
        console.log("User signed out");
      } else if (event === 'SIGNED_IN' && currentSession?.user) {
        console.log("User signed in, checking admin status");
        const adminStatus = await checkAdminStatus(currentSession.user.id);
        setIsAdmin(adminStatus);
        setLoading(false);
      } else if (event === 'TOKEN_REFRESHED') {
        console.log('Token refreshed successfully');
      }
    });

    // Initialize session
    const initSession = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        console.log("Initial session check:", currentSession ? "Session found" : "No session");
        
        if (currentSession?.user) {
          setSession(currentSession);
          setUser(currentSession.user);
          
          const adminStatus = await checkAdminStatus(currentSession.user.id);
          setIsAdmin(adminStatus);
        } else {
          setIsAdmin(false);
          setUserRole(null);
          setAdminCheckCompleted(true);
        }
        
        setLoading(false);
      } catch (error) {
        console.error("Session initialization error:", error);
        
        // Always complete loading even on error
        setSession(null);
        setUser(null);
        setIsAdmin(false);
        setUserRole(null);
        setAdminCheckCompleted(true);
        setLoading(false);
      }
    };
    
    initSession();

    return () => {
      console.log("Cleaning up AuthProvider...");
      subscription.unsubscribe();
    };
  }, []);

  // Sign out function
  const signOut = async () => {
    try {
      console.log("Initiating sign out...");
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error("Sign out error:", error);
        throw error;
      }
      
      // Clear state
      setSession(null);
      setUser(null);
      setIsAdmin(false);
      setUserRole(null);
      setAdminCheckCompleted(true);
      
      console.log("Sign out complete");
    } catch (error) {
      console.error("Sign out exception:", error);
      
      // Force cleanup even on error
      setSession(null);
      setUser(null);
      setIsAdmin(false);
      setUserRole(null);
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
    userRole,
    validateSession,
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
