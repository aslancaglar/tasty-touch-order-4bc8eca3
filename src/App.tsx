import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { QueryClient } from 'react-query';
import { Auth } from '@/pages/Auth';
import { Dashboard } from '@/pages/Dashboard';
import { Restaurants } from '@/pages/Restaurants';
import { RestaurantManage } from '@/pages/RestaurantManage';
import { Orders } from '@/pages/Orders';
import { OwnerDashboard } from '@/pages/OwnerDashboard';
import { OwnerLogin } from '@/pages/OwnerLogin';
import { OwnerRestaurantManage } from '@/pages/OwnerRestaurantManage';
import { KioskView } from '@/pages/KioskView';
import { Menu } from '@/pages/Menu';
import { NotFound } from '@/pages/NotFound';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { NetworkErrorBoundary } from '@/components/error/NetworkErrorBoundary';
import { Toaster } from "@/components/ui/toaster"
import SecurityMonitor from '@/components/security/SecurityMonitor';
import AdminLayout from '@/components/layout/AdminLayout';
import SecurityDashboard from "@/components/security/SecurityDashboard";

function App() {
  
  
  return (
    <QueryClient>
      <Router>
        <NetworkErrorBoundary>
          <Toaster />
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route 
              path="/" 
              element={
                <ProtectedRoute requireAdmin>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="restaurants" element={<Restaurants />} />
              <Route path="restaurants/:id" element={<RestaurantManage />} />
              <Route path="orders" element={<Orders />} />
              <Route path="security" element={<SecurityDashboard />} />
            </Route>
            <Route 
              path="/owner" 
              element={
                <ProtectedRoute allowAdminAccess={false}>
                  <OwnerDashboard />
                </ProtectedRoute>
              } 
            />
            <Route path="/owner/login" element={<OwnerLogin />} />
            <Route 
              path="/owner/restaurant/:id" 
              element={
                <ProtectedRoute allowAdminAccess={false}>
                  <OwnerRestaurantManage />
                </ProtectedRoute>
              } 
            />
            <Route path="/kiosk/:restaurantId" element={<KioskView />} />
            <Route path="/menu/:restaurantId" element={<Menu />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <SecurityMonitor />
        </NetworkErrorBoundary>
      </Router>
    </QueryClient>
  );
}

export default App;
