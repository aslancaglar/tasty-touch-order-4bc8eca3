import { SECURITY_CONFIG } from '@/config/security';
import { logSecurityEvent } from '@/utils/error-handler';
import { enhancedAuditLogger } from '@/components/security/AuditLogger';

interface ViolationRecord {
  timestamp: number;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: Record<string, any>;
}

interface IPBlockData {
  violations: ViolationRecord[];
  blockedUntil: number;
  requestCounts: { [key: string]: { count: number; window: number } };
  permanentBan: boolean;
  firstViolation: number;
}

class EnhancedIPBlockingService {
  private ipData: Map<string, IPBlockData> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up old data every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldData();
    }, 5 * 60 * 1000);

    // Load data from localStorage on initialization
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem('ip_blocking_data');
      if (stored) {
        const data = JSON.parse(stored);
        this.ipData = new Map(Object.entries(data));
      }
    } catch (error) {
      console.warn('Failed to load IP blocking data from storage:', error);
    }
  }

  private saveToStorage() {
    try {
      const data = Object.fromEntries(this.ipData);
      localStorage.setItem('ip_blocking_data', JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save IP blocking data to storage:', error);
    }
  }

  private getClientIdentifier(): string {
    // In a real implementation, this would be the actual IP address from server
    // For client-side demo, we'll use a browser fingerprint
    return 'client_' + (
      navigator.userAgent + 
      navigator.language + 
      screen.width + 
      screen.height + 
      new Date().getTimezoneOffset()
    ).split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0).toString();
  }

  private getIPData(ip?: string): IPBlockData {
    const identifier = ip || this.getClientIdentifier();
    
    if (!this.ipData.has(identifier)) {
      this.ipData.set(identifier, {
        violations: [],
        blockedUntil: 0,
        requestCounts: {},
        permanentBan: false,
        firstViolation: 0,
      });
    }
    
    return this.ipData.get(identifier)!;
  }

  checkRateLimit(operation: string, maxRequests: number, windowMs: number, ip?: string): boolean {
    const identifier = ip || this.getClientIdentifier();
    const ipData = this.getIPData(identifier);
    const now = Date.now();

    // Check if permanently banned
    if (ipData.permanentBan) {
      this.logViolation('permanent_ban_access_attempt', { operation }, 'critical', identifier);
      return false;
    }

    // Check if currently blocked
    if (ipData.blockedUntil > now) {
      this.logViolation('blocked_ip_access_attempt', { 
        operation, 
        blocked_until: new Date(ipData.blockedUntil).toISOString() 
      }, 'high', identifier);
      return false;
    }

    // Check rate limit for this operation
    const requestKey = `${operation}_${Math.floor(now / windowMs)}`;
    
    if (!ipData.requestCounts[requestKey]) {
      ipData.requestCounts[requestKey] = { count: 0, window: now };
    }

    const requestData = ipData.requestCounts[requestKey];
    
    // Clean up old request counts
    Object.keys(ipData.requestCounts).forEach(key => {
      if (now - ipData.requestCounts[key].window > windowMs) {
        delete ipData.requestCounts[key];
      }
    });

    if (requestData.count >= maxRequests) {
      this.recordViolation('rate_limit_exceeded', {
        operation,
        request_count: requestData.count,
        max_requests: maxRequests,
        window_ms: windowMs,
      }, 'medium', identifier);
      return false;
    }

    requestData.count++;
    this.saveToStorage();
    return true;
  }

  recordViolation(type: string, details: Record<string, any>, severity: 'low' | 'medium' | 'high' | 'critical' = 'medium', ip?: string) {
    const identifier = ip || this.getClientIdentifier();
    const ipData = this.getIPData(identifier);
    const now = Date.now();

    const violation: ViolationRecord = {
      timestamp: now,
      type,
      severity,
      details,
    };

    ipData.violations.push(violation);
    
    if (ipData.firstViolation === 0) {
      ipData.firstViolation = now;
    }

    // Clean up old violations (keep only within violation window)
    const violationWindow = SECURITY_CONFIG.IP_BLOCKING.VIOLATION_WINDOW;
    ipData.violations = ipData.violations.filter(v => 
      now - v.timestamp < violationWindow
    );

    // Check for blocking conditions
    const recentViolations = ipData.violations.filter(v => 
      now - v.timestamp < violationWindow
    );

    const criticalViolations = recentViolations.filter(v => v.severity === 'critical').length;
    const highViolations = recentViolations.filter(v => v.severity === 'high').length;
    const totalViolations = recentViolations.length;

    // Immediate permanent ban for critical violations
    if (criticalViolations >= 1) {
      ipData.permanentBan = true;
      this.logViolation('permanent_ban_applied', { 
        reason: 'critical_violation',
        violation_count: criticalViolations,
        violation_details: details 
      }, 'critical', identifier);
    }
    // Permanent ban for repeated high-severity violations
    else if (highViolations >= 3) {
      ipData.permanentBan = true;
      this.logViolation('permanent_ban_applied', { 
        reason: 'repeated_high_violations',
        violation_count: highViolations 
      }, 'critical', identifier);
    }
    // Temporary block for moderate violations
    else if (totalViolations >= SECURITY_CONFIG.IP_BLOCKING.MAX_VIOLATIONS_PER_IP) {
      const blockDuration = this.calculateBlockDuration(recentViolations);
      ipData.blockedUntil = now + blockDuration;
      
      this.logViolation('temporary_block_applied', { 
        duration_ms: blockDuration,
        violation_count: totalViolations,
        block_until: new Date(ipData.blockedUntil).toISOString()
      }, 'high', identifier);
    }

    // Log the violation
    this.logViolation(type, details, severity, identifier);
    this.saveToStorage();
  }

  private calculateBlockDuration(violations: ViolationRecord[]): number {
    const baseBlockDuration = SECURITY_CONFIG.IP_BLOCKING.BLOCK_DURATION;
    const highSeverityCount = violations.filter(v => v.severity === 'high').length;
    const mediumSeverityCount = violations.filter(v => v.severity === 'medium').length;
    
    // Escalate block duration based on severity
    let multiplier = 1;
    multiplier += highSeverityCount * 2; // Double for each high-severity violation
    multiplier += mediumSeverityCount * 0.5; // Half for each medium-severity violation
    
    return Math.min(baseBlockDuration * multiplier, 7 * 24 * 60 * 60 * 1000); // Max 7 days
  }

  private async logViolation(type: string, details: Record<string, any>, severity: 'low' | 'medium' | 'high' | 'critical', identifier: string) {
    // Log to audit system
    await enhancedAuditLogger.logSecurityViolation(type, {
      ip_identifier: identifier,
      ...details,
    });

    // Log to security monitoring
    await logSecurityEvent(`IP Blocking: ${type}`, {
      ip_identifier: identifier,
      severity,
      ...details,
    });
  }

  isIPBlocked(ip?: string): boolean {
    const identifier = ip || this.getClientIdentifier();
    const ipData = this.getIPData(identifier);
    const now = Date.now();

    if (ipData.permanentBan) {
      return true;
    }

    return ipData.blockedUntil > now;
  }

  getBlockStatus(ip?: string): { blocked: boolean; until?: Date; permanent: boolean; reason?: string } {
    const identifier = ip || this.getClientIdentifier();
    const ipData = this.getIPData(identifier);
    const now = Date.now();

    if (ipData.permanentBan) {
      return { blocked: true, permanent: true, reason: 'Permanent ban due to security violations' };
    }

    if (ipData.blockedUntil > now) {
      return { 
        blocked: true, 
        until: new Date(ipData.blockedUntil), 
        permanent: false,
        reason: 'Temporary block due to security violations'
      };
    }

    return { blocked: false, permanent: false };
  }

  private cleanupOldData() {
    const now = Date.now();
    const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days

    for (const [identifier, data] of this.ipData.entries()) {
      // Don't cleanup permanently banned IPs
      if (data.permanentBan) continue;

      // Remove if no recent activity and not blocked
      const lastActivity = Math.max(
        data.firstViolation,
        data.violations.length > 0 ? Math.max(...data.violations.map(v => v.timestamp)) : 0,
        data.blockedUntil
      );

      if (now - lastActivity > maxAge) {
        this.ipData.delete(identifier);
      }
    }

    this.saveToStorage();
  }

  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.saveToStorage();
  }
}

// Create singleton instance
export const ipBlockingService = new EnhancedIPBlockingService();

// Clean up on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    ipBlockingService.destroy();
  });
}
