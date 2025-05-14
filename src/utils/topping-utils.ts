import { MenuItemWithOptions, CartItem } from "@/types/database-types";

/**
 * Prepares initial selected toppings structure for a menu item
 * Handles both regular toppings and quantity-based toppings
 */
export const prepareInitialToppings = (menuItem: MenuItemWithOptions): CartItem['selectedToppings'] => {
  if (!menuItem.toppingCategories || menuItem.toppingCategories.length === 0) {
    return [];
  }

  return menuItem.toppingCategories.map(category => {
    const base = {
      categoryId: category.id,
      toppingIds: []
    };

    // For categories that allow multiple same topping, add the toppingQuantities array
    if (category.allow_multiple_same_topping) {
      return {
        ...base,
        toppingQuantities: category.toppings.map(topping => ({
          id: topping.id,
          quantity: 0
        }))
      };
    }
    
    return base;
  });
};

/**
 * Handles toggling a topping selection based on whether the category allows multiple same topping
 */
export const handleToppingToggle = (
  prevToppings: CartItem['selectedToppings'],
  categoryId: string,
  toppingId: string,
  quantity?: number,
  category?: any
): CartItem['selectedToppings'] => {
  const categoryIndex = prevToppings.findIndex(t => t.categoryId === categoryId);
  
  // If category is not found, create a new entry
  if (categoryIndex === -1) {
    const newCategory = {
      categoryId,
      toppingIds: [toppingId]
    };
    
    // If this is a multiple same topping category and quantity is provided
    if (category?.allow_multiple_same_topping && quantity !== undefined) {
      return [
        ...prevToppings,
        {
          ...newCategory,
          toppingQuantities: [{
            id: toppingId,
            quantity
          }]
        }
      ];
    }
    
    return [...prevToppings, newCategory];
  }
  
  // Get the current category
  const currentCategory = prevToppings[categoryIndex];
  const newToppings = [...prevToppings];
  
  // Handle categories with multiple same topping
  if (category?.allow_multiple_same_topping && quantity !== undefined) {
    // Initialize toppingQuantities if it doesn't exist
    if (!currentCategory.toppingQuantities) {
      currentCategory.toppingQuantities = [];
    }
    
    const quantityIndex = currentCategory.toppingQuantities.findIndex(t => t.id === toppingId);
    
    if (quantityIndex === -1) {
      // If this topping doesn't have a quantity entry yet
      currentCategory.toppingQuantities.push({
        id: toppingId,
        quantity
      });
    } else {
      // Update the existing quantity
      currentCategory.toppingQuantities[quantityIndex].quantity = quantity;
    }
    
    // Manage the toppingIds array based on quantity
    if (quantity > 0) {
      // Add topping to toppingIds if not already there
      if (!currentCategory.toppingIds.includes(toppingId)) {
        currentCategory.toppingIds.push(toppingId);
      }
    } else {
      // Remove topping from toppingIds when quantity is 0
      currentCategory.toppingIds = currentCategory.toppingIds.filter(id => id !== toppingId);
    }
    
    newToppings[categoryIndex] = currentCategory;
    return newToppings;
  }
  
  // Standard toggle behavior for regular categories
  if (currentCategory.toppingIds.includes(toppingId)) {
    // Remove topping
    newToppings[categoryIndex] = {
      ...currentCategory,
      toppingIds: currentCategory.toppingIds.filter(id => id !== toppingId)
    };
  } else {
    // Check max selections
    if (category?.max_selections > 0 && currentCategory.toppingIds.length >= category.max_selections) {
      // If max selections is 1, replace the existing selection
      if (category.max_selections === 1) {
        newToppings[categoryIndex] = {
          ...currentCategory,
          toppingIds: [toppingId]
        };
      } else {
        // Otherwise, just don't add it (max limit reached)
        return prevToppings;
      }
    } else {
      // Add topping
      newToppings[categoryIndex] = {
        ...currentCategory,
        toppingIds: [...currentCategory.toppingIds, toppingId]
      };
    }
  }
  
  return newToppings;
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
