import { logSecurityEvent } from './error-handler';

export interface AuditEvent {
  event_type: string;
  user_id?: string;
  resource_type?: string;
  resource_id?: string;
  action: string;
  ip_address?: string;
  user_agent?: string;
  details?: Record<string, any>;
  timestamp: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

class AuditLogger {
  private events: AuditEvent[] = [];
  private maxEvents = 1000; // Keep last 1000 events in memory

  private getClientInfo() {
    return {
      ip_address: 'client-side', // Would need server-side for real IP
      user_agent: navigator.userAgent,
      timestamp: new Date().toISOString(),
    };
  }

  logEvent(
    eventType: string,
    action: string,
    severity: AuditEvent['severity'] = 'low',
    details: Record<string, any> = {},
    userId?: string,
    resourceType?: string,
    resourceId?: string
  ) {
    const event: AuditEvent = {
      event_type: eventType,
      action,
      severity,
      user_id: userId,
      resource_type: resourceType,
      resource_id: resourceId,
      details,
      ...this.getClientInfo(),
    };

    // Add to in-memory storage
    this.events.unshift(event);
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(0, this.maxEvents);
    }

    // Log to console for development
    console.log('[Audit]', event);

    // Also log as security event for high/critical severity
    if (severity === 'high' || severity === 'critical') {
      logSecurityEvent(`Audit: ${eventType}`, {
        action,
        severity,
        ...details,
      });
    }

    // In production, send to backend audit service
    if (process.env.NODE_ENV === 'production') {
      this.sendToAuditService(event);
    }
  }

  private async sendToAuditService(event: AuditEvent) {
    try {
      // This would send to your audit logging service
      // For now, just store in localStorage as backup
      const stored = localStorage.getItem('audit_logs') || '[]';
      const logs = JSON.parse(stored);
      logs.unshift(event);
      
      // Keep only last 100 events in localStorage
      const trimmed = logs.slice(0, 100);
      localStorage.setItem('audit_logs', JSON.stringify(trimmed));
    } catch (error) {
      console.error('Failed to store audit event:', error);
    }
  }

  // Authentication events
  logAuth(action: string, userId?: string, details: Record<string, any> = {}) {
    this.logEvent('authentication', action, 'medium', details, userId);
  }

  // Data access events
  logDataAccess(action: string, resourceType: string, resourceId: string, userId?: string, details: Record<string, any> = {}) {
    this.logEvent('data_access', action, 'low', details, userId, resourceType, resourceId);
  }

  // Administrative events
  logAdmin(action: string, userId?: string, details: Record<string, any> = {}) {
    this.logEvent('administration', action, 'high', details, userId);
  }

  // Security events
  logSecurity(action: string, userId?: string, details: Record<string, any> = {}) {
    this.logEvent('security', action, 'critical', details, userId);
  }

  // Business logic events
  logBusiness(action: string, resourceType: string, resourceId?: string, userId?: string, details: Record<string, any> = {}) {
    this.logEvent('business', action, 'low', details, userId, resourceType, resourceId);
  }

  // Get recent events (for debugging)
  getRecentEvents(limit: number = 50): AuditEvent[] {
    return this.events.slice(0, limit);
  }

  // Search events
  searchEvents(filter: Partial<AuditEvent>): AuditEvent[] {
    return this.events.filter(event => {
      return Object.entries(filter).every(([key, value]) => {
        return event[key as keyof AuditEvent] === value;
      });
    });
  }
}

export const auditLogger = new AuditLogger();

// Convenience functions
export const logAuthEvent = (action: string, userId?: string, details?: Record<string, any>) => {
  auditLogger.logAuth(action, userId, details);
};

export const logDataEvent = (action: string, resourceType: string, resourceId: string, userId?: string, details?: Record<string, any>) => {
  auditLogger.logDataAccess(action, resourceType, resourceId, userId, details);
};

export const logAdminEvent = (action: string, userId?: string, details?: Record<string, any>) => {
  auditLogger.logAdmin(action, userId, details);
};

export const logSecurityEventAudit = (action: string, userId?: string, details?: Record<string, any>) => {
  auditLogger.logSecurity(action, userId, details);
};

export const logBusinessEvent = (action: string, resourceType: string, resourceId?: string, userId?: string, details?: Record<string, any>) => {
  auditLogger.logBusiness(action, resourceType, resourceId, userId, details);
};
