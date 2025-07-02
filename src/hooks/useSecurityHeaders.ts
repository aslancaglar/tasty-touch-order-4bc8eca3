import { useEffect } from 'react';

/**
 * Hook to apply client-side security headers and meta tags
 */
export const useSecurityHeaders = () => {
  useEffect(() => {
    // Set CSP meta tag if not already present
    const existingCSP = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    if (!existingCSP) {
      const cspMeta = document.createElement('meta');
      cspMeta.httpEquiv = 'Content-Security-Policy';
      cspMeta.content = "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdn.gpteng.co; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https: blob:; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://*.supabase.co; frame-ancestors 'none';";
      document.head.appendChild(cspMeta);
    }

    // Set X-Content-Type-Options
    const noSniffMeta = document.createElement('meta');
    noSniffMeta.httpEquiv = 'X-Content-Type-Options';
    noSniffMeta.content = 'nosniff';
    document.head.appendChild(noSniffMeta);

    // Set Referrer Policy
    const referrerMeta = document.createElement('meta');
    referrerMeta.name = 'referrer';
    referrerMeta.content = 'strict-origin-when-cross-origin';
    document.head.appendChild(referrerMeta);

    // Prevent clickjacking with frame-ancestors in CSP
    // Remove iframes from external sources
    const iframes = document.querySelectorAll('iframe');
    iframes.forEach(iframe => {
      const src = iframe.src;
      if (src && !src.startsWith(window.location.origin) && !src.startsWith('https://cdn.gpteng.co')) {
        console.warn('Removing potentially unsafe iframe:', src);
        iframe.remove();
      }
    });

    return () => {
      // Cleanup on unmount
      const metas = document.querySelectorAll('meta[http-equiv="X-Content-Type-Options"], meta[name="referrer"]');
      metas.forEach(meta => meta.remove());
    };
  }, []);
};