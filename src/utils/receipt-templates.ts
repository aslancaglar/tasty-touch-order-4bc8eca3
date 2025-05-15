// src/utils/receipt-templates.ts
import { CartItem } from '@/types/database-types';
import { SupportedLanguage } from '@/utils/language-utils';
import { ESCPOS, formatText, centerText, addLineFeed, createDivider } from '@/utils/print-utils';

// Define topping object type with name and quantity
export interface ToppingWithQuantity {
  name: string;
  quantity: number;
}

// Define grouped toppings interface
export interface GroupedToppings {
  category: string;
  toppings: (string | ToppingWithQuantity)[];
}

// Helper function to group toppings by category for receipt display
export function getGroupedToppings(item: CartItem): GroupedToppings[] {
  if (!item.menuItem.toppingCategories || item.menuItem.toppingCategories.length === 0 || !item.selectedToppings) {
    return [];
  }

  return item.menuItem.toppingCategories
    .filter(category => {
      const selectedCategory = item.selectedToppings.find(t => t.categoryId === category.id);
      return selectedCategory && selectedCategory.toppingIds.length > 0;
    })
    .map(category => {
      const selectedCategory = item.selectedToppings.find(t => t.categoryId === category.id);
      const toppings = selectedCategory?.toppingIds.map(toppingId => {
        const topping = category.toppings.find(t => t.id === toppingId);
        
        if (topping) {
          // Check if we have quantities for this topping
          if (category.allow_multiple_same_topping && 
              selectedCategory.toppingQuantities && 
              selectedCategory.toppingQuantities[toppingId]) {
            // Return topping with quantity
            return {
              name: topping.name,
              quantity: selectedCategory.toppingQuantities[toppingId]
            };
          }
          // Return just the name for simple display
          return topping.name;
        }
        return '';
      }).filter(Boolean) as (string | ToppingWithQuantity)[];

      return {
        category: category.name,
        toppings
      };
    });
}

// Function to replace French characters with ASCII equivalents
function removeAccents(str: string): string {
  return str
    .replace(/[éèêë]/g, 'e')
    .replace(/[àâä]/g, 'a')
    .replace(/[ïî]/g, 'i')
    .replace(/[ôö]/g, 'o')
    .replace(/[ùûü]/g, 'u')
    .replace(/[ç]/g, 'c')
    .replace(/[ÉÈÊË]/g, 'E')
    .replace(/[ÀÂÄÃ]/g, 'A')
    .replace(/[ÏÎ]/g, 'I')
    .replace(/[ÔÖ]/g, 'O')
    .replace(/[ÙÛÜ]/g, 'U')
    .replace(/[Ç]/g, 'C');
}

// Generate a receipt HTML for browser printing
export function generateReceiptHTML(
  cart: CartItem[],
  restaurant: { name: string; location?: string | null; currency?: string; } | null,
  orderType: string | null,
  tableNumber: string | null,
  orderNumber: string,
  currencySymbol: string,
  total: number,
  subtotal: number,
  tax: number,
  taxRate: number = 10,
  t: (key: string) => string
): string {
  const date = new Date();
  const formattedDate = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
  
  // Function to format each item in the cart
  const formatCartItem = (item: CartItem) => {
    const itemToppings = getGroupedToppings(item);
    const selectedOptions = item.selectedOptions.flatMap(option => {
      const optionDef = item.menuItem.options?.find(o => o.id === option.optionId);
      if (!optionDef) return [];
      
      return option.choiceIds.map(choiceId => {
        const choice = optionDef.choices.find(c => c.id === choiceId);
        return choice ? choice.name : '';
      });
    }).filter(Boolean);
    
    const toppingsHtml = itemToppings.map(group => `
      <div class="topping-group">
        <div class="topping-category">${group.category}:</div>
        ${group.toppings.map(topping => {
          if (typeof topping === 'object') {
            // Handle topping with quantity
            return `<div class="topping-item">${topping.quantity > 1 ? `${topping.quantity}x ` : ''}${topping.name}</div>`;
          }
          return `<div class="topping-item">${topping}</div>`;
        }).join('')}
      </div>
    `).join('');
    
    const optionsHtml = selectedOptions.length 
      ? `<div class="options">${selectedOptions.join(', ')}</div>` 
      : '';
    
    return `
      <div class="receipt-item">
        <div class="item-header">
          <span>${item.quantity}x ${item.menuItem.name}</span>
          <span>${(item.itemPrice * item.quantity).toFixed(2)}${currencySymbol}</span>
        </div>
        ${optionsHtml}
        ${toppingsHtml}
        ${item.specialInstructions ? `<div class="special-instructions">${t('receipt.specialInstructions')}: ${item.specialInstructions}</div>` : ''}
      </div>
    `;
  };

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${t('receipt.title')}</title>
      <style>
        body {
          font-family: 'Courier New', Courier, monospace;
          margin: 0;
          padding: 0;
          width: 80mm;
          max-width: 80mm;
          font-size: 12px;
        }
        .receipt-container {
          padding: 10px 5px;
        }
        .receipt-header {
          text-align: center;
          margin-bottom: 10px;
        }
        .restaurant-name {
          font-size: 18px;
          font-weight: bold;
        }
        .receipt-subtitle {
          margin: 5px 0;
        }
        .receipt-info {
          margin-bottom: 10px;
          border-bottom: 1px dashed #000;
          padding-bottom: 10px;
        }
        .receipt-items {
          margin-bottom: 10px;
        }
        .receipt-item {
          margin-bottom: 10px;
        }
        .item-header {
          display: flex;
          justify-content: space-between;
          font-weight: bold;
        }
        .topping-group {
          margin-left: 15px;
        }
        .topping-category {
          font-style: italic;
        }
        .topping-item, .options, .special-instructions {
          margin-left: 20px;
          font-size: 10px;
        }
        .receipt-totals {
          border-top: 1px dashed #000;
          padding-top: 10px;
        }
        .total-row {
          display: flex;
          justify-content: space-between;
          margin: 2px 0;
        }
        .grand-total {
          font-weight: bold;
          font-size: 14px;
          margin-top: 5px;
        }
        .receipt-footer {
          text-align: center;
          margin-top: 10px;
          font-size: 10px;
        }
      </style>
    </head>
    <body>
      <div class="receipt-container">
        <div class="receipt-header">
          <div class="restaurant-name">${restaurant?.name || 'Restaurant'}</div>
          ${restaurant?.location ? `<div class="receipt-subtitle">${restaurant.location}</div>` : ''}
          <div class="receipt-subtitle">${formattedDate}</div>
          <div class="receipt-subtitle">${t('receipt.orderNumber')}: ${orderNumber}</div>
        </div>
        
        <div class="receipt-info">
          <div>${t('receipt.orderType')}: ${orderType || t('receipt.takeaway')}</div>
          ${tableNumber ? `<div>${t('receipt.tableNumber')}: ${tableNumber}</div>` : ''}
        </div>
        
        <div class="receipt-items">
          ${cart.map(formatCartItem).join('')}
        </div>
        
        <div class="receipt-totals">
          <div class="total-row">
            <span>${t('receipt.subtotal')}:</span>
            <span>${subtotal.toFixed(2)}${currencySymbol}</span>
          </div>
          <div class="total-row">
            <span>TVA (${taxRate}%):</span>
            <span>${tax.toFixed(2)}${currencySymbol}</span>
          </div>
          <div class="total-row grand-total">
            <span>${t('receipt.total')}:</span>
            <span>${total.toFixed(2)}${currencySymbol}</span>
          </div>
        </div>
        
        <div class="receipt-footer">
          <p>${t('receipt.thankYou')}</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// Function to generate plain text receipt for PrintNode
export function generatePlainTextReceipt(
  cart: CartItem[],
  restaurant: { name: string; location?: string | null; currency?: string; } | null,
  orderType: string | null,
  tableNumber: string | null,
  orderNumber: string,
  currencySymbol: string,
  total: number,
  subtotal: number,
  tax: number,
  taxRate: number = 10,
  t: (key: string) => string
): string {
  const date = new Date();
  const formattedDate = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
  
  // Start building the receipt with header elements
  let receipt = ESCPOS.ALIGN_CENTER;
  
  // Restaurant name with larger font - remove accents
  receipt += ESCPOS.FONT_LARGE + removeAccents(restaurant?.name || 'Restaurant') + ESCPOS.FONT_NORMAL + ESCPOS.LINE_FEED;
  
  // Restaurant location if available - remove accents
  if (restaurant?.location) {
    receipt += removeAccents(restaurant.location) + ESCPOS.LINE_FEED;
  }
  
  // Add date - no extra line break before ORDER
  receipt += formattedDate + ESCPOS.LINE_FEED;
  
  // Order number with larger font - uppercase ORDER text - remove accents
  receipt += ESCPOS.FONT_LARGE_BOLD + 
    removeAccents(`COMMANDE : ${orderNumber}`) + 
    ESCPOS.FONT_NORMAL + ESCPOS.LINE_FEED;
  
  // Add order type in uppercase with proper translation - remove accents
  if (orderType === 'dine-in') {
    receipt += removeAccents(t('receipt.dineIn').toUpperCase()) + ESCPOS.LINE_FEED;
  } else if (orderType === 'takeaway') {
    receipt += removeAccents(t('receipt.takeaway').toUpperCase()) + ESCPOS.LINE_FEED;
  }
  
  // Add table number if available - remove accents
  if (tableNumber) {
    receipt += removeAccents(t('receipt.tableNumber') + ': ' + tableNumber) + ESCPOS.LINE_FEED;
  }
  
  // Return to left alignment - reduce spacing before divider
  receipt += ESCPOS.ALIGN_LEFT;
  receipt += createDivider(48) + ESCPOS.LINE_FEED;
  
  // Add each item with proper formatting
  cart.forEach(item => {
    // Format: "2x Item Name       10.50€" - remove accents
    const itemPrice = (parseFloat(item.itemPrice.toString()) * item.quantity).toFixed(2);
    const itemText = removeAccents(`${item.quantity}x ${item.menuItem.name}`);
    // Use currency code instead of symbol
    const currencyCode = restaurant?.currency?.toUpperCase() || 'EUR';
    const paddedSpaces = ' '.repeat(Math.max(1, 48 - itemText.length - (itemPrice + ' ' + currencyCode).length));
    
    receipt += ESCPOS.FONT_0_5X_BIGGER + 
      `${itemText}${paddedSpaces}${itemPrice} ${currencyCode}` + 
      ESCPOS.FONT_NORMAL + ESCPOS.LINE_FEED;
    
    // Add selected options - remove accents
    const selectedOptions = item.selectedOptions.flatMap(option => {
      const optionDef = item.menuItem.options?.find(o => o.id === option.optionId);
      if (!optionDef) return [];
      
      return option.choiceIds.map(choiceId => {
        const choice = optionDef.choices.find(c => c.id === choiceId);
        return choice ? choice.name : '';
      });
    }).filter(Boolean);
    
    if (selectedOptions.length) {
      selectedOptions.forEach(option => {
        receipt += `  + ${removeAccents(option)}` + ESCPOS.LINE_FEED;
      });
    }
    
    // Add toppings with toppings price in parentheses next to topping name (not right-aligned)
    if (item.selectedToppings && item.selectedToppings.length > 0) {
      const itemToppings = getGroupedToppings(item);
      
      // Process all toppings, flattening the structure
      itemToppings.forEach(group => {
        group.toppings.forEach(topping => {
          // For each topping, determine if it has a quantity > 1
          if (typeof topping === 'object') {
            const category = item.menuItem.toppingCategories?.find(cat => cat.name === group.category);
            const toppingObj = category?.toppings.find(t => t.name === topping.name);
            const price = toppingObj ? parseFloat(String(toppingObj.price ?? "0")) : 0;
            
            let toppingText = topping.quantity > 1 
              ? `  + ${topping.quantity}x ${removeAccents(topping.name)}`
              : `  + ${removeAccents(topping.name)}`;
              
            // Add price in parentheses next to topping name if > 0
            if (price > 0) {
              const toppingPrice = (price * topping.quantity).toFixed(2);
              toppingText += ` (${toppingPrice} ${currencyCode})`;
            }
            
            receipt += toppingText + ESCPOS.LINE_FEED;
          } else {
            // Simple string topping
            const category = item.menuItem.toppingCategories?.find(cat => cat.name === group.category);
            const toppingObj = category?.toppings.find(t => t.name === topping);
            const price = toppingObj ? parseFloat(String(toppingObj.price ?? "0")) : 0;
            
            let toppingText = `  + ${removeAccents(topping)}`;
            
            // Add price in parentheses next to topping name if > 0
            if (price > 0) {
              const toppingPrice = price.toFixed(2);
              toppingText += ` (${toppingPrice} ${currencyCode})`;
            }
            
            receipt += toppingText + ESCPOS.LINE_FEED;
          }
        });
      });
    }
    
    // Add special instructions - remove accents
    if (item.specialInstructions) {
      receipt += `  ${removeAccents(t('receipt.specialInstructions'))}: ${removeAccents(item.specialInstructions)}` + ESCPOS.LINE_FEED;
    }
    
    // Add line space between items
    receipt += ESCPOS.LINE_FEED;
  });

  // Add totals section
  receipt += createDivider(48) + ESCPOS.LINE_FEED;
  
  // Use currency code instead of symbol
  const currencyCode = restaurant?.currency?.toUpperCase() || 'EUR';
  
  // Subtotal and VAT with right alignment for values
  const subtotalText = removeAccents(`${t('receipt.subtotal')}:`);
  const subtotalValue = `${subtotal.toFixed(2)} ${currencyCode}`;
  const subtotalPadding = ' '.repeat(Math.max(1, 48 - subtotalText.length - subtotalValue.length));
  receipt += subtotalText + subtotalPadding + subtotalValue + ESCPOS.LINE_FEED;
  
  const vatText = removeAccents(`${t('receipt.vat')}:`);
  const vatValue = `${tax.toFixed(2)} ${currencyCode}`;
  const vatPadding = ' '.repeat(Math.max(1, 48 - vatText.length - vatValue.length));
  receipt += vatText + vatPadding + vatValue + ESCPOS.LINE_FEED;
  
  // Divider before grand total
  receipt += createDivider(48) + ESCPOS.LINE_FEED;
  
  // Grand total with larger font - right aligned on same line
  const totalText = removeAccents(`${t('receipt.total')}:`);
  const totalValue = `${total.toFixed(2)} ${currencyCode}`;
  const totalPadding = ' '.repeat(Math.max(1, 48 - totalText.length - totalValue.length));
  
  receipt += ESCPOS.FONT_LARGE + 
    totalText + totalPadding + totalValue + 
    ESCPOS.FONT_NORMAL + ESCPOS.LINE_FEED;
  
  // Remove thank you message but keep space for cutting
  receipt += ESCPOS.LINE_FEED.repeat(4); // Add extra line feeds for spacing before cut
  
  // Add cut command
  receipt += ESCPOS.CUT_PAPER;

  return receipt;
}

// Add the missing generateStandardReceipt function
export function generateStandardReceipt(options: {
  restaurant: { name: string; location?: string | null; currency?: string; } | null;
  cart: CartItem[];
  orderNumber: string;
  tableNumber?: string | null;
  orderType: "dine-in" | "takeaway" | null;
  subtotal: number;
  tax: number;
  total: number;
  getFormattedOptions: (item: CartItem) => string;
  getFormattedToppings: (item: CartItem) => string;
  uiLanguage?: SupportedLanguage;
  useCurrencyCode?: boolean;
}): string {
  const {
    restaurant,
    cart,
    orderNumber,
    tableNumber,
    orderType,
    subtotal,
    tax,
    total,
    uiLanguage = "fr"
  } = options;
  
  // Translation function - simplified for plain text receipt
  const t = (key: string): string => {
    // Basic translations for receipt
    const translations: Record<string, Record<string, string>> = {
      fr: {
        "receipt.orderNumber": "Commande No",
        "receipt.orderType": "Type de commande",
        "receipt.dineIn": "Sur place",
        "receipt.takeaway": "À emporter",
        "receipt.tableNumber": "Table No",
        "receipt.subtotal": "Sous-total",
        "receipt.vat": "TVA",
        "receipt.total": "Total",
        "receipt.thankYou": "Merci pour votre visite!",
        "receipt.specialInstructions": "Instructions spéciales"
      },
      en: {
        "receipt.orderNumber": "Order No",
        "receipt.orderType": "Order Type",
        "receipt.dineIn": "Dine In",
        "receipt.takeaway": "Takeaway",
        "receipt.tableNumber": "Table No",
        "receipt.subtotal": "Subtotal",
        "receipt.vat": "VAT",
        "receipt.total": "Total",
        "receipt.thankYou": "Thank you for your visit!",
        "receipt.specialInstructions": "Special Instructions"
      },
      tr: {
        "receipt.orderNumber": "Sipariş No",
        "receipt.orderType": "Sipariş Tipi",
        "receipt.dineIn": "Masa Servisi",
        "receipt.takeaway": "Paket Servisi",
        "receipt.tableNumber": "Masa No",
        "receipt.subtotal": "Ara Toplam",
        "receipt.vat": "KDV",
        "receipt.total": "Toplam",
        "receipt.thankYou": "Ziyaretiniz için teşekkürler!",
        "receipt.specialInstructions": "Özel Talimatlar"
      }
    };
    
    return translations[uiLanguage]?.[key] || key;
  };
  
  // Currency helper
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
  
  // Use ISO code for PrintNode and symbol for browser
  const currencyCode = restaurant?.currency || "EUR";
  const currencySymbol = options.useCurrencyCode ? currencyCode : (CURRENCY_SYMBOLS[currencyCode.toUpperCase()] || currencyCode);
  
  const date = new Date();
  const formattedDate = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
  
  let receipt = `
${restaurant?.name || 'Restaurant'}
${restaurant?.location || ''}
${formattedDate}
${t('receipt.orderNumber')}: ${orderNumber}

${t('receipt.orderType')}: ${orderType === 'dine-in' ? t('receipt.dineIn') : t('receipt.takeaway')}
${tableNumber ? `${t('receipt.tableNumber')}: ${tableNumber}` : ''}

----------------------------------------
`;

  // Add each item
  cart.forEach(item => {
    receipt += `${item.quantity}x ${item.menuItem.name} - ${(parseFloat(item.itemPrice.toString()) * item.quantity).toFixed(2)}${currencySymbol}\n`;
    
    // Add selected options
    const selectedOptions = item.selectedOptions.flatMap(option => {
      const optionDef = item.menuItem.options?.find(o => o.id === option.optionId);
      if (!optionDef) return [];
      
      return option.choiceIds.map(choiceId => {
        const choice = optionDef.choices.find(c => c.id === choiceId);
        return choice ? choice.name : '';
      });
    }).filter(Boolean);
    
    if (selectedOptions.length) {
      receipt += `   ${selectedOptions.join(', ')}\n`;
    }
    
    // Add toppings with quantities
    const itemToppings = getGroupedToppings(item);
    itemToppings.forEach(group => {
      receipt += `   ${group.category}:\n`;
      group.toppings.forEach(topping => {
        if (typeof topping === 'object') {
          // Handle topping with quantity
          receipt += `      ${topping.quantity > 1 ? `${topping.quantity}x ` : ''}${topping.name}\n`;
        } else {
          receipt += `      ${topping}\n`;
        }
      });
    });
    
    // Add special instructions
    if (item.specialInstructions) {
      receipt += `   ${t('receipt.specialInstructions')}: ${item.specialInstructions}\n`;
    }
    
    receipt += '\n';
  });

  // Add totals
  receipt += `
----------------------------------------
${t('receipt.subtotal')}: ${subtotal.toFixed(2)}${currencySymbol}
${t('receipt.vat')}: ${tax.toFixed(2)}${currencySymbol}
${t('receipt.total')}: ${total.toFixed(2)}${currencySymbol}

${t('receipt.thankYou')}
`;

  return receipt;
}
