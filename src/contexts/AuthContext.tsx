
import { createContext, useContext, useEffect, useState } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AuthContextType = {
  session: Session | null;
  user: User | null;
  signOut: () => Promise<void>;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("Setting up AuthProvider...");
    
    // Use a stale closure prevention technique with function reference
    const handleAuthChange = (event: string, currentSession: Session | null) => {
      console.log("Auth state change event:", event);
      
      // Synchronously update state
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setLoading(false);
      
      // Additional security checks can be added here
      if (event === 'TOKEN_REFRESHED') {
        console.log("Token refreshed successfully");
      }
      
      if (event === 'SIGNED_OUT') {
        // Clear any application state or cached data
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
          } else {
            setSession(currentSession);
            setUser(currentUser);
          }
        }
        
        setLoading(false);
      } catch (error) {
        console.error("Error during session initialization:", error);
        // Fail safely by assuming no valid session
        setSession(null);
        setUser(null);
        setLoading(false);
      }
    };
    
    initSession();

    return () => {
      console.log("Cleaning up AuthProvider...");
      subscription.unsubscribe();
    };
  }, []);

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
      
      console.log("Sign out complete, session and user state cleared");
    } catch (error) {
      console.error("Exception during sign out:", error);
      // Still clear state even if there's an error
      setSession(null);
      setUser(null);
    }
  };

  const value = {
    session,
    user,
    signOut,
    loading,
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
