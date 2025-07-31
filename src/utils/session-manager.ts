import { supabase } from '@/integrations/supabase/client';
import { logSecurityEvent } from '@/utils/error-handler';

// Session management and cleanup utilities
export class SessionManager {
  private static readonly MAX_STORAGE_SIZE = 5 * 1024 * 1024; // 5MB
  private static readonly CLEANUP_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
  private static readonly SESSION_PREFIX = 'supabase.auth.token';

  /**
   * Clean up old sessions and expired data from localStorage
   */
  static cleanupSessions(): void {
    try {
      const storageUsage = this.calculateStorageUsage();
      
      if (storageUsage > this.MAX_STORAGE_SIZE * 0.8) { // 80% threshold
        console.warn('localStorage approaching quota limit, cleaning up...');
        this.performCleanup();
        
        logSecurityEvent('session_cleanup_performed', {
          storageUsage,
          maxSize: this.MAX_STORAGE_SIZE,
          threshold: '80%'
        });
      }

      // Clean expired sessions
      this.cleanupExpiredSessions();
      
      // Set next cleanup
      this.scheduleNextCleanup();
    } catch (error) {
      console.error('Session cleanup failed:', error);
      logSecurityEvent('session_cleanup_failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Calculate current localStorage usage
   */
  private static calculateStorageUsage(): number {
    let totalSize = 0;
    
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        totalSize += localStorage[key].length + key.length;
      }
    }
    
    return totalSize;
  }

  /**
   * Perform aggressive cleanup of localStorage
   */
  private static performCleanup(): void {
    const keysToRemove: string[] = [];
    
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        // Remove non-essential data first
        if (key.startsWith('cache_') || 
            key.startsWith('temp_') ||
            key.includes('analytics') ||
            key.includes('metrics')) {
          keysToRemove.push(key);
        }
      }
    }
    
    keysToRemove.forEach(key => {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.error(`Failed to remove ${key}:`, error);
      }
    });
  }

  /**
   * Clean up expired authentication sessions
   */
  private static cleanupExpiredSessions(): void {
    try {
      const keys = Object.keys(localStorage);
      const authKeys = keys.filter(key => key.includes(this.SESSION_PREFIX));
      
      authKeys.forEach(key => {
        try {
          const data = localStorage.getItem(key);
          if (data) {
            const sessionData = JSON.parse(data);
            if (sessionData.expires_at && new Date(sessionData.expires_at * 1000) < new Date()) {
              localStorage.removeItem(key);
              console.log('Removed expired session:', key);
            }
          }
        } catch (error) {
          // Invalid session data, remove it
          localStorage.removeItem(key);
          console.log('Removed invalid session data:', key);
        }
      });
    } catch (error) {
      console.error('Failed to cleanup expired sessions:', error);
    }
  }

  /**
   * Schedule next cleanup
   */
  private static scheduleNextCleanup(): void {
    setTimeout(() => {
      this.cleanupSessions();
    }, this.CLEANUP_INTERVAL);
  }

  /**
   * Force logout and cleanup on quota exceeded
   */
  static async handleQuotaExceeded(): Promise<void> {
    try {
      // Log security event
      logSecurityEvent('storage_quota_exceeded', {
        action: 'force_logout_initiated',
        storageUsage: this.calculateStorageUsage()
      });

      // Sign out user
      await supabase.auth.signOut();
      
      // Perform emergency cleanup
      this.performCleanup();
      
      // Clear all auth-related data
      const authKeys = Object.keys(localStorage).filter(key => 
        key.includes('supabase') || key.includes('auth')
      );
      
      authKeys.forEach(key => {
        try {
          localStorage.removeItem(key);
        } catch (error) {
          console.error(`Emergency cleanup failed for ${key}:`, error);
        }
      });

      // Redirect to login
      window.location.href = '/auth';
      
    } catch (error) {
      console.error('Emergency session cleanup failed:', error);
      // Force page reload as last resort
      window.location.reload();
    }
  }

  /**
   * Initialize session management
   */
  static initialize(): void {
    // Start cleanup routine
    this.scheduleNextCleanup();
    
    // Monitor localStorage quota
    this.monitorStorageQuota();
    
    console.log('Session manager initialized');
  }

  /**
   * Monitor localStorage quota and handle exceeded quota
   */
  private static monitorStorageQuota(): void {
    // Override localStorage.setItem to catch quota exceeded errors
    const originalSetItem = localStorage.setItem;
    
    localStorage.setItem = function(key: string, value: string) {
      try {
        originalSetItem.call(localStorage, key, value);
      } catch (error) {
        if (error instanceof DOMException && error.name === 'QuotaExceededError') {
          console.error('localStorage quota exceeded');
          SessionManager.handleQuotaExceeded();
          throw error;
        }
        throw error;
      }
    };
  }
}

// Auto-initialize on import
if (typeof window !== 'undefined') {
  SessionManager.initialize();
}