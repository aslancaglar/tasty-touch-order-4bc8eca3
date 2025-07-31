import { logSecurityEvent } from '@/utils/error-handler';
import { EnhancedValidator } from '@/utils/enhanced-validation';

export class APISecurityManager {
  private static csrfToken: string | null = null;
  private static readonly ALLOWED_ORIGINS = [
    window.location.origin,
    'https://localhost:3000',
    'https://127.0.0.1:3000'
  ];

  /**
   * Initialize API security measures
   */
  static initialize(): void {
    this.generateCSRFToken();
    this.setupRequestInterceptors();
    console.log('API Security Manager initialized');
  }

  /**
   * Generate and store CSRF token
   */
  static generateCSRFToken(): string {
    this.csrfToken = EnhancedValidator.generateCSRFToken();
    
    // Store in sessionStorage (not localStorage for security)
    sessionStorage.setItem('csrf_token', this.csrfToken);
    
    return this.csrfToken;
  }

  /**
   * Get current CSRF token
   */
  static getCSRFToken(): string | null {
    if (!this.csrfToken) {
      this.csrfToken = sessionStorage.getItem('csrf_token');
    }
    return this.csrfToken;
  }

  /**
   * Validate request origin
   */
  static validateOrigin(origin?: string): boolean {
    if (!origin) {
      return false;
    }

    const isAllowed = this.ALLOWED_ORIGINS.includes(origin);
    
    if (!isAllowed) {
      logSecurityEvent('Invalid request origin', {
        origin,
        allowedOrigins: this.ALLOWED_ORIGINS
      });
    }

    return isAllowed;
  }

  /**
   * Validate CSRF token
   */
  static validateCSRFToken(providedToken: string): boolean {
    const storedToken = this.getCSRFToken();
    
    if (!storedToken || !providedToken) {
      logSecurityEvent('Missing CSRF token', {
        hasStoredToken: !!storedToken,
        hasProvidedToken: !!providedToken
      });
      return false;
    }

    const isValid = EnhancedValidator.validateCSRFToken(providedToken, storedToken);
    
    if (!isValid) {
      logSecurityEvent('CSRF token validation failed', {
        providedTokenLength: providedToken.length,
        storedTokenLength: storedToken.length
      });
    }

    return isValid;
  }

  /**
   * Encrypt sensitive data before storing
   */
  static async encryptSensitiveData(data: string, key?: string): Promise<string> {
    try {
      // Use Web Crypto API for encryption
      const encoder = new TextEncoder();
      const decoder = new TextDecoder();
      
      // Generate key if not provided
      const cryptoKey = key 
        ? await this.importKey(key)
        : await crypto.subtle.generateKey(
            { name: 'AES-GCM', length: 256 },
            true,
            ['encrypt', 'decrypt']
          );

      // Generate random IV
      const iv = crypto.getRandomValues(new Uint8Array(12));
      
      // Encrypt data
      const encryptedData = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        cryptoKey,
        encoder.encode(data)
      );

      // Combine IV and encrypted data
      const combined = new Uint8Array(iv.length + encryptedData.byteLength);
      combined.set(iv);
      combined.set(new Uint8Array(encryptedData), iv.length);

      // Convert to base64
      return btoa(String.fromCharCode(...combined));
      
    } catch (error) {
      logSecurityEvent('Encryption failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new Error('Encryption failed');
    }
  }

  /**
   * Decrypt sensitive data
   */
  static async decryptSensitiveData(encryptedData: string, key: string): Promise<string> {
    try {
      const decoder = new TextDecoder();
      
      // Convert from base64
      const combined = new Uint8Array(
        atob(encryptedData).split('').map(char => char.charCodeAt(0))
      );

      // Extract IV and encrypted data
      const iv = combined.slice(0, 12);
      const data = combined.slice(12);

      // Import key
      const cryptoKey = await this.importKey(key);

      // Decrypt data
      const decryptedData = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        cryptoKey,
        data
      );

      return decoder.decode(decryptedData);
      
    } catch (error) {
      logSecurityEvent('Decryption failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new Error('Decryption failed');
    }
  }

  /**
   * Import encryption key
   */
  private static async importKey(keyString: string): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(keyString.padEnd(32, '0').slice(0, 32));
    
    return await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'AES-GCM' },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Setup request interceptors for security headers
   */
  private static setupRequestInterceptors(): void {
    // Intercept fetch requests to add security headers
    const originalFetch = window.fetch;
    
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      
      // Only apply to Supabase requests
      if (url.includes('supabase.co') || url.includes('localhost')) {
        const headers = new Headers(init?.headers);
        
        // Add CSRF token for state-changing operations
        if (init?.method && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(init.method.toUpperCase())) {
          const csrfToken = this.getCSRFToken();
          if (csrfToken) {
            headers.set('X-CSRF-Token', csrfToken);
          }
        }

        // Add origin validation
        headers.set('X-Requested-With', 'XMLHttpRequest');
        
        // Update init with new headers
        const newInit = {
          ...init,
          headers
        };

        return originalFetch(input, newInit);
      }

      return originalFetch(input, init);
    };
  }

  /**
   * Sanitize API response data
   */
  static sanitizeResponse(data: any): any {
    if (typeof data === 'string') {
      const validation = EnhancedValidator.validateInput(data, 'text', 'api_response');
      return validation.sanitized;
    }

    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeResponse(item));
    }

    if (data && typeof data === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(data)) {
        sanitized[key] = this.sanitizeResponse(value);
      }
      return sanitized;
    }

    return data;
  }

  /**
   * Validate API request parameters
   */
  static validateRequestParams(params: Record<string, any>): {
    isValid: boolean;
    sanitized: Record<string, any>;
    errors: string[];
  } {
    const errors: string[] = [];
    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(params)) {
      if (typeof value === 'string') {
        const validation = EnhancedValidator.validateInput(value, 'text', `param_${key}`);
        
        if (!validation.isValid) {
          errors.push(`Invalid parameter: ${key}`);
          errors.push(...validation.threats);
        }
        
        sanitized[key] = validation.sanitized;
      } else {
        sanitized[key] = value;
      }
    }

    return {
      isValid: errors.length === 0,
      sanitized,
      errors
    };
  }

  /**
   * Generate secure headers for API requests
   */
  static getSecureHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    };

    // Add CSRF token if available
    const csrfToken = this.getCSRFToken();
    if (csrfToken) {
      headers['X-CSRF-Token'] = csrfToken;
    }

    return headers;
  }
}

// Auto-initialize on import
if (typeof window !== 'undefined') {
  APISecurityManager.initialize();
}