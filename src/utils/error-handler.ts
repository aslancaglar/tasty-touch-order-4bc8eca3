
import { logSecurityEvent } from "@/config/security";

export interface ErrorDetails {
  message: string;
  code?: string;
  details?: any;
  context?: string;
  timestamp: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface PrintingErrorContext {
  restaurantId?: string;
  orderNumber?: string;
  printerIds?: string[];
  attemptedMethod?: 'printnode' | 'browser' | 'fallback';
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

  // API key related errors should be high severity
  if (error.message?.includes('API key') || 
      error.message?.includes('authentication') ||
      error.message?.includes('authorization') ||
      error.message?.includes('permission')) {
    severity = 'high';
  }

  // Printing errors are typically low-medium severity (non-critical)
  if (context.includes('Print') || context.includes('Receipt')) {
    severity = error.message?.includes('timeout') ? 'medium' : 'low';
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

export const handleApiKeyError = (error: any, context: string): ErrorDetails => {
  return handleError({
    ...error,
    message: error?.message || 'API key operation failed',
    isApiKeyError: true
  }, `ApiKey:${context}`);
};

export const handlePrintingError = (
  error: any, 
  context: string, 
  printContext?: PrintingErrorContext
): ErrorDetails => {
  const enhancedContext = printContext ? {
    ...printContext,
    originalContext: context
  } : undefined;

  return handleError({
    ...error,
    message: error?.message || 'Printing operation failed',
    isPrintingError: true,
    printingContext: enhancedContext
  }, `Printing:${context}`);
};

// Enhanced error recovery utilities
export const withFallback = async <T>(
  primary: () => Promise<T>,
  fallback: () => Promise<T>,
  context: string
): Promise<T> => {
  try {
    return await primary();
  } catch (primaryError) {
    console.warn(`[${context}] Primary method failed, trying fallback:`, primaryError.message);
    
    try {
      return await fallback();
    } catch (fallbackError) {
      console.error(`[${context}] Both primary and fallback methods failed:`, {
        primaryError: primaryError.message,
        fallbackError: fallbackError.message
      });
      throw fallbackError;
    }
  }
};

export const withRetry = async <T>(
  operation: () => Promise<T>,
  maxAttempts: number = 3,
  delayMs: number = 1000,
  context: string = 'Operation'
): Promise<T> => {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      console.warn(`[${context}] Attempt ${attempt}/${maxAttempts} failed:`, error.message);
      
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
      }
    }
  }
  
  throw lastError;
};

// Export security logging function for backward compatibility
export { logSecurityEvent };
