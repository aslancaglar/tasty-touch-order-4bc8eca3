
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

/**
 * Format text with ESC/POS commands
 * @param text The text to format
 * @param command The ESC/POS command to apply
 * @returns Formatted text with ESC/POS commands
 */
export const formatText = (text: string, command: string): string => {
  return command + text + ESCPOS.FONT_NORMAL;
};

/**
 * Center text with ESC/POS commands
 * @param text The text to center
 * @param command Optional formatting command to apply (default: normal font)
 * @returns Centered text with ESC/POS commands
 */
export const centerText = (text: string, command: string = ESCPOS.FONT_NORMAL): string => {
  return ESCPOS.ALIGN_CENTER + command + text + ESCPOS.FONT_NORMAL + ESCPOS.ALIGN_LEFT;
};

/**
 * Right-align text (typically used for prices)
 * @param text The text to right-align
 * @param command Optional formatting command to apply
 * @returns Right-aligned text with ESC/POS commands
 */
export const rightAlignText = (text: string, command: string = ESCPOS.FONT_NORMAL): string => {
  return ESCPOS.ALIGN_RIGHT + command + text + ESCPOS.FONT_NORMAL + ESCPOS.ALIGN_LEFT;
};

/**
 * Format a line with label on left and value on right
 * @param label The left-aligned label
 * @param value The right-aligned value
 * @param command Optional formatting command to apply
 * @returns Formatted line with ESC/POS commands
 */
export const formatLine = (label: string, value: string, command: string = ESCPOS.FONT_NORMAL): string => {
  return command + label + ESCPOS.ALIGN_RIGHT + value + ESCPOS.FONT_NORMAL + ESCPOS.ALIGN_LEFT;
};

/**
 * Create a divider line using dashes
 * @param length The length of the divider
 * @returns A divider line with ESC/POS commands
 */
export const createDivider = (length: number = 32): string => {
  return ESCPOS.ALIGN_CENTER + '-'.repeat(length) + ESCPOS.ALIGN_LEFT;
};

/**
 * Add a line feed
 * @param count Number of line feeds
 * @returns Line feed command repeated count times
 */
export const addLineFeed = (count: number = 1): string => {
  return ESCPOS.LINE_FEED.repeat(count);
};

/**
 * Prints the content of a specified element for a thermal printer
 * @param elementId The ID of the element to print
 */
export const printReceipt = (elementId: string) => {
  console.log(`Attempting to print element with ID: ${elementId}`, {
    userAgent: navigator.userAgent,
    screen: { width: window.innerWidth, height: window.innerHeight },
    isMobileDevice: /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile|tablet/i.test(navigator.userAgent.toLowerCase())
  });
  
  const printContent = document.getElementById(elementId);
  if (!printContent) {
    console.error(`Element with ID '${elementId}' not found`);
    return;
  }

  // Create a hidden iframe for printing to avoid conflicts with the main window
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = 'none';
  document.body.appendChild(iframe);
  
  console.log("Created iframe for printing");
  
  // Wait for iframe to be loaded before writing content
  iframe.onload = () => {
    try {
      // Write content to iframe with print-specific styles
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc) {
        console.error("Could not access iframe document");
        return;
      }
      
      iframeDoc.open();
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
                width: 72mm; /* Accounting for printer margins */
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
      
      console.log("Content written to iframe, preparing to print...");
      
      // Wait a moment for the content to render before printing
      setTimeout(() => {
        try {
          // Focus the iframe before printing
          if (iframe.contentWindow) {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
            console.log("Print dialog opened successfully");
            
            // Remove iframe after a delay to ensure print dialog has time to open
            setTimeout(() => {
              document.body.removeChild(iframe);
              console.log("Print iframe removed");
            }, 2000);
          } else {
            console.error("Cannot access iframe contentWindow");
          }
        } catch (printErr) {
          console.error("Error during print operation:", printErr);
        }
      }, 1000);
    } catch (err) {
      console.error("Error setting up print iframe:", err);
      document.body.removeChild(iframe);
    }
  };
  
  // Trigger iframe load event
  iframe.src = 'about:blank';
};

