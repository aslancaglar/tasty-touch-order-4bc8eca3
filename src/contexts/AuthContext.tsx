
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

  // Function to check admin status - separated to avoid direct calls in auth state change
  const checkAdminStatus = async (userId: string) => {
    if (!userId) return false;
    
    try {
      console.log("Checking admin status for user:", userId);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.error("Error checking admin status:", error);
        return false;
      }
      
      console.log("Admin check result:", data?.is_admin);
      return data?.is_admin || false;
    } catch (error) {
      console.error("Exception checking admin status:", error);
      return false;
    }
  };

  useEffect(() => {
    console.log("Setting up AuthProvider...");
    
    // Use a stale closure prevention technique with function reference
    const handleAuthChange = (event: string, currentSession: Session | null) => {
      console.log("Auth state change event:", event);
      
      // Synchronously update session and user state
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      
      // Reset admin status when session changes
      if (event === 'SIGNED_OUT') {
        setIsAdmin(false);
        setAdminCheckCompleted(true);
        setLoading(false);
        console.log("User signed out, clearing application state");
      }
    };
    
    // Set up auth state listener first - this prevents deadlocks
    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthChange);

    // Then check for existing session
    const initSession = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        console.log("Initial session check:", currentSession ? "Session found" : "No session");
        
        // Explicitly verify the session token is still valid
        if (currentSession) {
          const { data: { user: currentUser } } = await supabase.auth.getUser();
          if (!currentUser) {
            // Invalid session detected, clear it
            console.warn("Invalid session detected, clearing...");
            await supabase.auth.signOut();
            setSession(null);
            setUser(null);
            setIsAdmin(false);
            setAdminCheckCompleted(true);
          } else {
            setSession(currentSession);
            setUser(currentUser);
            
            // Check admin status outside the auth state change callback
            const adminStatus = await checkAdminStatus(currentUser.id);
            setIsAdmin(adminStatus);
            setAdminCheckCompleted(true);
          }
        } else {
          setIsAdmin(false);
          setAdminCheckCompleted(true);
        }
        
        setLoading(false);
      } catch (error) {
        console.error("Error during session initialization:", error);
        // Fail safely by assuming no valid session
        setSession(null);
        setUser(null);
        setIsAdmin(false);
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

  // When the user state changes (and isn't being updated as part of initial load)
  useEffect(() => {
    const updateAdminStatus = async () => {
      if (user && !loading) {
        console.log("User state changed, updating admin status for:", user.id);
        
        try {
          setAdminCheckCompleted(false);
          const adminStatus = await checkAdminStatus(user.id);
          setIsAdmin(adminStatus);
        } finally {
          setAdminCheckCompleted(true);
        }
      }
    };
    
    updateAdminStatus();
  }, [user, loading]);

  const signOut = async () => {
    try {
      console.log("Signing out...");
      // Use a timeout to prevent potential deadlocks with auth state changes
      const { error } = await Promise.race([
        supabase.auth.signOut(),
        new Promise<{error: Error}>((_, reject) => 
          setTimeout(() => reject({ error: new Error("Sign out timed out") }), 5000)
        )
      ]);
      
      if (error) {
        console.error("Error signing out:", error);
        throw error;
      }
      
      // Clear state regardless of API response
      setSession(null);
      setUser(null);
      setIsAdmin(false);
      
      console.log("Sign out complete, session and user state cleared");
    } catch (error) {
      console.error("Exception during sign out:", error);
      // Still clear state even if there's an error
      setSession(null);
      setUser(null);
      setIsAdmin(false);
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
