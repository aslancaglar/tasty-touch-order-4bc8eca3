
/**
 * Utility functions for printing receipts
 */

/**
 * Prints the content of a specified element for a thermal printer
 * @param elementId The ID of the element to print
 */
export const printReceipt = (elementId: string) => {
  const printContent = document.getElementById(elementId);
  if (!printContent) return;

  // Create a new window for printing
  const printWindow = window.open('', '_blank', 'width=800,height=600');
  if (!printWindow) {
    alert("Please allow popups for this website to print receipts");
    return;
  }

  // Setup print-specific styles for 80mm thermal printer (typically 302px wide)
  printWindow.document.write(`
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
            font-weight: 500; /* Increased from default */
          }
          .receipt {
            width: 100%;
          }
          .header {
            text-align: center;
            margin-bottom: 10px;
            font-weight: 600; /* Increased from default */
          }
          .logo {
            font-size: 18px;
            font-weight: 700; /* Increased from default */
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
            font-weight: 500; /* Increased from default */
          }
          .item-details {
            padding-left: 10px;
            font-size: 11px;
            font-weight: 500; /* Increased from default */
          }
          .total-section {
            margin-top: 10px;
            font-weight: 500; /* Increased from default */
          }
          .total-line {
            display: flex;
            justify-content: space-between;
          }
          .grand-total {
            font-weight: 700; /* Increased from default */
            font-size: 14px;
          }
          .footer {
            text-align: center;
            margin-top: 20px;
            font-size: 11px;
            font-weight: 500; /* Increased from default */
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
  
  printWindow.document.close();
  
  // Wait for resources to load before printing
  printWindow.onload = function() {
    printWindow.focus();
    printWindow.print();
    // Close the window after printing (or after the print dialog is closed)
    printWindow.onafterprint = function() {
      printWindow.close();
    };
  };
};
