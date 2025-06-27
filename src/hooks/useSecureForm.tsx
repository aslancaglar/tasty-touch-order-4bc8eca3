
import { useState, useCallback } from 'react';
import { useRateLimit } from './useRateLimit';
import { useSessionValidation } from './useSessionValidation';
import { validateFormData, sanitizeInput } from '@/config/security';
import { enhancedAuditLogger } from '@/components/security/AuditLogger';
import { ipBlockingService } from '@/utils/ip-blocking-service';
import { useAuth } from '@/contexts/AuthContext';

interface UseSecureFormOptions {
  maxSubmissions?: number;
  windowSize?: number;
  enableAuditLogging?: boolean;
  requireAdmin?: boolean;
  formType?: string;
  validationRules?: Record<string, string[]>;
}

export const useSecureForm = (options: UseSecureFormOptions = {}) => {
  const {
    maxSubmissions = 5,
    windowSize = 60000, // 1 minute
    enableAuditLogging = true,
    requireAdmin = false,
    formType = 'generic',
    validationRules = {}
  } = options;

  const { user } = useAuth();
  const { validateSession, validateAdminOperation } = useSessionValidation();
  const { checkRateLimit, isBlocked } = useRateLimit({
    maxRequests: maxSubmissions,
    windowSize,
    identifier: `form-submission-${formType}`
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSubmissionTime, setLastSubmissionTime] = useState<number>(0);

  const validateAndSanitizeData = useCallback((data: Record<string, any>) => {
    // Server-side validation using the enhanced validation rules
    const { isValid, errors } = validateFormData(data, validationRules);
    
    if (!isValid) {
      return { sanitizedData: null, validationErrors: errors };
    }

    const sanitizedData: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string') {
        // Enhanced sanitization
        sanitizedData[key] = sanitizeInput(value);
      } else {
        sanitizedData[key] = value;
      }
    }

    return { sanitizedData, validationErrors: [] };
  }, [validationRules]);

  const secureSubmit = useCallback(async (
    data: Record<string, any>,
    submitFunction: (sanitizedData: Record<string, any>) => Promise<any>,
    customFormType?: string
  ) => {
    const currentFormType = customFormType || formType;

    // Check IP blocking first
    if (ipBlockingService.isIPBlocked()) {
      const error = 'Access denied due to security violations.';
      if (enableAuditLogging) {
        await enhancedAuditLogger.logSecurityViolation('blocked_ip_form_submission', {
          form_type: currentFormType,
          user_id: user?.id || null,
        });
      }
      throw new Error(error);
    }

    // Enhanced rate limiting with IP tracking
    if (!ipBlockingService.checkRateLimit(`form-${currentFormType}`, maxSubmissions, windowSize)) {
      const error = 'Too many submissions. Please wait before trying again.';
      if (enableAuditLogging) {
        await enhancedAuditLogger.logEvent({
          event_type: 'form_submission_blocked',
          user_id: user?.id || null,
          resource_type: 'form',
          severity: 'medium',
          details: {
            form_type: currentFormType,
            reason: 'rate_limit_exceeded',
          }
        });
      }
      throw new Error(error);
    }

    // Session validation
    const isSessionValid = await validateSession();
    if (!isSessionValid) {
      ipBlockingService.recordViolation('invalid_session_form_submission', {
        form_type: currentFormType,
      });
      throw new Error('Session invalid. Please log in again.');
    }

    // Admin validation if required
    if (requireAdmin) {
      const isAdminValid = await validateAdminOperation();
      if (!isAdminValid) {
        ipBlockingService.recordViolation('unauthorized_admin_form_submission', {
          form_type: currentFormType,
        });
        throw new Error('Administrative privileges required.');
      }
    }

    // Prevent double submissions with enhanced debouncing
    const now = Date.now();
    if (now - lastSubmissionTime < 1000) {
      throw new Error('Please wait before submitting again.');
    }

    setIsSubmitting(true);
    setLastSubmissionTime(now);

    try {
      // Enhanced validation and sanitization
      const { sanitizedData, validationErrors } = validateAndSanitizeData(data);

      if (validationErrors.length > 0) {
        ipBlockingService.recordViolation('form_validation_failed', {
          form_type: currentFormType,
          validation_errors: validationErrors,
        });

        if (enableAuditLogging) {
          await enhancedAuditLogger.logEvent({
            event_type: 'form_validation_failed',
            user_id: user?.id || null,
            resource_type: 'form',
            severity: 'medium',
            details: {
              form_type: currentFormType,
              validation_errors: validationErrors,
            }
          });
        }
        throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
      }

      // Log successful validation
      if (enableAuditLogging) {
        await enhancedAuditLogger.logEvent({
          event_type: 'form_submission_started',
          user_id: user?.id || null,
          resource_type: 'form',
          severity: 'low',
          details: {
            form_type: currentFormType,
            field_count: Object.keys(sanitizedData).length,
          }
        });
      }

      // Execute the actual submission
      const result = await submitFunction(sanitizedData);

      // Log successful submission
      if (enableAuditLogging) {
        await enhancedAuditLogger.logDataModification(
          'form_submission',
          currentFormType,
          result?.id || 'unknown',
          sanitizedData,
          user?.id
        );

        await enhancedAuditLogger.logEvent({
          event_type: 'form_submission_completed',
          user_id: user?.id || null,
          resource_type: 'form',
          severity: 'low',
          details: {
            form_type: currentFormType,
            success: true,
          }
        });
      }

      return result;
    } catch (error) {
      // Enhanced error logging with potential security implications
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Check for potential security-related errors
      if (errorMessage.includes('permission') || errorMessage.includes('unauthorized') || errorMessage.includes('forbidden')) {
        ipBlockingService.recordViolation('permission_denied_form_submission', {
          form_type: currentFormType,
          error: errorMessage,
        });
      }

      if (enableAuditLogging) {
        await enhancedAuditLogger.logEvent({
          event_type: 'form_submission_failed',
          user_id: user?.id || null,
          resource_type: 'form',
          severity: 'medium',
          details: {
            form_type: currentFormType,
            error: errorMessage,
          }
        });
      }
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  }, [
    checkRateLimit, user, lastSubmissionTime, validateAndSanitizeData, 
    enableAuditLogging, requireAdmin, validateSession, validateAdminOperation,
    maxSubmissions, windowSize, formType
  ]);

  return {
    secureSubmit,
    isSubmitting,
    isBlocked,
    validateAndSanitizeData
  };
};
