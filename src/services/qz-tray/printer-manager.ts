
import { QZPrinter } from '@/types/qz-tray-types';

export class QZPrinterManager {
  async getPrinters(): Promise<QZPrinter[]> {
    if (!window.qz) {
      throw new Error('QZ Tray not connected');
    }

    // Check if websocket is connected
    if (!window.qz.websocket.isActive()) {
      throw new Error('QZ Tray websocket not connected');
    }

    try {
      console.log('Fetching printers from QZ Tray...');
      const printers = await window.qz.printers.find();
      console.log('Raw printers response:', printers);
      
      return printers.map((printer: any) => ({
        name: printer.name || printer,
        driver: printer.driver
      }));
    } catch (error) {
      console.error('Error getting printers:', error);
      throw error;
    }
  }

  async printToDevice(printerName: string, content: string): Promise<void> {
    if (!window.qz) {
      throw new Error('QZ Tray not connected');
    }

    // Check if websocket is connected
    if (!window.qz.websocket.isActive()) {
      throw new Error('QZ Tray websocket not connected');
    }

    const config = window.qz.configs.create(printerName);
    const data = [{
      type: 'raw',
      format: 'plain',
      data: content
    }];

    try {
      await window.qz.print(config, data);
      console.log(`Print job sent to ${printerName}`);
    } catch (error) {
      console.error(`Error printing to ${printerName}:`, error);
      throw error;
    }
  }
}
