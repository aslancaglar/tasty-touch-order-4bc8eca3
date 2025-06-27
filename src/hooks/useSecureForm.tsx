
import { useState, useCallback } from 'react';
import { useRateLimit } from './useRateLimit';
import { validateInput, sanitizeInput } from '@/config/security';
import { auditLogger } from '@/components/security/AuditLogger';
import { useAuth } from '@/contexts/AuthContext';

interface UseSecureFormOptions {
  maxSubmissions?: number;
  windowSize?: number;
  enableAuditLogging?: boolean;
}

export const useSecureForm = (options: UseSecureFormOptions = {}) => {
  const {
    maxSubmissions = 5,
    windowSize = 60000, // 1 minute
    enableAuditLogging = true
  } = options;

  const { user } = useAuth();
  const { checkRateLimit, isBlocked } = useRateLimit({
    maxRequests: maxSubmissions,
    windowSize,
    identifier: 'form-submission'
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSubmissionTime, setLastSubmissionTime] = useState<number>(0);

  const validateAndSanitizeData = useCallback((data: Record<string, any>) => {
    const sanitizedData: Record<string, any> = {};
    const validationErrors: string[] = [];

    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string') {
        // Validate input
        if (!validateInput(value)) {
          validationErrors.push(`Invalid input detected in field: ${key}`);
          continue;
        }

        // Sanitize input
        sanitizedData[key] = sanitizeInput(value);
      } else {
        sanitizedData[key] = value;
      }
    }

    return { sanitizedData, validationErrors };
  }, []);

  const secureSubmit = useCallback(async (
    data: Record<string, any>,
    submitFunction: (sanitizedData: Record<string, any>) => Promise<any>,
    formType?: string
  ) => {
    // Check rate limiting
    if (!checkRateLimit()) {
      if (enableAuditLogging) {
        auditLogger.logEvent({
          event_type: 'form_submission_blocked',
          user_id: user?.id || null,
          resource_type: 'form',
          details: {
            form_type: formType,
            reason: 'rate_limit_exceeded',
            timestamp: new Date().toISOString()
          }
        });
      }
      throw new Error('Too many submissions. Please wait before trying again.');
    }

    // Prevent double submissions
    const now = Date.now();
    if (now - lastSubmissionTime < 1000) { // 1 second debounce
      throw new Error('Please wait before submitting again.');
    }

    setIsSubmitting(true);
    setLastSubmissionTime(now);

    try {
      // Validate and sanitize data
      const { sanitizedData, validationErrors } = validateAndSanitizeData(data);

      if (validationErrors.length > 0) {
        if (enableAuditLogging) {
          auditLogger.logEvent({
            event_type: 'form_validation_failed',
            user_id: user?.id || null,
            resource_type: 'form',
            details: {
              form_type: formType,
              validation_errors: validationErrors,
              timestamp: new Date().toISOString()
            }
          });
        }
        throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
      }

      // Log successful validation
      if (enableAuditLogging) {
        auditLogger.logEvent({
          event_type: 'form_submission_started',
          user_id: user?.id || null,
          resource_type: 'form',
          details: {
            form_type: formType,
            field_count: Object.keys(sanitizedData).length,
            timestamp: new Date().toISOString()
          }
        });
      }

      // Execute the actual submission
      const result = await submitFunction(sanitizedData);

      // Log successful submission
      if (enableAuditLogging) {
        auditLogger.logEvent({
          event_type: 'form_submission_completed',
          user_id: user?.id || null,
          resource_type: 'form',
          details: {
            form_type: formType,
            success: true,
            timestamp: new Date().toISOString()
          }
        });
      }

      return result;
    } catch (error) {
      // Log failed submission
      if (enableAuditLogging) {
        auditLogger.logEvent({
          event_type: 'form_submission_failed',
          user_id: user?.id || null,
          resource_type: 'form',
          details: {
            form_type: formType,
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
          }
        });
      }
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  }, [checkRateLimit, user, lastSubmissionTime, validateAndSanitizeData, enableAuditLogging]);

  return {
    secureSubmit,
    isSubmitting,
    isBlocked,
    validateAndSanitizeData
  };
};
