
import { MenuItemWithOptions } from '@/types/database-types';

/**
 * Calculates the total price for a menu item including selected options and toppings
 */
export const calculateItemPrice = (
  item: MenuItemWithOptions, 
  options: { optionId: string; choiceIds: string[]; }[], 
  toppings: { categoryId: string; toppingIds: string[]; }[]
): number => {
  let price = parseFloat(item.price.toString());
  
  // Add option prices
  if (item.options) {
    item.options.forEach(option => {
      const selectedOption = options.find(o => o.optionId === option.id);
      if (selectedOption) {
        selectedOption.choiceIds.forEach(choiceId => {
          const choice = option.choices.find(c => c.id === choiceId);
          if (choice && choice.price) {
            price += parseFloat(choice.price.toString());
          }
        });
      }
    });
  }
  
  // Add topping prices
  if (item.toppingCategories) {
    item.toppingCategories.forEach(category => {
      const selectedToppingCategory = toppings.find(t => t.categoryId === category.id);
      if (selectedToppingCategory) {
        selectedToppingCategory.toppingIds.forEach(toppingId => {
          const topping = category.toppings.find(t => t.id === toppingId);
          if (topping && topping.price) {
            price += parseFloat(topping.price.toString());
          }
        });
      }
    });
  }
  
  return price;
};

/**
 * Returns the appropriate currency symbol for a given currency code
 */
export const getCurrencySymbol = (currency: string): string => {
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
  
  const code = currency?.toUpperCase() || "EUR";
  return CURRENCY_SYMBOLS[code] || code;
};
