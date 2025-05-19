
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Dashboard from "./Dashboard";
import { Loader2 } from "lucide-react";
import { setCachingEnabled, setCachingEnabledForAdmin } from "@/services/cache-service";
import { useEffect, useState } from "react";
import { isOnline } from "@/utils/service-worker";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const [redirecting, setRedirecting] = useState(false);

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

  // Add a delayed redirect to prevent rapid route toggling
  useEffect(() => {
    console.log("Auth state in Index:", { user, loading });

    // Only set redirecting if we've finished loading and have no user
    if (!loading && !user && !redirecting) {
      console.log("No user found, preparing to redirect to auth page");
      setRedirecting(true);
      
      // Small delay to prevent route flickering
      const redirectTimer = setTimeout(() => {
        console.log("Redirecting to auth page");
      }, 100);
      
      return () => clearTimeout(redirectTimer);
    }
  }, [loading, user, redirecting]);

  if (loading) {
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

  console.log("User authenticated, rendering Dashboard");
  return <Dashboard />;
};

export default Index;
