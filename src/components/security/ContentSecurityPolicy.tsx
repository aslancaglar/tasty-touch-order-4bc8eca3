
import { useEffect } from 'react';
import { SECURITY_CONFIG } from '@/config/security';

const ContentSecurityPolicy = () => {
  useEffect(() => {
    // Create CSP directives based on our security config
    const cspDirectives = [
      `default-src ${SECURITY_CONFIG.CSP.DEFAULT_SRC.join(' ')}`,
      `script-src ${SECURITY_CONFIG.CSP.SCRIPT_SRC.join(' ')}`,
      `style-src ${SECURITY_CONFIG.CSP.STYLE_SRC.join(' ')}`,
      `img-src ${SECURITY_CONFIG.CSP.IMG_SRC.join(' ')}`,
      `font-src ${SECURITY_CONFIG.CSP.FONT_SRC.join(' ')}`,
      `connect-src ${SECURITY_CONFIG.CSP.CONNECT_SRC.join(' ')}`,
    ].join('; ');

    // Create and append meta tag for CSP
    const existingCSP = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    if (existingCSP) {
      existingCSP.remove();
    }

    const meta = document.createElement('meta');
    meta.httpEquiv = 'Content-Security-Policy';
    meta.content = cspDirectives;
    document.head.appendChild(meta);

    console.log('CSP headers applied:', cspDirectives);

    return () => {
      // Cleanup on unmount
      const cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
      if (cspMeta) {
        cspMeta.remove();
      }
    };
  }, []);

  return null; // This component doesn't render anything
};

export default ContentSecurityPolicy;
