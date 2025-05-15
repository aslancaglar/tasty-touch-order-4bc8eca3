
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
  
  // Character code table for proper accented characters
  CHAR_TABLE_LATIN: '\x1B\x74\x02', // Code page 850 for Latin characters support

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
 * Prints the content of a specified element for a thermal printer
 * Enhanced with improved error handling and offline detection
 * @param elementId The ID of the element to print
 */
export const printReceipt = (elementId: string) => {
  // Prevent double-printing by implementing debounce
  const now = Date.now();
  if (now - lastPrintTime < PRINT_DEBOUNCE_MS) {
    console.log("Print request ignored - too soon after previous print");
    return;
  }
  lastPrintTime = now;
  
  // Check if we're offline
  if (!navigator.onLine) {
    console.error("Cannot print - device is offline");
    throw new Error("Cannot print while offline");
  }
  
  console.log(`Attempting to print element with ID: ${elementId}`, {
    userAgent: navigator.userAgent,
    screen: { width: window.innerWidth, height: window.innerHeight },
    isMobileDevice: /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile|tablet/i.test(navigator.userAgent.toLowerCase())
  });
  
  const printContent = document.getElementById(elementId);
  if (!printContent) {
    console.error(`Element with ID '${elementId}' not found`);
    throw new Error(`Print element '${elementId}' not found`);
  }

  // Create a hidden iframe for printing
  try {
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    
    console.log("Created iframe for printing");
    
    // Setup print-specific styles for 80mm thermal printer (typically 302px wide)
    const iframeDoc = iframe.contentDocument;
    if (!iframeDoc) {
      throw new Error("Could not access iframe document");
    }
    
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
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    
    iframeDoc.close();
    
    // Wait for resources to load before printing
    const iframeWindow = iframe.contentWindow;
    if (iframeWindow) {
      console.log("Preparing to print...");
      setTimeout(() => {
        try {
          console.log("Opening print dialog...");
          iframeWindow.focus();
          iframeWindow.print();
          console.log("Print dialog opened");
        } catch (error) {
          console.error("Error opening print dialog:", error);
          throw new Error("Failed to open print dialog");
        }
        
        // Remove the iframe after printing is done or canceled
        setTimeout(() => {
          document.body.removeChild(iframe);
          console.log("Print iframe removed from DOM");
        }, 1000);
      }, 500);
    } else {
      console.error("Failed to access iframe window");
      throw new Error("Failed to access iframe window");
    }
  } catch (error) {
    console.error("Print error:", error);
    throw error; // Re-throw for handling at call site
  }
};
