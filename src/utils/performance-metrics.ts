/**
 * Performance monitoring utilities for the optimized kiosk
 */

interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
}

class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric> = new Map();
  private isEnabled: boolean = true;

  constructor() {
    // Only enable in development or when explicitly enabled
    this.isEnabled = process.env.NODE_ENV === 'development' || 
      localStorage.getItem('kiosk_performance_monitoring') === 'true';
  }

  /**
   * Start measuring a performance metric
   */
  startMeasure(name: string, metadata?: Record<string, any>): void {
    if (!this.isEnabled) return;

    const metric: PerformanceMetric = {
      name,
      startTime: performance.now(),
      metadata
    };

    this.metrics.set(name, metric);
    console.log(`[Performance] Started measuring: ${name}`, metadata);
  }

  /**
   * End measuring a performance metric
   */
  endMeasure(name: string, additionalMetadata?: Record<string, any>): number | null {
    if (!this.isEnabled) return null;

    const metric = this.metrics.get(name);
    if (!metric) {
      console.warn(`[Performance] No metric found for: ${name}`);
      return null;
    }

    metric.endTime = performance.now();
    metric.duration = metric.endTime - metric.startTime;

    if (additionalMetadata) {
      metric.metadata = { ...metric.metadata, ...additionalMetadata };
    }

    const color = metric.duration < 100 ? 'green' : metric.duration < 500 ? 'orange' : 'red';
    console.log(
      `%c[Performance] ${name}: ${metric.duration.toFixed(2)}ms`,
      `color: ${color}; font-weight: bold`,
      metric.metadata
    );

    return metric.duration;
  }

  /**
   * Measure a function execution time
   */
  async measureAsync<T>(
    name: string, 
    fn: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    if (!this.isEnabled) return fn();

    this.startMeasure(name, metadata);
    try {
      const result = await fn();
      this.endMeasure(name, { success: true });
      return result;
    } catch (error) {
      this.endMeasure(name, { success: false, error: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    }
  }

  /**
   * Measure synchronous function execution time
   */
  measure<T>(
    name: string,
    fn: () => T,
    metadata?: Record<string, any>
  ): T {
    if (!this.isEnabled) return fn();

    this.startMeasure(name, metadata);
    try {
      const result = fn();
      this.endMeasure(name, { success: true });
      return result;
    } catch (error) {
      this.endMeasure(name, { success: false, error: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    }
  }

  /**
   * Get all recorded metrics
   */
  getMetrics(): PerformanceMetric[] {
    return Array.from(this.metrics.values());
  }

  /**
   * Get metrics summary
   */
  getSummary(): {
    totalMeasurements: number;
    averageDuration: number;
    slowestMeasurement: PerformanceMetric | null;
    fastestMeasurement: PerformanceMetric | null;
  } {
    const metrics = this.getMetrics().filter(m => m.duration !== undefined);
    
    if (metrics.length === 0) {
      return {
        totalMeasurements: 0,
        averageDuration: 0,
        slowestMeasurement: null,
        fastestMeasurement: null
      };
    }

    const durations = metrics.map(m => m.duration!);
    const totalDuration = durations.reduce((sum, duration) => sum + duration, 0);
    const averageDuration = totalDuration / durations.length;

    const slowestMeasurement = metrics.reduce((slowest, current) => 
      !slowest || current.duration! > slowest.duration! ? current : slowest
    );

    const fastestMeasurement = metrics.reduce((fastest, current) => 
      !fastest || current.duration! < fastest.duration! ? current : fastest
    );

    return {
      totalMeasurements: metrics.length,
      averageDuration,
      slowestMeasurement,
      fastestMeasurement
    };
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics.clear();
    console.log('[Performance] Cleared all metrics');
  }

  /**
   * Enable or disable performance monitoring
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    if (enabled) {
      localStorage.setItem('kiosk_performance_monitoring', 'true');
    } else {
      localStorage.removeItem('kiosk_performance_monitoring');
    }
    console.log(`[Performance] Monitoring ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Log performance summary to console
   */
  logSummary(): void {
    if (!this.isEnabled) return;

    const summary = this.getSummary();
    console.group('[Performance] Summary');
    console.log(`Total measurements: ${summary.totalMeasurements}`);
    console.log(`Average duration: ${summary.averageDuration.toFixed(2)}ms`);
    if (summary.slowestMeasurement) {
      console.log(`Slowest: ${summary.slowestMeasurement.name} (${summary.slowestMeasurement.duration!.toFixed(2)}ms)`);
    }
    if (summary.fastestMeasurement) {
      console.log(`Fastest: ${summary.fastestMeasurement.name} (${summary.fastestMeasurement.duration!.toFixed(2)}ms)`);
    }
    console.groupEnd();
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();

// Utility functions for common measurements
export const measureDatabaseQuery = async <T>(
  queryName: string,
  queryFn: () => Promise<T>,
  metadata?: Record<string, any>
): Promise<T> => {
  return performanceMonitor.measureAsync(
    `DB: ${queryName}`,
    queryFn,
    { type: 'database', ...metadata }
  );
};

export const measureCacheOperation = <T>(
  operationName: string,
  operationFn: () => T,
  metadata?: Record<string, any>
): T => {
  return performanceMonitor.measure(
    `Cache: ${operationName}`,
    operationFn,
    { type: 'cache', ...metadata }
  );
};

export const measureComponentRender = (
  componentName: string,
  metadata?: Record<string, any>
) => {
  const startTime = performance.now();
  
  return () => {
    const duration = performance.now() - startTime;
    console.log(
      `%c[Performance] Component ${componentName}: ${duration.toFixed(2)}ms`,
      'color: blue; font-weight: bold',
      { type: 'component-render', ...metadata }
    );
  };
};

// Hook for measuring React component performance
export const usePerformanceMeasure = (componentName: string) => {
  const startMeasure = (operationName: string, metadata?: Record<string, any>) => {
    performanceMonitor.startMeasure(`${componentName}: ${operationName}`, {
      component: componentName,
      ...metadata
    });
  };

  const endMeasure = (operationName: string, metadata?: Record<string, any>) => {
    return performanceMonitor.endMeasure(`${componentName}: ${operationName}`, metadata);
  };

  return { startMeasure, endMeasure };
};