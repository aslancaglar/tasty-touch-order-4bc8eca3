
import { createContext, useContext, useEffect, useState } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { logSecurityEvent, handleError } from "@/utils/error-handler";
import { SECURITY_CONFIG, validateSessionSecurity } from "@/config/security";

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
  const [lastAdminCheck, setLastAdminCheck] = useState<number>(0);
  const [userRole, setUserRole] = useState<'admin' | 'owner' | null>(null);

  // Enhanced session validation using new security measures
  const validateSession = async (currentSession: Session | null): Promise<boolean> => {
    if (!currentSession) return false;
    
    const now = Date.now();
    const sessionTime = new Date(currentSession.expires_at || 0).getTime();
    
    // Check if session is expired
    if (sessionTime <= now + 60000) { // 1 minute buffer
      logSecurityEvent('Session expired', {
        expiresAt: currentSession.expires_at,
        timeToExpiry: sessionTime - now
      });
      return false;
    }

    // Use new session validation function
    const isSecureSession = await validateSessionSecurity();
    if (!isSecureSession) {
      logSecurityEvent('Session security validation failed');
      return false;
    }
    
    return true;
  };

  // Enhanced admin status check using new RLS-compliant function
  const checkAdminStatus = async (userId: string): Promise<boolean> => {
    if (!userId) return false;
    
    const now = Date.now();
    
    // Use cached result if recent enough
    if (now - lastAdminCheck < SECURITY_CONFIG.SESSION.ADMIN_CHECK_CACHE && isAdmin !== null) {
      return isAdmin;
    }
    
    try {
      console.log("Checking admin status for user:", userId);
      
      // Use the new RLS-compliant function
      const { data, error } = await supabase
        .rpc('is_current_user_admin');
      
      if (error) {
        const errorDetails = handleError(error, 'Admin status check');
        logSecurityEvent('Admin check failed', errorDetails);
        return false;
      }
      
      const adminStatus = data || false;
      setLastAdminCheck(now);
      
      // Also get user role
      const { data: roleData, error: roleError } = await supabase
        .rpc('get_current_user_role');
      
      if (!roleError && roleData) {
        setUserRole(roleData as 'admin' | 'owner');
      } else {
        setUserRole(adminStatus ? 'admin' : 'owner');
      }
      
      console.log("Admin check result:", adminStatus, "Role:", roleData);
      return adminStatus;
    } catch (error) {
      const errorDetails = handleError(error, 'Admin status check exception');
      logSecurityEvent('Admin check exception', errorDetails);
      return false;
    }
  };

  // Session validation API for external use
  const validateSessionAPI = async (): Promise<boolean> => {
    if (!session) return false;
    return await validateSession(session);
  };

  useEffect(() => {
    console.log("Setting up AuthProvider with enhanced security and RLS...");
    
    // Store session start time for security validation
    if (!localStorage.getItem('session_start')) {
      localStorage.setItem('session_start', Date.now().toString());
    }
    
    const handleAuthChange = async (event: string, currentSession: Session | null) => {
      console.log("Auth state change event:", event);
      
      // Enhanced validation for existing sessions
      if (currentSession && event !== 'SIGNED_IN') {
        const isValid = await validateSession(currentSession);
        if (!isValid) {
          logSecurityEvent('Invalid session detected during auth change', { event });
          await supabase.auth.signOut();
          return;
        }
      }
      
      // Update session and user state
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      
      // Handle logout events
      if (event === 'SIGNED_OUT') {
        setIsAdmin(false);
        setUserRole(null);
        setAdminCheckCompleted(true);
        setLoading(false);
        setLastAdminCheck(0);
        localStorage.removeItem('session_start');
        logSecurityEvent('User signed out', { 
          timestamp: new Date().toISOString(),
          reason: 'User initiated or session expired'
        });
      }
      
      // Log sign-in events with enhanced security info
      if (event === 'SIGNED_IN' && currentSession?.user) {
        localStorage.setItem('session_start', Date.now().toString());
        logSecurityEvent('User signed in', { 
          userId: currentSession.user.id,
          timestamp: new Date().toISOString(),
          sessionExpiry: currentSession.expires_at
        });
      }
    };
    
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthChange);

    // Enhanced session initialization
    const initSession = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        console.log("Initial session check:", currentSession ? "Session found" : "No session");
        
        if (currentSession) {
          // Enhanced session validation on startup
          const sessionAge = Date.now() - new Date(currentSession.expires_at || 0).getTime() + (currentSession.expires_in || 3600) * 1000;
          
          if (sessionAge > 10000) { // Only validate if session is older than 10 seconds
            const isValid = await validateSession(currentSession);
            if (!isValid) {
              logSecurityEvent('Invalid initial session detected');
              await supabase.auth.signOut();
              setSession(null);
              setUser(null);
              setIsAdmin(false);
              setUserRole(null);
              setAdminCheckCompleted(true);
              return;
            }
          }
          
          setSession(currentSession);
          setUser(currentSession.user);
          
          // Check admin status using new RLS-compliant method
          const adminStatus = await checkAdminStatus(currentSession.user.id);
          setIsAdmin(adminStatus);
          setAdminCheckCompleted(true);
        } else {
          setIsAdmin(false);
          setUserRole(null);
          setAdminCheckCompleted(true);
        }
        
        setLoading(false);
      } catch (error) {
        const errorDetails = handleError(error, 'Enhanced session initialization');
        logSecurityEvent('Session initialization failed', errorDetails);
        
        // Enhanced failure handling
        setSession(null);
        setUser(null);
        setIsAdmin(false);
        setUserRole(null);
        setAdminCheckCompleted(true);
        setLoading(false);
        localStorage.removeItem('session_start');
      }
    };
    
    initSession();

    // Set up periodic session validation
    const validationInterval = setInterval(async () => {
      if (session) {
        const isValid = await validateSession(session);
        if (!isValid) {
          logSecurityEvent('Session validation failed during periodic check');
          await supabase.auth.signOut();
        }
      }
    }, SECURITY_CONFIG.SESSION.VALIDATION_INTERVAL);

    return () => {
      console.log("Cleaning up enhanced AuthProvider...");
      subscription.unsubscribe();
      clearInterval(validationInterval);
    };
  }, []);

  // Enhanced admin status updates
  useEffect(() => {
    const updateAdminStatus = async () => {
      if (user && !loading) {
        console.log("User state changed, updating admin status with RLS compliance for:", user.id);
        
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

  // Enhanced sign out with security logging
  const signOut = async () => {
    try {
      console.log("Initiating secure sign out...");
      logSecurityEvent('Sign out initiated', { 
        userId: user?.id,
        timestamp: new Date().toISOString(),
        sessionDuration: localStorage.getItem('session_start') ? 
          Date.now() - parseInt(localStorage.getItem('session_start')!) : 0
      });
      
      // Enhanced sign out with timeout protection
      const { error } = await Promise.race([
        supabase.auth.signOut(),
        new Promise<{error: Error}>((_, reject) => 
          setTimeout(() => reject({ error: new Error("Sign out timed out") }), 5000)
        )
      ]);
      
      if (error) {
        const errorDetails = handleError(error, 'Sign out');
        logSecurityEvent('Sign out failed', errorDetails);
        throw error;
      }
      
      // Enhanced state cleanup
      setSession(null);
      setUser(null);
      setIsAdmin(false);
      setUserRole(null);
      setLastAdminCheck(0);
      localStorage.removeItem('session_start');
      
      console.log("Secure sign out complete");
    } catch (error) {
      const errorDetails = handleError(error, 'Sign out exception');
      logSecurityEvent('Sign out exception', errorDetails);
      
      // Force cleanup even on error
      setSession(null);
      setUser(null);
      setIsAdmin(false);
      setUserRole(null);
      setLastAdminCheck(0);
      localStorage.removeItem('session_start');
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
    validateSession: validateSessionAPI,
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
