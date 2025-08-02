import { preloadAllRestaurantData, clearRestaurantCache } from '@/utils/data-preloader';
import { cacheCoordinator } from '@/services/cache-coordinator';
import { testNetworkConnectivity, isOnline } from '@/utils/service-worker';
import { PreloaderState } from '@/utils/data-preloader';

interface StartupPreloaderConfig {
  restaurantId?: string;
  forceRefresh?: boolean;
  skipImages?: boolean;
  maxRetries?: number;
  adaptToConnection?: boolean;
}

interface ConnectionQuality {
  type: 'fast' | 'medium' | 'slow' | 'offline';
  downloadSpeed?: number;
  rtt?: number;
}

class StartupPreloader {
  private static instance: StartupPreloader;
  private isPreloading = false;
  private preloadPromise: Promise<void> | null = null;
  private connectionQuality: ConnectionQuality = { type: 'medium' };
  private subscribers: ((state: PreloaderState) => void)[] = [];

  static getInstance(): StartupPreloader {
    if (!StartupPreloader.instance) {
      StartupPreloader.instance = new StartupPreloader();
    }
    return StartupPreloader.instance;
  }

  private constructor() {
    this.detectConnectionQuality();
  }

  private async detectConnectionQuality(): Promise<void> {
    try {
      if (!isOnline()) {
        this.connectionQuality = { type: 'offline' };
        return;
      }

      // Test network connectivity with timing
      const startTime = performance.now();
      const isConnected = await testNetworkConnectivity();
      const rtt = performance.now() - startTime;

      if (!isConnected) {
        this.connectionQuality = { type: 'offline' };
        return;
      }

      // Use navigator.connection if available
      const connection = (navigator as any).connection;
      if (connection) {
        const { effectiveType, downlink, rtt: connectionRtt } = connection;
        
        this.connectionQuality = {
          type: this.mapEffectiveType(effectiveType),
          downloadSpeed: downlink,
          rtt: connectionRtt || rtt
        };
      } else {
        // Fallback based on RTT
        this.connectionQuality = {
          type: rtt < 100 ? 'fast' : rtt < 300 ? 'medium' : 'slow',
          rtt
        };
      }
    } catch (error) {
      console.warn('[StartupPreloader] Connection quality detection failed:', error);
      this.connectionQuality = { type: 'medium' };
    }
  }

  private mapEffectiveType(effectiveType: string): 'fast' | 'medium' | 'slow' {
    switch (effectiveType) {
      case '4g':
        return 'fast';
      case '3g':
        return 'medium';
      case '2g':
      case 'slow-2g':
        return 'slow';
      default:
        return 'medium';
    }
  }

  private getPreloadConfig(config: StartupPreloaderConfig): StartupPreloaderConfig {
    const { type } = this.connectionQuality;
    
    // Adapt configuration based on connection quality
    const adaptedConfig = { ...config };
    
    switch (type) {
      case 'fast':
        adaptedConfig.skipImages = config.skipImages ?? false;
        adaptedConfig.maxRetries = config.maxRetries ?? 3;
        break;
      case 'medium':
        adaptedConfig.skipImages = config.skipImages ?? false;
        adaptedConfig.maxRetries = config.maxRetries ?? 2;
        break;
      case 'slow':
        adaptedConfig.skipImages = config.skipImages ?? true;
        adaptedConfig.maxRetries = config.maxRetries ?? 1;
        break;
      case 'offline':
        // Skip preloading entirely when offline
        return adaptedConfig;
    }

    return adaptedConfig;
  }

  subscribe(callback: (state: PreloaderState) => void): () => void {
    this.subscribers.push(callback);
    return () => {
      const index = this.subscribers.indexOf(callback);
      if (index > -1) {
        this.subscribers.splice(index, 1);
      }
    };
  }

  private notifySubscribers(state: PreloaderState): void {
    this.subscribers.forEach(callback => {
      try {
        callback(state);
      } catch (error) {
        console.error('[StartupPreloader] Subscriber callback failed:', error);
      }
    });
  }

  async preloadData(config: StartupPreloaderConfig = {}): Promise<void> {
    if (this.isPreloading && this.preloadPromise) {
      return this.preloadPromise;
    }

    this.isPreloading = true;
    
    // Update connection quality before preloading
    await this.detectConnectionQuality();
    
    if (this.connectionQuality.type === 'offline') {
      this.isPreloading = false;
      throw new Error('Cannot preload data while offline');
    }

    const adaptedConfig = this.getPreloadConfig(config);

    this.preloadPromise = this.performPreload(adaptedConfig);
    
    try {
      await this.preloadPromise;
    } finally {
      this.isPreloading = false;
      this.preloadPromise = null;
    }
  }

  private async performPreload(config: StartupPreloaderConfig): Promise<void> {
    const { restaurantId, forceRefresh, skipImages, maxRetries = 2 } = config;

    if (!restaurantId) {
      throw new Error('Restaurant ID is required for preloading');
    }

    let retryCount = 0;
    let lastError: Error | null = null;

    while (retryCount <= maxRetries) {
      try {
        // Clear cache if force refresh requested
        if (forceRefresh) {
          clearRestaurantCache(restaurantId);
        }

        // Preload all restaurant data with progress tracking
        await preloadAllRestaurantData(
          restaurantId,
          {
            forceRefresh,
            skipImages
          },
          (state) => this.notifySubscribers(state)
        );

        // Optimize cache after successful preload
        await cacheCoordinator.performMemoryOptimization();

        if (import.meta.env.DEV) {
          console.log('[StartupPreloader] Preload completed successfully');
        }

        return;
      } catch (error) {
        lastError = error as Error;
        retryCount++;

        if (import.meta.env.DEV) {
          console.warn(`[StartupPreloader] Preload attempt ${retryCount} failed:`, error);
        }

        if (retryCount <= maxRetries) {
          // Exponential backoff for retries
          const delay = Math.min(1000 * Math.pow(2, retryCount - 1), 5000);
          await new Promise(resolve => setTimeout(resolve, delay));
          
          // Re-detect connection quality before retry
          await this.detectConnectionQuality();
          
          if (this.connectionQuality.type === 'offline') {
            throw new Error('Lost network connection during preload');
          }
        }
      }
    }

    throw new Error(`Preload failed after ${maxRetries + 1} attempts: ${lastError?.message}`);
  }

  getConnectionQuality(): ConnectionQuality {
    return { ...this.connectionQuality };
  }

  isCurrentlyPreloading(): boolean {
    return this.isPreloading;
  }

  async forceRefresh(restaurantId: string): Promise<void> {
    return this.preloadData({
      restaurantId,
      forceRefresh: true,
      adaptToConnection: true
    });
  }
}

export const startupPreloader = StartupPreloader.getInstance();

// Convenience functions
export const preloadRestaurantData = (restaurantId: string, options: Omit<StartupPreloaderConfig, 'restaurantId'> = {}) => {
  return startupPreloader.preloadData({ ...options, restaurantId });
};

export const subscribeToPreloadProgress = (callback: (state: PreloaderState) => void) => {
  return startupPreloader.subscribe(callback);
};

export const getConnectionQuality = () => {
  return startupPreloader.getConnectionQuality();
};

export const isPreloading = () => {
  return startupPreloader.isCurrentlyPreloading();
};