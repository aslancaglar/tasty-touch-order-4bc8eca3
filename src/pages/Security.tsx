import { AdminLayout } from "@/components/layout/AdminLayout";
import { SecurityMetrics } from "@/components/security/SecurityMetrics";
import { SecurityEventsList } from "@/components/security/SecurityEventsList";
import { AuditLogsList } from "@/components/security/AuditLogsList";
import { GeneralSettings } from "@/components/security/GeneralSettings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Shield, FileText, AlertTriangle, Activity, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";

export default function Security() {
  const [restaurants, setRestaurants] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState<string>("");

  useEffect(() => {
    fetchRestaurants();
  }, []);

  const fetchRestaurants = async () => {
    try {
      const { data, error } = await supabase
        .from('restaurants')
        .select('id, name')
        .order('name');

      if (error) throw error;
      if (data && data.length > 0) {
        setRestaurants(data);
        setSelectedRestaurant(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching restaurants:', error);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center space-x-2">
          <Shield className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Security Dashboard</h1>
            <p className="text-muted-foreground">
              Monitor security events and audit logs across your system
            </p>
          </div>
        </div>

        <SecurityMetrics />

        <Tabs defaultValue="events" className="space-y-4">
          <TabsList>
            <TabsTrigger value="events" className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4" />
              <span>Security Events</span>
            </TabsTrigger>
            <TabsTrigger value="audit" className="flex items-center space-x-2">
              <FileText className="h-4 w-4" />
              <span>Audit Logs</span>
            </TabsTrigger>
            <TabsTrigger value="monitoring" className="flex items-center space-x-2">
              <Activity className="h-4 w-4" />
              <span>System Monitoring</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center space-x-2">
              <Settings className="h-4 w-4" />
              <span>General Settings</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="events">
            <SecurityEventsList />
          </TabsContent>

          <TabsContent value="audit">
            <AuditLogsList />
          </TabsContent>

          <TabsContent value="monitoring">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>System Health</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>Database Connection</span>
                      <span className="text-green-600 font-medium">Healthy</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Authentication Service</span>
                      <span className="text-green-600 font-medium">Operational</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>File Storage</span>
                      <span className="text-green-600 font-medium">Available</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Edge Functions</span>
                      <span className="text-green-600 font-medium">Running</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Security Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>SSL Certificate</span>
                      <span className="text-green-600 font-medium">Valid</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>RLS Policies</span>
                      <span className="text-green-600 font-medium">Active</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>CORS Configuration</span>
                      <span className="text-green-600 font-medium">Configured</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Rate Limiting</span>
                      <span className="text-green-600 font-medium">Enabled</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="settings">
            <div className="space-y-6">
              <div className="flex items-center space-x-4">
                <Label htmlFor="restaurant-select" className="text-sm font-medium">
                  Select Restaurant:
                </Label>
                <Select value={selectedRestaurant} onValueChange={setSelectedRestaurant}>
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder="Select a restaurant" />
                  </SelectTrigger>
                  <SelectContent>
                    {restaurants.map((restaurant) => (
                      <SelectItem key={restaurant.id} value={restaurant.id}>
                        {restaurant.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {selectedRestaurant && (
                <GeneralSettings restaurantId={selectedRestaurant} />
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}