
import { OrderData } from '@/types/qz-tray-types';
import { generatePlainTextReceipt } from '@/utils/receipt-templates';

export class QZReceiptGenerator {
  generateReceiptContent(orderData: OrderData): string {
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
}
