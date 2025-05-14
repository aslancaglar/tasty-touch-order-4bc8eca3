
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

type AuthContextType = {
  session: Session | null;
  user: User | null;
  signOut: () => Promise<void>;
  loading: boolean;
  refreshSession: () => Promise<void>; // Added method to manually refresh session
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Function to refresh session data
  const refreshSession = useCallback(async (): Promise<void> => {
    try {
      console.log("Manually refreshing session...");
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error("Error refreshing session:", error);
        return;
      }
      
      console.log("Session refreshed:", data.session ? "Session found" : "No session");
      setSession(data.session);
      setUser(data.session?.user ?? null);
    } catch (error) {
      console.error("Exception during session refresh:", error);
    }
  }, []);

  useEffect(() => {
    // Set up auth state listener first with debounced handling
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        console.log("Auth state change event:", event);
        
        // Use timeout to prevent potential race conditions in auth state updates
        setTimeout(() => {
          setSession(newSession);
          setUser(newSession?.user ?? null);
          setLoading(false);
          
          // Clear admin cache on sign out
          if (event === 'SIGNED_OUT') {
            localStorage.removeItem("admin_status_cache");
          }
        }, 0);
      }
    );

    // Then check for existing session with enhanced retry mechanism
    const checkSession = async (retries = 3, delay = 1000) => {
      try {
        console.log(`Checking for existing session (Attempt: ${4-retries})`);
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Error getting session:", error);
          
          if (retries > 0) {
            console.log(`Retrying session check in ${delay}ms...`);
            setTimeout(() => checkSession(retries - 1, delay * 1.5), delay);
            return;
          }
          
          // After all retries, set loading to false even if we couldn't get the session
          console.log("Failed to get session after all retries");
          setLoading(false);
        } else {
          console.log("Initial session check:", data.session ? "Session found" : "No session");
          setSession(data.session);
          setUser(data.session?.user ?? null);
          setLoading(false);
        }
      } catch (err) {
        console.error("Exception during session check:", err);
        
        if (retries > 0) {
          setTimeout(() => checkSession(retries - 1, delay * 1.5), delay);
          return;
        }
        
        setLoading(false);
      }
    };

    checkSession();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
      console.log("Signing out...");
      setLoading(true); // Set loading while signing out
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error("Error signing out:", error);
        throw error;
      }
      
      // Clear admin status cache
      localStorage.removeItem("admin_status_cache");
      
      // Clear state regardless of API response
      setSession(null);
      setUser(null);
      
      console.log("Sign out complete, session and user state cleared");
    } catch (error) {
      console.error("Exception during sign out:", error);
      // Still clear state even if there's an error
      setSession(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const value = {
    session,
    user,
    signOut,
    loading,
    refreshSession, // Expose the refresh function
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
