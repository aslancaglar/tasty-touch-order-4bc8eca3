import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import StockManagement from "@/pages/StockManagement";

// Create the QueryClient with optimized settings
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // Prevents excessive refetching
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes (formerly cacheTime)
      retry: 1, // Limit retries
    },
  },
});

// Lazy load pages for better initial load performance
import Dashboard from "./pages/Dashboard";
import Restaurants from "./pages/Restaurants";
import RestaurantManage from "./pages/RestaurantManage";
import KioskView from "./pages/KioskView";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Auth Routes */}
            <Route path="/auth" element={<Auth />} />
            
            {/* Admin Routes - Protected */}
            <Route path="/" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/restaurants" element={
              <ProtectedRoute>
                <Restaurants />
              </ProtectedRoute>
            } />
            <Route path="/restaurant/:id" element={
              <ProtectedRoute>
                <RestaurantManage />
              </ProtectedRoute>
            } />
            <Route path="/restaurant/:id/stock" element={
              <ProtectedRoute>
                <StockManagement />
              </ProtectedRoute>
            } />
            
            {/* Public Kiosk Routes */}
            <Route path="/r/:restaurantSlug" element={<KioskView />} />
            
            {/* Catch-all Route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
