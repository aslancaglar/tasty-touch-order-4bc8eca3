import { SECURITY_CONFIG } from '@/config/security';

// Content Security Policy utilities
export const generateCSPHeader = (): string => {
  const directives = {
    'default-src': SECURITY_CONFIG.CSP.DEFAULT_SRC.join(' '),
    'script-src': SECURITY_CONFIG.CSP.SCRIPT_SRC.join(' '),
    'style-src': SECURITY_CONFIG.CSP.STYLE_SRC.join(' '),
    'img-src': SECURITY_CONFIG.CSP.IMG_SRC.join(' '),
    'font-src': SECURITY_CONFIG.CSP.FONT_SRC.join(' '),
    'connect-src': SECURITY_CONFIG.CSP.CONNECT_SRC.join(' ')
  };

  return Object.entries(directives)
    .map(([key, value]) => `${key} ${value}`)
    .join('; ');
};

// Set CSP meta tag programmatically for single-page applications
export const setCSPMetaTag = (): void => {
  const existingMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
  if (existingMeta) {
    existingMeta.remove();
  }

  const meta = document.createElement('meta');
  meta.setAttribute('http-equiv', 'Content-Security-Policy');
  meta.setAttribute('content', generateCSPHeader());
  document.head.appendChild(meta);
};

// Enhanced security headers that should be set server-side
export const getSecurityHeaders = () => ({
  'Content-Security-Policy': generateCSPHeader(),
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
});