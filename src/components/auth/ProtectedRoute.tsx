import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import { Loader2, ShieldOff } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

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
  const { user, loading, isAdmin, adminCheckCompleted } = useAuth();
  const location = useLocation();
  const [authError, setAuthError] = useState<string | null>(null);
  const [securityFailure, setSecurityFailure] = useState(false);

  // Clear any previous errors when dependencies change
  useEffect(() => {
    setAuthError(null);
    setSecurityFailure(false);
  }, [user, isAdmin]);

  console.log(`[ProtectedRoute] ${new Date().toISOString()} - Render:`, {
    pathname: location.pathname,
    loading,
    adminCheckCompleted,
    user: !!user,
    isAdmin,
    requireAdmin,
    allowAdminAccess
  });

  // IMPROVED: Better loading state handling
  if (loading) {
    console.log(`[ProtectedRoute] ${new Date().toISOString()} - Showing loading state for auth loading`);
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-purple-700 mx-auto" />
          <p className="mt-4 text-gray-600">Verifying authentication...</p>
          <p className="mt-2 text-sm text-gray-500">Please wait...</p>
        </div>
      </div>
    );
  }

  // IMPROVED: Separate check for admin verification when user exists and admin check is required
  if (user && requireAdmin && !adminCheckCompleted) {
    console.log(`[ProtectedRoute] ${new Date().toISOString()} - Showing loading state for admin verification`);
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-purple-700 mx-auto" />
          <p className="mt-4 text-gray-600">Verifying admin permissions...</p>
          <p className="mt-2 text-sm text-gray-500">Checking your access level...</p>
        </div>
      </div>
    );
  }

  // Show security error if verification failed but user is logged in
  if (securityFailure && user) {
    console.log(`[ProtectedRoute] ${new Date().toISOString()} - Showing security failure`);
    return (
      <div className="flex h-screen items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-lg">
          <ShieldOff className="h-4 w-4" />
          <AlertTitle>Security Verification Failed</AlertTitle>
          <AlertDescription>
            {authError || "There was a problem verifying your permissions. Please try logging out and back in."}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    console.log(`[ProtectedRoute] ${new Date().toISOString()} - No user, redirecting to /auth`);
    // Save the location they were trying to access for redirect after login
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // IMPROVED: Handle admin status more robustly
  const finalAdminStatus = adminCheckCompleted ? (isAdmin ?? false) : isAdmin;

  // Handle admin-required routes for non-admin users
  if (requireAdmin && finalAdminStatus === false) {
    console.log(`[ProtectedRoute] ${new Date().toISOString()} - Access denied - User is not an admin, redirecting to /owner`);
    return <Navigate to="/owner" replace />;
  }

  // Handle owner routes for admin users
  if (finalAdminStatus && location.pathname === '/owner' && !allowAdminAccess) {
    console.log(`[ProtectedRoute] ${new Date().toISOString()} - Admin user detected on owner route, redirecting to admin dashboard`);
    return <Navigate to="/" replace />;
  }

  console.log(`[ProtectedRoute] ${new Date().toISOString()} - Access granted`, { requireAdmin, isAdmin: finalAdminStatus });
  return <>{children}</>;
};

export default ProtectedRoute;
