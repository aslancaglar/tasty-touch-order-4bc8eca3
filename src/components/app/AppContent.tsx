import React from 'react';
import { Routes, Route, useParams, useLocation } from "react-router-dom";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import AppPreloader from "@/components/app/AppPreloader";

// Import pages
import Dashboard from "@/pages/Dashboard";
import Restaurants from "@/pages/Restaurants";
import RestaurantManage from "@/pages/RestaurantManage";
import KioskView from "@/pages/KioskView";
import NotFound from "@/pages/NotFound";
import Auth from "@/pages/Auth";
import OwnerDashboard from "@/pages/OwnerDashboard";
import OwnerRestaurantManage from "@/pages/OwnerRestaurantManage";
import OwnerLogin from "@/pages/OwnerLogin";
import Index from "@/pages/Index";
import Security from "@/pages/Security";
import Performance from "@/pages/Performance";
import GeneralSettings from "@/pages/GeneralSettings";

// Helper component to detect restaurant ID for preloading
const AppWithPreloader: React.FC = () => {
  const location = useLocation();
  
  // Detect restaurant context for preloading
  const getRestaurantId = (): string | undefined => {
    const pathParts = location.pathname.split('/');
    
    // Check for restaurant management routes (/restaurant/:id or /owner/restaurant/:id)
    if (pathParts[1] === 'restaurant' && pathParts[2]) {
      return pathParts[2];
    }
    if (pathParts[1] === 'owner' && pathParts[2] === 'restaurant' && pathParts[3]) {
      return pathParts[3];
    }
    
    // For kiosk routes (/r/:slug), we'll need to resolve the slug to an ID
    // This will be handled by the KioskView component itself
    return undefined;
  };

  const restaurantId = getRestaurantId();

  return (
    <AppPreloader
      restaurantId={restaurantId}
      skipPreloadingRoutes={['/auth', '/owner/login', '/restaurants', '/', '/security', '/performance', '/general-settings']}
    >
      <Routes>
        {/* Auth Routes */}
        <Route path="/auth" element={<Auth />} />
        <Route path="/owner/login" element={<OwnerLogin />} />
        
        {/* Admin Routes - Protected and require admin role */}
        <Route path="/" element={<ProtectedRoute requireAdmin={true}><Index /></ProtectedRoute>} />
        <Route path="/restaurants" element={
          <ProtectedRoute requireAdmin={true}>
            <Restaurants />
          </ProtectedRoute>
        } />
        <Route path="/restaurant/:id" element={
          <ProtectedRoute requireAdmin={true}>
            <RestaurantManage />
          </ProtectedRoute>
        } />
        <Route path="/security" element={
          <ProtectedRoute requireAdmin={true}>
            <Security />
          </ProtectedRoute>
        } />
        <Route path="/performance" element={
          <ProtectedRoute requireAdmin={true}>
            <Performance />
          </ProtectedRoute>
        } />
        <Route path="/general-settings" element={
          <ProtectedRoute requireAdmin={true}>
            <GeneralSettings />
          </ProtectedRoute>
        } />
        
        {/* Restaurant Owner Routes - Protected but don't require admin role */}
        <Route path="/owner" element={
          <ProtectedRoute>
            <OwnerDashboard />
          </ProtectedRoute>
        } />
        <Route path="/owner/restaurant/:id" element={
          <ProtectedRoute>
            <OwnerRestaurantManage />
          </ProtectedRoute>
        } />
        
        {/* Public Kiosk Routes */}
        <Route path="/r/:restaurantSlug" element={<KioskView />} />
        
        {/* Catch-all Route */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AppPreloader>
  );
};

export default AppWithPreloader;