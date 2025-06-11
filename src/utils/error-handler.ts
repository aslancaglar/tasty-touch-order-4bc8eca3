
import { logSecurityEvent } from "@/config/security";

export interface ErrorDetails {
  message: string;
  code?: string;
  details?: any;
  context?: string;
  timestamp: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export const handleError = (error: any, context: string = 'Unknown'): ErrorDetails => {
  const timestamp = new Date().toISOString();
  
  // Determine error severity
  let severity: 'low' | 'medium' | 'high' | 'critical' = 'medium';
  
  if (error?.code) {
    // Database/Auth errors are typically higher severity
    if (error.code.startsWith('PGRST') || error.code.includes('auth')) {
      severity = 'high';
    }
    
    // RLS violations are now properly secured - these should be rare
    if (error.message?.includes('row-level security') || 
        error.message?.includes('insufficient_privilege')) {
      severity = 'critical';
      logSecurityEvent('CRITICAL: RLS policy violation detected', {
        error: error.message,
        context,
        code: error.code
      });
    }
  }
  
  // Network/timeout errors are usually medium severity
  if (error.message?.includes('timeout') || 
      error.message?.includes('network') ||
      error.message?.includes('fetch')) {
    severity = 'medium';
  }
  
  const errorDetails: ErrorDetails = {
    message: error?.message || 'Unknown error occurred',
    code: error?.code || error?.status?.toString(),
    details: error?.details || error?.hint,
    context,
    timestamp,
    severity
  };
  
  // Log security events for high/critical errors
  if (severity === 'high' || severity === 'critical') {
    logSecurityEvent(`${severity.toUpperCase()} error in ${context}`, {
      ...errorDetails,
      userAgent: navigator?.userAgent,
      url: window?.location?.href
    });
  }
  
  // Console logging for development
  console.error(`[${severity.toUpperCase()}] Error in ${context}:`, errorDetails);
  
  return errorDetails;
};

export const handleNetworkError = (error: any, context: string): ErrorDetails => {
  return handleError({
    ...error,
    message: error?.message || 'Network connection failed',
    isNetworkError: true
  }, `Network:${context}`);
};

export const handleAuthError = (error: any, context: string): ErrorDetails => {
  return handleError({
    ...error,
    message: error?.message || 'Authentication failed',
    isAuthError: true
  }, `Auth:${context}`);
};

export const handleDatabaseError = (error: any, context: string): ErrorDetails => {
  return handleError({
    ...error,
    message: error?.message || 'Database operation failed',
    isDatabaseError: true
  }, `Database:${context}`);
};

// Export security logging function for backward compatibility
export { logSecurityEvent };
