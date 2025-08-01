import { AdminLayout } from "@/components/layout/AdminLayout";
import { PerformanceMetrics } from "@/components/performance/PerformanceMetrics";
import { CacheMonitor } from "@/components/cache/CacheMonitor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useCacheOptimizer } from "@/hooks/useCacheOptimizer";
import { Activity, Zap, Database, BarChart3, Trash2, RefreshCw } from "lucide-react";

export default function Performance() {
  const {
    performCleanup,
    invalidateAll,
    isOptimizing,
    memoryUsage,
    recommendedActions
  } = useCacheOptimizer({
    restaurantId: 'default', // Use a default ID for admin context
    enableBackgroundCleanup: false, // Disable automatic cleanup
  });

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
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    Manual Cache Management
                    <div className="flex space-x-2">
                      <Button
                        onClick={performCleanup}
                        disabled={isOptimizing}
                        variant="outline"
                      >
                        <Trash2 className={`h-4 w-4 mr-2 ${isOptimizing ? 'animate-spin' : ''}`} />
                        {isOptimizing ? 'Cleaning...' : 'Clean Cache'}
                      </Button>
                      <Button
                        onClick={invalidateAll}
                        disabled={isOptimizing}
                        variant="destructive"
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Clear All Cache
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>Memory Usage</span>
                      <span className="font-medium">{memoryUsage}%</span>
                    </div>
                    {recommendedActions.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2">Recommended Actions</h4>
                        <ul className="space-y-1">
                          {recommendedActions.map((action, index) => (
                            <li key={index} className="text-sm text-muted-foreground">
                              • {action}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
              
              <CacheMonitor />
            </div>
          </TabsContent>

          <TabsContent value="optimization">
            <Card>
              <CardHeader>
                <CardTitle>Performance Optimization Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-muted-foreground">
                    Manual cache management is now active. Use the Cache Management tab for cleanup operations.
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <h4 className="font-medium">Automatic Cache Cleanup</h4>
                        <p className="text-sm text-muted-foreground">Manual cleanup only from dashboard</p>
                      </div>
                      <span className="text-red-600 font-medium">Disabled</span>
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
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <h4 className="font-medium">Cache Monitoring</h4>
                        <p className="text-sm text-muted-foreground">Real-time cache performance tracking</p>
                      </div>
                      <span className="text-green-600 font-medium">Active</span>
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