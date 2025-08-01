import { AdminLayout } from "@/components/layout/AdminLayout";
import { PerformanceMetrics } from "@/components/performance/PerformanceMetrics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, Zap, Database, BarChart3 } from "lucide-react";

export default function Performance() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center space-x-2">
          <Activity className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Performance Dashboard</h1>
            <p className="text-muted-foreground">
              Monitor system performance, cache efficiency, and resource usage
            </p>
          </div>
        </div>

        <PerformanceMetrics />

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview" className="flex items-center space-x-2">
              <BarChart3 className="h-4 w-4" />
              <span>Performance Overview</span>
            </TabsTrigger>
            <TabsTrigger value="cache" className="flex items-center space-x-2">
              <Database className="h-4 w-4" />
              <span>Cache Management</span>
            </TabsTrigger>
            <TabsTrigger value="optimization" className="flex items-center space-x-2">
              <Zap className="h-4 w-4" />
              <span>Optimization</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>System Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>Application Response Time</span>
                      <span className="text-green-600 font-medium">&lt; 200ms</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Database Query Performance</span>
                      <span className="text-green-600 font-medium">Optimal</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Image Loading Speed</span>
                      <span className="text-green-600 font-medium">Fast</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>API Response Time</span>
                      <span className="text-green-600 font-medium">&lt; 150ms</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Resource Utilization</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>Memory Usage</span>
                      <span className="text-blue-600 font-medium">Normal</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Storage Efficiency</span>
                      <span className="text-green-600 font-medium">Optimized</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Network Bandwidth</span>
                      <span className="text-green-600 font-medium">Available</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Cache Efficiency</span>
                      <span className="text-green-600 font-medium">High</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="cache">
            <Card>
              <CardHeader>
                <CardTitle>Cache Management</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-muted-foreground">
                    Cache management tools and diagnostics will be available here.
                    Use the performance metrics above to monitor current cache performance.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium mb-2">Menu Cache</h4>
                      <p className="text-sm text-muted-foreground">High priority cache for menu data</p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium mb-2">Image Cache</h4>
                      <p className="text-sm text-muted-foreground">Optimized image storage and delivery</p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium mb-2">Auth Cache</h4>
                      <p className="text-sm text-muted-foreground">Secure authentication data cache</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="optimization">
            <Card>
              <CardHeader>
                <CardTitle>Performance Optimization</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-muted-foreground">
                    Optimization recommendations and automated performance improvements.
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <h4 className="font-medium">Automatic Cache Cleanup</h4>
                        <p className="text-sm text-muted-foreground">Runs every 10 minutes</p>
                      </div>
                      <span className="text-green-600 font-medium">Active</span>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <h4 className="font-medium">Background Data Refresh</h4>
                        <p className="text-sm text-muted-foreground">Preloads fresh data automatically</p>
                      </div>
                      <span className="text-green-600 font-medium">Enabled</span>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <h4 className="font-medium">Image Optimization</h4>
                        <p className="text-sm text-muted-foreground">Compresses and caches images</p>
                      </div>
                      <span className="text-green-600 font-medium">Running</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}