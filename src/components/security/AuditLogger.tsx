
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
  severity?: 'low' | 'medium' | 'high' | 'critical';
  metadata?: Record<string, any>;
}

interface DataRetentionPolicy {
  eventType: string;
  retentionDays: number;
  archiveAfterDays?: number;
}

const DATA_RETENTION_POLICIES: DataRetentionPolicy[] = [
  { eventType: 'authentication', retentionDays: 90 },
  { eventType: 'admin_operation', retentionDays: 365 },
  { eventType: 'data_modification', retentionDays: 180 },
  { eventType: 'security_violation', retentionDays: 730 },
  { eventType: 'form_submission', retentionDays: 30 },
  { eventType: 'rate_limit_exceeded', retentionDays: 60 },
  { eventType: 'session_management', retentionDays: 30 },
];

class EnhancedAuditLogger {
  private static instance: EnhancedAuditLogger;
  private eventQueue: AuditEvent[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private readonly FLUSH_INTERVAL = 5000; // 5 seconds
  private readonly MAX_QUEUE_SIZE = 50;
  private readonly MAX_RETRY_ATTEMPTS = 3;
  private retryQueue: AuditEvent[] = [];

  static getInstance(): EnhancedAuditLogger {
    if (!EnhancedAuditLogger.instance) {
      EnhancedAuditLogger.instance = new EnhancedAuditLogger();
    }
    return EnhancedAuditLogger.instance;
  }

  private constructor() {
    this.startFlushTimer();
    this.setupRetentionCleanup();
  }

  private startFlushTimer() {
    this.flushTimer = setInterval(() => {
      this.flushEvents();
    }, this.FLUSH_INTERVAL);
  }

  private setupRetentionCleanup() {
    // Run retention cleanup daily
    setInterval(() => {
      this.cleanupExpiredEvents();
    }, 24 * 60 * 60 * 1000);
  }

  async logEvent(event: Omit<AuditEvent, 'ip_address' | 'user_agent'>) {
    const enrichedEvent: AuditEvent = {
      ...event,
      user_agent: navigator.userAgent,
      severity: event.severity || 'low',
      metadata: {
        ...event.metadata,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        referrer: document.referrer,
      }
    };

    this.eventQueue.push(enrichedEvent);

    // Flush immediately for critical events
    if (event.severity === 'critical' || this.eventQueue.length >= this.MAX_QUEUE_SIZE) {
      await this.flushEvents();
    }
  }

  private async flushEvents() {
    if (this.eventQueue.length === 0) return;

    const events = [...this.eventQueue];
    this.eventQueue = [];

    try {
      // For now, we'll log to console and security event system
      // Enhanced with structured logging
      events.forEach(event => {
        const logMessage = `[AUDIT] ${event.event_type} - ${event.severity?.toUpperCase()}`;
        const logData = {
          ...event,
          retention_policy: this.getRetentionPolicy(event.event_type),
        };

        console.log(logMessage, logData);
        logSecurityEvent(`Audit: ${event.event_type}`, logData);
      });

      // TODO: Implement actual database logging with encryption
      // const { error } = await supabase
      //   .from('audit_logs')
      //   .insert(events.map(event => ({
      //     ...event,
      //     encrypted_details: await this.encryptSensitiveData(event.details),
      //     retention_until: this.calculateRetentionDate(event.event_type)
      //   })));
      
      // if (error) {
      //   throw error;
      // }
    } catch (error) {
      console.error('Error flushing audit events:', error);
      
      // Add to retry queue with limited attempts
      events.forEach(event => {
        const retryEvent = { ...event, metadata: { ...event.metadata, retryCount: (event.metadata?.retryCount || 0) + 1 } };
        if ((retryEvent.metadata.retryCount || 0) <= this.MAX_RETRY_ATTEMPTS) {
          this.retryQueue.push(retryEvent);
        }
      });
    }
  }

  private getRetentionPolicy(eventType: string): DataRetentionPolicy | null {
    return DATA_RETENTION_POLICIES.find(policy => 
      eventType.includes(policy.eventType)
    ) || null;
  }

  private calculateRetentionDate(eventType: string): Date {
    const policy = this.getRetentionPolicy(eventType);
    const retentionDays = policy?.retentionDays || 30; // Default 30 days
    const retentionDate = new Date();
    retentionDate.setDate(retentionDate.getDate() + retentionDays);
    return retentionDate;
  }

  private async cleanupExpiredEvents() {
    try {
      console.log('Running audit log cleanup...');
      
      // TODO: Implement actual cleanup query
      // const cutoffDate = new Date();
      // cutoffDate.setDate(cutoffDate.getDate() - 30); // Cleanup events older than 30 days by default
      
      // const { error } = await supabase
      //   .from('audit_logs')
      //   .delete()
      //   .lt('retention_until', cutoffDate.toISOString());
      
      // if (error) {
      //   throw error;
      // }
      
      this.logEvent({
        event_type: 'audit_cleanup_completed',
        user_id: null,
        severity: 'low',
        details: {
          cleanup_date: new Date().toISOString(),
        }
      });
    } catch (error) {
      console.error('Error during audit log cleanup:', error);
      this.logEvent({
        event_type: 'audit_cleanup_failed',
        user_id: null,
        severity: 'medium',
        details: {
          error: String(error),
          cleanup_date: new Date().toISOString(),
        }
      });
    }
  }

  // Data modification logging
  async logDataModification(operation: string, table: string, recordId: string, changes: Record<string, any>, userId?: string) {
    await this.logEvent({
      event_type: 'data_modification',
      user_id: userId || null,
      resource_type: table,
      resource_id: recordId,
      severity: 'medium',
      details: {
        operation,
        changes,
        table,
        record_id: recordId,
      }
    });
  }

  // Security violation logging
  async logSecurityViolation(violation: string, details: Record<string, any>, userId?: string) {
    await this.logEvent({
      event_type: 'security_violation',
      user_id: userId || null,
      severity: 'high',
      details: {
        violation_type: violation,
        ...details,
      }
    });
  }

  // Admin operation logging
  async logAdminOperation(operation: string, details: Record<string, any>, userId: string) {
    await this.logEvent({
      event_type: 'admin_operation',
      user_id: userId,
      severity: 'medium',
      details: {
        operation,
        ...details,
      }
    });
  }

  destroy() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    this.flushEvents(); // Final flush
  }
}

export const enhancedAuditLogger = EnhancedAuditLogger.getInstance();

const AuditLoggerComponent = () => {
  const { user } = useAuth();

  useEffect(() => {
    // Log session start with enhanced details
    if (user) {
      enhancedAuditLogger.logEvent({
        event_type: 'session_start',
        user_id: user.id,
        severity: 'low',
        details: {
          user_email: user.email,
          session_method: 'web_app',
        }
      });
    }

    // Log page visibility changes
    const handleVisibilityChange = () => {
      if (user) {
        enhancedAuditLogger.logEvent({
          event_type: document.hidden ? 'session_hidden' : 'session_visible',
          user_id: user.id,
          severity: 'low',
          details: {
            visibility: document.hidden ? 'hidden' : 'visible',
            page_url: window.location.href,
          }
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup on unmount
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      if (user) {
        enhancedAuditLogger.logEvent({
          event_type: 'session_end',
          user_id: user.id,
          severity: 'low',
          details: {
            session_duration: performance.now(),
          }
        });
      }
    };
  }, [user]);

  return null;
};

export default AuditLoggerComponent;
