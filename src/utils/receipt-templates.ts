import { ESCPOS, formatText, centerText, rightAlignText, formatLine, createDivider, addLineFeed } from './print-utils';
import { CartItem } from '@/types/database-types';
import currencyCodes from "currency-codes";

const translations = {
  fr: {
    order: "COMMANDE",
    takeaway: "A EMPORTER",
    table: "SUR PLACE - TABLE",
    subtotal: "Sous-total",
    vat: "TVA",
    total: "TOTAL",
    thanks: "Merci de votre visite!",
    seeYouSoon: "A bientot!",
  },
  en: {
    order: "ORDER",
    takeaway: "TAKEAWAY",
    table: "DINE IN - TABLE",
    subtotal: "Subtotal",
    vat: "VAT",
    total: "TOTAL",
    thanks: "Thank you for your visit!",
    seeYouSoon: "See you soon!",
  },
  tr: {
    order: "SİPARİŞ",
    takeaway: "PAKET SERVİSİ",
    table: "YERİNDE - MASA",
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
}

type GroupedToppings = Array<{
  category: string;
  toppings: string[];
}>;

const encodeSpecialChars = (text: string): string => {
  const charMap: Record<string, string> = {
    'ç': 'c', 'Ç': 'C', 'ğ': 'g', 'Ğ': 'G', 'ı': 'i', 'İ': 'I',
    'ö': 'o', 'Ö': 'O', 'ş': 's', 'Ş': 'S', 'ü': 'u', 'Ü': 'U',
    'é': 'e', 'É': 'E', 'è': 'e', 'È': 'E', 'ê': 'e', 'Ê': 'E',
    'ë': 'e', 'Ë': 'E', 'à': 'a', 'À': 'A', 'â': 'a', 'Â': 'A',
    'î': 'i', 'Î': 'I', 'ï': 'i', 'Ï': 'I', 'ô': 'o', 'Ô': 'O',
    'ù': 'u', 'Ù': 'U', 'û': 'u', 'Û': 'U',
    'ÿ': 'y', 'Ÿ': 'Y'
  };

  let result = '';
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    result += charMap[char] || char;
  }
  
  return result;
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

const getCurrencySymbol = (currencyCode: string) => {
  try {
    const entry = currencyCodes.code(currencyCode);
    return (entry && entry.code) ? entry.code : currencyCode;
  } catch (error) {
    console.error("Error getting currency symbol:", error);
    return currencyCode;
  }
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
  } = data;

  const t = (k: keyof typeof translations["en"]) => {
    const translation = translations[uiLanguage]?.[k] ?? translations.fr[k];
    return encodeSpecialChars(translation);
  };

  const firstItem = cart[0];
  const vat = firstItem?.menuItem?.tax_percentage ?? 10;
  
  const currencyCode = restaurant?.currency || 'EUR';
  const currencySymbol = getCurrencySymbol(currencyCode);

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
  receipt += formatText(encodeSpecialChars(restaurant?.name || 'Restaurant'), ESCPOS.FONT_LARGE_BOLD) + addLineFeed();

  if (restaurant?.location) {
    receipt += formatText(encodeSpecialChars(restaurant.location), ESCPOS.FONT_NORMAL) + addLineFeed();
  }

  receipt += formatText(`${date} ${time}`, ESCPOS.FONT_NORMAL) + addLineFeed();
  receipt += formatText(`${t("order")} #${orderNumber}`, ESCPOS.FONT_LARGE) + addLineFeed(2);

  if (orderType === 'takeaway') {
    receipt += formatText(t("takeaway"), ESCPOS.FONT_BOLD) + addLineFeed();
  } else if (orderType === 'dine-in' && tableNumber) {
    receipt += formatText(`${t("table")}: ${tableNumber}`, ESCPOS.FONT_BOLD) + addLineFeed();
  }
  receipt += ESCPOS.ALIGN_LEFT;

  receipt += createDivider(48) + addLineFeed();

  cart.forEach(item => {
    const itemPrice = parseFloat(item.itemPrice.toString()).toFixed(2);
    const itemText = `${item.quantity}x ${encodeSpecialChars(item.menuItem.name)}`;
    const spaces = 48 - itemText.length - itemPrice.length - 2 - currencySymbol.length;

    receipt += formatText(itemText + ' '.repeat(Math.max(0, spaces)) + itemPrice + ' ' + currencySymbol, ESCPOS.FONT_BOLD) + addLineFeed();

    const options = getFormattedOptions(item).split(', ').filter(Boolean);
    options.forEach(option => {
      receipt += formatText(`  + ${encodeSpecialChars(option)}`, ESCPOS.FONT_NORMAL) + addLineFeed();
    });

    const groupedToppings = getGroupedToppings(item);
    groupedToppings.forEach(group => {
      receipt += formatText(`  ${encodeSpecialChars(group.category)}:`, ESCPOS.FONT_NORMAL) + addLineFeed();
      group.toppings.forEach(topping => {
        const price = getToppingPrice(item, group.category, topping);
        let line = `    + ${encodeSpecialChars(topping)}`;
        if (price > 0) line += ` (${price.toFixed(2)} ${currencySymbol})`;
        receipt += formatText(line, ESCPOS.FONT_NORMAL) + addLineFeed();
      });
    });
  });

  receipt += createDivider(48) + addLineFeed();

  receipt += ESCPOS.ALIGN_RIGHT;
  receipt += formatText(`${t("subtotal")}: ` + subtotal.toFixed(2) + ' ' + currencySymbol, ESCPOS.FONT_NORMAL) + addLineFeed();
  receipt += formatText(`${t("vat")}: ` + tax.toFixed(2) + ' ' + currencySymbol, ESCPOS.FONT_NORMAL) + addLineFeed();
  receipt += createDivider(48) + addLineFeed();

  receipt += ESCPOS.ALIGN_RIGHT;
  receipt += formatText(`${t("total")}: ` + total.toFixed(2) + ' ' + currencySymbol, ESCPOS.FONT_LARGE_BOLD) + addLineFeed(2);

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
