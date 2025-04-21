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

type GroupedToppings = Array<{
  category: string;
  toppings: string[];
}>;

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
  } = data;
  
  const firstItem = cart[0];
  const vat = firstItem?.menuItem?.tax_percentage ?? 10;

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
  
  receipt += ESCPOS.ALIGN_CENTER;
  receipt += formatText(restaurant?.name || 'Restaurant', ESCPOS.FONT_LARGE_BOLD) + addLineFeed();
  
  if (restaurant?.location) {
    receipt += formatText(restaurant.location, ESCPOS.FONT_NORMAL) + addLineFeed();
  }
  
  receipt += formatText(`${date} ${time}`, ESCPOS.FONT_NORMAL) + addLineFeed();
  receipt += formatText(`COMMANDE #${orderNumber}`, ESCPOS.FONT_LARGE) + addLineFeed(2);
  
  if (orderType === 'takeaway') {
    receipt += formatText("A EMPORTER", ESCPOS.FONT_BOLD) + addLineFeed();
  } else if (orderType === 'dine-in' && tableNumber) {
    receipt += formatText(`SUR PLACE - TABLE: ${tableNumber}`, ESCPOS.FONT_BOLD) + addLineFeed();
  }
  receipt += ESCPOS.ALIGN_LEFT;
  
  receipt += createDivider(48) + addLineFeed();
  
  cart.forEach(item => {
    const itemPrice = parseFloat(item.itemPrice.toString()).toFixed(2);
    const itemText = `${item.quantity}x ${item.menuItem.name}`;
    const spaces = 48 - itemText.length - itemPrice.length - 4;
    
    receipt += formatText(itemText + ' '.repeat(Math.max(0, spaces)) + itemPrice + ' EUR', ESCPOS.FONT_BOLD) + addLineFeed();
    
    const options = getFormattedOptions(item).split(', ').filter(Boolean);
    options.forEach(option => {
      receipt += formatText(`  + ${option}`, ESCPOS.FONT_NORMAL) + addLineFeed();
    });

    const groupedToppings = getGroupedToppings(item);
    groupedToppings.forEach(group => {
      receipt += formatText(`  ${group.category}:`, ESCPOS.FONT_NORMAL) + addLineFeed();
      group.toppings.forEach(topping => {
        receipt += formatText(`    + ${topping}`, ESCPOS.FONT_NORMAL) + addLineFeed();
      });
    });
  });
  
  receipt += createDivider(48) + addLineFeed();
  
  receipt += ESCPOS.ALIGN_RIGHT;
  receipt += formatText('Sous-total: ' + subtotal.toFixed(2) + ' EUR', ESCPOS.FONT_NORMAL) + addLineFeed();
  receipt += formatText('TVA: ' + tax.toFixed(2) + ' EUR', ESCPOS.FONT_NORMAL) + addLineFeed();
  receipt += createDivider(48) + addLineFeed();
  
  receipt += ESCPOS.ALIGN_RIGHT;
  receipt += formatText('TOTAL: ' + total.toFixed(2) + ' EUR', ESCPOS.FONT_LARGE_BOLD) + addLineFeed(2);
  
  receipt += ESCPOS.ALIGN_CENTER;
  receipt += formatText('Merci de votre visite!', ESCPOS.FONT_NORMAL) + addLineFeed();
  receipt += formatText('A bientot!', ESCPOS.FONT_NORMAL) + addLineFeed(3);
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
