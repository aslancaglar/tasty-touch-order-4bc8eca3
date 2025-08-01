
import { CartItem, MenuItemWithOptions } from '@/types/database-types';

/**
 * Validates if a topping category should be displayed based on conditional display rules.
 */
export function shouldShowToppingCategory(item: MenuItemWithOptions, categoryId: string): boolean {
  // If no topping categories, nothing to show
  if (!item.toppingCategories) return false;

  // Find the category
  const category = item.toppingCategories.find(cat => cat.id === categoryId);
  if (!category) return false;

  // If no conditional display rules, always show
  if (!category.show_if_selection_type || !category.show_if_selection_id || 
      category.show_if_selection_type.length === 0 || 
      category.show_if_selection_id.length === 0) {
    return true;
  }

  // Check if any of the required options are selected
  let shouldShow = false;
  
  for (let i = 0; i < category.show_if_selection_type.length; i++) {
    const type = category.show_if_selection_type[i];
    const id = category.show_if_selection_id[i];
    
    if (type === 'option') {
      // Option condition - check if the option with this ID has any selection
      shouldShow = checkOptionSelection(item, id);
      if (shouldShow) break;
    } else if (type === 'topping') {
      // Topping condition - check if the topping with this ID is selected
      shouldShow = checkToppingSelection(item, id);
      if (shouldShow) break;
    }
  }
  
  return shouldShow;
}

/**
 * Checks if a specific option has any selection in the item.
 */
function checkOptionSelection(item: MenuItemWithOptions, optionId: string): boolean {
  if (!item.options) return false;
  
  const option = item.options.find(o => o.id === optionId);
  if (!option) return false;
  
  // The option exists, now check if any choice is selected
  // Note: Actual selections would typically be tracked separately
  return true; // Simplified for this example
}

/**
 * Checks if a specific topping is selected in the item.
 */
function checkToppingSelection(item: MenuItemWithOptions, toppingId: string): boolean {
  // This is a placeholder - actual implementation would check against a selection state
  return false;
}

/**
 * Calculate a menu item's price based on selected options and toppings.
 * Now includes support for topping quantities.
 */
export function calculateItemPrice(item: MenuItemWithOptions, selectedOptions: {
  optionId: string;
  choiceIds: string[];
}[], selectedToppings: {
  categoryId: string;
  toppingIds: string[];
  toppingQuantities?: { [toppingId: string]: number };
}[]): number {
  // Start with base price
  let price = item.price;

  // Add option prices
  const optionsPrice = selectedOptions.reduce((total, optionSelection) => {
    const option = item.options?.find(o => o.id === optionSelection.optionId);
    if (!option) return total;

    const choicesPrice = optionSelection.choiceIds.reduce((choicesTotal, choiceId) => {
      const choice = option.choices.find(c => c.id === choiceId);
      return choicesTotal + (choice?.price || 0);
    }, 0);

    return total + choicesPrice;
  }, 0);

  price += optionsPrice;

  // Add topping prices, accounting for quantities
  const toppingsPrice = selectedToppings.reduce((total, toppingSelection) => {
    const category = item.toppingCategories?.find(c => c.id === toppingSelection.categoryId);
    if (!category) return total;

    return total + toppingSelection.toppingIds.reduce((toppingTotal, toppingId) => {
      const topping = category.toppings.find(t => t.id === toppingId);
      if (!topping) return toppingTotal;
      
      // Check if we have a quantity for this topping
      let quantity = 1;
      if (category.allow_multiple_same_topping && 
          toppingSelection.toppingQuantities && 
          toppingSelection.toppingQuantities[toppingId]) {
        quantity = toppingSelection.toppingQuantities[toppingId];
      }
      
      return toppingTotal + (topping.price * quantity);
    }, 0);
  }, 0);

  price += toppingsPrice;

  return price;
}

/**
 * Validates if a topping can be selected based on category limits.
 */
export function canSelectTopping(
  categoryId: string,
  toppingId: string,
  currentSelections: { categoryId: string; toppingIds: string[] }[],
  toppingCategories: any[]
): boolean {
  const category = toppingCategories.find(cat => cat.id === categoryId);
  if (!category) return false;

  const currentSelection = currentSelections.find(sel => sel.categoryId === categoryId);
  const currentCount = currentSelection?.toppingIds.length || 0;
  const isCurrentlySelected = currentSelection?.toppingIds.includes(toppingId) || false;

  // If already selected, allow deselection
  if (isCurrentlySelected) return true;

  // Check if we can add more selections
  if (category.max_selections && currentCount >= category.max_selections) {
    return false;
  }

  return true;
}

/**
 * Calculates the tax amount for a menu item with selected options and toppings.
 * Now includes support for topping quantities.
 */
export function calculateItemTax(item: MenuItemWithOptions, selectedOptions: {
  optionId: string;
  choiceIds: string[];
}[], selectedToppings: {
  categoryId: string;
  toppingIds: string[];
  toppingQuantities?: { [toppingId: string]: number };
}[]): number {
  // Base item tax
  const baseItemTaxRate = item.tax_percentage || 10;
  let totalTax = (item.price * baseItemTaxRate) / 100;

  // Options tax (assuming same tax rate as base item for simplicity)
  const optionsPrice = selectedOptions.reduce((total, optionSelection) => {
    const option = item.options?.find(o => o.id === optionSelection.optionId);
    if (!option) return total;

    const choicesPrice = optionSelection.choiceIds.reduce((choicesTotal, choiceId) => {
      const choice = option.choices.find(c => c.id === choiceId);
      return choicesTotal + (choice?.price || 0);
    }, 0);

    return total + choicesPrice;
  }, 0);

  totalTax += (optionsPrice * baseItemTaxRate) / 100;

  // Toppings tax (using specific tax rate for each topping)
  selectedToppings.forEach(toppingSelection => {
    const category = item.toppingCategories?.find(c => c.id === toppingSelection.categoryId);
    if (!category) return;

    toppingSelection.toppingIds.forEach(toppingId => {
      const topping = category.toppings.find(t => t.id === toppingId);
      if (!topping) return;
      
      // Check if we have a quantity for this topping
      let quantity = 1;
      if (category.allow_multiple_same_topping && 
          toppingSelection.toppingQuantities && 
          toppingSelection.toppingQuantities[toppingId]) {
        quantity = toppingSelection.toppingQuantities[toppingId];
      }
      
      const toppingTaxRate = topping.tax_percentage || baseItemTaxRate;
      totalTax += ((topping.price * quantity) * toppingTaxRate) / 100;
    });
  });

  return totalTax;
}
