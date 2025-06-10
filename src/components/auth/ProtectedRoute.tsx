
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, AlertTriangle } from "lucide-react";
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
  const { user, loading, isAdmin, adminCheckCompleted, userRole } = useAuth();
  const location = useLocation();

  console.log("ProtectedRoute state:", { 
    loading, 
    adminCheckCompleted, 
    user: !!user, 
    isAdmin, 
    requireAdmin,
    userRole 
  });

  // Show loading only while initial authentication is in progress
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-purple-700 mx-auto" />
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    console.log("ProtectedRoute: No user, redirecting to /auth");
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // If admin is required but admin check is not completed yet, show loading
  if (requireAdmin && !adminCheckCompleted) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-purple-700 mx-auto" />
          <p className="mt-4 text-gray-600">Checking permissions...</p>
        </div>
      </div>
    );
  }

  // Check admin requirement
  if (requireAdmin && !isAdmin) {
    console.log("Access denied: Admin required but user is not admin:", { 
      isAdmin, 
      userRole, 
      adminCheckCompleted,
      userId: user.id 
    });
    
    return (
      <div className="flex h-screen items-center justify-center p-4">
        <Alert variant="warning" className="max-w-lg">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            You don't have the required admin permissions to access this page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Handle owner routes for admin users
  if (isAdmin && location.pathname === '/owner' && !allowAdminAccess) {
    console.log("Admin user detected on owner route, redirecting to admin dashboard");
    return <Navigate to="/" replace />;
  }

  console.log("ProtectedRoute: Access granted", { 
    requireAdmin, 
    isAdmin, 
    userRole,
    adminCheckCompleted
  });
  
  return <>{children}</>;
};

export default ProtectedRoute;
