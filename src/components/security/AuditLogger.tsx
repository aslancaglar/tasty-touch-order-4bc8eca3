
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { SECURITY_CONFIG, maskSensitiveData } from '@/config/security';
import { logSecurityEvent } from '@/utils/error-handler';

interface AuditEvent {
  event_type: string;
  user_id?: string | null;
  resource_type?: string;
  resource_id?: string;
  action?: string;
  details?: Record<string, any>;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  ip_address?: string;
  user_agent?: string;
  session_id?: string;
}

class EnhancedAuditLogger {
  private eventQueue: AuditEvent[] = [];
  private isProcessing = false;
  private flushInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Auto-flush events every 30 seconds
    this.flushInterval = setInterval(() => {
      this.flushEvents();
    }, 30000);

    // Flush on page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.flushEvents();
      });
    }
  }

  private async getClientInfo() {
    return {
      ip_address: await this.getClientIP(),
      user_agent: navigator.userAgent,
      timestamp: new Date().toISOString(),
    };
  }

  private async getClientIP(): Promise<string | undefined> {
    try {
      // This would normally be handled server-side
      // For client-side, we can't reliably get the real IP
      return undefined;
    } catch {
      return undefined;
    }
  }

  async logEvent(event: AuditEvent) {
    try {
      const clientInfo = await this.getClientInfo();
      const enhancedEvent: AuditEvent = {
        ...event,
        ...clientInfo,
        details: maskSensitiveData(event.details || {}),
        session_id: supabase.auth.getSession().then(s => s.data.session?.access_token?.substring(0, 8)),
      };

      // Queue the event
      this.eventQueue.push(enhancedEvent);

      // If high severity, flush immediately
      if (event.severity === 'high' || event.severity === 'critical') {
        await this.flushEvents();
      }

      // If queue is getting large, flush
      if (this.eventQueue.length >= 10) {
        await this.flushEvents();
      }
    } catch (error) {
      console.error('Failed to log audit event:', error);
    }
  }

  async logDataModification(action: string, resourceType: string, resourceId: string, data: any, userId?: string) {
    await this.logEvent({
      event_type: 'data_modification',
      user_id: userId,
      resource_type: resourceType,
      resource_id: resourceId,
      action,
      details: {
        modified_data: maskSensitiveData(data),
        timestamp: new Date().toISOString(),
      },
      severity: 'medium',
    });
  }

  async logSecurityViolation(violationType: string, details: Record<string, any>) {
    await this.logEvent({
      event_type: 'security_violation',
      action: violationType,
      details: maskSensitiveData(details),
      severity: 'high',
    });

    // Also log to security monitoring
    await logSecurityEvent(`Security violation: ${violationType}`, details);
  }

  async logAuthentication(action: 'login' | 'logout' | 'signup' | 'password_reset', userId?: string, success = true) {
    await this.logEvent({
      event_type: 'authentication',
      user_id: userId,
      action,
      details: {
        success,
        timestamp: new Date().toISOString(),
      },
      severity: success ? 'low' : 'medium',
    });
  }

  async logAdminOperation(operation: string, resourceType: string, resourceId?: string, userId?: string) {
    await this.logEvent({
      event_type: 'admin_operation',
      user_id: userId,
      resource_type: resourceType,
      resource_id: resourceId,
      action: operation,
      severity: 'medium',
    });
  }

  async logRateLimitViolation(identifier: string, requestCount: number, userId?: string) {
    await this.logEvent({
      event_type: 'rate_limit_violation',
      user_id: userId,
      action: 'rate_limit_exceeded',
      details: {
        identifier,
        request_count: requestCount,
        limit: SECURITY_CONFIG.RATE_LIMIT.MAX_REQUESTS_PER_MINUTE,
        timestamp: new Date().toISOString(),
      },
      severity: 'medium',
    });
  }

  private async flushEvents() {
    if (this.isProcessing || this.eventQueue.length === 0) {
      return;
    }

    this.isProcessing = true;
    const eventsToProcess = [...this.eventQueue];
    this.eventQueue = [];

    try {
      // In a real implementation, this would send to a secure audit logging endpoint
      // For now, we'll just log locally and send security events
      for (const event of eventsToProcess) {
        if (event.severity === 'high' || event.severity === 'critical') {
          await logSecurityEvent(`Audit: ${event.event_type}`, event.details || {});
        }
      }

      console.log('Audit events processed:', eventsToProcess.length);
    } catch (error) {
      console.error('Failed to flush audit events:', error);
      // Put events back in queue for retry
      this.eventQueue.unshift(...eventsToProcess);
    } finally {
      this.isProcessing = false;
    }
  }

  destroy() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    this.flushEvents();
  }
}

// Create singleton instance
export const enhancedAuditLogger = new EnhancedAuditLogger();

const AuditLogger = () => {
  const { user } = useAuth();

  useEffect(() => {
    // Log page views for authenticated users
    if (user) {
      enhancedAuditLogger.logEvent({
        event_type: 'page_view',
        user_id: user.id,
        resource_type: 'page',
        action: 'view',
        details: {
          path: window.location.pathname,
          referrer: document.referrer,
          timestamp: new Date().toISOString(),
        },
        severity: 'low',
      });
    }
  }, [user, window.location.pathname]);

  // Component doesn't render anything
  return null;
};

export default AuditLogger;
