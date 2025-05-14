
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Dashboard from "./Dashboard";
import { Loader2 } from "lucide-react";
import { setCachingEnabled, setCachingEnabledForAdmin } from "@/services/cache-service";
import { useEffect } from "react";
import { isOnline } from "@/utils/service-worker";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  // Use a try-catch block to handle potential AuthContext issues
  try {
    const { user, loading } = useAuth();
    const { toast } = useToast();

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

    if (loading) {
      return (
        <div className="flex h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-purple-700" />
        </div>
      );
    }

    if (!user) {
      console.log("No user detected in Index.tsx, redirecting to auth");
      return <Navigate to="/auth" />;
    }

    console.log("User authenticated in Index.tsx, rendering Dashboard");
    // Pass useDefaultLanguage={true} to Dashboard to force English for admin
    return <Dashboard />;
  } catch (error) {
    console.error("Auth error in Index:", error);
    // If AuthContext is not available or throws an error, redirect to auth
    return <Navigate to="/auth" />;
  }
};

export default Index;
