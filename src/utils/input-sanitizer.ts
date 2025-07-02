import DOMPurify from 'dompurify';
import { SECURITY_CONFIG, logSecurityEvent } from '@/config/security';

// XSS Prevention utilities
export const sanitizeInput = (input: string, type: 'text' | 'name' | 'description' = 'text'): string => {
  if (typeof input !== 'string') {
    logSecurityEvent('Invalid input type', { type: typeof input });
    return '';
  }

  const maxLength = {
    text: SECURITY_CONFIG.INPUT.MAX_TEXT_LENGTH,
    name: SECURITY_CONFIG.INPUT.MAX_NAME_LENGTH,
    description: SECURITY_CONFIG.INPUT.MAX_DESCRIPTION_LENGTH,
  }[type];

  // Basic sanitization
  let sanitized = input
    .trim()
    .substring(0, maxLength);

  // Use DOMPurify for HTML content sanitization
  sanitized = DOMPurify.sanitize(sanitized, {
    ALLOWED_TAGS: [], // No HTML tags allowed
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
    USE_PROFILES: { html: false }
  });

  return sanitized;
};

// Sanitize HTML content (for rich text areas)
export const sanitizeHtml = (html: string): string => {
  if (typeof html !== 'string') {
    logSecurityEvent('Invalid HTML input type', { type: typeof html });
    return '';
  }

  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'ol', 'ul', 'li'],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
    FORBID_TAGS: ['script', 'object', 'embed', 'style', 'link', 'meta', 'form', 'input'],
    FORBID_ATTR: ['style', 'onclick', 'onload', 'onerror', 'onmouseover']
  });
};

// Escape string for safe interpolation in HTML
export const escapeHtml = (unsafe: string): string => {
  if (typeof unsafe !== 'string') {
    return '';
  }

  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

// Validate and sanitize URLs
export const sanitizeUrl = (url: string): string => {
  if (typeof url !== 'string') {
    logSecurityEvent('Invalid URL input type', { type: typeof url });
    return '';
  }

  // Remove dangerous protocols
  if (url.match(/^(javascript|data|vbscript|file):/i)) {
    logSecurityEvent('Dangerous URL protocol detected', { url });
    return '';
  }

  // Only allow http/https/relative URLs
  if (url.match(/^(https?:\/\/|\/)/)) {
    return url;
  }

  // Default to making it a relative URL if it doesn't match patterns
  return url.startsWith('/') ? url : `/${url}`;
};

// Sanitize filename for uploads
export const sanitizeFileName = (fileName: string): string => {
  if (typeof fileName !== 'string') {
    logSecurityEvent('Invalid filename input type', { type: typeof fileName });
    return 'upload';
  }

  return fileName
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .substring(0, SECURITY_CONFIG.UPLOAD.MAX_FILENAME_LENGTH);
};

// Validate chart configuration to prevent XSS in chart data
export const validateChartConfig = (config: any): any => {
  if (!config || typeof config !== 'object') {
    logSecurityEvent('Invalid chart config', { config });
    return {};
  }

  const sanitizedConfig: any = {};

  Object.keys(config).forEach(key => {
    if (typeof config[key] === 'object' && config[key] !== null) {
      sanitizedConfig[key] = {};
      
      if ('label' in config[key]) {
        // Sanitize labels to prevent XSS
        sanitizedConfig[key].label = sanitizeInput(String(config[key].label), 'name');
      }
      
      if ('color' in config[key]) {
        // Validate color values
        const color = String(config[key].color);
        if (color.match(/^#[0-9A-Fa-f]{6}$/) || color.match(/^hsl\(\d+,\s*\d+%,\s*\d+%\)$/)) {
          sanitizedConfig[key].color = color;
        }
      }
      
      if ('theme' in config[key]) {
        sanitizedConfig[key].theme = config[key].theme;
      }
    }
  });

  return sanitizedConfig;
};

// Validate and sanitize chart data
export const validateChartData = (data: any[]): any[] => {
  if (!Array.isArray(data)) {
    logSecurityEvent('Invalid chart data format', { data });
    return [];
  }

  return data.map(item => {
    if (typeof item !== 'object' || item === null) {
      return {};
    }

    const sanitizedItem: any = {};

    Object.keys(item).forEach(key => {
      const value = item[key];
      
      if (typeof value === 'string') {
        // Sanitize string values
        sanitizedItem[key] = sanitizeInput(value, 'text');
      } else if (typeof value === 'number') {
        // Validate numbers
        if (!isNaN(value) && isFinite(value)) {
          sanitizedItem[key] = value;
        }
      } else if (typeof value === 'boolean') {
        sanitizedItem[key] = value;
      }
    });

    return sanitizedItem;
  });
};