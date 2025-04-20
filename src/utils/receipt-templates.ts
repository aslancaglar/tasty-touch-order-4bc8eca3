
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
  
  // Header with emojis and restaurant info
  receipt += centerText(`🍽 ${restaurant?.name || 'Restaurant'} 🍽`, ESCPOS.FONT_LARGE_BOLD) + addLineFeed();
  
  if (restaurant?.location) {
    receipt += centerText(restaurant.location, ESCPOS.FONT_NORMAL) + addLineFeed();
  }
  
  receipt += centerText(`${date} ${time}`, ESCPOS.FONT_NORMAL) + addLineFeed();
  receipt += centerText(`Commande #${orderNumber}`, ESCPOS.FONT_BOLD) + addLineFeed(2);
  
  if (orderType === 'takeaway') {
    receipt += centerText('À Emporter', ESCPOS.FONT_BOLD) + addLineFeed();
  } else if (orderType === 'dine-in' && tableNumber) {
    receipt += centerText(`Table: ${tableNumber}`, ESCPOS.FONT_BOLD) + addLineFeed();
  }
  
  // Divider line (32 characters)
  receipt += createDivider(32) + addLineFeed();
  
  // Items section
  cart.forEach(item => {
    const itemPrice = parseFloat(item.itemPrice.toString()).toFixed(2);
    const itemText = `${item.quantity}x ${item.menuItem.name}`;
    const spaces = 32 - itemText.length - itemPrice.length - 2; // -2 for "€ " at the end
    
    receipt += formatText(itemText + ' '.repeat(Math.max(0, spaces)) + itemPrice + ' €', ESCPOS.FONT_BOLD) + addLineFeed();
    
    // Options and toppings with small font and indentation
    const options = getFormattedOptions(item).split(', ').filter(Boolean);
    options.forEach(option => {
      receipt += formatText(`+ ${option}`, ESCPOS.FONT_SMALL) + addLineFeed();
    });
    
    const toppings = getFormattedToppings(item).split(', ').filter(Boolean);
    toppings.forEach(topping => {
      receipt += formatText(`+ ${topping}`, ESCPOS.FONT_SMALL) + addLineFeed();
    });
  });
  
  // Totals section with aligned prices
  receipt += createDivider(32) + addLineFeed();
  
  const subtotalLine = `Sous-total${' '.repeat(Math.max(0, 21 - subtotal.toFixed(2).length))}${subtotal.toFixed(2)} €`;
  receipt += formatText(subtotalLine) + addLineFeed();
  
  const taxLine = `TVA (10%)${' '.repeat(Math.max(0, 22 - tax.toFixed(2).length))}${tax.toFixed(2)} €`;
  receipt += formatText(taxLine) + addLineFeed();
  
  receipt += createDivider(32) + addLineFeed();
  
  const totalLine = `TOTAL${' '.repeat(Math.max(0, 25 - total.toFixed(2).length))}${total.toFixed(2)} €`;
  receipt += formatText(totalLine, ESCPOS.FONT_LARGE_BOLD) + addLineFeed();
  
  receipt += createDivider(32) + addLineFeed(2);
  
  // Footer
  receipt += centerText('Merci de votre visite!') + addLineFeed();
  receipt += centerText('À bientôt!') + addLineFeed(2);
  
  // Cut paper
  receipt += ESCPOS.CUT_PAPER;
  
  return receipt;
};

// Helper function to format options (moved from OrderSummary)
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

// Helper function to format toppings (moved from OrderSummary)
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
