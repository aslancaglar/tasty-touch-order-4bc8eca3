
import { CartItem } from "@/types/database-types";

// Helper function to get the active price (promotion or regular)
export const getActivePrice = (item: any): number => {
  if (hasPromotionPrice(item)) {
    return parseFloat(item.promotion_price.toString());
  }
  return parseFloat(item.price.toString());
};

// Check if an item has a valid promotion price
export const hasPromotionPrice = (item: any): boolean => {
  return item.promotion_price !== null && 
         item.promotion_price !== undefined && 
         parseFloat(item.promotion_price.toString()) > 0 && 
         parseFloat(item.promotion_price.toString()) < parseFloat(item.price.toString());
};

// Calculate discount percentage
export const getDiscountPercentage = (item: any): number => {
  if (!hasPromotionPrice(item)) return 0;
  
  const regularPrice = parseFloat(item.price.toString());
  const promoPrice = parseFloat(item.promotion_price.toString());
  return Math.round(((regularPrice - promoPrice) / regularPrice) * 100);
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

// Updated utility function to calculate cart totals with proper topping VAT using promotional prices
export const calculateCartTotals = (cart: CartItem[]) => {
  let total = 0;
  let totalTax = 0;
  let originalTotal = 0;
  let originalTax = 0;

  cart.forEach(item => {
    // Use promotional price if available
    const basePrice = hasPromotionPrice(item.menuItem) 
      ? parseFloat(item.menuItem.promotion_price!.toString())
      : parseFloat(item.menuItem.price.toString());
      
    // Original price always uses the regular price
    const originalBasePrice = parseFloat(item.menuItem.price.toString());
    
    // Calculate with quantity
    const baseItemTotal = item.quantity * basePrice;
    const originalBaseItemTotal = item.quantity * originalBasePrice;
    
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
    const originalBaseItemTax = calculateTaxAmount(originalBaseItemTotal, vatPercentage);
    
    // Add to totals
    total += baseItemTotal + itemToppingsTotal;
    totalTax += baseItemTax + itemToppingsTax;
    
    // Add to original totals
    originalTotal += originalBaseItemTotal + itemToppingsTotal;
    originalTax += originalBaseItemTax + itemToppingsTax;
  });

  const subtotal = total - totalTax;
  const originalSubtotal = originalTotal - originalTax;

  return {
    total,
    subtotal,
    tax: totalTax,
    originalTotal,
    originalSubtotal,
    originalTax
  };
};
