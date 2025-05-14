
import { MenuItemWithOptions, CartItem } from "@/types/database-types";

/**
 * Prepares initial selected toppings structure for a menu item
 * Handles both regular toppings and quantity-based toppings
 */
export const prepareInitialToppings = (item: MenuItemWithOptions) => {
  if (!item.toppingCategories) return [];
  
  return item.toppingCategories.map(category => ({
    categoryId: category.id,
    toppingIds: [],
    // Initialize quantities array for categories that allow multiple same topping
    toppingQuantities: category.allow_multiple_same_topping 
      ? category.toppings.map(topping => ({ id: topping.id, quantity: 0 }))
      : []
  }));
};

/**
 * Handles toggling a topping selection based on whether the category allows multiple same topping
 */
export const handleToppingToggle = (
  selectedToppings: CartItem['selectedToppings'],
  categoryId: string,
  toppingId: string,
  quantity?: number,
  category?: MenuItemWithOptions['toppingCategories'][0]
) => {
  return selectedToppings.map(cat => {
    if (cat.categoryId !== categoryId) return cat;
    
    // Handle quantity-based toppings (multiple same topping allowed)
    if (category?.allow_multiple_same_topping && quantity !== undefined) {
      // Create or update toppingQuantities array if it doesn't exist
      const toppingQuantities = cat.toppingQuantities || 
        category.toppings.map(t => ({ id: t.id, quantity: 0 }));
      
      const updatedQuantities = toppingQuantities.map(tq => {
        if (tq.id === toppingId) {
          return { ...tq, quantity };
        }
        return tq;
      });
      
      // Also update the toppingIds array for compatibility
      const updatedToppingIds = updatedQuantities
        .filter(tq => tq.quantity > 0)
        .map(tq => tq.id);
      
      return {
        ...cat,
        toppingIds: updatedToppingIds,
        toppingQuantities: updatedQuantities
      };
    } 
    
    // Handle standard toppings (no multiple same topping)
    else {
      const toppingIds = [...cat.toppingIds];
      const toppingIndex = toppingIds.indexOf(toppingId);
      
      if (toppingIndex === -1) {
        toppingIds.push(toppingId);
      } else {
        toppingIds.splice(toppingIndex, 1);
      }
      
      return {
        ...cat,
        toppingIds
      };
    }
  });
};

/**
 * Format selected toppings for display in the cart
 */
export const formatToppingsForDisplay = (
  selectedToppings: CartItem['selectedToppings'],
  item: MenuItemWithOptions
) => {
  if (!item.toppingCategories) return [];
  
  const formattedToppings: string[] = [];
  
  selectedToppings.forEach(catSelection => {
    const category = item.toppingCategories?.find(c => c.id === catSelection.categoryId);
    if (!category) return;
    
    // If this category allows multiple same topping and we have quantities
    if (category.allow_multiple_same_topping && catSelection.toppingQuantities?.length) {
      catSelection.toppingQuantities
        .filter(tq => tq.quantity > 0)
        .forEach(tq => {
          const topping = category.toppings.find(t => t.id === tq.id);
          if (topping) {
            formattedToppings.push(`${topping.name} (x${tq.quantity})`);
          }
        });
    } 
    // Standard toppings display
    else {
      catSelection.toppingIds.forEach(toppingId => {
        const topping = category.toppings.find(t => t.id === toppingId);
        if (topping) {
          formattedToppings.push(topping.name);
        }
      });
    }
  });
  
  return formattedToppings;
};
