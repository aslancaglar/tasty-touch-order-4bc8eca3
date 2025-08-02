import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import PreloadingScreen from '@/components/kiosk/PreloadingScreen';
import { startupPreloader, subscribeToPreloadProgress } from '@/services/startup-preloader';
import { PreloaderState } from '@/utils/data-preloader';
import { useToast } from '@/hooks/use-toast';

interface AppPreloaderProps {
  children: React.ReactNode;
  restaurantId?: string;
  skipPreloadingRoutes?: string[];
  forcePreload?: boolean;
}

export const AppPreloader: React.FC<AppPreloaderProps> = ({
  children,
  restaurantId,
  skipPreloadingRoutes = ['/auth', '/owner-login', '/restaurants'],
  forcePreload = false
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  
  const [preloadState, setPreloadState] = useState<PreloaderState>({
    isLoading: false,
    progress: 0,
    stage: 'idle',
    error: null
  });
  
  const [shouldShowPreloader, setShouldShowPreloader] = useState(false);
  const [hasPreloaded, setHasPreloaded] = useState(false);

  // Check if current route should skip preloading
  const shouldSkipPreloading = useCallback(() => {
    const currentPath = location.pathname;
    return skipPreloadingRoutes.some(route => currentPath.startsWith(route));
  }, [location.pathname, skipPreloadingRoutes]);

  // Handle preload retry
  const handleRetry = useCallback(async () => {
    if (!restaurantId) return;
    
    try {
      await startupPreloader.preloadData({
        restaurantId,
        forceRefresh: true,
        adaptToConnection: true
      });
      setHasPreloaded(true);
    } catch (error) {
      console.error('[AppPreloader] Retry failed:', error);
      toast({
        title: "Preload Failed",
        description: "Unable to load restaurant data. Some features may be limited.",
        variant: "destructive"
      });
    }
  }, [restaurantId, toast]);

  // Initialize preloading
  useEffect(() => {
    if (!restaurantId || shouldSkipPreloading() || hasPreloaded) {
      return;
    }

    const unsubscribe = subscribeToPreloadProgress((state) => {
      setPreloadState(state);
      
      if (state.isLoading && !shouldShowPreloader) {
        setShouldShowPreloader(true);
      }
      
      if (!state.isLoading && state.stage === 'complete') {
        setHasPreloaded(true);
        setTimeout(() => {
          setShouldShowPreloader(false);
        }, 500); // Brief delay to show completion
      }
      
      if (state.error) {
        // Show error toast for critical failures
        toast({
          title: "Loading Error",
          description: "Failed to load some data. Retrying...",
          variant: "destructive"
        });
      }
    });

    // Start preloading
    const startPreload = async () => {
      try {
        await startupPreloader.preloadData({
          restaurantId,
          forceRefresh: forcePreload,
          adaptToConnection: true
        });
        setHasPreloaded(true);
      } catch (error) {
        console.error('[AppPreloader] Initial preload failed:', error);
        // Don't block the app, just log the error
        setHasPreloaded(true); // Allow app to continue
      }
    };

    startPreload();

    return unsubscribe;
  }, [restaurantId, forcePreload, shouldSkipPreloading, hasPreloaded, shouldShowPreloader, toast]);

  // Show preloading screen only when actively preloading and not on skip routes
  if (shouldShowPreloader && !shouldSkipPreloading() && !hasPreloaded) {
    return (
      <PreloadingScreen 
        state={preloadState} 
        onRetry={handleRetry}
      />
    );
  }

  // Render the app
  return <>{children}</>;
};

export default AppPreloader;