
import { CartItem } from "@/types/database-types";

export const calculatePriceWithoutTax = (totalPrice: number, percentage: number = 10): number => {
  if (percentage === null || percentage === undefined) percentage = 10;
  return totalPrice / (1 + percentage / 100);
};

export const calculateTaxAmount = (totalPrice: number, percentage: number = 10): number => {
  const priceWithoutTax = calculatePriceWithoutTax(totalPrice, percentage);
  return totalPrice - priceWithoutTax;
};

// Get the active price (regular or promotion)
export const getActivePrice = (price: number, promotionPrice: number | null): number => {
  return (promotionPrice !== null && promotionPrice > 0) ? promotionPrice : price;
};

// Check if a menu item is available based on time constraints
export const isItemAvailable = (item: any): boolean => {
  if (!item.available_from || !item.available_until) {
    return true; // If no time constraint is set, the item is always available
  }

  const currentDate = new Date();
  const currentTime = currentDate.getHours() * 60 + currentDate.getMinutes(); // Convert to minutes since midnight
  
  // Parse HH:MM:SS format to minutes since midnight
  const parseTimeToMinutes = (timeString: string): number => {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  };
  
  const fromMinutes = parseTimeToMinutes(item.available_from);
  const untilMinutes = parseTimeToMinutes(item.available_until);
  
  // Handle cases where availability crosses midnight
  if (fromMinutes <= untilMinutes) {
    // Regular time range (e.g., 11:00 to 14:00)
    return currentTime >= fromMinutes && currentTime <= untilMinutes;
  } else {
    // Time range spans midnight (e.g., 22:00 to 02:00)
    return currentTime >= fromMinutes || currentTime <= untilMinutes;
  }
};

// Check if a topping category should be required based on selected toppings
export const shouldToppingCategoryBeRequired = (
  category: { 
    required?: boolean; 
    id: string;
    show_if_selection_id?: string[] | null;
  }, 
  selectedToppings: {
    categoryId: string;
    toppingIds: string[];
  }[]
): boolean => {
  // If category has no conditions, respect its original required state
  if (!category.show_if_selection_id || category.show_if_selection_id.length === 0) {
    return !!category.required;
  }
  
  // Category has conditions - it's only required if the conditions are met
  const conditionMet = selectedToppings.some(selection => 
    selection.toppingIds.some(toppingId => 
      category.show_if_selection_id?.includes(toppingId)
    )
  );
  
  // Only required if conditions are met AND it's originally marked as required
  return conditionMet && !!category.required;
};

// Updated utility function to calculate cart totals with proper topping VAT
export const calculateCartTotals = (cart: CartItem[]) => {
  let total = 0;
  let totalTax = 0;

  cart.forEach(item => {
    // Get the active price (regular or promotion)
    const itemPrice = getActivePrice(
      item.menuItem.price, 
      item.menuItem.promotion_price
    );
    
    // Base menu item price with its VAT
    const baseItemTotal = item.quantity * itemPrice;
    const vatPercentage = item.menuItem.tax_percentage ?? 10;
    
    let itemToppingsTotal = 0;
    let itemToppingsTax = 0;
    
    // Calculate toppings price and tax separately
    if (item.selectedToppings && item.menuItem.toppingCategories) {
      item.selectedToppings.forEach(toppingCategory => {
        const category = item.menuItem.toppingCategories?.find(cat => cat.id === toppingCategory.categoryId);
        if (category) {
          toppingCategory.toppingIds.forEach(toppingId => {
            const topping = category.toppings.find(t => t.id === toppingId);
            if (topping) {
              const toppingPrice = topping.price ? parseFloat(topping.price.toString()) * item.quantity : 0;
              itemToppingsTotal += toppingPrice;
              
              // Use topping specific tax rate if available
              const toppingVatPercentage = topping.tax_percentage ?? vatPercentage; 
              itemToppingsTax += calculateTaxAmount(toppingPrice, toppingVatPercentage);
            }
          });
        }
      });
    }
    
    // Calculate base item tax
    const baseItemTax = calculateTaxAmount(baseItemTotal, vatPercentage);
    
    // Add to totals
    total += baseItemTotal + itemToppingsTotal;
    totalTax += baseItemTax + itemToppingsTax;
  });

  const subtotal = total - totalTax;

  return {
    total,
    subtotal,
    tax: totalTax
  };
};
