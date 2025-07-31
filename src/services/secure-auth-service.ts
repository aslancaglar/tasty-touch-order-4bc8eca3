import { supabase } from '@/integrations/supabase/client';
import { rateLimiter, logSecurityEvent } from '@/utils/error-handler';
import { EnhancedValidator } from '@/utils/enhanced-validation';

export interface AuthAttempt {
  email: string;
  timestamp: number;
  successful: boolean;
  ipAddress?: string;
  userAgent?: string;
}

export class SecureAuthService {
  private static readonly MAX_LOGIN_ATTEMPTS = 5;
  private static readonly LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes
  private static readonly ATTEMPT_WINDOW = 60 * 1000; // 1 minute
  private static attempts: Map<string, AuthAttempt[]> = new Map();

  /**
   * Secure login with enhanced validation and rate limiting
   */
  static async secureLogin(email: string, password: string): Promise<{
    success: boolean;
    error?: string;
    user?: any;
    rateLimited?: boolean;
  }> {
    try {
      // Validate inputs
      const emailValidation = EnhancedValidator.validateInput(email, 'email', 'login_email');
      const passwordValidation = EnhancedValidator.validateInput(password, 'text', 'login_password');

      if (!emailValidation.isValid) {
        logSecurityEvent('Invalid email format in login attempt', {
          email: email.substring(0, 50),
          threats: emailValidation.threats
        });
        return { success: false, error: 'Invalid email format' };
      }

      if (!passwordValidation.isValid) {
        logSecurityEvent('Invalid password format in login attempt', {
          threats: passwordValidation.threats
        });
        return { success: false, error: 'Invalid input detected' };
      }

      // Check rate limiting
      const rateLimitKey = `login_${email}`;
      if (!rateLimiter.isAllowed(rateLimitKey, this.MAX_LOGIN_ATTEMPTS, this.ATTEMPT_WINDOW)) {
        logSecurityEvent('Login rate limit exceeded', {
          email: emailValidation.sanitized,
          maxAttempts: this.MAX_LOGIN_ATTEMPTS,
          windowMs: this.ATTEMPT_WINDOW
        });
        return { success: false, error: 'Too many login attempts. Please try again later.', rateLimited: true };
      }

      // Check account lockout
      if (this.isAccountLocked(emailValidation.sanitized)) {
        logSecurityEvent('Login attempt on locked account', {
          email: emailValidation.sanitized
        });
        return { success: false, error: 'Account is temporarily locked due to too many failed attempts.' };
      }

      // Attempt login
      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailValidation.sanitized,
        password: passwordValidation.sanitized
      });

      const attempt: AuthAttempt = {
        email: emailValidation.sanitized,
        timestamp: Date.now(),
        successful: !error,
        ipAddress: await this.getClientIP(),
        userAgent: navigator.userAgent
      };

      this.recordAttempt(emailValidation.sanitized, attempt);

      if (error) {
        logSecurityEvent('Failed login attempt', {
          email: emailValidation.sanitized,
          error: error.message,
          ipAddress: attempt.ipAddress,
          userAgent: attempt.userAgent
        });
        return { success: false, error: error.message };
      }

      // Successful login
      logSecurityEvent('Successful login', {
        userId: data.user?.id,
        email: emailValidation.sanitized,
        ipAddress: attempt.ipAddress,
        userAgent: attempt.userAgent
      });

      // Clear failed attempts on successful login
      this.clearFailedAttempts(emailValidation.sanitized);

      return { success: true, user: data.user };

    } catch (error) {
      logSecurityEvent('Login service error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        email: email.substring(0, 50)
      });
      return { success: false, error: 'Authentication service temporarily unavailable' };
    }
  }

  /**
   * Secure signup with enhanced validation
   */
  static async secureSignup(email: string, password: string): Promise<{
    success: boolean;
    error?: string;
    user?: any;
  }> {
    try {
      // Validate inputs
      const emailValidation = EnhancedValidator.validateInput(email, 'email', 'signup_email');
      const passwordValidation = EnhancedValidator.validateInput(password, 'text', 'signup_password');

      if (!emailValidation.isValid) {
        logSecurityEvent('Invalid email format in signup attempt', {
          email: email.substring(0, 50),
          threats: emailValidation.threats
        });
        return { success: false, error: 'Invalid email format' };
      }

      if (!passwordValidation.isValid) {
        logSecurityEvent('Invalid password format in signup attempt', {
          threats: passwordValidation.threats
        });
        return { success: false, error: 'Invalid input detected' };
      }

      // Additional password strength validation
      const passwordStrength = this.validatePasswordStrength(passwordValidation.sanitized);
      if (!passwordStrength.isValid) {
        return { success: false, error: passwordStrength.error };
      }

      // Check rate limiting for signups
      const signupRateLimitKey = `signup_${await this.getClientIP()}`;
      if (!rateLimiter.isAllowed(signupRateLimitKey, 3, 60 * 1000)) { // 3 signups per minute per IP
        logSecurityEvent('Signup rate limit exceeded', {
          email: emailValidation.sanitized,
          ipAddress: await this.getClientIP()
        });
        return { success: false, error: 'Too many signup attempts. Please try again later.' };
      }

      const redirectUrl = `${window.location.origin}/`;
      
      const { data, error } = await supabase.auth.signUp({
        email: emailValidation.sanitized,
        password: passwordValidation.sanitized,
        options: {
          emailRedirectTo: redirectUrl
        }
      });

      if (error) {
        logSecurityEvent('Failed signup attempt', {
          email: emailValidation.sanitized,
          error: error.message,
          ipAddress: await this.getClientIP()
        });
        return { success: false, error: error.message };
      }

      logSecurityEvent('Successful signup', {
        userId: data.user?.id,
        email: emailValidation.sanitized,
        ipAddress: await this.getClientIP()
      });

      return { success: true, user: data.user };

    } catch (error) {
      logSecurityEvent('Signup service error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        email: email.substring(0, 50)
      });
      return { success: false, error: 'Registration service temporarily unavailable' };
    }
  }

  /**
   * Secure logout with cleanup
   */
  static async secureLogout(): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        logSecurityEvent('Failed logout attempt', {
          error: error.message
        });
        return { success: false, error: error.message };
      }

      // Clear sensitive data from localStorage
      this.clearSensitiveData();

      logSecurityEvent('Successful logout', {});
      return { success: true };

    } catch (error) {
      logSecurityEvent('Logout service error', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return { success: false, error: 'Logout failed' };
    }
  }

  /**
   * Record login attempt
   */
  private static recordAttempt(email: string, attempt: AuthAttempt): void {
    const attempts = this.attempts.get(email) || [];
    attempts.push(attempt);
    
    // Keep only recent attempts (last 24 hours)
    const recent = attempts.filter(a => Date.now() - a.timestamp < 24 * 60 * 60 * 1000);
    this.attempts.set(email, recent);
  }

  /**
   * Check if account is locked
   */
  private static isAccountLocked(email: string): boolean {
    const attempts = this.attempts.get(email) || [];
    const recentFailures = attempts.filter(a => 
      !a.successful && 
      Date.now() - a.timestamp < this.LOCKOUT_DURATION
    );
    
    return recentFailures.length >= this.MAX_LOGIN_ATTEMPTS;
  }

  /**
   * Clear failed attempts on successful login
   */
  private static clearFailedAttempts(email: string): void {
    const attempts = this.attempts.get(email) || [];
    const successfulAttempts = attempts.filter(a => a.successful);
    this.attempts.set(email, successfulAttempts);
  }

  /**
   * Validate password strength
   */
  private static validatePasswordStrength(password: string): { isValid: boolean; error?: string } {
    if (password.length < 8) {
      return { isValid: false, error: 'Password must be at least 8 characters long' };
    }

    if (!/[A-Z]/.test(password)) {
      return { isValid: false, error: 'Password must contain at least one uppercase letter' };
    }

    if (!/[a-z]/.test(password)) {
      return { isValid: false, error: 'Password must contain at least one lowercase letter' };
    }

    if (!/[0-9]/.test(password)) {
      return { isValid: false, error: 'Password must contain at least one number' };
    }

    if (!/[^A-Za-z0-9]/.test(password)) {
      return { isValid: false, error: 'Password must contain at least one special character' };
    }

    // Check for common weak passwords
    const commonPasswords = ['password', '123456', 'qwerty', 'admin', 'letmein'];
    if (commonPasswords.some(weak => password.toLowerCase().includes(weak))) {
      return { isValid: false, error: 'Password contains common weak patterns' };
    }

    return { isValid: true };
  }

  /**
   * Get client IP address (best effort)
   */
  private static async getClientIP(): Promise<string> {
    try {
      // This is a simplified approach - in production you'd want server-side IP detection
      return 'client_ip_placeholder';
    } catch {
      return 'unknown';
    }
  }

  /**
   * Clear sensitive data from localStorage
   */
  private static clearSensitiveData(): void {
    const sensitiveKeys = Object.keys(localStorage).filter(key =>
      key.includes('password') ||
      key.includes('token') ||
      key.includes('session') ||
      key.includes('auth')
    );

    sensitiveKeys.forEach(key => {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.warn(`Failed to clear ${key}:`, error);
      }
    });
  }

  /**
   * Get account security status
   */
  static getAccountSecurityStatus(email: string): {
    isLocked: boolean;
    failedAttempts: number;
    lockoutTimeRemaining?: number;
  } {
    const attempts = this.attempts.get(email) || [];
    const recentFailures = attempts.filter(a => 
      !a.successful && 
      Date.now() - a.timestamp < this.LOCKOUT_DURATION
    );

    const isLocked = recentFailures.length >= this.MAX_LOGIN_ATTEMPTS;
    const lockoutTimeRemaining = isLocked && recentFailures.length > 0
      ? this.LOCKOUT_DURATION - (Date.now() - recentFailures[0].timestamp)
      : undefined;

    return {
      isLocked,
      failedAttempts: recentFailures.length,
      lockoutTimeRemaining
    };
  }
}
