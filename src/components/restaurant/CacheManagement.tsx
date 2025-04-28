
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, RefreshCw, Database, Image } from 'lucide-react';
import { clearCache, getCacheStats } from '@/utils/cache-utils';
import { getImageCacheStats, clearAllCache } from '@/utils/image-cache';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

interface CacheManagementProps {
  restaurantId: string;
}

const CacheManagement: React.FC<CacheManagementProps> = ({ restaurantId }) => {
  const [dataStats, setDataStats] = useState({ count: 0, size: 0 });
  const [imageStats, setImageStats] = useState({ count: 0, size: 0 });
  const [clearing, setClearing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    updateStats();
  }, [restaurantId]);

  const updateStats = async () => {
    // Get data cache stats
    const currentDataStats = getCacheStats(restaurantId);
    setDataStats(currentDataStats);
    
    // Get image cache stats
    const currentImageStats = await getImageCacheStats(restaurantId);
    setImageStats(currentImageStats);
  };

  const handleClearCache = async (type: 'all' | 'data' | 'images') => {
    setClearing(true);
    try {
      switch (type) {
        case 'all':
          await clearAllCache(restaurantId);
          break;
        case 'data':
          clearCache(restaurantId);
          break;
        case 'images':
          await clearCachedImages(restaurantId);
          break;
      }
      
      toast({
        title: 'Cache Cleared',
        description: `${type === 'all' ? 'All' : type === 'data' ? 'Data' : 'Image'} cache has been successfully cleared.`,
      });
      
      updateStats();
    } catch (error) {
      console.error('Error clearing cache:', error);
      toast({
        title: 'Error',
        description: 'Failed to clear cache. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setClearing(false);
    }
  };

  const totalSize = dataStats.size + imageStats.size;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-xl font-bold flex items-center">
          <Database className="mr-2 h-5 w-5" />
          Local Cache Management
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-muted p-3 rounded-md">
              <p className="text-sm font-medium text-muted-foreground">Total Cached Items</p>
              <p className="text-2xl font-bold">{dataStats.count + imageStats.count}</p>
            </div>
            <div className="bg-muted p-3 rounded-md">
              <p className="text-sm font-medium text-muted-foreground">Total Cache Size</p>
              <p className="text-2xl font-bold">{totalSize} KB</p>
            </div>
          </div>
          
          <Tabs defaultValue="all">
            <TabsList className="grid grid-cols-3 mb-4">
              <TabsTrigger value="all">All Cache</TabsTrigger>
              <TabsTrigger value="data">Data Cache</TabsTrigger>
              <TabsTrigger value="images">Image Cache</TabsTrigger>
            </TabsList>
            
            <TabsContent value="all">
              <p className="text-sm text-muted-foreground mb-4">
                Local cache stores menu items, categories, and images to reduce API calls and improve performance.
                Cache expires after 24 hours for data and 7 days for images.
              </p>
              
              <Button 
                variant="destructive" 
                onClick={() => handleClearCache('all')} 
                disabled={clearing || (dataStats.count === 0 && imageStats.count === 0)}
                className="w-full"
              >
                {clearing ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Clearing All Cache...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Clear All Cache
                  </>
                )}
              </Button>
            </TabsContent>
            
            <TabsContent value="data">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-muted p-3 rounded-md">
                  <p className="text-sm font-medium text-muted-foreground">Data Items</p>
                  <p className="text-xl font-bold">{dataStats.count}</p>
                </div>
                <div className="bg-muted p-3 rounded-md">
                  <p className="text-sm font-medium text-muted-foreground">Data Size</p>
                  <p className="text-xl font-bold">{dataStats.size} KB</p>
                </div>
              </div>
              
              <Button 
                variant="destructive" 
                onClick={() => handleClearCache('data')} 
                disabled={clearing || dataStats.count === 0}
                className="w-full"
              >
                {clearing ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Clearing Data Cache...
                  </>
                ) : (
                  <>
                    <Database className="mr-2 h-4 w-4" />
                    Clear Data Cache
                  </>
                )}
              </Button>
            </TabsContent>
            
            <TabsContent value="images">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-muted p-3 rounded-md">
                  <p className="text-sm font-medium text-muted-foreground">Cached Images</p>
                  <p className="text-xl font-bold">{imageStats.count}</p>
                </div>
                <div className="bg-muted p-3 rounded-md">
                  <p className="text-sm font-medium text-muted-foreground">Images Size</p>
                  <p className="text-xl font-bold">{imageStats.size} KB</p>
                </div>
              </div>
              
              <Button 
                variant="destructive" 
                onClick={() => handleClearCache('images')} 
                disabled={clearing || imageStats.count === 0}
                className="w-full"
              >
                {clearing ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Clearing Image Cache...
                  </>
                ) : (
                  <>
                    <Image className="mr-2 h-4 w-4" />
                    Clear Image Cache
                  </>
                )}
              </Button>
            </TabsContent>
          </Tabs>
          
          <div className="flex justify-end">
            <Button 
              variant="outline" 
              onClick={updateStats}
              size="sm"
              className="flex-shrink-0"
            >
              <RefreshCw className="h-4 w-4 mr-1" /> Refresh Stats
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CacheManagement;
