
import { supabase } from '@/integrations/supabase/client';
import { useAuditLogging } from '@/hooks/useAuditLogging';
import { ipBlockingService } from '@/utils/ip-blocking-service';
import { SECURITY_CONFIG, validateFormData, sanitizeInput } from '@/config/security';

interface SecureDatabaseOptions {
  auditLog?: boolean;
  rateLimitKey?: string;
  validateOwnership?: boolean;
  tableName: string;
}

class SecureDatabaseOperations {
  private auditLogger: ReturnType<typeof useAuditLogging> | null = null;

  setAuditLogger(logger: ReturnType<typeof useAuditLogging>) {
    this.auditLogger = logger;
  }

  async secureSelect<T = any>(
    tableName: string,
    query: any,
    options: Omit<SecureDatabaseOptions, 'tableName'> = {}
  ): Promise<{ data: T[] | null; error: any }> {
    try {
      // Rate limiting check
      if (options.rateLimitKey) {
        const allowed = ipBlockingService.checkRateLimit(
          options.rateLimitKey,
          SECURITY_CONFIG.RATE_LIMIT.MAX_REQUESTS_PER_MINUTE,
          60000
        );
        
        if (!allowed) {
          throw new Error('Rate limit exceeded for database operations');
        }
      }

      const result = await query;

      // Audit logging for select operations
      if (options.auditLog && this.auditLogger) {
        await this.auditLogger.logDatabaseOperation('create', tableName, 'multiple');
      }

      return result;
    } catch (error) {
      console.error(`Secure select error on ${tableName}:`, error);
      
      if (this.auditLogger) {
        await this.auditLogger.logSecurityEvent('database_operation_failed', {
          operation: 'select',
          table: tableName,
          error: String(error)
        }, 'medium');
      }

      return { data: null, error };
    }
  }

  async secureInsert<T = any>(
    tableName: string,
    data: any,
    options: Omit<SecureDatabaseOptions, 'tableName'> = {}
  ): Promise<{ data: T[] | null; error: any }> {
    try {
      // Rate limiting
      const allowed = ipBlockingService.checkRateLimit(
        `insert-${tableName}`,
        SECURITY_CONFIG.RATE_LIMIT.MAX_REQUESTS_PER_MINUTE / 2, // More restrictive for writes
        60000
      );
      
      if (!allowed) {
        throw new Error('Rate limit exceeded for database insertions');
      }

      // Data sanitization
      const sanitizedData = this.sanitizeData(data);

      // Use type assertion to handle dynamic table names
      const result = await (supabase as any)
        .from(tableName)
        .insert(sanitizedData)
        .select();

      // Audit logging
      if (options.auditLog !== false && this.auditLogger) {
        const recordId = result.data?.[0]?.id || 'unknown';
        await this.auditLogger.logDatabaseOperation('create', tableName, recordId, sanitizedData);
      }

      return result as { data: T[] | null; error: any };
    } catch (error) {
      console.error(`Secure insert error on ${tableName}:`, error);
      
      if (this.auditLogger) {
        await this.auditLogger.logSecurityEvent('database_operation_failed', {
          operation: 'insert',
          table: tableName,
          error: String(error)
        }, 'high');
      }

      // Log potential security violation
      if (String(error).includes('policy') || String(error).includes('permission')) {
        ipBlockingService.recordViolation('database_permission_violation', {
          operation: 'insert',
          table: tableName,
          error: String(error)
        }, 'high');
      }

      return { data: null, error };
    }
  }

  async secureUpdate<T = any>(
    tableName: string,
    id: string,
    data: any,
    options: Omit<SecureDatabaseOptions, 'tableName'> = {}
  ): Promise<{ data: T[] | null; error: any }> {
    try {
      // Rate limiting
      const allowed = ipBlockingService.checkRateLimit(
        `update-${tableName}`,
        SECURITY_CONFIG.RATE_LIMIT.MAX_REQUESTS_PER_MINUTE / 2,
        60000
      );
      
      if (!allowed) {
        throw new Error('Rate limit exceeded for database updates');
      }

      // Data sanitization
      const sanitizedData = this.sanitizeData(data);

      // Use type assertion to handle dynamic table names
      const result = await (supabase as any)
        .from(tableName)
        .update(sanitizedData)
        .eq('id', id)
        .select();

      // Audit logging
      if (options.auditLog !== false && this.auditLogger) {
        await this.auditLogger.logDatabaseOperation('update', tableName, id, sanitizedData);
      }

      return result as { data: T[] | null; error: any };
    } catch (error) {
      console.error(`Secure update error on ${tableName}:`, error);
      
      if (this.auditLogger) {
        await this.auditLogger.logSecurityEvent('database_operation_failed', {
          operation: 'update',
          table: tableName,
          record_id: id,
          error: String(error)
        }, 'high');
      }

      // Log potential security violation
      if (String(error).includes('policy') || String(error).includes('permission')) {
        ipBlockingService.recordViolation('database_permission_violation', {
          operation: 'update',
          table: tableName,
          record_id: id,
          error: String(error)
        }, 'high');
      }

      return { data: null, error };
    }
  }

  async secureDelete<T = any>(
    tableName: string,
    id: string,
    options: Omit<SecureDatabaseOptions, 'tableName'> = {}
  ): Promise<{ data: T[] | null; error: any }> {
    try {
      // Rate limiting - most restrictive for deletes
      const allowed = ipBlockingService.checkRateLimit(
        `delete-${tableName}`,
        Math.floor(SECURITY_CONFIG.RATE_LIMIT.MAX_REQUESTS_PER_MINUTE / 4),
        60000
      );
      
      if (!allowed) {
        throw new Error('Rate limit exceeded for database deletions');
      }

      // Use type assertion to handle dynamic table names
      const result = await (supabase as any)
        .from(tableName)
        .delete()
        .eq('id', id)
        .select();

      // Audit logging - always log deletions
      if (this.auditLogger) {
        await this.auditLogger.logDatabaseOperation('delete', tableName, id);
      }

      return result as { data: T[] | null; error: any };
    } catch (error) {
      console.error(`Secure delete error on ${tableName}:`, error);
      
      if (this.auditLogger) {
        await this.auditLogger.logSecurityEvent('database_operation_failed', {
          operation: 'delete',
          table: tableName,
          record_id: id,
          error: String(error)
        }, 'critical');
      }

      // Log potential security violation
      if (String(error).includes('policy') || String(error).includes('permission')) {
        ipBlockingService.recordViolation('database_permission_violation', {
          operation: 'delete',
          table: tableName,
          record_id: id,
          error: String(error)
        }, 'critical');
      }

      return { data: null, error };
    }
  }

  private sanitizeData(data: any): any {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    const sanitized: any = {};
    
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string') {
        sanitized[key] = sanitizeInput(value);
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeData(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }
}

export const secureDatabaseOperations = new SecureDatabaseOperations();
