
import { createContext, useContext, useEffect, useState } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

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
    // Set up auth state listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        console.log("Auth state change event:", event);
        setSession(newSession);
        setUser(newSession?.user ?? null);
        setLoading(false);
      }
    );

    // Then check for existing session with retry mechanism
    const checkSession = async (retries = 3, delay = 1000) => {
      try {
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Error getting session:", error);
          
          if (retries > 0) {
            console.log(`Retrying session check... (${retries} attempts left)`);
            setTimeout(() => checkSession(retries - 1, delay * 1.5), delay);
            return;
          }
        }
        
        console.log("Initial session check:", data.session ? "Session found" : "No session");
        setSession(data.session);
        setUser(data.session?.user ?? null);
        setLoading(false);
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
      const { error } = await supabase.auth.signOut();
      
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
