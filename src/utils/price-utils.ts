import { CartItem } from "@/types/database-types";

export const calculatePriceWithoutTax = (totalPrice: number, percentage: number = 10): number => {
  if (percentage === null || percentage === undefined) percentage = 10;
  return totalPrice / (1 + percentage / 100);
};

export const calculateTaxAmount = (totalPrice: number, percentage: number = 10): number => {
  const priceWithoutTax = calculatePriceWithoutTax(totalPrice, percentage);
  return totalPrice - priceWithoutTax;
};

export const calculateToppingsPrice = (item: CartItem): number => {
  let toppingsPrice = 0;
  
  if (item.toppings && item.menuItem.topping_categories) {
    item.toppings.forEach(category => {
      const toppingCategory = item.menuItem.topping_categories?.find(id => id === category.categoryId);
      if (toppingCategory) {
        toppingsPrice += category.toppingIds.length * 1;
      }
    });
  }
  
  return toppingsPrice;
};

export const calculateCartTotals = (cart: CartItem[]) => {
  let total = 0;
  let totalTax = 0;

  cart.forEach(item => {
    const baseItemTotal = item.quantity * (item.menuItem.price || 0);
    const vatPercentage = item.menuItem.tax_percentage ?? 10;
    
    let itemToppingsTotal = 0;
    let itemToppingsTax = 0;
    
    if (item.selectedToppings && item.menuItem.toppingCategories) {
      item.selectedToppings.forEach(toppingCategory => {
        const category = item.menuItem.toppingCategories?.find(cat => cat.id === toppingCategory.categoryId);
        if (category) {
          toppingCategory.toppingIds.forEach(toppingId => {
            const topping = category.toppings.find(t => t.id === toppingId);
            if (topping) {
              const toppingPrice = topping.price ? parseFloat(topping.price.toString()) * item.quantity : 0;
              itemToppingsTotal += toppingPrice;
              
              const toppingVatPercentage = topping.tax_percentage ?? vatPercentage; 
              itemToppingsTax += calculateTaxAmount(toppingPrice, toppingVatPercentage);
            }
          });
        }
      });
    }
    
    const baseItemTax = calculateTaxAmount(baseItemTotal, vatPercentage);
    
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
