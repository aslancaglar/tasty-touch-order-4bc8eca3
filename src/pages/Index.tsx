
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Dashboard from "./Dashboard";
import { Loader2 } from "lucide-react";
import { setCachingEnabled, setCachingEnabledForAdmin } from "@/services/cache-service";
import { useEffect, useState } from "react";
import { isOnline } from "@/utils/service-worker";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const [redirecting, setRedirecting] = useState(false);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [checkingAdmin, setCheckingAdmin] = useState(true);

  // Ensure caching is properly set when the admin dashboard loads
  useEffect(() => {
    // Check network status
    const online = isOnline();
    
    // Make sure admin caching is disabled
    setCachingEnabledForAdmin(false);
    console.log("[AdminDashboard] Disabled caching for admin routes");
    
    // Warn if offline - admin features require connectivity
    if (!online) {
      toast({
        title: "You're offline",
        description: "Admin dashboard requires internet connectivity for full functionality",
        variant: "destructive",
        duration: 5000,
      });
    }
    
    return () => {
      // Reset when unmounting (though this likely won't matter)
      setCachingEnabled(true);
    };
  }, [toast]);

  // Check admin status when user is available
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) {
        setIsAdmin(false);
        setCheckingAdmin(false);
        return;
      }

      try {
        console.log("Index: Checking admin status for user:", user.id);
        
        const { data, error } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', user.id)
          .single();
        
        if (error) {
          console.error("Error checking admin status:", error);
          setIsAdmin(false);
        } else {
          console.log("Admin check result:", data?.is_admin);
          setIsAdmin(data?.is_admin || false);
        }
      } catch (error) {
        console.error("Exception checking admin status:", error);
        setIsAdmin(false);
      } finally {
        setCheckingAdmin(false);
      }
    };

    if (user) {
      checkAdminStatus();
    } else {
      setCheckingAdmin(false);
    }
  }, [user]);

  // Add a delayed redirect to prevent rapid route toggling
  useEffect(() => {
    console.log("Auth state in Index:", { user, loading, isAdmin, checkingAdmin });

    // Only set redirecting if we've finished all checks and have no user
    if (!loading && !checkingAdmin && !user && !redirecting) {
      console.log("No user found, preparing to redirect to auth page");
      setRedirecting(true);
      
      // Small delay to prevent route flickering
      const redirectTimer = setTimeout(() => {
        console.log("Redirecting to auth page");
      }, 100);
      
      return () => clearTimeout(redirectTimer);
    }
  }, [loading, user, redirecting, isAdmin, checkingAdmin]);

  if (loading || checkingAdmin) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-700" />
      </div>
    );
  }

  if (!user) {
    console.log("No authenticated user, redirecting to auth");
    return <Navigate to="/auth" />;
  }

  // If user is not an admin, redirect to owner page
  if (user && isAdmin === false) {
    console.log("User is not an admin, redirecting to owner page");
    return <Navigate to="/owner" />;
  }

  console.log("User is admin, rendering Dashboard");
  return <Dashboard />;
};

export default Index;
