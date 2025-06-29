
import { useEffect } from 'react';
import { SECURITY_CONFIG } from '@/config/security';

export const useSecurityHeaders = () => {
  useEffect(() => {
    // Set Content Security Policy via meta tag
    const cspContent = [
      `default-src ${SECURITY_CONFIG.CSP.DEFAULT_SRC.join(' ')}`,
      `script-src ${SECURITY_CONFIG.CSP.SCRIPT_SRC.join(' ')}`,
      `style-src ${SECURITY_CONFIG.CSP.STYLE_SRC.join(' ')}`,
      `img-src ${SECURITY_CONFIG.CSP.IMG_SRC.join(' ')}`,
      `font-src ${SECURITY_CONFIG.CSP.FONT_SRC.join(' ')}`,
      `connect-src ${SECURITY_CONFIG.CSP.CONNECT_SRC.join(' ')}`
    ].join('; ');

    // Check if CSP meta tag already exists
    let cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]') as HTMLMetaElement;
    
    if (!cspMeta) {
      cspMeta = document.createElement('meta');
      cspMeta.httpEquiv = 'Content-Security-Policy';
      document.head.appendChild(cspMeta);
    }
    
    cspMeta.content = cspContent;

    // Set other security headers via meta tags where possible
    const securityMetas = [
      { name: 'referrer', content: 'strict-origin-when-cross-origin' },
      { httpEquiv: 'X-Content-Type-Options', content: 'nosniff' },
      { httpEquiv: 'X-Frame-Options', content: 'DENY' }
    ];

    securityMetas.forEach(({ name, httpEquiv, content }) => {
      const selector = name ? `meta[name="${name}"]` : `meta[http-equiv="${httpEquiv}"]`;
      let meta = document.querySelector(selector) as HTMLMetaElement;
      
      if (!meta) {
        meta = document.createElement('meta');
        if (name) meta.name = name;
        if (httpEquiv) meta.httpEquiv = httpEquiv;
        document.head.appendChild(meta);
      }
      
      meta.content = content;
    });

    return () => {
      // Cleanup is not needed for meta tags as they should persist
    };
  }, []);
};
