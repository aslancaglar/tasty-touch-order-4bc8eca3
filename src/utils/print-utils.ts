
import React from 'react';

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
            font-size: 14px;  // Updated from 8px to 14px
            line-height: 1.2;
            font-weight: 500;
          }
          .receipt {
            width: 100%;
          }
          .header {
            text-align: center;
            margin-bottom: 10px;
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
            font-weight: 600;
          }
          .item-details {
            padding-left: 15px;
            font-size: 14px;  // Updated from 8px to 14px
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
            font-size: 14px;  // Updated from 8px to 14px
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
