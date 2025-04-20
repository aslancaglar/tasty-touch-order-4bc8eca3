
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
  
  // Line feeds and positioning
  LINE_FEED: '\x0A',           // New line
  ALIGN_LEFT: '\x1B\x61\x00',  // Left align
  ALIGN_CENTER: '\x1B\x61\x01', // Center align
  ALIGN_RIGHT: '\x1B\x61\x02', // Right align
  
  // Paper cutting
  CUT_PAPER: '\x1D\x56\x41',   // Cut paper
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
  const printContent = document.getElementById(elementId);
  if (!printContent) return;

  // Create a hidden iframe for printing
  const iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  document.body.appendChild(iframe);
  
  // Setup print-specific styles for 80mm thermal printer (typically 302px wide)
  iframe.contentDocument?.write(`
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
            font-size: 12px;  // Updated from 8px to 14px
            line-height: 1.2;
            font-weight: 400;
          }
          .receipt {
            width: 100%;
          }
          .header {
            text-align: center;
            margin-bottom: 20px;
            font-weight: 600;
          }
          .logo {
            font-size: 16px;  // Slightly larger to maintain hierarchy
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
            margin-bottom: 5px;
            font-weight: 400;
          }
          .item-details {
            padding-left: 15px;
            font-size: 12px;  // Updated from 8px to 14px
            font-weight: 400;
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
            font-size: 12px;  // Updated from 8px to 14px
            font-weight: 500;
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
  
  iframe.contentDocument?.close();
  
  // Wait for resources to load before printing
  const iframeWindow = iframe.contentWindow;
  if (iframeWindow) {
    setTimeout(() => {
      iframeWindow.focus();
      iframeWindow.print();
      
      // Remove the iframe after printing is done or canceled
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
    }, 500);
  }
};
