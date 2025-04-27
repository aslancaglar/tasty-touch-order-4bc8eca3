import { CartItem } from "@/types/database-types";

export const getGroupedToppings = (item: CartItem) => {
  const result: { category: string; toppings: string[] }[] = [];
  
  // Use toppings instead of selectedToppings
  if (item.toppings) {
    // Use toppings instead of selectedToppings
    item.toppings.forEach(toppingCategory => {
      // Use topping_categories instead of toppingCategories
      const category = item.menuItem.topping_categories?.find(id => id === toppingCategory.categoryId);
      if (category) {
        // Logic to group toppings
        result.push({
          category: "Toppings", // Placeholder name - this would need actual implementation
          toppings: toppingCategory.toppingIds.map(id => id) // Placeholder - this would need to map to actual names
        });
      }
    });
  }
  
  return result;
};

export const generateStandardReceipt = ({
  restaurant,
  cart,
  orderNumber,
  tableNumber = null,
  orderType = null,
  subtotal,
  tax,
  total,
  getFormattedOptions,
  getFormattedToppings,
  uiLanguage = 'fr',
  useCurrencyCode = false
}: {
  restaurant: {
    name: string;
    location?: string;
    currency?: string;
  };
  cart: CartItem[];
  orderNumber: string;
  tableNumber?: string | null;
  orderType?: "dine-in" | "takeaway" | null;
  subtotal: number;
  tax: number;
  total: number;
  getFormattedOptions: (item: CartItem) => string;
  getFormattedToppings: (item: CartItem) => string;
  uiLanguage?: "fr" | "en" | "tr";
  useCurrencyCode?: boolean;
}): string => {
  const translations = {
    fr: {
      order: "Commande",
      table: "Table",
      subtotal: "Sous-total",
      vat: "TVA",
      total: "TOTAL",
      thanks: "Merci de votre visite!",
      seeYouSoon: "A bientôt!",
      dineIn: "Sur Place",
      takeaway: "À Emporter"
    },
    en: {
      order: "Order",
      table: "Table",
      subtotal: "Subtotal",
      vat: "VAT",
      total: "TOTAL",
      thanks: "Thank you for your visit!",
      seeYouSoon: "See you soon!",
      dineIn: "Dine In",
      takeaway: "Takeaway"
    },
    tr: {
      order: "Sipariş",
      table: "Masa",
      subtotal: "Ara Toplam",
      vat: "KDV",
      total: "TOPLAM",
      thanks: "Ziyaretiniz için teşekkürler!",
      seeYouSoon: "Tekrar görüşmek üzere!",
      dineIn: "Yemek İçin",
      takeaway: "Paket Servisi"
    }
  };
  
  const t = (key: keyof typeof translations.en) => translations[uiLanguage][key];
  
  const orderDate = new Date().toLocaleDateString('fr-FR');
  const orderTime = new Date().toLocaleTimeString('fr-FR');
  
  const currencyCode = restaurant.currency || 'EUR';
  const currencySymbol = useCurrencyCode ? currencyCode : getCurrencySymbol(currencyCode);
  
  return `Receipt Template Generated`;
};

export const generateReceiptHTML = (
  restaurant: {
    name: string;
    location?: string;
    currency?: string;
  },
  cart: CartItem[],
  orderNumber: string,
  orderDate: string,
  tableNumber?: string | null,
  orderType?: 'dine-in' | 'takeaway' | null,
  language: 'fr' | 'en' | 'tr' = 'fr'
) => {
  const translations = {
    fr: {
      order: "Commande",
      table: "Table",
      subtotal: "Sous-total",
      vat: "TVA",
      total: "TOTAL",
      thanks: "Merci de votre visite!",
      seeYouSoon: "A bientôt!",
      dineIn: "Sur Place",
      takeaway: "À Emporter"
    },
    en: {
      order: "Order",
      table: "Table",
      subtotal: "Subtotal",
      vat: "VAT",
      total: "TOTAL",
      thanks: "Thank you for your visit!",
      seeYouSoon: "See you soon!",
      dineIn: "Dine In",
      takeaway: "Takeaway"
    },
    tr: {
      order: "Sipariş",
      table: "Masa",
      subtotal: "Ara Toplam",
      vat: "KDV",
      total: "TOPLAM",
      thanks: "Ziyaretiniz için teşekkürler!",
      seeYouSoon: "Tekrar görüşmek üzere!",
      dineIn: "Yemek İçin",
      takeaway: "Paket Servisi"
    }
  };

  const t = (key: keyof typeof translations.en) => translations[language][key];

  const CURRENCY_SYMBOLS: Record<string, string> = {
    EUR: "€",
    USD: "$",
    GBP: "£",
    TRY: "₺",
    JPY: "¥",
    CAD: "$",
    AUD: "$",
    CHF: "Fr.",
    CNY: "¥",
    RUB: "₽"
  };

  const getCurrencySymbol = (currencyCode: string): string => {
    const code = (currencyCode || "EUR").toUpperCase();
    return CURRENCY_SYMBOLS[code] || code;
  };

  const currencySymbol = getCurrencySymbol(restaurant.currency || 'EUR');

  // Calculate totals
  const subtotal = cart.reduce((sum, item) => sum + item.price, 0);
  const taxRate = 0.10; // Assuming 10% tax rate
  const tax = subtotal * taxRate;
  const total = subtotal + tax;

  // Fix category name in grouped toppings
  const getFormattedToppings = (item: CartItem) => {
    // Use topping_categories instead of toppingCategories
    const category = item.menuItem.topping_categories?.find(id => id === item.toppings?.[0]?.categoryId);
    return category ? "Toppings" : "";
  };

  // Generate HTML
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Receipt</title>
      <style>
        body {
          font-family: 'Courier New', Courier, monospace;
          margin: 0;
          padding: 0;
          width: 80mm;
          font-size: 12px;
        }
        .receipt {
          padding: 5mm;
        }
        .header {
          text-align: center;
          margin-bottom: 5mm;
        }
        .logo {
          font-size: 16px;
          font-weight: bold;
          margin-bottom: 2mm;
        }
        .divider {
          border-top: 1px dashed #000;
          margin: 3mm 0;
        }
        .item {
          display: flex;
          justify-content: space-between;
          margin-bottom: 1mm;
        }
        .item-details {
          padding-left: 5mm;
          font-size: 10px;
        }
        .total-section {
          margin-top: 3mm;
        }
        .total-line {
          display: flex;
          justify-content: space-between;
          margin-bottom: 1mm;
        }
        .grand-total {
          font-weight: bold;
          font-size: 14px;
        }
        .footer {
          text-align: center;
          margin-top: 5mm;
          font-size: 10px;
        }
      </style>
    </head>
    <body>
      <div class="receipt">
        <div class="header">
          <div class="logo">${restaurant.name}</div>
          ${restaurant.location ? `<div>${restaurant.location}</div>` : ''}
          <div>${orderDate}</div>
          <div class="order-number">${t('order')} #${orderNumber}</div>
          ${orderType === 'dine-in' ? `<div>${t('dineIn')}</div>` : ''}
          ${orderType === 'takeaway' ? `<div>${t('takeaway')}</div>` : ''}
          ${tableNumber ? `<div>${t('table')} ${tableNumber}</div>` : ''}
        </div>

        <div class="divider"></div>

        <div>
          ${cart.map(item => `
            <div style="margin-bottom: 8px;">
              <div class="item">
                <span>${item.quantity}x ${item.menuItem.name}</span>
                <span>${item.price.toFixed(2)} ${currencySymbol}</span>
              </div>
              ${item.options && item.options.length > 0 ? `
                <div class="item-details">
                  ${item.options.map(option => {
                    const menuOption = item.menuItem.options?.find(o => o.id === option.optionId);
                    return option.choiceIds.map(choiceId => {
                      const choice = menuOption?.choices.find(c => c.id === choiceId);
                      return choice ? `
                        <div class="item">
                          <span>+ ${choice.name}</span>
                          <span>${choice.price ? `${choice.price.toFixed(2)} ${currencySymbol}` : ''}</span>
                        </div>
                      ` : '';
                    }).join('');
                  }).join('')}
                </div>
              ` : ''}
              ${item.toppings && item.toppings.length > 0 ? `
                <div class="item-details">
                  ${item.toppings.map(toppingCategory => {
                    // Use topping_categories instead of toppingCategories
                    const category = item.menuItem.topping_categories?.find(id => id === toppingCategory.categoryId);
                    return category ? `
                      <div style="font-weight: 600; padding-left: 0;">Toppings:</div>
                      ${toppingCategory.toppingIds.map(toppingId => `
                        <div class="item">
                          <span style="padding-left: 6px;">+ Topping ${toppingId}</span>
                          <span>1.00 ${currencySymbol}</span>
                        </div>
                      `).join('')}
                    ` : '';
                  }).join('')}
                </div>
              ` : ''}
            </div>
          `).join('')}
        </div>

        <div class="divider"></div>

        <div class="total-section">
          <div class="total-line">
            <span>${t('subtotal')}</span>
            <span>${subtotal.toFixed(2)} ${currencySymbol}</span>
          </div>
          <div class="total-line">
            <span>${t('vat')}</span>
            <span>${tax.toFixed(2)} ${currencySymbol}</span>
          </div>
          <div class="divider"></div>
          <div class="total-line grand-total">
            <span>${t('total')}</span>
            <span>${total.toFixed(2)} ${currencySymbol}</span>
          </div>
        </div>

        <div class="footer">
          <p>${t('thanks')}</p>
          <p>${t('seeYouSoon')}</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

export const getFormattedOptions = (item: CartItem): string => {
  if (!item.options || item.options.length === 0) {
    return '';
  }

  const formattedOptions: string[] = [];
  
  item.options.forEach(option => {
    const menuOption = item.menuItem.options?.find(o => o.id === option.optionId);
    if (menuOption) {
      option.choiceIds.forEach(choiceId => {
        const choice = menuOption.choices.find(c => c.id === choiceId);
        if (choice) {
          formattedOptions.push(`${choice.name}${choice.price ? ` (+${choice.price})` : ''}`);
        }
      });
    }
  });

  return formattedOptions.join(', ');
};

export const getFormattedToppings = (item: CartItem): string => {
  if (!item.toppings || item.toppings.length === 0) {
    return '';
  }

  const formattedToppings: string[] = [];
  
  item.toppings.forEach(toppingCategory => {
    // Use topping_categories instead of toppingCategories
    const category = item.menuItem.topping_categories?.find(id => id === toppingCategory.categoryId);
    if (category) {
      toppingCategory.toppingIds.forEach(toppingId => {
        formattedToppings.push(`Topping ${toppingId}`);
      });
    }
  });

  return formattedToppings.join(', ');
};

const CURRENCY_SYMBOLS: Record<string, string> = {
  EUR: "€",
  USD: "$",
  GBP: "£",
  TRY: "₺",
  JPY: "¥",
  CAD: "$",
  AUD: "$",
  CHF: "Fr.",
  CNY: "¥",
  RUB: "₽"
};

const getCurrencySymbol = (currencyCode: string): string => {
  const code = (currencyCode || "EUR").toUpperCase();
  return CURRENCY_SYMBOLS[code] || code;
};
