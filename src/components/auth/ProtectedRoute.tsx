
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

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
  const [routingDecision, setRoutingDecision] = useState<string | null>(null);

  console.log("ProtectedRoute:", { 
    user: !!user, 
    loading, 
    isAdmin, 
    adminCheckCompleted, 
    requireAdmin,
    allowAdminAccess,
    pathname: location.pathname,
    routingDecision
  });

  // Determine routing decision when auth state is complete
  useEffect(() => {
    // Reset routing decision when auth state changes
    setRoutingDecision(null);
    
    // Don't make routing decisions while loading or admin check is incomplete
    if (loading || !adminCheckCompleted) {
      console.log("ProtectedRoute: Still loading or admin check incomplete");
      return;
    }

    // No user - redirect to auth
    if (!user) {
      console.log("ProtectedRoute: No user, will redirect to /auth");
      setRoutingDecision("auth");
      return;
    }

    // Admin required but user is not admin
    if (requireAdmin && isAdmin === false) {
      console.log("ProtectedRoute: Admin required but user is not admin, will redirect to /owner");
      setRoutingDecision("owner");
      return;
    }

    // Admin user on owner route (and not allowed)
    if (isAdmin === true && location.pathname === '/owner' && !allowAdminAccess) {
      console.log("ProtectedRoute: Admin user on owner route, will redirect to admin dashboard");
      setRoutingDecision("admin");
      return;
    }

    // Access granted
    console.log("ProtectedRoute: Access granted, will show content");
    setRoutingDecision("allow");
  }, [user, loading, isAdmin, adminCheckCompleted, requireAdmin, allowAdminAccess, location.pathname]);

  // Show loading spinner while determining routing
  if (loading || !adminCheckCompleted || routingDecision === null) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-purple-700 mx-auto" />
          <p className="mt-4 text-gray-600">
            {loading 
              ? "Loading..." 
              : !adminCheckCompleted 
                ? "Verifying authentication..." 
                : "Preparing content..."
            }
          </p>
        </div>
      </div>
    );
  }

  // Execute routing decision
  switch (routingDecision) {
    case "auth":
      return <Navigate to="/auth" state={{ from: location }} replace />;
    case "owner":
      return <Navigate to="/owner" replace />;
    case "admin":
      return <Navigate to="/" replace />;
    case "allow":
      return <>{children}</>;
    default:
      console.warn("ProtectedRoute: Unexpected routing state, redirecting to auth");
      return <Navigate to="/auth" state={{ from: location }} replace />;
  }
};

export default ProtectedRoute;
