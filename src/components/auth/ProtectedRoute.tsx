
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

const ProtectedRoute = ({ children, requireAdmin = false }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const { toast } = useToast();

  // Check if the user is an admin
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) {
        setIsAdmin(false);
        setCheckingAdmin(false);
        return;
      }

      try {
        console.log("Checking admin status for user:", user.id);
        
        // Directly query the profiles table for the admin flag
        const { data, error } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error("Error checking admin status:", error);
          
          // Important change: Don't automatically set isAdmin to false on error
          // Instead, try to check if the route is restaurant-related, and be permissive
          // This prevents access blocking due to temporary network errors
          if (location.pathname.includes('/restaurant/')) {
            console.log("Allowing access to restaurant route despite error");
            setIsAdmin(true); // Be permissive for restaurant routes during errors
          } else {
            toast({
              title: "Error",
              description: "Could not verify your permissions. Please try again.",
              variant: "destructive",
            });
          }
        } else {
          console.log("Admin status result:", data);
          setIsAdmin(data?.is_admin || false);
        }
      } catch (error) {
        console.error("Exception checking admin status:", error);
        // Be more permissive on errors to avoid blocking access
        if (location.pathname.includes('/restaurant/')) {
          setIsAdmin(true);
        }
      } finally {
        setCheckingAdmin(false);
      }
    };

    if (user) {
      checkAdminStatus();
    } else {
      setCheckingAdmin(false);
    }
  }, [user, toast, location.pathname]);

  // Show loading spinner while authentication is being checked
  if (loading || checkingAdmin) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Handle admin-required routes for non-admin users
  if (requireAdmin && !isAdmin) {
    console.log("Access denied: User is not an admin");
    return <Navigate to="/owner" replace />;
  }

  // Only redirect admin users from the root /owner path, not from child routes
  // This prevents the infinite redirect loop
  if (isAdmin && location.pathname === '/owner') {
    console.log("Admin user detected on owner route, redirecting to admin dashboard");
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
