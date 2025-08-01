import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useMenuItemPreloader } from '@/hooks/useOptimizedMenuItemDetails';
import { getCacheDiagnostics } from '@/services/cache-coordinator';
import { perfMonitor } from '@/utils/performance-monitor';

interface PerformanceMonitorProps {
  restaurantId: string;
  isVisible: boolean;
  onToggle: () => void;
}

export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  restaurantId,
  isVisible,
  onToggle
}) => {
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const { getCacheStats } = useMenuItemPreloader();

  // Refresh diagnostics every 5 seconds when visible
  useEffect(() => {
    if (!isVisible) return;

    const refreshDiagnostics = async () => {
      try {
        const cacheDiagnostics = await getCacheDiagnostics();
        const cacheStats = getCacheStats();
        
        setDiagnostics({
          ...cacheDiagnostics,
          memoryCache: cacheStats
        });
      } catch (error) {
        console.error('Failed to get diagnostics:', error);
      }
    };

    refreshDiagnostics();
    const interval = setInterval(refreshDiagnostics, 5000);

    return () => clearInterval(interval);
  }, [isVisible, getCacheStats, refreshKey]);

  const refreshData = () => {
    setRefreshKey(prev => prev + 1);
  };

  const clearCaches = () => {
    localStorage.clear();
    // Reset performance monitor
    perfMonitor.disable();
    perfMonitor.enable();
    refreshData();
  };

  if (!isVisible) {
    return (
      <Button
        onClick={onToggle}
        size="sm"
        variant="outline"
        className="fixed bottom-4 right-4 z-50 opacity-50 hover:opacity-100"
      >
        📊 Performance
      </Button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 max-h-96 overflow-y-auto">
      <Card className="p-4 bg-white shadow-lg border">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-lg">Performance Monitor</h3>
          <div className="flex gap-2">
            <Button onClick={refreshData} size="sm" variant="outline">
              🔄
            </Button>
            <Button onClick={clearCaches} size="sm" variant="outline">
              🗑️ Clear
            </Button>
            <Button onClick={onToggle} size="sm" variant="outline">
              ✕
            </Button>
          </div>
        </div>

        {diagnostics && (
          <div className="space-y-4 text-sm">
            {/* Cache Hit Rate */}
            <div>
              <div className="flex justify-between items-center">
                <span className="font-medium">Cache Hit Rate</span>
                <Badge variant={diagnostics.metrics.hitRate > 70 ? "default" : "destructive"}>
                  {diagnostics.metrics.hitRate.toFixed(1)}%
                </Badge>
              </div>
              <div className="text-xs text-gray-500">
                Hits: {diagnostics.metrics.cacheHits} / Total: {diagnostics.metrics.totalRequests}
              </div>
            </div>

            {/* Memory Usage */}
            <div>
              <div className="flex justify-between items-center">
                <span className="font-medium">Storage Usage</span>
                <Badge variant={diagnostics.storage.usagePercentage > 80 ? "destructive" : "default"}>
                  {diagnostics.storage.usagePercentage}%
                </Badge>
              </div>
              <div className="text-xs text-gray-500">
                {diagnostics.storage.used}MB / {diagnostics.storage.quota}MB
              </div>
            </div>

            {/* Memory Cache Stats */}
            {diagnostics.memoryCache && (
              <div>
                <div className="flex justify-between items-center">
                  <span className="font-medium">Memory Cache</span>
                  <Badge variant="outline">
                    {diagnostics.memoryCache.size} items
                  </Badge>
                </div>
                <div className="text-xs text-gray-500">
                  Hit Rate: {diagnostics.memoryCache.hitRate.toFixed(1)}%
                </div>
              </div>
            )}

            {/* Background Queue */}
            <div>
              <div className="flex justify-between items-center">
                <span className="font-medium">Background Queue</span>
                <Badge variant={diagnostics.backgroundQueue > 0 ? "secondary" : "outline"}>
                  {diagnostics.backgroundQueue} pending
                </Badge>
              </div>
            </div>

            {/* Online Status */}
            <div>
              <div className="flex justify-between items-center">
                <span className="font-medium">Network Status</span>
                <Badge variant={diagnostics.onlineStatus ? "default" : "destructive"}>
                  {diagnostics.onlineStatus ? "Online" : "Offline"}
                </Badge>
              </div>
            </div>

            {/* Last Cleanup */}
            <div>
              <div className="flex justify-between items-center">
                <span className="font-medium">Last Cleanup</span>
                <span className="text-xs text-gray-500">
                  {new Date(diagnostics.metrics.lastCleanup).toLocaleTimeString()}
                </span>
              </div>
            </div>

            {/* Cache Strategies */}
            <div>
              <div className="font-medium mb-2">Active Strategies</div>
              <div className="space-y-1">
                {Object.entries(diagnostics.strategies).map(([key, strategy]: [string, any]) => (
                  <div key={key} className="flex justify-between text-xs">
                    <span>{key}</span>
                    <span className="text-gray-500">
                      {strategy.priority} | {(strategy.ttl / 60000).toFixed(0)}min
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};