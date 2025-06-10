
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import { Loader2, ShieldOff, AlertTriangle } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { logSecurityEvent } from "@/config/security";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  allowAdminAccess?: boolean;
}

const ProtectedRoute = ({ 
  children, 
  requireAdmin = false, 
  allowAdminAccess = true 
}: ProtectedRouteProps) => {
  const { user, loading, isAdmin, adminCheckCompleted, userRole, validateSession } = useAuth();
  const location = useLocation();
  const [authError, setAuthError] = useState<string | null>(null);
  const [securityFailure, setSecurityFailure] = useState(false);
  const [sessionValid, setSessionValid] = useState<boolean | null>(null);

  // Enhanced session validation on route access
  useEffect(() => {
    const checkSessionSecurity = async () => {
      if (user && adminCheckCompleted) {
        try {
          const isValid = await validateSession();
          setSessionValid(isValid);
          
          if (!isValid) {
            logSecurityEvent('Invalid session detected in ProtectedRoute', {
              route: location.pathname,
              userId: user.id,
              requireAdmin,
            });
            setAuthError("Your session is no longer valid. Please log in again.");
            setSecurityFailure(true);
          }
        } catch (error) {
          console.error('Session validation error:', error);
          setSessionValid(false);
          setSecurityFailure(true);
          setAuthError("Session validation failed. Please log in again.");
        }
      }
    };

    checkSessionSecurity();
  }, [user, adminCheckCompleted, validateSession, location.pathname, requireAdmin]);

  // Clear errors when dependencies change
  useEffect(() => {
    setAuthError(null);
    setSecurityFailure(false);
    setSessionValid(null);
  }, [user, isAdmin]);

  // Show loading while authentication and session validation are in progress
  if (loading || !adminCheckCompleted || (user && sessionValid === null)) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-purple-700 mx-auto" />
          <p className="mt-4 text-gray-600">Verifying authentication and security...</p>
        </div>
      </div>
    );
  }

  // Show security error if validation failed
  if (securityFailure || sessionValid === false) {
    logSecurityEvent('Security failure in ProtectedRoute', {
      route: location.pathname,
      userId: user?.id,
      error: authError,
      requireAdmin,
    });

    return (
      <div className="flex h-screen items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-lg">
          <ShieldOff className="h-4 w-4" />
          <AlertTitle>Security Verification Failed</AlertTitle>
          <AlertDescription>
            {authError || "There was a problem verifying your session security. Please log in again."}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    console.log("ProtectedRoute: No user, redirecting to /auth");
    logSecurityEvent('Unauthenticated access attempt', {
      route: location.pathname,
      requireAdmin,
    });
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Enhanced admin requirement check with role-based access
  if (requireAdmin && !isAdmin) {
    console.log("Access denied: User is not an admin, redirecting to /owner");
    logSecurityEvent('Unauthorized admin access attempt', {
      route: location.pathname,
      userId: user.id,
      userRole,
      isAdmin,
    });
    
    return (
      <div className="flex h-screen items-center justify-center p-4">
        <Alert variant="warning" className="max-w-lg">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            You don't have the required permissions to access this page. Redirecting to your dashboard...
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Handle owner routes for admin users with enhanced security
  if (isAdmin && location.pathname === '/owner' && !allowAdminAccess) {
    console.log("Admin user detected on owner route, redirecting to admin dashboard");
    logSecurityEvent('Admin accessing owner route', {
      route: location.pathname,
      userId: user.id,
      redirected: true,
    });
    return <Navigate to="/" replace />;
  }

  // Log successful access for security monitoring
  logSecurityEvent('Route access granted', {
    route: location.pathname,
    userId: user.id,
    userRole,
    requireAdmin,
    isAdmin,
  });

  console.log("ProtectedRoute: Access granted with enhanced security", { 
    requireAdmin, 
    isAdmin, 
    userRole,
    sessionValid 
  });
  
  return <>{children}</>;
};

export default ProtectedRoute;
