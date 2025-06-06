
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
  
  // Prevent multiple initializations and infinite loops
  const initializationRef = useRef(false);
  const adminCheckRef = useRef<Map<string, boolean>>(new Map());
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Function to check admin status with caching
  const checkAdminStatus = async (userId: string): Promise<boolean> => {
    // Check cache first
    if (adminCheckRef.current.has(userId)) {
      const cachedResult = adminCheckRef.current.get(userId)!;
      console.log(`[AuthProvider] ${new Date().toISOString()} - Using cached admin status:`, cachedResult);
      return cachedResult;
    }

    try {
      console.log(`[AuthProvider] ${new Date().toISOString()} - Checking admin status for user:`, userId);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', userId)
        .maybeSingle();
      
      if (error) {
        console.error("[AuthProvider] Error checking admin status:", error);
        const errorDetails = handleError(error, 'Admin status check');
        logSecurityEvent('Admin check failed', errorDetails);
        adminCheckRef.current.set(userId, false);
        return false;
      }
      
      const adminStatus = data?.is_admin || false;
      console.log(`[AuthProvider] ${new Date().toISOString()} - Admin check result:`, adminStatus);
      
      // Cache the result
      adminCheckRef.current.set(userId, adminStatus);
      return adminStatus;
    } catch (error) {
      console.error("[AuthProvider] Exception in admin status check:", error);
      const errorDetails = handleError(error, 'Admin status check exception');
      logSecurityEvent('Admin check exception', errorDetails);
      adminCheckRef.current.set(userId, false);
      return false;
    }
  };

  useEffect(() => {
    console.log(`[AuthProvider] ${new Date().toISOString()} - Initializing AuthProvider...`);
    
    // Prevent multiple initializations
    if (initializationRef.current) {
      console.log("[AuthProvider] Already initialized, skipping");
      return;
    }
    
    initializationRef.current = true;
    let isMounted = true;

    const initializeAuth = async () => {
      try {
        // Clear any existing timeout
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }

        // Set up auth state listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, currentSession) => {
            if (!isMounted) return;
            
            console.log(`[AuthProvider] ${new Date().toISOString()} - Auth state change:`, event, currentSession ? "Session present" : "No session");
            
            setSession(currentSession);
            setUser(currentSession?.user ?? null);
            
            if (currentSession?.user) {
              // User is logged in, check admin status
              try {
                const adminStatus = await checkAdminStatus(currentSession.user.id);
                if (isMounted) {
                  setIsAdmin(adminStatus);
                  setAdminCheckCompleted(true);
                  setLoading(false);
                }
              } catch (error) {
                console.error(`[AuthProvider] Error in admin check:`, error);
                if (isMounted) {
                  setIsAdmin(false);
                  setAdminCheckCompleted(true);
                  setLoading(false);
                }
              }
              
              logSecurityEvent('Auth state updated', { 
                event,
                userId: currentSession.user.id,
                timestamp: new Date().toISOString()
              });
            } else {
              // User is logged out
              if (isMounted) {
                setIsAdmin(null);
                setAdminCheckCompleted(false);
                setLoading(false);
                // Clear admin cache
                adminCheckRef.current.clear();
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

        // Check for existing session
        console.log(`[AuthProvider] ${new Date().toISOString()} - Checking for existing session...`);
        const { data: { session: existingSession }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error("[AuthProvider] Error getting session:", sessionError);
          if (isMounted) {
            setLoading(false);
          }
          return;
        }

        console.log(`[AuthProvider] ${new Date().toISOString()} - Existing session:`, existingSession ? "Found" : "None");
        
        // If no existing session, complete loading immediately
        if (!existingSession) {
          if (isMounted) {
            setLoading(false);
            setAdminCheckCompleted(false);
          }
        }
        // The onAuthStateChange will handle session processing for existing sessions

        // Set a safety timeout to prevent infinite loading
        timeoutRef.current = setTimeout(() => {
          if (isMounted && loading) {
            console.warn(`[AuthProvider] ${new Date().toISOString()} - Auth timeout reached, completing loading`);
            setLoading(false);
            if (user && !adminCheckCompleted) {
              setIsAdmin(false);
              setAdminCheckCompleted(true);
            }
          }
        }, 8000); // 8 second timeout

        return subscription;
      } catch (error) {
        console.error(`[AuthProvider] Error in initialization:`, error);
        const errorDetails = handleError(error, 'Auth initialization');
        logSecurityEvent('Auth initialization failed', errorDetails);
        
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth().then(subscription => {
      return () => {
        console.log(`[AuthProvider] ${new Date().toISOString()} - Cleaning up...`);
        isMounted = false;
        subscription?.unsubscribe();
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        initializationRef.current = false;
      };
    });
  }, []); // Empty dependency array

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
      
      // Clear admin cache
      adminCheckRef.current.clear();
      
      console.log(`[AuthProvider] ${new Date().toISOString()} - Sign out complete`);
    } catch (error) {
      const errorDetails = handleError(error, 'Sign out exception');
      logSecurityEvent('Sign out exception', errorDetails);
      
      // Clear state even on error
      setSession(null);
      setUser(null);
      setIsAdmin(null);
      setAdminCheckCompleted(false);
      adminCheckRef.current.clear();
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
