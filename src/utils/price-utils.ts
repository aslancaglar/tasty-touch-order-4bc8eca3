
import { CartItem } from "@/types/database-types";

export const calculatePriceWithoutTax = (totalPrice: number, percentage: number = 10): number => {
  if (percentage === null || percentage === undefined) percentage = 10;
  return totalPrice / (1 + percentage / 100);
};

export const calculateTaxAmount = (totalPrice: number, percentage: number = 10): number => {
  const priceWithoutTax = calculatePriceWithoutTax(totalPrice, percentage);
  return totalPrice - priceWithoutTax;
};

// New utility function to calculate percentage discount
export const calculateDiscountPercentage = (originalPrice: number, discountedPrice: number): number => {
  if (!originalPrice || !discountedPrice || originalPrice <= 0 || discountedPrice <= 0) return 0;
  const discount = ((originalPrice - discountedPrice) / originalPrice) * 100;
  return Math.round(discount); // Round to whole number
};

// Updated utility function to calculate cart totals with proper topping VAT
export const calculateCartTotals = (cart: CartItem[]) => {
  let total = 0;
  let totalTax = 0;

  cart.forEach(item => {
    // Base menu item price with its VAT
    const baseItemTotal = item.quantity * (item.menuItem.price || 0);
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
