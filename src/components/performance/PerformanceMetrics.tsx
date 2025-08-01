import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getCacheDiagnostics, cacheCoordinator } from '@/services/cache-coordinator';
import { Activity, Database, Zap, Clock, HardDrive, Wifi, Trash2 } from 'lucide-react';

interface PerformanceMetrics {
  cacheHitRate: number;
  storageUsage: number;
  memoryCacheSize: number;
  backgroundQueueSize: number;
  onlineStatus: boolean;
  lastCleanup: string;
}

export const PerformanceMetrics: React.FC = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOptimizing, setIsOptimizing] = useState(false);

  const fetchMetrics = async () => {
    try {
      const diagnostics = await getCacheDiagnostics();
      
      setMetrics({
        cacheHitRate: diagnostics.metrics?.hitRate || 0,
        storageUsage: diagnostics.storage?.usagePercentage || 0,
        memoryCacheSize: 0, // Will be available in future diagnostics
        backgroundQueueSize: diagnostics.backgroundQueue || 0,
        onlineStatus: diagnostics.onlineStatus || navigator.onLine,
        lastCleanup: diagnostics.metrics?.lastCleanup ? diagnostics.metrics.lastCleanup.toISOString() : new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to fetch performance metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickCleanup = async () => {
    setIsOptimizing(true);
    try {
      await cacheCoordinator.performMemoryOptimization();
      await fetchMetrics();
    } catch (error) {
      console.error('Quick cleanup failed:', error);
    } finally {
      setIsOptimizing(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    
    // Refresh metrics every 30 seconds
    const interval = setInterval(fetchMetrics, 30000);
    
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-muted rounded w-24"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-16 mb-2"></div>
              <div className="h-3 bg-muted rounded w-32"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const metricCards = [
    {
      title: "Cache Hit Rate",
      value: `${metrics?.cacheHitRate.toFixed(1) || 0}%`,
      description: "Data served from cache",
      icon: Zap,
      color: (metrics?.cacheHitRate || 0) > 70 ? "text-green-600" : "text-red-600",
      bgColor: (metrics?.cacheHitRate || 0) > 70 ? "bg-green-100" : "bg-red-100",
    },
    {
      title: "Storage Usage",
      value: `${metrics?.storageUsage || 0}%`,
      description: "Local storage utilization",
      icon: HardDrive,
      color: (metrics?.storageUsage || 0) > 80 ? "text-red-600" : "text-green-600",
      bgColor: (metrics?.storageUsage || 0) > 80 ? "bg-red-100" : "bg-green-100",
    },
    {
      title: "Memory Cache",
      value: `${metrics?.memoryCacheSize || 0}`,
      description: "Items in memory cache",
      icon: Database,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      title: "Background Queue",
      value: `${metrics?.backgroundQueueSize || 0}`,
      description: "Pending background tasks",
      icon: Clock,
      color: (metrics?.backgroundQueueSize || 0) > 0 ? "text-yellow-600" : "text-green-600",
      bgColor: (metrics?.backgroundQueueSize || 0) > 0 ? "bg-yellow-100" : "bg-green-100",
    },
    {
      title: "Network Status",
      value: metrics?.onlineStatus ? "Online" : "Offline",
      description: "Connection status",
      icon: Wifi,
      color: metrics?.onlineStatus ? "text-green-600" : "text-red-600",
      bgColor: metrics?.onlineStatus ? "bg-green-100" : "bg-red-100",
    },
    {
      title: "Last Cleanup",
      value: new Date(metrics?.lastCleanup || '').toLocaleTimeString(),
      description: "Cache maintenance",
      icon: Activity,
      color: "text-gray-600",
      bgColor: "bg-gray-100",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">System Performance Overview</h2>
        <Button
          onClick={handleQuickCleanup}
          disabled={isOptimizing}
          variant="outline"
          size="sm"
        >
          <Trash2 className={`h-4 w-4 mr-2 ${isOptimizing ? 'animate-spin' : ''}`} />
          {isOptimizing ? 'Optimizing...' : 'Quick Cleanup'}
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {metricCards.map((metric, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {metric.title}
              </CardTitle>
              <div className={`p-2 rounded-full ${metric.bgColor}`}>
                <metric.icon className={`h-4 w-4 ${metric.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${metric.color}`}>
                {metric.value}
              </div>
              <p className="text-xs text-muted-foreground">
                {metric.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};