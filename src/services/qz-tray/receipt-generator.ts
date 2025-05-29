
import { OrderData } from '@/types/qz-tray-types';
import { generatePlainTextReceipt } from '@/utils/receipt-templates';

export class QZReceiptGenerator {
  generateReceiptContent(orderData: OrderData): string {
    // Use the language from orderData if available
    const uiLanguage = orderData.uiLanguage || 'fr';
    
    const t = (key: string): string => {
      const translations: Record<string, Record<string, string>> = {
        fr: {
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
        },
        en: {
          'receipt.orderNumber': 'Order No',
          'receipt.orderType': 'Order Type',
          'receipt.dineIn': 'Dine In',
          'receipt.takeaway': 'Takeaway',
          'receipt.tableNumber': 'Table No',
          'receipt.subtotal': 'Subtotal',
          'receipt.vat': 'VAT',
          'receipt.total': 'Total',
          'receipt.thankYou': 'Thank you for your visit!',
          'receipt.specialInstructions': 'Special Instructions'
        },
        tr: {
          'receipt.orderNumber': 'Sipariş No',
          'receipt.orderType': 'Sipariş Tipi',
          'receipt.dineIn': 'Masa Servisi',
          'receipt.takeaway': 'Paket Servisi',
          'receipt.tableNumber': 'Masa No',
          'receipt.subtotal': 'Ara Toplam',
          'receipt.vat': 'KDV',
          'receipt.total': 'Toplam',
          'receipt.thankYou': 'Ziyaretiniz için teşekkürler!',
          'receipt.specialInstructions': 'Özel Talimatlar'
        }
      };
      
      return translations[uiLanguage]?.[key] || key;
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
}
