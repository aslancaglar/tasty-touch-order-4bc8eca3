import React from 'react';
import { initializeQZTray, printReceiptWithQZ, isQZTrayAvailable } from './qz-tray-utils';

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
 * Enhanced print receipt function with QZ Tray support
 * @param elementId The ID of the element to print
 * @param preferredMethod Preferred printing method: 'qz-tray', 'browser', or 'auto'
 * @param qzPrinterName Optional specific QZ Tray printer name
 */
export const printReceipt = async (
  elementId: string, 
  preferredMethod: 'qz-tray' | 'browser' | 'auto' = 'auto',
  qzPrinterName?: string
) => {
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
    preferredMethod,
    qzPrinterName,
    isMobileDevice: /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile|tablet/i.test(navigator.userAgent.toLowerCase())
  });
  
  const printContent = document.getElementById(elementId);
  if (!printContent) {
    console.error(`Element with ID '${elementId}' not found`);
    throw new Error(`Print element '${elementId}' not found`);
  }

  // Determine which printing method to use
  const shouldUseQZTray = (preferredMethod === 'qz-tray') || 
                          (preferredMethod === 'auto' && isQZTrayAvailable());

  if (shouldUseQZTray) {
    try {
      console.log("Attempting QZ Tray printing...");
      
      // Convert HTML content to plain text for thermal printer
      const plainTextContent = convertHTMLToPlainText(printContent);
      
      // Use specified printer or try to find a default thermal printer
      const printerName = qzPrinterName || await getDefaultQZPrinter();
      
      if (!printerName) {
        throw new Error("No QZ Tray printer available");
      }
      
      const success = await printReceiptWithQZ(printerName, plainTextContent);
      
      if (success) {
        console.log("QZ Tray printing successful");
        return;
      } else {
        throw new Error("QZ Tray printing failed");
      }
    } catch (error) {
      console.error("QZ Tray printing failed, falling back to browser printing:", error);
      
      // Fall back to browser printing if QZ Tray fails and auto mode is enabled
      if (preferredMethod === 'auto') {
        await browserPrint(elementId);
        return;
      } else {
        throw error;
      }
    }
  }

  // Use browser printing
  await browserPrint(elementId);
};

/**
 * Get default QZ Tray printer (first available thermal printer)
 */
const getDefaultQZPrinter = async (): Promise<string | null> => {
  try {
    const { getQZPrinters } = await import('./qz-tray-utils');
    const printers = await getQZPrinters();
    
    // Return first available printer
    return printers.length > 0 ? printers[0].name : null;
  } catch (error) {
    console.error("Error getting default QZ printer:", error);
    return null;
  }
};

/**
 * Convert HTML content to plain text suitable for thermal printing
 */
const convertHTMLToPlainText = (element: HTMLElement): string => {
  // Create a clone to avoid modifying the original
  const clone = element.cloneNode(true) as HTMLElement;
  
  // Extract text content while preserving some structure
  let text = '';
  
  // Process specific receipt sections
  const header = clone.querySelector('.header');
  if (header) {
    text += centerText(header.textContent || '', ESCPOS.FONT_BOLD) + addLineFeed(2);
  }
  
  const items = clone.querySelectorAll('.item');
  items.forEach(item => {
    const itemText = item.textContent || '';
    text += itemText + addLineFeed();
  });
  
  const totalSection = clone.querySelector('.total-section');
  if (totalSection) {
    text += createDivider() + addLineFeed();
    text += totalSection.textContent || '';
    text += addLineFeed(2);
  }
  
  const footer = clone.querySelector('.footer');
  if (footer) {
    text += centerText(footer.textContent || '', ESCPOS.FONT_NORMAL) + addLineFeed();
  }
  
  return text;
};

/**
 * Browser-based printing (existing implementation)
 */
const browserPrint = async (elementId: string): Promise<void> => {
  const printContent = document.getElementById(elementId);
  if (!printContent) {
    throw new Error(`Print element '${elementId}' not found`);
  }

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
          console.error("Error opening print dialog");
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
    console.error("Print error");
    throw error; // Re-throw for handling at call site
  }
};
