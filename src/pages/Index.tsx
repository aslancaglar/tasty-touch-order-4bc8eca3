
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Dashboard from "./Dashboard";
import { Loader2 } from "lucide-react";
import { setCachingEnabled, setCachingEnabledForAdmin } from "@/services/cache-service";
import { useEffect } from "react";

const Index = () => {
  const { user, loading } = useAuth();

  // Ensure caching is properly set when the admin dashboard loads
  useEffect(() => {
    // Make sure admin caching is disabled
    setCachingEnabledForAdmin(false);
    console.log("[AdminDashboard] Disabled caching for admin routes");
    
    return () => {
      // Reset when unmounting (though this likely won't matter)
      setCachingEnabled(true);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-700" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" />;
  }

  // Pass useDefaultLanguage={true} to Dashboard to force English for admin
  return <Dashboard />;
};

export default Index;
