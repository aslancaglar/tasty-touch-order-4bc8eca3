
import { SECURITY_CONFIG } from '@/config/security';

export class SecurityHeaders {
  private static instance: SecurityHeaders;

  public static getInstance(): SecurityHeaders {
    if (!SecurityHeaders.instance) {
      SecurityHeaders.instance = new SecurityHeaders();
    }
    return SecurityHeaders.instance;
  }

  // Apply security headers to fetch requests
  public getSecureHeaders(additionalHeaders: Record<string, string> = {}): HeadersInit {
    return {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
      ...additionalHeaders,
    };
  }

  // Generate Content Security Policy
  public generateCSP(): string {
    const directives = [
      `default-src ${SECURITY_CONFIG.CSP.DEFAULT_SRC.join(' ')}`,
      `script-src ${SECURITY_CONFIG.CSP.SCRIPT_SRC.join(' ')}`,
      `style-src ${SECURITY_CONFIG.CSP.STYLE_SRC.join(' ')}`,
      `img-src ${SECURITY_CONFIG.CSP.IMG_SRC.join(' ')}`,
      `font-src ${SECURITY_CONFIG.CSP.FONT_SRC.join(' ')}`,
      `connect-src ${SECURITY_CONFIG.CSP.CONNECT_SRC.join(' ')}`,
    ];

    return directives.join('; ');
  }

  // Apply CSP meta tag (call this once in app initialization)
  public applyCSP(): void {
    if (typeof document === 'undefined') return;

    const existingCSP = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    if (existingCSP) {
      existingCSP.remove();
    }

    const meta = document.createElement('meta');
    meta.httpEquiv = 'Content-Security-Policy';
    meta.content = this.generateCSP();
    document.head.appendChild(meta);
  }

  // Enhanced fetch wrapper with security headers
  public async secureFetch(
    url: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const secureOptions: RequestInit = {
      ...options,
      headers: {
        ...this.getSecureHeaders(),
        ...options.headers,
      },
      // Ensure credentials are included for authentication
      credentials: 'include',
    };

    // Add timeout to prevent hanging requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    try {
      const response = await fetch(url, {
        ...secureOptions,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  // Validate and sanitize URLs
  public isUrlSafe(url: string): boolean {
    try {
      const urlObj = new URL(url);
      
      // Only allow HTTPS in production
      if (process.env.NODE_ENV === 'production' && urlObj.protocol !== 'https:') {
        return false;
      }

      // Block suspicious patterns
      const suspiciousPatterns = [
        /javascript:/i,
        /data:/i,
        /vbscript:/i,
        /file:/i,
      ];

      return !suspiciousPatterns.some(pattern => pattern.test(url));
    } catch {
      return false;
    }
  }

  // Sanitize redirect URLs
  public sanitizeRedirectUrl(url: string, allowedDomains: string[] = []): string | null {
    if (!this.isUrlSafe(url)) {
      return null;
    }

    try {
      const urlObj = new URL(url);
      
      // If no allowed domains specified, only allow same origin
      if (allowedDomains.length === 0) {
        return urlObj.origin === window.location.origin ? url : null;
      }

      // Check if domain is in allowed list
      const isAllowed = allowedDomains.some(domain => {
        return urlObj.hostname === domain || urlObj.hostname.endsWith(`.${domain}`);
      });

      return isAllowed ? url : null;
    } catch {
      return null;
    }
  }
}

export const securityHeaders = SecurityHeaders.getInstance();

// Enhanced fetch function for the entire app
export const secureFetch = securityHeaders.secureFetch.bind(securityHeaders);
