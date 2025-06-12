
import React from 'react';

/**
 * ESC/POS command constants for text formatting
 */
export const ESCPOS = {
  // Text formatting
  FONT_NORMAL: '\x1B\x21\x00', // Normal text
  FONT_BOLD: '\x1B\x21\x08',   // Bold text
  FONT_LARGE: '\x1D\x21\x11',  // Double height and width
  FONT_LARGE_BOLD: '\x1B\x21\x30', // Large and bold
  FONT_SMALL: '\x1B\x21\x01',  // Small text
  FONT_0_5X_BIGGER: '\x1D\x21\x01', // 0.5x bigger text (Width multiplier=1)

  // Line feeds and positioning
  LINE_FEED: '\x0A',           // New line
  ALIGN_LEFT: '\x1B\x61\x00',  // Left align
  ALIGN_CENTER: '\x1B\x61\x01', // Center align
  ALIGN_RIGHT: '\x1B\x61\x02', // Right align

  // Paper cutting - changed to full cut with feed
  CUT_PAPER: '\x1D\x56\x00',   // Full cut without feed
};

// Text formatting functions
export const formatText = (text: string, command: string): string => {
  return command + text + ESCPOS.FONT_NORMAL;
};

export const centerText = (text: string, command: string = ESCPOS.FONT_NORMAL): string => {
  return ESCPOS.ALIGN_CENTER + command + text + ESCPOS.FONT_NORMAL + ESCPOS.ALIGN_LEFT;
};

export const rightAlignText = (text: string, command: string = ESCPOS.FONT_NORMAL): string => {
  return ESCPOS.ALIGN_RIGHT + command + text + ESCPOS.FONT_NORMAL + ESCPOS.ALIGN_LEFT;
};

export const formatLine = (label: string, value: string, command: string = ESCPOS.FONT_NORMAL): string => {
  return command + label + ESCPOS.ALIGN_RIGHT + value + ESCPOS.FONT_NORMAL + ESCPOS.ALIGN_LEFT;
};

// Updated divider length from 32 to 48
export const createDivider = (length: number = 48): string => {
  return ESCPOS.ALIGN_CENTER + '-'.repeat(length) + ESCPOS.ALIGN_LEFT;
};

export const addLineFeed = (count: number = 1): string => {
  return ESCPOS.LINE_FEED.repeat(count);
};

// Track the last print time to prevent double-printing
let lastPrintTime = 0;
const PRINT_DEBOUNCE_MS = 1000; // 1 second debounce

/**
 * Enhanced print receipt function with comprehensive error handling
 * @param elementId The ID of the element to print
 */
export const printReceipt = (elementId: string) => {
  // Prevent double-printing by implementing debounce
  const now = Date.now();
  if (now - lastPrintTime < PRINT_DEBOUNCE_MS) {
    console.log("[PrintUtils] Print request ignored - too soon after previous print");
    return;
  }
  lastPrintTime = now;
  
  // Check if we're offline
  if (!navigator.onLine) {
    console.error("[PrintUtils] Cannot print - device is offline");
    throw new Error("Cannot print while offline");
  }
  
  console.log(`[PrintUtils] Starting print process for element: ${elementId}`, {
    isMobileDevice: /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile|tablet/i.test(navigator.userAgent.toLowerCase()),
    userAgent: navigator.userAgent,
    timestamp: new Date().toISOString()
  });
  
  const printContent = document.getElementById(elementId);
  if (!printContent) {
    console.error(`[PrintUtils] Element with ID '${elementId}' not found`);
    throw new Error(`Print element '${elementId}' not found`);
  }

  // Create a hidden iframe for printing
  try {
    console.log("[PrintUtils] Creating iframe for printing...");
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.style.position = 'absolute';
    iframe.style.left = '-9999px';
    iframe.style.top = '-9999px';
    document.body.appendChild(iframe);
    
    console.log("[PrintUtils] Iframe created successfully");
    
    // Setup print-specific styles for 80mm thermal printer (typically 302px wide)
    const iframeDoc = iframe.contentDocument;
    if (!iframeDoc) {
      throw new Error("Could not access iframe document");
    }
    
    console.log("[PrintUtils] Writing content to iframe...");
    
    iframeDoc.write(`
      <html>
        <head>
          <title>Order Receipt</title>
          <style>
            @page {
              size: 80mm auto;
              margin: 0mm;
            }
            body {
              font-family: 'Courier New', monospace;
              width: 72mm;
              margin: 0 auto;
              padding: 5mm 0;
              font-size: 12px;
              line-height: 1.2;
              font-weight: 600;
            }
            .receipt {
              width: 100%;
              display: block !important;
            }
            .header {
              text-align: center;
              margin-bottom: 20px;
              font-weight: 600;
            }
            .logo {
              font-size: 20px;
              font-weight: 700;
              margin-bottom: 5px;
            }
            .divider {
              border-top: 1px dashed #000;
              margin: 10px 0;
            }
            .item {
              display: flex;
              justify-content: space-between;
              margin-bottom: 4px;
              font-weight: 600;
            }
            .item-details {
              padding-left: 15px;
              font-size: 12px;
              font-weight: 600;
            }
            .total-section {
              margin-top: 10px;
              font-weight: 600;
            }
            .total-line {
              display: flex;
              justify-content: space-between;
              font-weight: 600;
            }
            .grand-total {
              font-weight: 700;
              font-size: 16px;
            }
            .footer {
              text-align: center;
              margin-top: 20px;
              font-size: 12px;
              font-weight: 600;
            }
            /* Order number style */
            .order-number-container {
              background-color: #000000;
              padding: 4px 8px;
              margin: 8px 0;
            }
            .order-number {
              font-size: 24px;
              font-weight: 900;
              color: white;
            }
            @media print {
              html, body {
                width: 72mm;
                background-color: white;
                color: black;
              }
              @page {
                margin: 0;
                size: 80mm auto;
              }
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    
    iframeDoc.close();
    console.log("[PrintUtils] Content written to iframe successfully");
    
    // Wait for resources to load before printing
    const iframeWindow = iframe.contentWindow;
    if (iframeWindow) {
      console.log("[PrintUtils] Preparing to open print dialog...");
      
      // Enhanced print timing with multiple fallbacks
      setTimeout(() => {
        try {
          console.log("[PrintUtils] Opening print dialog...");
          iframeWindow.focus();
          
          // Try to detect if print was cancelled
          const printPromise = new Promise<void>((resolve, reject) => {
            // Set up event listeners for print completion
            const beforePrint = () => {
              console.log("[PrintUtils] Print dialog opened");
            };
            const afterPrint = () => {
              console.log("[PrintUtils] Print dialog closed");
              cleanup();
              resolve();
            };
            const cleanup = () => {
              iframeWindow.removeEventListener('beforeprint', beforePrint);
              iframeWindow.removeEventListener('afterprint', afterPrint);
            };
            
            iframeWindow.addEventListener('beforeprint', beforePrint);
            iframeWindow.addEventListener('afterprint', afterPrint);
            
            // Fallback timeout
            setTimeout(() => {
              console.log("[PrintUtils] Print timeout reached");
              cleanup();
              resolve();
            }, 30000);
          });
          
          // Trigger print
          iframeWindow.print();
          
          // Wait for print completion
          printPromise.finally(() => {
            console.log("[PrintUtils] Cleaning up print iframe...");
            setTimeout(() => {
              try {
                if (iframe.parentNode) {
                  document.body.removeChild(iframe);
                  console.log("[PrintUtils] Print iframe removed from DOM");
                }
              } catch (cleanupError) {
                console.warn("[PrintUtils] Error during iframe cleanup:", cleanupError);
              }
            }, 1000);
          });
          
        } catch (printError) {
          console.error("[PrintUtils] Error during print process:", printError);
          throw new Error("Failed to open print dialog");
        }
      }, 500);
      
    } else {
      console.error("[PrintUtils] Failed to access iframe window");
      throw new Error("Failed to access iframe window for printing");
    }
    
  } catch (error) {
    console.error("[PrintUtils] Critical error in print process:", error);
    
    // Clean up iframe if it exists
    try {
      const existingIframes = document.querySelectorAll('iframe[style*="display: none"]');
      existingIframes.forEach(iframe => {
        if (iframe.parentNode) {
          iframe.parentNode.removeChild(iframe);
        }
      });
    } catch (cleanupError) {
      console.warn("[PrintUtils] Error during error cleanup:", cleanupError);
    }
    
    throw error; // Re-throw for handling at call site
  }
};

/**
 * Enhanced print health check function
 */
export const printHealthCheck = (): { status: string; details: any } => {
  const details = {
    online: navigator.onLine,
    userAgent: navigator.userAgent,
    isMobile: /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile|tablet/i.test(navigator.userAgent.toLowerCase()),
    printSupported: typeof window.print === 'function',
    timestamp: new Date().toISOString()
  };
  
  console.log("[PrintUtils] Print health check:", details);
  
  let status = 'healthy';
  if (!details.online) status = 'offline';
  if (!details.printSupported) status = 'unsupported';
  if (details.isMobile) status = 'mobile-limited';
  
  return { status, details };
};
