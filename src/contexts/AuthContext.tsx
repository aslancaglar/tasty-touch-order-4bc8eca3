
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

  // Function to check admin status with better error handling
  const checkAdminStatus = async (userId: string): Promise<boolean> => {
    if (!userId) {
      console.log("[AuthProvider] No userId provided for admin check");
      return false;
    }
    
    try {
      const startTime = Date.now();
      console.log(`[AuthProvider] ${new Date().toISOString()} - Starting admin check for user:`, userId);
      
      // Use maybeSingle() to handle missing profiles gracefully
      const { data, error } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', userId)
        .maybeSingle();
      
      const duration = Date.now() - startTime;
      console.log(`[AuthProvider] ${new Date().toISOString()} - Admin check completed in ${duration}ms`);
      
      if (error) {
        console.error("[AuthProvider] Error checking admin status:", error);
        const errorDetails = handleError(error, 'Admin status check');
        logSecurityEvent('Admin check failed', errorDetails);
        return false;
      }
      
      // If no profile exists, user is not admin
      if (!data) {
        console.log("[AuthProvider] No profile found for user, defaulting to non-admin");
        return false;
      }
      
      const adminStatus = data.is_admin || false;
      console.log(`[AuthProvider] ${new Date().toISOString()} - Admin check result:`, adminStatus);
      return adminStatus;
    } catch (error) {
      console.error("[AuthProvider] Exception in admin status check:", error);
      const errorDetails = handleError(error, 'Admin status check exception');
      logSecurityEvent('Admin check exception', errorDetails);
      return false;
    }
  };

  // FIXED: Removed problematic dependencies that caused infinite loop
  useEffect(() => {
    console.log(`[AuthProvider] ${new Date().toISOString()} - Setting up AuthProvider...`);
    
    let isComponentMounted = true;
    
    // Set up auth state listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        if (!isComponentMounted) return;
        
        console.log(`[AuthProvider] ${new Date().toISOString()} - Auth state change:`, event, currentSession ? "Session present" : "No session");
        
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        
        if (currentSession?.user) {
          // User is logged in, check admin status
          console.log(`[AuthProvider] ${new Date().toISOString()} - User logged in, checking admin status`);
          setAdminCheckCompleted(false);
          
          try {
            const adminStatus = await checkAdminStatus(currentSession.user.id);
            if (isComponentMounted) {
              console.log(`[AuthProvider] ${new Date().toISOString()} - Setting admin status:`, adminStatus);
              setIsAdmin(adminStatus);
              setAdminCheckCompleted(true);
            }
          } catch (error) {
            console.error(`[AuthProvider] ${new Date().toISOString()} - Error in admin status check:`, error);
            if (isComponentMounted) {
              setIsAdmin(false);
              setAdminCheckCompleted(true);
            }
          }
          
          logSecurityEvent('Auth state updated', { 
            event,
            userId: currentSession.user.id,
            timestamp: new Date().toISOString()
          });
        } else {
          // User is logged out
          console.log(`[AuthProvider] ${new Date().toISOString()} - User logged out, resetting admin status`);
          if (isComponentMounted) {
            setIsAdmin(false);
            setAdminCheckCompleted(true);
          }
          
          if (event === 'SIGNED_OUT') {
            logSecurityEvent('User signed out', { 
              event,
              timestamp: new Date().toISOString()
            });
          }
        }
        
        // Complete initialization after processing auth state
        if (isComponentMounted) {
          console.log(`[AuthProvider] ${new Date().toISOString()} - Completing auth initialization`);
          setLoading(false);
        }
      }
    );

    // Check for existing session after setting up the listener
    const initSession = async () => {
      try {
        console.log(`[AuthProvider] ${new Date().toISOString()} - Checking for existing session...`);
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        console.log(`[AuthProvider] ${new Date().toISOString()} - Initial session check:`, currentSession ? "Session found" : "No session");
        
        // The onAuthStateChange will handle the session processing
        // We just need to ensure loading is completed if no session
        if (!currentSession && isComponentMounted) {
          console.log(`[AuthProvider] ${new Date().toISOString()} - No existing session, completing initialization`);
          setLoading(false);
          setAdminCheckCompleted(true);
        }
      } catch (error) {
        console.error(`[AuthProvider] ${new Date().toISOString()} - Error in session initialization:`, error);
        const errorDetails = handleError(error, 'Session initialization');
        logSecurityEvent('Session initialization failed', errorDetails);
        
        // Fail safely
        if (isComponentMounted) {
          setSession(null);
          setUser(null);
          setIsAdmin(false);
          setAdminCheckCompleted(true);
          setLoading(false);
        }
      }
    };
    
    initSession();

    // Increased timeout and better logging
    const timeoutId = setTimeout(() => {
      if (isComponentMounted && loading) {
        console.warn(`[AuthProvider] ${new Date().toISOString()} - Auth initialization timeout (10s), completing with current state`);
        console.log(`[AuthProvider] Current state - Session:`, !!session, "User:", !!user, "IsAdmin:", isAdmin);
        setLoading(false);
        if (!adminCheckCompleted) {
          setAdminCheckCompleted(true);
        }
      }
    }, 10000); // Increased from 3 seconds to 10 seconds

    return () => {
      console.log(`[AuthProvider] ${new Date().toISOString()} - Cleaning up AuthProvider...`);
      isComponentMounted = false;
      subscription.unsubscribe();
      clearTimeout(timeoutId);
    };
  }, []); // FIXED: Empty dependency array to prevent infinite loop

  const signOut = async () => {
    try {
      console.log(`[AuthProvider] ${new Date().toISOString()} - Signing out...`);
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
      
      console.log(`[AuthProvider] ${new Date().toISOString()} - Sign out complete`);
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

  console.log(`[AuthProvider] ${new Date().toISOString()} - Render - Loading:`, loading, "AdminCheckCompleted:", adminCheckCompleted, "IsAdmin:", isAdmin, "User:", !!user);

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
