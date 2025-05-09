
import { ESCPOS, formatText, centerText, rightAlignText, formatLine, createDivider, addLineFeed } from './print-utils';
import { CartItem } from '@/types/database-types';
import currencyCodes from "currency-codes";

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

const translations = {
  fr: {
    order: "COMMANDE",
    takeaway: "A EMPORTER",
    table: "Sur Place",
    dineIn: "SUR PLACE",
    subtotal: "Sous-total",
    vat: "TVA",
    total: "TOTAL",
    thanks: "Merci de votre visite!",
    seeYouSoon: "A bientot!",
  },
  en: {
    order: "ORDER",
    takeaway: "TAKEAWAY",
    table: "Dine In",
    dineIn: "DINE IN",
    subtotal: "Subtotal",
    vat: "VAT",
    total: "TOTAL",
    thanks: "Thank you for your visit!",
    seeYouSoon: "See you soon!",
  },
  tr: {
    order: "SİPARİŞ",
    takeaway: "PAKET SERVİSİ",
    table: "Yemek İçin",
    dineIn: "YERİNDE TÜKETİM",
    subtotal: "Ara Toplam",
    vat: "KDV",
    total: "TOPLAM",
    thanks: "Ziyaretiniz için teşekkürler!",
    seeYouSoon: "Tekrar görüşmek üzere!",
  }
};

interface ReceiptData {
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
  getFormattedOptions?: (item: CartItem) => string;
  getFormattedToppings?: (item: CartItem) => string;
  uiLanguage?: "fr" | "en" | "tr";
  useCurrencyCode?: boolean;
}

type GroupedToppings = Array<{
  category: string;
  toppings: string[];
}>;

/**
 * Sanitizes text for thermal printers by:
 * 1. Removing emojis and other non-ANSI characters
 * 2. Converting accented characters to their non-accented equivalents
 * 
 * @param text Text to sanitize
 * @returns Sanitized text safe for printing
 */
const sanitizeForPrinter = (text: string): string => {
  // First remove emojis and other non-printable characters
  text = text.replace(/[\u{1F600}-\u{1F6FF}]|[\u{2600}-\u{26FF}]|[\u{1F300}-\u{1F5FF}]|[\u{1F900}-\u{1F9FF}]|[\u{1F1E0}-\u{1F1FF}]/gu, '');
  
  // Map for accented characters to replace
  const charMap: Record<string, string> = {
    'ç': 'c', 'Ç': 'C', 'ğ': 'g', 'Ğ': 'G', 'ı': 'i', 'İ': 'I',
    'ö': 'o', 'Ö': 'O', 'ş': 's', 'Ş': 'S', 'ü': 'u', 'Ü': 'U',
    'é': 'e', 'É': 'E', 'è': 'e', 'È': 'E', 'ê': 'e', 'Ê': 'E',
    'ë': 'e', 'Ë': 'E', 'à': 'a', 'À': 'A', 'â': 'a', 'Â': 'A',
    'î': 'i', 'Î': 'I', 'ï': 'i', 'Ï': 'I', 'ô': 'o', 'Ô': 'O',
    'ù': 'u', 'Ù': 'U', 'û': 'u', 'Û': 'U',
    'ÿ': 'y', 'Ÿ': 'Y'
  };

  // Replace accented characters
  let result = '';
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    result += charMap[char] || char;
  }
  
  // Handle any remaining non-ASCII characters by replacing them
  return result.replace(/[^\x00-\x7F]/g, '');
};

const getGroupedToppings = (item: CartItem): GroupedToppings => {
  if (!item.selectedToppings) return [];
  const groups: GroupedToppings = [];

  item.selectedToppings.forEach(toppingGroup => {
    const category = item.menuItem.toppingCategories?.find(cat => cat.id === toppingGroup.categoryId);
    if (!category) return;

    const selectedToppingNames = category.toppings
      .filter(topping => toppingGroup.toppingIds.includes(topping.id))
      .map(topping => topping.name);

    if (selectedToppingNames.length) {
      groups.push({
        category: category.name,
        toppings: selectedToppingNames,
      });
    }
  });

  return groups;
};

const getToppingPrice = (item: CartItem, groupCategory: string, toppingName: string): number => {
  const cat = item.menuItem.toppingCategories?.find(c => c.name === groupCategory);
  const toppingObj = cat?.toppings.find(t => t.name === toppingName);
  return toppingObj ? parseFloat(String(toppingObj.price ?? "0")) : 0;
};

const getToppingTaxPercentage = (item: CartItem, groupCategory: string, toppingName: string): number => {
  const cat = item.menuItem.toppingCategories?.find(c => c.name === groupCategory);
  const toppingObj = cat?.toppings.find(t => t.name === toppingName);
  return toppingObj?.tax_percentage ?? (item.menuItem.tax_percentage ?? 10);
};

const getCurrencyAbbreviation = (currencyCode: string) => {
  const code = (currencyCode || "EUR").toUpperCase();
  return code;
};

const getCurrencySymbol = (currencyCode: string) => {
  const code = (currencyCode || "EUR").toUpperCase();
  return CURRENCY_SYMBOLS[code] || code;
};

export const generateStandardReceipt = (data: ReceiptData): string => {
  const {
    restaurant,
    cart,
    orderNumber,
    tableNumber,
    orderType,
    subtotal,
    tax,
    total,
    getFormattedOptions = () => '',
    uiLanguage = "fr",
    useCurrencyCode = false,
  } = data;

  const t = (k: keyof typeof translations["en"]) => {
    const translation = translations[uiLanguage]?.[k] ?? translations.fr[k];
    return sanitizeForPrinter(translation);
  };

  const firstItem = cart[0];
  const defaultVat = firstItem?.menuItem?.tax_percentage ?? 10;
  
  const currencyCode = restaurant?.currency || "EUR";
  const currencyDisplay = useCurrencyCode
    ? getCurrencyAbbreviation(currencyCode)
    : getCurrencySymbol(currencyCode);

  const now = new Date();
  const date = now.toLocaleDateString(uiLanguage === "en" ? "en-GB" : (uiLanguage === "tr" ? "tr-TR" : "fr-FR"), { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric' 
  });
  const time = now.toLocaleTimeString(uiLanguage === "en" ? "en-GB" : (uiLanguage === "tr" ? "tr-TR" : "fr-FR"), {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });

  let receipt = '';

  receipt += ESCPOS.ALIGN_CENTER;
  receipt += formatText(sanitizeForPrinter(restaurant?.name || 'Restaurant'), ESCPOS.FONT_LARGE_BOLD) + addLineFeed();

  if (restaurant?.location) {
    receipt += formatText(sanitizeForPrinter(restaurant.location), ESCPOS.FONT_NORMAL) + addLineFeed();
  }

  receipt += formatText(`${date} ${time}`, ESCPOS.FONT_NORMAL) + addLineFeed();
  receipt += formatText(`${t("order")} #${orderNumber}`, ESCPOS.FONT_LARGE) + addLineFeed(2);

  if (orderType === 'takeaway') {
    receipt += formatText(t("takeaway"), ESCPOS.FONT_BOLD) + addLineFeed();
  } else if (orderType === 'dine-in') {
    receipt += formatText(t("dineIn"), ESCPOS.FONT_BOLD) + addLineFeed();
  }
  receipt += ESCPOS.ALIGN_LEFT;

  receipt += createDivider(48) + addLineFeed();

  cart.forEach(item => {
    const itemPrice = parseFloat(item.itemPrice.toString()).toFixed(2);
    const itemText = `${item.quantity}x ${sanitizeForPrinter(item.menuItem.name)}`;
    const formattedPrice = `${itemPrice} ${currencyDisplay}`;
    const spaces = 48 - itemText.length - formattedPrice.length;

    receipt += formatText(itemText + ' '.repeat(Math.max(0, spaces)) + formattedPrice, ESCPOS.FONT_BOLD) + addLineFeed();

    const options = getFormattedOptions(item).split(', ').filter(Boolean);
    options.forEach(option => {
      receipt += formatText(`  + ${sanitizeForPrinter(option)}`, ESCPOS.FONT_NORMAL) + addLineFeed();
    });

    // Modified code: Removing the category headers and just listing toppings directly
    const groupedToppings = getGroupedToppings(item);
    groupedToppings.forEach(group => {
      // No longer print the category name
      group.toppings.forEach(topping => {
        const price = getToppingPrice(item, group.category, topping);
        const toppingTaxPercentage = getToppingTaxPercentage(item, group.category, topping);
        let line = `  + ${sanitizeForPrinter(topping)}`;
        if (price > 0) {
          const formattedToppingPrice = `${price.toFixed(2)} ${currencyDisplay}`;
          // Include tax percentage if different from default
          if (toppingTaxPercentage !== defaultVat) {
            line += ` (${formattedToppingPrice}, TVA ${toppingTaxPercentage}%)`;
          } else {
            line += ` (${formattedToppingPrice})`;
          }
        }
        receipt += formatText(line, ESCPOS.FONT_NORMAL) + addLineFeed();
      });
    });
  });

  receipt += createDivider(48) + addLineFeed();

  receipt += ESCPOS.ALIGN_RIGHT;
  receipt += formatText(`${t("subtotal")}: ${subtotal.toFixed(2)} ${currencyDisplay}`, ESCPOS.FONT_NORMAL) + addLineFeed();
  receipt += formatText(`${t("vat")}: ${tax.toFixed(2)} ${currencyDisplay}`, ESCPOS.FONT_NORMAL) + addLineFeed();
  receipt += createDivider(48) + addLineFeed();

  receipt += ESCPOS.ALIGN_RIGHT;
  receipt += formatText(`${t("total")}: ${total.toFixed(2)} ${currencyDisplay}`, ESCPOS.FONT_LARGE_BOLD) + addLineFeed(2);

  receipt += ESCPOS.ALIGN_CENTER;
  receipt += formatText(t("thanks"), ESCPOS.FONT_NORMAL) + addLineFeed();
  receipt += formatText(t("seeYouSoon"), ESCPOS.FONT_NORMAL) + addLineFeed(3);
  receipt += ESCPOS.ALIGN_LEFT;

  receipt += addLineFeed(5);

  receipt += ESCPOS.CUT_PAPER;

  return receipt;
};

const getFormattedOptions = (item: CartItem): string => {
  if (!item.selectedOptions) return '';
  
  return item.selectedOptions
    .map(option => {
      const menuOption = item.menuItem.options?.find(opt => opt.id === option.optionId);
      if (!menuOption) return null;
      
      const selectedChoices = menuOption.choices
        .filter(choice => option.choiceIds.includes(choice.id))
        .map(choice => choice.name);
      
      if (selectedChoices.length > 0) {
        return `${menuOption.name}: ${selectedChoices.join(', ')}`;
      }
      
      return null;
    })
    .filter(Boolean)
    .join(', ');
};

const getFormattedToppings = (item: CartItem): string => {
  if (!item.selectedToppings) return '';
  
  const allToppings: string[] = [];
  
  item.selectedToppings.forEach(toppingGroup => {
    const category = item.menuItem.toppingCategories?.find(cat => cat.id === toppingGroup.categoryId);
    if (!category) return;
    
    const selectedToppingNames = category.toppings
      .filter(topping => toppingGroup.toppingIds.includes(topping.id))
      .map(topping => topping.name);
    
    allToppings.push(...selectedToppingNames);
  });
  
  return allToppings.join(', ');
};

export { getGroupedToppings };
