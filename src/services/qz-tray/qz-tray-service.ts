
import { OrderData } from '@/types/qz-tray-types';
import { QZConnectionManager } from './connection-manager';
import { QZPrinterManager } from './printer-manager';
import { QZReceiptGenerator } from './receipt-generator';

class QZTrayService {
  private static instance: QZTrayService;
  private connectionManager: QZConnectionManager;
  private printerManager: QZPrinterManager;
  private receiptGenerator: QZReceiptGenerator;

  private constructor() {
    this.connectionManager = new QZConnectionManager();
    this.printerManager = new QZPrinterManager();
    this.receiptGenerator = new QZReceiptGenerator();
  }

  static getInstance(): QZTrayService {
    if (!QZTrayService.instance) {
      QZTrayService.instance = new QZTrayService();
    }
    return QZTrayService.instance;
  }

  async printOrderTickets(orderData: OrderData): Promise<void> {
    let wasConnected = this.connectionManager.isQZConnected();
    
    try {
      if (!wasConnected) {
        await this.connectionManager.connect();
      }

      const printers = await this.printerManager.getPrinters();
      console.log('Available printers:', printers);

      if (printers.length === 0) {
        throw new Error('Aucune imprimante trouvée');
      }

      const receiptContent = this.receiptGenerator.generateReceiptContent(orderData);

      const printersToUse = printers.slice(0, 2);
      const printPromises = printersToUse.map(printer => 
        this.printerManager.printToDevice(printer.name, receiptContent)
      );

      await Promise.all(printPromises);
      console.log(`Successfully printed ${printersToUse.length} tickets`);

    } catch (error) {
      console.error('Error during QZ Tray printing:', error);
      throw error;
    } finally {
      if (!wasConnected) {
        try {
          await this.connectionManager.disconnect();
        } catch (disconnectError) {
          console.error('Error disconnecting QZ Tray:', disconnectError);
        }
      }
    }
  }

  async isQZTrayAvailable(): Promise<boolean> {
    return this.connectionManager.isQZTrayAvailable();
  }
}

export const qzTrayService = QZTrayService.getInstance();
