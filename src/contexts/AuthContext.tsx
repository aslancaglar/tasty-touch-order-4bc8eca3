
import { createContext, useContext, useEffect, useState, useRef } from "react";
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
  
  // Add refs to track state and prevent infinite loops
  const initializationRef = useRef(false);
  const adminCheckAttempts = useRef(0);
  const maxAdminCheckAttempts = 3;

  // Function to check admin status with retry logic
  const checkAdminStatus = async (userId: string, retryCount = 0): Promise<boolean> => {
    const maxRetries = 3;
    
    if (!userId) {
      console.log("[AuthProvider] No userId provided for admin check");
      return false;
    }
    
    // Prevent excessive admin check attempts
    if (adminCheckAttempts.current >= maxAdminCheckAttempts) {
      console.warn("[AuthProvider] Max admin check attempts reached, defaulting to false");
      return false;
    }
    
    adminCheckAttempts.current++;
    
    try {
      const startTime = Date.now();
      console.log(`[AuthProvider] ${new Date().toISOString()} - Starting admin check for user:`, userId, `(attempt ${retryCount + 1}, total attempts: ${adminCheckAttempts.current})`);
      
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
        
        // Retry on network or temporary errors
        if (retryCount < maxRetries && (error.message?.includes('network') || error.code === 'PGRST301')) {
          console.log(`[AuthProvider] Retrying admin check (${retryCount + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1))); // Exponential backoff
          return checkAdminStatus(userId, retryCount + 1);
        }
        
        const errorDetails = handleError(error, 'Admin status check');
        logSecurityEvent('Admin check failed', errorDetails);
        return false; // Default to non-admin on persistent errors
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
      
      // Retry on exceptions
      if (retryCount < maxRetries) {
        console.log(`[AuthProvider] Retrying admin check after exception (${retryCount + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
        return checkAdminStatus(userId, retryCount + 1);
      }
      
      const errorDetails = handleError(error, 'Admin status check exception');
      logSecurityEvent('Admin check exception', errorDetails);
      return false; // Default to non-admin on persistent exceptions
    }
  };

  useEffect(() => {
    console.log(`[AuthProvider] ${new Date().toISOString()} - Setting up AuthProvider...`);
    
    // Prevent multiple initializations
    if (initializationRef.current) {
      console.log("[AuthProvider] Already initialized, skipping");
      return;
    }
    
    initializationRef.current = true;
    let isComponentMounted = true;
    let timeoutId: NodeJS.Timeout;
    
    // Set up auth state listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        if (!isComponentMounted) return;
        
        console.log(`[AuthProvider] ${new Date().toISOString()} - Auth state change:`, event, currentSession ? "Session present" : "No session");
        
        // Clear any existing timeout since we have a definitive auth state
        if (timeoutId) {
          console.log(`[AuthProvider] ${new Date().toISOString()} - Clearing timeout due to auth state change`);
          clearTimeout(timeoutId);
        }
        
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        
        if (currentSession?.user) {
          // User is logged in, check admin status
          console.log(`[AuthProvider] ${new Date().toISOString()} - User logged in, checking admin status`);
          
          try {
            const adminStatus = await checkAdminStatus(currentSession.user.id);
            if (isComponentMounted) {
              console.log(`[AuthProvider] ${new Date().toISOString()} - Setting admin status:`, adminStatus, "and marking check as completed");
              setIsAdmin(adminStatus);
              setAdminCheckCompleted(true);
              setLoading(false); // Complete loading after admin check
            }
          } catch (error) {
            console.error(`[AuthProvider] ${new Date().toISOString()} - Error in admin status check:`, error);
            if (isComponentMounted) {
              console.log(`[AuthProvider] ${new Date().toISOString()} - Setting admin status to false due to error and marking check as completed`);
              setIsAdmin(false);
              setAdminCheckCompleted(true);
              setLoading(false); // Complete loading even on error
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
            setIsAdmin(null);
            setAdminCheckCompleted(false);
            setLoading(false); // Complete loading for logged out state
            adminCheckAttempts.current = 0; // Reset attempts counter
          }
          
          if (event === 'SIGNED_OUT') {
            logSecurityEvent('User signed out', { 
              event,
              timestamp: new Date().toISOString()
            });
          }
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
          setAdminCheckCompleted(false);
        }
      } catch (error) {
        console.error(`[AuthProvider] ${new Date().toISOString()} - Error in session initialization:`, error);
        const errorDetails = handleError(error, 'Session initialization');
        logSecurityEvent('Session initialization failed', errorDetails);
        
        // Fail safely - complete loading but preserve any existing session
        if (isComponentMounted) {
          setLoading(false);
        }
      }
    };
    
    initSession();

    // FIXED: Improved timeout handling with functional state updates to avoid stale closures
    timeoutId = setTimeout(() => {
      if (!isComponentMounted) return;
      
      console.warn(`[AuthProvider] ${new Date().toISOString()} - Auth initialization timeout (10s)`);
      
      // Use functional state updates to get current state values
      setLoading(currentLoading => {
        if (currentLoading) {
          console.log(`[AuthProvider] ${new Date().toISOString()} - Timeout: Completing loading`);
          return false;
        }
        return currentLoading;
      });
      
      // Only set admin defaults if we have a user but no completed admin check
      setUser(currentUser => {
        if (currentUser) {
          setAdminCheckCompleted(currentAdminCheckCompleted => {
            if (!currentAdminCheckCompleted) {
              console.log(`[AuthProvider] ${new Date().toISOString()} - Timeout: Setting admin status to false and marking check as completed`);
              setIsAdmin(false);
              return true;
            }
            return currentAdminCheckCompleted;
          });
        }
        return currentUser;
      });
    }, 10000); // Reduced timeout to 10 seconds

    return () => {
      console.log(`[AuthProvider] ${new Date().toISOString()} - Cleaning up AuthProvider...`);
      isComponentMounted = false;
      subscription.unsubscribe();
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      initializationRef.current = false; // Reset for potential remount
    };
  }, []); // Empty dependency array to run only once

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
