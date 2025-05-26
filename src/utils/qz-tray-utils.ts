
/**
 * QZ Tray integration utilities for direct printer communication
 * Provides thermal printer support with ESC/POS commands
 */

declare global {
  interface Window {
    qz: any;
  }
}

interface QZPrinter {
  name: string;
  connection: string;
  type: string;
}

interface QZConfig {
  printer: {
    name: string;
    connection?: string;
  };
  options: {
    encoding?: string;
    language?: string;
  };
}

/**
 * Initialize QZ Tray connection
 */
export const initializeQZTray = async (): Promise<boolean> => {
  try {
    if (!window.qz) {
      console.error("QZ Tray not loaded");
      return false;
    }

    if (!window.qz.websocket.isActive()) {
      await window.qz.websocket.connect();
      console.log("QZ Tray connected successfully");
    }
    
    return true;
  } catch (error) {
    console.error("Failed to connect to QZ Tray:", error);
    return false;
  }
};

/**
 * Get available printers from QZ Tray
 */
export const getQZPrinters = async (): Promise<QZPrinter[]> => {
  try {
    const isConnected = await initializeQZTray();
    if (!isConnected) {
      return [];
    }

    const printers = await window.qz.printers.find();
    console.log("Available QZ printers:", printers);
    
    return printers.map((printer: string) => ({
      name: printer,
      connection: "usb",
      type: "thermal"
    }));
  } catch (error) {
    console.error("Error fetching QZ printers:", error);
    return [];
  }
};

/**
 * Print receipt using QZ Tray with ESC/POS commands
 */
export const printReceiptWithQZ = async (
  printerName: string,
  receiptContent: string
): Promise<boolean> => {
  try {
    const isConnected = await initializeQZTray();
    if (!isConnected) {
      throw new Error("QZ Tray not connected");
    }

    // ESC/POS commands for thermal printer
    const ESCPOS = {
      INIT: '\x1B\x40',           // Initialize printer
      FONT_NORMAL: '\x1B\x21\x00', // Normal text
      FONT_BOLD: '\x1B\x21\x08',   // Bold text
      FONT_LARGE: '\x1D\x21\x11',  // Double height and width
      ALIGN_LEFT: '\x1B\x61\x00',  // Left align
      ALIGN_CENTER: '\x1B\x61\x01', // Center align
      ALIGN_RIGHT: '\x1B\x61\x02', // Right align
      LINE_FEED: '\x0A',           // New line
      CUT_PAPER: '\x1D\x56\x00',   // Cut paper
    };

    // Format the receipt with ESC/POS commands
    const formattedReceipt = 
      ESCPOS.INIT +
      ESCPOS.ALIGN_CENTER +
      ESCPOS.FONT_LARGE +
      "ORDER RECEIPT\n" +
      ESCPOS.FONT_NORMAL +
      ESCPOS.ALIGN_LEFT +
      receiptContent +
      ESCPOS.LINE_FEED +
      ESCPOS.LINE_FEED +
      ESCPOS.CUT_PAPER;

    const config: QZConfig = {
      printer: {
        name: printerName
      },
      options: {
        encoding: "UTF-8"
      }
    };

    const data = [{
      type: 'raw',
      format: 'plain',
      data: formattedReceipt
    }];

    await window.qz.print(config, data);
    console.log(`Receipt printed successfully to ${printerName}`);
    
    return true;
  } catch (error) {
    console.error("Error printing with QZ Tray:", error);
    return false;
  }
};

/**
 * Test printer connection and print a test receipt
 */
export const testQZPrinter = async (printerName: string): Promise<boolean> => {
  const testReceipt = `
================================
        TEST RECEIPT
================================
${new Date().toLocaleString()}

This is a test receipt from your
restaurant's kiosk system using
QZ Tray integration.

If you can read this, QZ Tray
printing is working correctly!

================================
      QZ TRAY TEST PASSED
================================

`;

  return await printReceiptWithQZ(printerName, testReceipt);
};

/**
 * Check if QZ Tray is available and running
 */
export const isQZTrayAvailable = (): boolean => {
  return typeof window !== 'undefined' && 
         typeof window.qz !== 'undefined' && 
         window.qz.websocket !== undefined;
};

/**
 * Disconnect from QZ Tray
 */
export const disconnectQZTray = async (): Promise<void> => {
  try {
    if (window.qz && window.qz.websocket.isActive()) {
      await window.qz.websocket.disconnect();
      console.log("QZ Tray disconnected");
    }
  } catch (error) {
    console.error("Error disconnecting QZ Tray:", error);
  }
};
