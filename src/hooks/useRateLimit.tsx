
import { useState, useCallback, useRef } from 'react';
import { SECURITY_CONFIG } from '@/config/security';
import { logSecurityEvent } from '@/utils/error-handler';

interface RateLimitState {
  requests: number;
  windowStart: number;
  blocked: boolean;
}

interface UseRateLimitOptions {
  maxRequests?: number;
  windowSize?: number;
  identifier?: string;
}

export const useRateLimit = (options: UseRateLimitOptions = {}) => {
  const {
    maxRequests = SECURITY_CONFIG.RATE_LIMIT.MAX_REQUESTS_PER_MINUTE,
    windowSize = SECURITY_CONFIG.RATE_LIMIT.WINDOW_SIZE,
    identifier = 'default'
  } = options;

  const stateRef = useRef<RateLimitState>({
    requests: 0,
    windowStart: Date.now(),
    blocked: false
  });

  const [isBlocked, setIsBlocked] = useState(false);

  const checkRateLimit = useCallback((): boolean => {
    const now = Date.now();
    const state = stateRef.current;

    // Reset window if expired
    if (now - state.windowStart >= windowSize) {
      state.requests = 0;
      state.windowStart = now;
      state.blocked = false;
      setIsBlocked(false);
    }

    // Check if rate limit exceeded
    if (state.requests >= maxRequests) {
      if (!state.blocked) {
        state.blocked = true;
        setIsBlocked(true);
        
        // Log security event
        logSecurityEvent('Rate limit exceeded', {
          identifier,
          requests: state.requests,
          maxRequests,
          windowSize,
          timestamp: new Date().toISOString()
        });
      }
      return false;
    }

    // Increment request count
    state.requests++;
    return true;
  }, [maxRequests, windowSize, identifier]);

  const resetRateLimit = useCallback(() => {
    stateRef.current = {
      requests: 0,
      windowStart: Date.now(),
      blocked: false
    };
    setIsBlocked(false);
  }, []);

  return {
    checkRateLimit,
    resetRateLimit,
    isBlocked,
    requestsRemaining: Math.max(0, maxRequests - stateRef.current.requests)
  };
};
