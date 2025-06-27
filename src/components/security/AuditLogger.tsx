
import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { logSecurityEvent } from '@/utils/error-handler';

interface AuditEvent {
  event_type: string;
  user_id: string | null;
  resource_type?: string;
  resource_id?: string;
  details?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
}

class AuditLogger {
  private static instance: AuditLogger;
  private eventQueue: AuditEvent[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private readonly FLUSH_INTERVAL = 5000; // 5 seconds
  private readonly MAX_QUEUE_SIZE = 50;

  static getInstance(): AuditLogger {
    if (!AuditLogger.instance) {
      AuditLogger.instance = new AuditLogger();
    }
    return AuditLogger.instance;
  }

  private constructor() {
    this.startFlushTimer();
  }

  private startFlushTimer() {
    this.flushTimer = setInterval(() => {
      this.flushEvents();
    }, this.FLUSH_INTERVAL);
  }

  async logEvent(event: Omit<AuditEvent, 'ip_address' | 'user_agent'>) {
    const enrichedEvent: AuditEvent = {
      ...event,
      user_agent: navigator.userAgent,
      // Note: We can't get the real IP address from the client side
      // This would need to be handled server-side
    };

    this.eventQueue.push(enrichedEvent);

    // Flush immediately if queue is getting full
    if (this.eventQueue.length >= this.MAX_QUEUE_SIZE) {
      await this.flushEvents();
    }
  }

  private async flushEvents() {
    if (this.eventQueue.length === 0) return;

    const events = [...this.eventQueue];
    this.eventQueue = [];

    try {
      // For now, we'll log to console and security event system
      // In a real implementation, you'd want to send this to a dedicated audit table
      events.forEach(event => {
        console.log('Audit Event:', event);
        logSecurityEvent(`Audit: ${event.event_type}`, event.details || {});
      });

      // TODO: Implement actual database logging
      // const { error } = await supabase
      //   .from('audit_logs')
      //   .insert(events);
      
      // if (error) {
      //   console.error('Failed to flush audit events:', error);
      //   // Re-queue events on failure
      //   this.eventQueue.unshift(...events);
      // }
    } catch (error) {
      console.error('Error flushing audit events:', error);
      // Re-queue events on failure
      this.eventQueue.unshift(...events);
    }
  }

  destroy() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    this.flushEvents(); // Final flush
  }
}

export const auditLogger = AuditLogger.getInstance();

const AuditLoggerComponent = () => {
  const { user } = useAuth();

  useEffect(() => {
    // Log session start
    if (user) {
      auditLogger.logEvent({
        event_type: 'session_start',
        user_id: user.id,
        details: {
          timestamp: new Date().toISOString(),
          user_email: user.email
        }
      });
    }

    // Log page visibility changes
    const handleVisibilityChange = () => {
      if (user) {
        auditLogger.logEvent({
          event_type: document.hidden ? 'session_hidden' : 'session_visible',
          user_id: user.id,
          details: {
            timestamp: new Date().toISOString(),
            visibility: document.hidden ? 'hidden' : 'visible'
          }
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup on unmount
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      if (user) {
        auditLogger.logEvent({
          event_type: 'session_end',
          user_id: user.id,
          details: {
            timestamp: new Date().toISOString()
          }
        });
      }
    };
  }, [user]);

  return null;
};

export default AuditLoggerComponent;
