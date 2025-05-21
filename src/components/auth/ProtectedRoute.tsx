
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ShieldOff } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  // Added property to allow admins to still access owner routes when needed
  allowAdminAccess?: boolean;
}

const ProtectedRoute = ({ 
  children, 
  requireAdmin = false, 
  allowAdminAccess = true 
}: ProtectedRouteProps) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [checkingAdmin, setCheckingAdmin] = useState(requireAdmin);
  const [authError, setAuthError] = useState<string | null>(null);
  const [securityFailure, setSecurityFailure] = useState(false);

  // Enhanced security check for admin status
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) {
        setIsAdmin(false);
        setCheckingAdmin(false);
        return;
      }

      try {
        console.log("Checking admin status for user:", user.id);
        
        // Apply timeout to prevent hanging issues
        const timeoutPromise = new Promise<null>((_, reject) => {
          setTimeout(() => reject(new Error("Admin check timeout")), 5000);
        });
        
        // Use race to ensure we don't hang indefinitely
        const { data, error } = await Promise.race([
          supabase
            .from('profiles')
            .select('is_admin')
            .eq('id', user.id)
            .single(),
          timeoutPromise
        ]) as { data: {is_admin: boolean} | null, error: Error | null };

        if (error) {
          console.error("Error checking admin status:", error);
          setIsAdmin(false);
          // Security failure - show error but still redirect
          setSecurityFailure(true);
          setAuthError("Error verifying permissions. Contact support if this persists.");
        } else {
          console.log("Admin check result:", data?.is_admin);
          setIsAdmin(data?.is_admin || false);
        }
      } catch (error) {
        console.error("Exception checking admin status:", error);
        setIsAdmin(false);
        setSecurityFailure(true);
        setAuthError("Security verification failed");
      } finally {
        setCheckingAdmin(false);
      }
    };

    // Clear any previous errors when dependencies change
    setAuthError(null);
    setSecurityFailure(false);

    if (user) {
      // Always check admin status when we have a user - fixes the reload issue
      checkAdminStatus();
    } else {
      setCheckingAdmin(false);
    }
  }, [user, requireAdmin]);

  // Show loading spinner while authentication is being checked
  if (loading || checkingAdmin) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-purple-700 mx-auto" />
          <p className="mt-4 text-gray-600">Verifying authentication...</p>
        </div>
      </div>
    );
  }

  // Show security error if verification failed but user is logged in
  if (securityFailure && user) {
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
    console.log("ProtectedRoute: No user, redirecting to /auth");
    // Save the location they were trying to access for redirect after login
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Handle admin-required routes for non-admin users
  if (requireAdmin && !isAdmin) {
    console.log("Access denied: User is not an admin, redirecting to /owner");
    return <Navigate to="/owner" replace />;
  }

  // Handle owner routes for admin users - only redirect if specifically 
  // requested to not allow admin access and we're on the specific owner path
  if (isAdmin && location.pathname === '/owner' && !allowAdminAccess) {
    console.log("Admin user detected on owner route, redirecting to admin dashboard");
    return <Navigate to="/" replace />;
  }

  console.log("ProtectedRoute: Access granted", { requireAdmin, isAdmin });
  return <>{children}</>;
};

export default ProtectedRoute;
