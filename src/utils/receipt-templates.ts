import { ESCPOS, formatText, centerText, rightAlignText, formatLine, createDivider, addLineFeed } from './print-utils';
import { CartItem } from '@/types/database-types';

interface ReceiptData {
  restaurant: {
    id?: string;
    name: string;
    location?: string;
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
}

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
    getFormattedToppings = () => ''
  } = data;
  
  const now = new Date();
  const date = now.toLocaleDateString('fr-FR', { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric' 
  });
  const time = now.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  
  let receipt = '';
  
  // Header centered with proper encoding
  receipt += ESCPOS.ALIGN_CENTER;
  receipt += formatText(restaurant?.name || 'Restaurant', ESCPOS.FONT_LARGE_BOLD) + addLineFeed();
  
  if (restaurant?.location) {
    receipt += formatText(restaurant.location, ESCPOS.FONT_NORMAL) + addLineFeed();
  }
  
  receipt += formatText(date, ESCPOS.FONT_NORMAL) + addLineFeed();
  receipt += formatText(`Commande #${orderNumber}`, ESCPOS.FONT_BOLD) + addLineFeed(2);
  
  if (orderType === 'takeaway') {
    receipt += formatText("A Emporter", ESCPOS.FONT_BOLD) + addLineFeed();
  } else if (orderType === 'dine-in' && tableNumber) {
    receipt += formatText(`Sur Place - Table: ${tableNumber}`, ESCPOS.FONT_BOLD) + addLineFeed();
  }
  receipt += ESCPOS.ALIGN_LEFT;
  
  // Divider line (48 characters for 80mm paper)
  receipt += createDivider(48) + addLineFeed();
  
  // Items section with proper spacing for 80mm
  cart.forEach(item => {
    const itemPrice = parseFloat(item.itemPrice.toString()).toFixed(2);
    const itemText = `${item.quantity}x ${item.menuItem.name}`;
    const spaces = 48 - itemText.length - itemPrice.length - 4; // -4 for "EUR " at the end
    
    receipt += formatText(itemText + ' '.repeat(Math.max(0, spaces)) + itemPrice + ' EUR', ESCPOS.FONT_BOLD) + addLineFeed();
    
    // Options and toppings with small font and indentation
    const options = getFormattedOptions(item).split(', ').filter(Boolean);
    options.forEach(option => {
      receipt += formatText(`  + ${option}`, ESCPOS.FONT_SMALL) + addLineFeed();
    });
    
    const toppings = getFormattedToppings(item).split(', ').filter(Boolean);
    toppings.forEach(topping => {
      receipt += formatText(`  + ${topping}`, ESCPOS.FONT_SMALL) + addLineFeed();
    });
  });
  
  // Totals section with right-aligned prices
  receipt += createDivider(48) + addLineFeed();
  
  receipt += ESCPOS.ALIGN_RIGHT;
  receipt += formatText(`Sous-total: ${subtotal.toFixed(2)} EUR`, ESCPOS.FONT_NORMAL) + addLineFeed();
  receipt += formatText(`TVA (10%): ${tax.toFixed(2)} EUR`, ESCPOS.FONT_NORMAL) + addLineFeed();
  receipt += createDivider(48) + addLineFeed();
  receipt += formatText(`TOTAL: ${total.toFixed(2)} EUR`, ESCPOS.FONT_LARGE_BOLD) + addLineFeed();
  receipt += ESCPOS.ALIGN_LEFT;
  
  receipt += createDivider(48) + addLineFeed(2);
  
  // Footer
  receipt += ESCPOS.ALIGN_CENTER;
  receipt += formatText('Merci de votre visite!', ESCPOS.FONT_NORMAL) + addLineFeed();
  receipt += formatText('A bientot!', ESCPOS.FONT_NORMAL) + addLineFeed(3);
  receipt += ESCPOS.ALIGN_LEFT;
  
  // Add extra line feeds before cutting to ensure the full receipt is printed
  receipt += addLineFeed(5);
  
  // Explicitly add the cut paper command with full feed
  receipt += ESCPOS.CUT_PAPER;
  
  return receipt;
};

const getFormattedOptions = (item: CartItem): string => {
  if (!item.selectedOptions) return '';
  
  return item.selectedOptions
    .map(option => {
      // Find the option in the menu item
      const menuOption = item.menuItem.options?.find(opt => opt.id === option.optionId);
      if (!menuOption) return null;
      
      // Find the selected choices
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
  
  // Flatten toppings from all categories
  const allToppings: string[] = [];
  
  item.selectedToppings.forEach(toppingGroup => {
    // Find the category
    const category = item.menuItem.toppingCategories?.find(cat => cat.id === toppingGroup.categoryId);
    if (!category) return;
    
    // Get names of selected toppings
    const selectedToppingNames = category.toppings
      .filter(topping => toppingGroup.toppingIds.includes(topping.id))
      .map(topping => topping.name);
    
    allToppings.push(...selectedToppingNames);
  });
  
  return allToppings.join(', ');
};
