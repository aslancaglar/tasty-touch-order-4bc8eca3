
import { CartItem } from '@/types/database-types';
import { generatePlainTextReceipt } from '@/utils/receipt-templates';

declare global {
  interface Window {
    qz: any;
  }
}

interface QZPrinter {
  name: string;
  driver?: string;
}

interface OrderData {
  restaurant: {
    id?: string;
    name: string;
    location?: string;
    currency?: string;
  } | null;
  cart: CartItem[];
  orderNumber: string;
  tableNumber?: string | null;
  orderType: "dine-in" | "takeaway" | null;
  subtotal: number;
  tax: number;
  total: number;
  getFormattedOptions: (item: CartItem) => string;
  getFormattedToppings: (item: CartItem) => string;
  uiLanguage?: string;
}

class QZTrayService {
  private static instance: QZTrayService;
  private isConnected = false;

  static getInstance(): QZTrayService {
    if (!QZTrayService.instance) {
      QZTrayService.instance = new QZTrayService();
    }
    return QZTrayService.instance;
  }

  private async loadQZTray(): Promise<void> {
    if (window.qz) {
      return;
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/qz-tray@2.2.4/qz-tray.js';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load QZ Tray'));
      document.head.appendChild(script);
    });
  }

  private async connect(): Promise<void> {
    if (this.isConnected) {
      return;
    }

    try {
      await this.loadQZTray();
      
      if (!window.qz) {
        throw new Error('QZ Tray not available');
      }

      // Configuration QZ Tray
      window.qz.security.setCertificatePromise(() => {
        return fetch('/qz-tray.der', { cache: 'no-store' })
          .catch(() => {
            // Fallback: utiliser le certificat par défaut
            return Promise.resolve();
          });
      });

      window.qz.security.setSignaturePromise((toSign: string) => {
        return fetch('/qz-tray-signature', {
          method: 'POST',
          body: JSON.stringify({ data: toSign }),
          headers: { 'Content-Type': 'application/json' }
        })
        .then(response => response.text())
        .catch(() => {
          // Fallback: signature vide pour développement
          return Promise.resolve('');
        });
      });

      await window.qz.websocket.connect();
      this.isConnected = true;
      console.log('QZ Tray connected successfully');
    } catch (error) {
      console.error('Failed to connect to QZ Tray:', error);
      throw error;
    }
  }

  private async disconnect(): Promise<void> {
    if (!this.isConnected || !window.qz) {
      return;
    }

    try {
      await window.qz.websocket.disconnect();
      this.isConnected = false;
      console.log('QZ Tray disconnected');
    } catch (error) {
      console.error('Error disconnecting QZ Tray:', error);
    }
  }

  private async getPrinters(): Promise<QZPrinter[]> {
    if (!window.qz) {
      throw new Error('QZ Tray not connected');
    }

    try {
      const printers = await window.qz.printers.find();
      return printers.map((printer: any) => ({
        name: printer.name || printer,
        driver: printer.driver
      }));
    } catch (error) {
      console.error('Error getting printers:', error);
      throw error;
    }
  }

  private generateReceiptContent(orderData: OrderData): string {
    const t = (key: string): string => {
      const translations: Record<string, string> = {
        'receipt.orderNumber': 'Commande No',
        'receipt.orderType': 'Type de commande',
        'receipt.dineIn': 'Sur place',
        'receipt.takeaway': 'À emporter',
        'receipt.tableNumber': 'Table No',
        'receipt.subtotal': 'Sous-total',
        'receipt.vat': 'TVA',
        'receipt.total': 'Total',
        'receipt.thankYou': 'Merci pour votre visite!',
        'receipt.specialInstructions': 'Instructions spéciales'
      };
      return translations[key] || key;
    };

    return generatePlainTextReceipt(
      orderData.cart,
      orderData.restaurant,
      orderData.orderType,
      orderData.tableNumber,
      orderData.orderNumber,
      orderData.restaurant?.currency?.toUpperCase() || 'EUR',
      orderData.total,
      orderData.subtotal,
      orderData.tax,
      10,
      t
    );
  }

  private async printToDevice(printerName: string, content: string): Promise<void> {
    if (!window.qz) {
      throw new Error('QZ Tray not connected');
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

  async printOrderTickets(orderData: OrderData): Promise<void> {
    let wasConnected = this.isConnected;
    
    try {
      // Connexion à QZ Tray
      if (!wasConnected) {
        await this.connect();
      }

      // Récupération des imprimantes disponibles
      const printers = await this.getPrinters();
      console.log('Available printers:', printers);

      if (printers.length === 0) {
        throw new Error('Aucune imprimante trouvée');
      }

      // Génération du contenu du ticket
      const receiptContent = this.generateReceiptContent(orderData);

      // Impression sur chaque imprimante (maximum 2)
      const printersToUse = printers.slice(0, 2);
      const printPromises = printersToUse.map(printer => 
        this.printToDevice(printer.name, receiptContent)
      );

      await Promise.all(printPromises);
      console.log(`Successfully printed ${printersToUse.length} tickets`);

    } catch (error) {
      console.error('Error during QZ Tray printing:', error);
      throw error;
    } finally {
      // Déconnexion si on était pas connecté au début
      if (!wasConnected) {
        try {
          await this.disconnect();
        } catch (disconnectError) {
          console.error('Error disconnecting QZ Tray:', disconnectError);
        }
      }
    }
  }

  async isQZTrayAvailable(): Promise<boolean> {
    try {
      await this.loadQZTray();
      return !!window.qz;
    } catch {
      return false;
    }
  }
}

export const qzTrayService = QZTrayService.getInstance();
