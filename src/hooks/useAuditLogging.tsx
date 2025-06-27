
import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { enhancedAuditLogger } from '@/components/security/AuditLogger';

interface AuditLogEntry {
  event_type: string;
  resource_type?: string;
  resource_id?: string;
  action?: string;
  details?: Record<string, any>;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

export const useAuditLogging = () => {
  const { user } = useAuth();

  const logToSupabase = useCallback(async (entry: AuditLogEntry) => {
    try {
      const { error } = await supabase
        .from('audit_logs')
        .insert({
          ...entry,
          user_id: user?.id || null,
        });

      if (error) {
        console.error('Failed to log audit entry to database:', error);
      }
    } catch (error) {
      console.error('Audit logging error:', error);
    }
  }, [user]);

  const logDatabaseOperation = useCallback(async (
    operation: 'create' | 'update' | 'delete',
    table: string,
    recordId: string,
    data?: any
  ) => {
    const auditEntry: AuditLogEntry = {
      event_type: 'database_operation',
      resource_type: table,
      resource_id: recordId,
      action: operation,
      details: {
        operation,
        table,
        timestamp: new Date().toISOString(),
        ...(data && { data: JSON.stringify(data) })
      },
      severity: operation === 'delete' ? 'medium' : 'low'
    };

    // Log to both client-side system and database
    await enhancedAuditLogger.logEvent(auditEntry);
    await logToSupabase(auditEntry);
  }, [logToSupabase]);

  const logSecurityEvent = useCallback(async (
    eventType: string,
    details: Record<string, any>,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ) => {
    const auditEntry: AuditLogEntry = {
      event_type: 'security_event',
      action: eventType,
      details: {
        ...details,
        timestamp: new Date().toISOString()
      },
      severity
    };

    await enhancedAuditLogger.logEvent(auditEntry);
    await logToSupabase(auditEntry);
  }, [logToSupabase]);

  const logAdminAction = useCallback(async (
    action: string,
    resourceType: string,
    resourceId?: string,
    details?: Record<string, any>
  ) => {
    const auditEntry: AuditLogEntry = {
      event_type: 'admin_action',
      resource_type: resourceType,
      resource_id: resourceId,
      action,
      details: {
        ...details,
        admin_user: user?.id,
        timestamp: new Date().toISOString()
      },
      severity: 'medium'
    };

    await enhancedAuditLogger.logEvent(auditEntry);
    await logToSupabase(auditEntry);
  }, [user, logToSupabase]);

  return {
    logDatabaseOperation,
    logSecurityEvent,
    logAdminAction,
    logToSupabase
  };
};
