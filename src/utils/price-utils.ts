
import { CartItem, MenuItem } from "@/types/database-types";

// Helper function to get the active price (promotion price if available, otherwise regular price)
export const getActivePrice = (item: MenuItem | { price: number; promotion_price?: number | null }): number => {
  if (item.promotion_price !== undefined && item.promotion_price !== null && item.promotion_price > 0) {
    return parseFloat(item.promotion_price.toString());
  }
  return parseFloat(item.price.toString());
};

// Helper function to check if item has a valid promotion price
export const hasPromotionPrice = (item: MenuItem | { price: number; promotion_price?: number | null }): boolean => {
  return item.promotion_price !== undefined && 
         item.promotion_price !== null && 
         item.promotion_price > 0 &&
         item.promotion_price < parseFloat(item.price.toString());
};

// Helper function to calculate discount percentage
export const getDiscountPercentage = (item: MenuItem | { price: number; promotion_price?: number | null }): number => {
  if (!hasPromotionPrice(item)) return 0;
  
  const originalPrice = parseFloat(item.price.toString());
  const promoPrice = parseFloat(item.promotion_price!.toString());
  
  return Math.round(((originalPrice - promoPrice) / originalPrice) * 100);
};

export const calculatePriceWithoutTax = (totalPrice: number, percentage: number = 10): number => {
  if (percentage === null || percentage === undefined) percentage = 10;
  return totalPrice / (1 + percentage / 100);
};

export const calculateTaxAmount = (totalPrice: number, percentage: number = 10): number => {
  const priceWithoutTax = calculatePriceWithoutTax(totalPrice, percentage);
  return totalPrice - priceWithoutTax;
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

// Updated utility function to calculate cart totals with proper topping VAT and promotion prices
export const calculateCartTotals = (cart: CartItem[]) => {
  let total = 0;
  let totalTax = 0;

  cart.forEach(item => {
    // Use active price (promotion price if available) for the menu item
    const activePrice = getActivePrice(item.menuItem);
    const baseItemTotal = item.quantity * activePrice;
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
              const toppingPrice = topping.price ? parseFloat(String(topping.price)) * item.quantity : 0;
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
