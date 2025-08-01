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
    // Enable performance monitoring in development and staging
    this.isEnabled = process.env.NODE_ENV !== 'production' || window.location.hostname.includes('lovableproject.com');
  }

  start(name: string, metadata?: Record<string, any>): void {
    if (!this.isEnabled) return;

    this.metrics.set(name, {
      name,
      startTime: performance.now(),
      metadata
    });
  }

  end(name: string, additionalMetadata?: Record<string, any>): number | null {
    if (!this.isEnabled) return null;

    const metric = this.metrics.get(name);
    if (!metric) {
      console.warn(`[PerfMonitor] No start time found for metric: ${name}`);
      return null;
    }

    const endTime = performance.now();
    const duration = endTime - metric.startTime;

    metric.endTime = endTime;
    metric.duration = duration;
    metric.metadata = { ...metric.metadata, ...additionalMetadata };

    // Log performance data
    this.logMetric(metric);

    // Clean up the metric
    this.metrics.delete(name);

    return duration;
  }

  mark(name: string, metadata?: Record<string, any>): void {
    if (!this.isEnabled) return;

    const timestamp = performance.now();
    console.log(`[PerfMonitor] ${name}: ${timestamp.toFixed(2)}ms`, metadata || '');
  }

  measure(name: string, fn: () => Promise<any>, metadata?: Record<string, any>): Promise<any> {
    if (!this.isEnabled) return fn();

    this.start(name, metadata);
    return fn().finally(() => {
      this.end(name);
    });
  }

  measureSync(name: string, fn: () => any, metadata?: Record<string, any>): any {
    if (!this.isEnabled) return fn();

    this.start(name, metadata);
    try {
      return fn();
    } finally {
      this.end(name);
    }
  }

  private logMetric(metric: PerformanceMetric): void {
    const { name, duration, metadata } = metric;
    
    if (!duration) return;

    // Color code based on performance thresholds
    let color = 'green';
    let level = 'info';
    
    if (duration > 1000) {
      color = 'red';
      level = 'warn';
    } else if (duration > 500) {
      color = 'orange';
      level = 'warn';
    } else if (duration > 200) {
      color = 'yellow';
    }

    const style = `color: ${color}; font-weight: bold;`;
    const message = `[PerfMonitor] ${name}: ${duration.toFixed(2)}ms`;

    if (level === 'warn') {
      console.warn(`%c${message}`, style, metadata || '');
    } else {
      console.log(`%c${message}`, style, metadata || '');
    }

    // Send to analytics in production (if available)
    if (typeof window !== 'undefined' && (window as any).analytics?.track) {
      (window as any).analytics.track('Performance Metric', {
        metric_name: name,
        duration_ms: duration,
        ...metadata
      });
    }
  }

  getMetrics(): PerformanceMetric[] {
    return Array.from(this.metrics.values());
  }

  clear(): void {
    this.metrics.clear();
  }

  disable(): void {
    this.isEnabled = false;
  }

  enable(): void {
    this.isEnabled = true;
  }
}

// Export singleton instance
export const perfMonitor = new PerformanceMonitor();

// Convenience functions
export const startPerf = (name: string, metadata?: Record<string, any>) => perfMonitor.start(name, metadata);
export const endPerf = (name: string, metadata?: Record<string, any>) => perfMonitor.end(name, metadata);
export const markPerf = (name: string, metadata?: Record<string, any>) => perfMonitor.mark(name, metadata);
export const measurePerf = (name: string, fn: () => Promise<any>, metadata?: Record<string, any>) => perfMonitor.measure(name, fn, metadata);
export const measureSyncPerf = (name: string, fn: () => any, metadata?: Record<string, any>) => perfMonitor.measureSync(name, fn, metadata);

// Dialog-specific performance tracking
export const trackDialogOpen = (itemId: string) => {
  startPerf('dialog_open', { itemId });
};

export const trackDialogDataLoaded = (itemId: string, dataSource: 'cache' | 'api') => {
  endPerf('dialog_open', { itemId, dataSource });
  markPerf('dialog_data_loaded', { itemId, dataSource });
};

export const trackDialogRender = (itemId: string, optionsCount: number, toppingsCount: number) => {
  markPerf('dialog_render_complete', { 
    itemId, 
    optionsCount, 
    toppingsCount,
    totalCustomizations: optionsCount + toppingsCount
  });
};