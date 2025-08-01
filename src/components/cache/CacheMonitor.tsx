import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { getCacheMetrics, getCacheDiagnostics, cacheCoordinator } from '@/services/cache-coordinator';
import { Trash2, RefreshCw, Activity, HardDrive, Wifi, WifiOff } from 'lucide-react';

interface CacheMonitorProps {
  className?: string;
  restaurantId?: string;
}

export const CacheMonitor = ({ className, restaurantId }: CacheMonitorProps) => {
  const [metrics, setMetrics] = useState(getCacheMetrics());
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshData = async () => {
    setIsRefreshing(true);
    try {
      setMetrics(getCacheMetrics());
      setDiagnostics(await getCacheDiagnostics());
    } catch (error) {
      console.error('Failed to refresh cache data:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleMemoryCleanup = async () => {
    try {
      await cacheCoordinator.performMemoryOptimization();
      await refreshData();
    } catch (error) {
      console.error('Memory cleanup failed:', error);
    }
  };

  useEffect(() => {
    refreshData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(refreshData, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getPerformanceStatus = (hitRate: number) => {
    if (hitRate >= 80) return { color: 'bg-green-500', label: 'Excellent' };
    if (hitRate >= 60) return { color: 'bg-yellow-500', label: 'Good' };
    if (hitRate >= 40) return { color: 'bg-orange-500', label: 'Fair' };
    return { color: 'bg-red-500', label: 'Poor' };
  };

  const performanceStatus = getPerformanceStatus(metrics.hitRate);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Activity className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-sm font-medium">Cache Hit Rate</p>
                <p className="text-2xl font-bold">{metrics.hitRate.toFixed(1)}%</p>
                <Badge variant="secondary" className={performanceStatus.color}>
                  {performanceStatus.label}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <HardDrive className="h-4 w-4 text-purple-500" />
              <div>
                <p className="text-sm font-medium">Memory Usage</p>
                <p className="text-2xl font-bold">
                  {diagnostics ? formatBytes(diagnostics.storage.used * 1024 * 1024) : 'Loading...'}
                </p>
                {diagnostics && (
                  <Progress 
                    value={diagnostics.storage.usagePercentage} 
                    className="w-full h-2 mt-1"
                  />
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              {diagnostics?.onlineStatus ? (
                <Wifi className="h-4 w-4 text-green-500" />
              ) : (
                <WifiOff className="h-4 w-4 text-red-500" />
              )}
              <div>
                <p className="text-sm font-medium">Connection</p>
                <p className="text-2xl font-bold">
                  {diagnostics?.onlineStatus ? 'Online' : 'Offline'}
                </p>
                <Badge variant={diagnostics?.onlineStatus ? 'default' : 'destructive'}>
                  {diagnostics?.onlineStatus ? 'Connected' : 'Disconnected'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <RefreshCw className="h-4 w-4 text-orange-500" />
              <div>
                <p className="text-sm font-medium">Background Queue</p>
                <p className="text-2xl font-bold">{diagnostics?.backgroundQueue || 0}</p>
                <Badge variant="outline">Tasks Pending</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Cache Performance Details
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={refreshData}
                disabled={isRefreshing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleMemoryCleanup}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clean Cache
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h4 className="font-semibold mb-2">Request Statistics</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Total Requests:</span>
                  <span className="font-mono">{metrics.totalRequests}</span>
                </div>
                <div className="flex justify-between">
                  <span>Cache Hits:</span>
                  <span className="font-mono text-green-600">{metrics.cacheHits}</span>
                </div>
                <div className="flex justify-between">
                  <span>Cache Misses:</span>
                  <span className="font-mono text-red-600">
                    {metrics.totalRequests - metrics.cacheHits}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Miss Rate:</span>
                  <span className="font-mono">{metrics.missRate.toFixed(1)}%</span>
                </div>
              </div>
            </div>

            {diagnostics && (
              <div>
                <h4 className="font-semibold mb-2">Storage Information</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Used Storage:</span>
                    <span className="font-mono">{diagnostics.storage.used} MB</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Available Storage:</span>
                    <span className="font-mono">{diagnostics.storage.quota} MB</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Usage Percentage:</span>
                    <span className="font-mono">{diagnostics.storage.usagePercentage}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Last Cleanup:</span>
                    <span className="font-mono">
                      {new Date(metrics.lastCleanup).toLocaleTimeString()} (Manual)
                    </span>
                  </div>
                </div>
              </div>
            )}

            {diagnostics?.strategies && (
              <div>
                <h4 className="font-semibold mb-2">Cache Strategies</h4>
                <div className="space-y-2 text-sm">
                  {Object.entries(diagnostics.strategies).map(([type, strategy]: [string, any]) => (
                    <div key={type} className="flex justify-between">
                      <span className="capitalize">{type}:</span>
                      <Badge variant="outline" className="text-xs">
                        {strategy.priority} | {Math.round(strategy.ttl / 60000)}m
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};