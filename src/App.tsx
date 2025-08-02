
import React from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useParams, useLocation } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { NetworkStatus } from "@/components/ui/network-status";
import SecurityMonitor from "@/components/security/SecurityMonitor";
import { initializeCacheConfig } from "@/utils/cache-config";
import AppPreloader from "@/components/app/AppPreloader";

// Create a more sophisticated QueryClient with route-aware settings
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Default settings for customer-facing routes
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes (formerly cacheTime)
      retry: 1,
    },
  },
});

// Import the content component
import AppWithPreloader from "@/components/app/AppContent";

const App = () => {
  // Initialize cache config when the app starts
  React.useEffect(() => {
    initializeCacheConfig();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <TooltipProvider>
            <Sonner />
            
            {/* Security Monitoring */}
            <SecurityMonitor />
            
            {/* Network Status */}
            <div className="fixed bottom-4 right-4 z-50">
              <NetworkStatus showLabel={true} />
            </div>
            
            <AppWithPreloader />
          </TooltipProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
