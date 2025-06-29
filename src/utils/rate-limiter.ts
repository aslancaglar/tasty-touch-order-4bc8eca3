
import { logSecurityEvent } from '@/utils/error-handler';

interface RateLimitEntry {
  count: number;
  firstAttempt: number;
  lastAttempt: number;
  blocked?: boolean;
  blockUntil?: number;
}

class RateLimiter {
  private attempts: Map<string, RateLimitEntry> = new Map();
  private readonly cleanupInterval: ReturnType<typeof setInterval>;

  constructor() {
    // Clean up old entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  private cleanup(): void {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;

    for (const [key, entry] of this.attempts.entries()) {
      if (now - entry.lastAttempt > oneHour) {
        this.attempts.delete(key);
      }
    }
  }

  checkRateLimit(
    identifier: string,
    maxAttempts: number = 5,
    windowMs: number = 15 * 60 * 1000, // 15 minutes
    blockDurationMs: number = 15 * 60 * 1000 // 15 minutes
  ): { allowed: boolean; retryAfter?: number } {
    const now = Date.now();
    const entry = this.attempts.get(identifier);

    // Check if currently blocked
    if (entry?.blocked && entry.blockUntil && now < entry.blockUntil) {
      const retryAfter = Math.ceil((entry.blockUntil - now) / 1000);
      return { allowed: false, retryAfter };
    }

    // Initialize or reset window if needed
    if (!entry || now - entry.firstAttempt > windowMs) {
      this.attempts.set(identifier, {
        count: 1,
        firstAttempt: now,
        lastAttempt: now
      });
      return { allowed: true };
    }

    // Increment attempt count
    entry.count++;
    entry.lastAttempt = now;

    // Check if limit exceeded
    if (entry.count > maxAttempts) {
      entry.blocked = true;
      entry.blockUntil = now + blockDurationMs;
      
      logSecurityEvent('Rate limit exceeded', {
        identifier: identifier.substring(0, 10) + '...',
        attempts: entry.count,
        windowMs,
        blockDurationMs
      });

      const retryAfter = Math.ceil(blockDurationMs / 1000);
      return { allowed: false, retryAfter };
    }

    return { allowed: true };
  }

  reset(identifier: string): void {
    this.attempts.delete(identifier);
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.attempts.clear();
  }
}

export const rateLimiter = new RateLimiter();

// Login-specific rate limiter
export const checkLoginRateLimit = (email: string) => {
  return rateLimiter.checkRateLimit(
    `login:${email}`,
    5, // 5 attempts
    15 * 60 * 1000, // 15 minute window
    15 * 60 * 1000 // 15 minute block
  );
};

// General API rate limiter
export const checkApiRateLimit = (identifier: string) => {
  return rateLimiter.checkRateLimit(
    `api:${identifier}`,
    100, // 100 requests
    60 * 1000, // 1 minute window
    5 * 60 * 1000 // 5 minute block
  );
};
