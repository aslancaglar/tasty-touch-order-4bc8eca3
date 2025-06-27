
import { SECURITY_CONFIG } from '@/config/security';
import { logSecurityEvent } from '@/utils/error-handler';

interface IPViolation {
  ip: string;
  violations: number;
  firstViolation: number;
  lastViolation: number;
  blockedUntil?: number;
  violationTypes: string[];
}

interface RateLimitInfo {
  ip: string;
  requests: number;
  windowStart: number;
  blocked: boolean;
}

class IPBlockingService {
  private static instance: IPBlockingService;
  private violations: Map<string, IPViolation> = new Map();
  private rateLimits: Map<string, RateLimitInfo> = new Map();
  private cleanupTimer: NodeJS.Timeout | null = null;

  static getInstance(): IPBlockingService {
    if (!IPBlockingService.instance) {
      IPBlockingService.instance = new IPBlockingService();
    }
    return IPBlockingService.instance;
  }

  private constructor() {
    this.startCleanupTimer();
    this.loadFromStorage();
  }

  private startCleanupTimer() {
    // Clean up expired blocks every hour
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpiredBlocks();
    }, 60 * 60 * 1000);
  }

  private getClientIP(): string {
    // In a real environment, this would come from server headers
    // For now, we'll use a placeholder
    return 'client-ip-placeholder';
  }

  private saveToStorage() {
    try {
      localStorage.setItem('ip-violations', JSON.stringify(Array.from(this.violations.entries())));
      localStorage.setItem('rate-limits', JSON.stringify(Array.from(this.rateLimits.entries())));
    } catch (error) {
      console.warn('Could not save IP blocking data to storage:', error);
    }
  }

  private loadFromStorage() {
    try {
      const violationsData = localStorage.getItem('ip-violations');
      const rateLimitsData = localStorage.getItem('rate-limits');

      if (violationsData) {
        this.violations = new Map(JSON.parse(violationsData));
      }

      if (rateLimitsData) {
        this.rateLimits = new Map(JSON.parse(rateLimitsData));
      }
    } catch (error) {
      console.warn('Could not load IP blocking data from storage:', error);
    }
  }

  private cleanupExpiredBlocks() {
    const now = Date.now();
    let cleaned = false;

    // Clean up expired violations
    for (const [ip, violation] of this.violations.entries()) {
      if (violation.blockedUntil && violation.blockedUntil < now) {
        this.violations.delete(ip);
        cleaned = true;
        logSecurityEvent('IP block expired', { ip, violation });
      }
    }

    // Clean up old rate limit windows
    for (const [ip, rateLimit] of this.rateLimits.entries()) {
      if (now - rateLimit.windowStart >= SECURITY_CONFIG.RATE_LIMIT.WINDOW_SIZE) {
        this.rateLimits.delete(ip);
        cleaned = true;
      }
    }

    if (cleaned) {
      this.saveToStorage();
    }
  }

  isIPBlocked(ip?: string): boolean {
    const clientIP = ip || this.getClientIP();
    const violation = this.violations.get(clientIP);
    
    if (!violation) return false;
    
    const now = Date.now();
    
    // Check if block has expired
    if (violation.blockedUntil && violation.blockedUntil < now) {
      this.violations.delete(clientIP);
      this.saveToStorage();
      return false;
    }
    
    return violation.violations >= SECURITY_CONFIG.IP_BLOCKING.MAX_VIOLATIONS_PER_IP;
  }

  recordViolation(violationType: string, details: Record<string, any> = {}, ip?: string) {
    const clientIP = ip || this.getClientIP();
    const now = Date.now();
    
    if (this.isIPBlocked(clientIP)) {
      logSecurityEvent('Blocked IP attempted access', { ip: clientIP, violationType, details });
      return;
    }
    
    const existing = this.violations.get(clientIP);
    
    if (existing) {
      // Check if violation is within the window
      if (now - existing.firstViolation <= SECURITY_CONFIG.IP_BLOCKING.VIOLATION_WINDOW) {
        existing.violations++;
        existing.lastViolation = now;
        existing.violationTypes.push(violationType);
        
        // Block if threshold exceeded
        if (existing.violations >= SECURITY_CONFIG.IP_BLOCKING.MAX_VIOLATIONS_PER_IP) {
          existing.blockedUntil = now + SECURITY_CONFIG.IP_BLOCKING.BLOCK_DURATION;
          logSecurityEvent('IP blocked due to repeated violations', {
            ip: clientIP,
            violations: existing.violations,
            violationTypes: existing.violationTypes,
            blockDuration: SECURITY_CONFIG.IP_BLOCKING.BLOCK_DURATION,
          });
        }
      } else {
        // Reset violation count for new window
        existing.violations = 1;
        existing.firstViolation = now;
        existing.lastViolation = now;
        existing.violationTypes = [violationType];
        delete existing.blockedUntil;
      }
    } else {
      // First violation
      this.violations.set(clientIP, {
        ip: clientIP,
        violations: 1,
        firstViolation: now,
        lastViolation: now,
        violationTypes: [violationType],
      });
    }
    
    this.saveToStorage();
    
    logSecurityEvent('Security violation recorded', {
      ip: clientIP,
      violationType,
      totalViolations: this.violations.get(clientIP)?.violations,
      details,
    });
  }

  checkRateLimit(identifier: string, maxRequests: number = SECURITY_CONFIG.RATE_LIMIT.MAX_REQUESTS_PER_MINUTE, windowSize: number = SECURITY_CONFIG.RATE_LIMIT.WINDOW_SIZE, ip?: string): boolean {
    const clientIP = ip || this.getClientIP();
    const key = `${clientIP}-${identifier}`;
    
    if (this.isIPBlocked(clientIP)) {
      return false;
    }
    
    const now = Date.now();
    const existing = this.rateLimits.get(key);
    
    if (existing) {
      // Reset window if expired
      if (now - existing.windowStart >= windowSize) {
        existing.requests = 1;
        existing.windowStart = now;
        existing.blocked = false;
      } else if (existing.requests >= maxRequests) {
        if (!existing.blocked) {
          existing.blocked = true;
          this.recordViolation('rate_limit_exceeded', {
            identifier,
            requests: existing.requests,
            maxRequests,
            windowSize,
          }, clientIP);
        }
        return false;
      } else {
        existing.requests++;
      }
    } else {
      this.rateLimits.set(key, {
        ip: clientIP,
        requests: 1,
        windowStart: now,
        blocked: false,
      });
    }
    
    this.saveToStorage();
    return true;
  }

  getViolationInfo(ip?: string): IPViolation | null {
    const clientIP = ip || this.getClientIP();
    return this.violations.get(clientIP) || null;
  }

  // Manual block/unblock methods for admin use
  blockIP(ip: string, duration: number = SECURITY_CONFIG.IP_BLOCKING.BLOCK_DURATION, reason: string = 'Manual block') {
    const now = Date.now();
    this.violations.set(ip, {
      ip,
      violations: SECURITY_CONFIG.IP_BLOCKING.MAX_VIOLATIONS_PER_IP,
      firstViolation: now,
      lastViolation: now,
      blockedUntil: now + duration,
      violationTypes: [reason],
    });
    
    this.saveToStorage();
    
    logSecurityEvent('IP manually blocked', { ip, duration, reason });
  }

  unblockIP(ip: string, reason: string = 'Manual unblock') {
    this.violations.delete(ip);
    this.rateLimits.delete(ip);
    this.saveToStorage();
    
    logSecurityEvent('IP manually unblocked', { ip, reason });
  }

  destroy() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }
}

export const ipBlockingService = IPBlockingService.getInstance();
