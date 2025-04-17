
/**
 * Utility functions for printing receipts
 */

/**
 * Prints the content of a specified element for a thermal printer
 * @param elementId The ID of the element to print
 */
export const printReceipt = (elementId: string) => {
  const printContent = document.getElementById(elementId);
  if (!printContent) {
    console.error(`Element with ID '${elementId}' not found for printing`);
    return;
  }

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
            font-weight: 600; /* Changed to semi-bold (600) */
          }
          .item-details {
            padding-left: 10px;
            font-size: 11px;
            font-weight: 600; /* Changed to semi-bold (600) */
          }
          .total-section {
            margin-top: 10px;
            font-weight: 600; /* Changed to semi-bold (600) */
          }
          .total-line {
            display: flex;
            justify-content: space-between;
            font-weight: 600; /* Changed to semi-bold (600) */
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
  } else {
    console.error("Could not access iframe window for printing");
  }
};

/**
 * Send print job to PrintNode printer
 * @param printerId The PrintNode printer ID
 * @param apiKey The PrintNode API key
 * @param content The content to print (formatted for thermal printer)
 * @param title Print job title
 */
export const sendToPrintNode = async (
  printerId: string, 
  apiKey: string, 
  content: any, 
  title: string = "Receipt"
) => {
  try {
    const response = await fetch('https://api.printnode.com/printjobs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${btoa(apiKey + ':')}`
      },
      body: JSON.stringify({
        printer: printerId,
        title: title,
        contentType: "raw_base64",
        content: btoa(JSON.stringify(content)),
        source: "Restaurant Kiosk"
      })
    });
    
    if (!response.ok) {
      throw new Error(`Error sending print job: ${response.status}`);
    }
    
    const responseData = await response.text();
    console.log(`PrintNode job sent successfully, ID: ${responseData}`);
    return responseData;
  } catch (error) {
    console.error("Error sending to PrintNode:", error);
    throw error;
  }
};
