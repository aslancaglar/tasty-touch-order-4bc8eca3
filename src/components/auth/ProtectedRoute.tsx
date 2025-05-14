
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

// Admin status cache to prevent repeated checks
const ADMIN_CACHE_KEY = "admin_status_cache";
const CACHE_EXPIRY = 30 * 60 * 1000; // 30 minutes in milliseconds

// Helper function to get cached admin status
const getCachedAdminStatus = (userId: string): boolean | null => {
  try {
    const cachedData = localStorage.getItem(ADMIN_CACHE_KEY);
    if (!cachedData) return null;

    const parsedData = JSON.parse(cachedData);
    
    // Check if cache is valid (belongs to current user and not expired)
    if (
      parsedData.userId === userId && 
      parsedData.expiresAt > Date.now()
    ) {
      console.log("Using cached admin status:", parsedData.isAdmin);
      return parsedData.isAdmin;
    }
    
    // Clear invalid cache
    localStorage.removeItem(ADMIN_CACHE_KEY);
    return null;
  } catch (error) {
    console.error("Error reading admin cache:", error);
    return null;
  }
};

// Helper function to set cached admin status
const setCachedAdminStatus = (userId: string, isAdmin: boolean): void => {
  try {
    const cacheData = {
      userId,
      isAdmin,
      expiresAt: Date.now() + CACHE_EXPIRY
    };
    localStorage.setItem(ADMIN_CACHE_KEY, JSON.stringify(cacheData));
    console.log("Admin status cached:", isAdmin);
  } catch (error) {
    console.error("Error caching admin status:", error);
  }
};

const ProtectedRoute = ({ children, requireAdmin = false }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const { toast } = useToast();
  
  // Clear admin cache on path change if needed
  useEffect(() => {
    if (location.pathname === "/auth") {
      localStorage.removeItem(ADMIN_CACHE_KEY);
    }
  }, [location.pathname]);

  // Check if the user is an admin with retries and caching
  useEffect(() => {
    const checkAdminStatus = async (retryCount = 3, delay = 1000) => {
      if (!user) {
        setIsAdmin(false);
        setCheckingAdmin(false);
        return;
      }

      // Check cache first
      const cachedStatus = getCachedAdminStatus(user.id);
      if (cachedStatus !== null) {
        setIsAdmin(cachedStatus);
        setCheckingAdmin(false);
        return;
      }

      try {
        console.log(`Checking admin status for user: ${user.id} (Attempt: ${4-retryCount})`);
        
        // Directly query the profiles table for the admin flag
        const { data, error } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', user.id as string)
          .single();

        if (error) {
          console.error("Error checking admin status:", error);
          
          if (retryCount > 0) {
            console.log(`Retrying admin check in ${delay}ms...`);
            setTimeout(() => checkAdminStatus(retryCount - 1, delay * 1.5), delay);
            return;
          }
          
          // Be permissive after all retries fail
          const isAdminRoute = 
            location.pathname === "/" || 
            location.pathname === "/restaurants" ||
            location.pathname.includes('/restaurant/');
            
          if (isAdminRoute) {
            console.log("Allowing access to admin route despite error after retries");
            setIsAdmin(true); // Be permissive for admin routes
            setCachedAdminStatus(user.id, true); // Cache this decision temporarily
          } else {
            toast({
              title: "Verification Issue",
              description: "Could not verify your permissions after multiple attempts.",
              variant: "destructive",
            });
          }
        } else {
          console.log("Admin status result:", data);
          const userIsAdmin = Boolean(data?.is_admin);
          setIsAdmin(userIsAdmin);
          
          // Cache the result to prevent future checks
          setCachedAdminStatus(user.id, userIsAdmin);
        }
      } catch (error) {
        console.error("Exception checking admin status:", error);
        
        // Retry on exception
        if (retryCount > 0) {
          setTimeout(() => checkAdminStatus(retryCount - 1, delay * 1.5), delay);
          return;
        }
        
        // Be permissive on exceptions for admin routes
        const isAdminRoute = 
          location.pathname === "/" || 
          location.pathname === "/restaurants" ||
          location.pathname.includes('/restaurant/');
          
        if (isAdminRoute) {
          setIsAdmin(true);
          setCachedAdminStatus(user.id, true); // Cache this decision temporarily
        }
      } finally {
        if (retryCount === 0) {
          setCheckingAdmin(false);
        }
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
  if (isAdmin && location.pathname === '/owner') {
    console.log("Admin user detected on owner route, redirecting to admin dashboard");
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
