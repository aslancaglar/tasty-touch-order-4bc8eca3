
import { MenuItemWithOptions, CartItem } from "@/types/database-types";

export function prepareInitialToppings(menuItem: MenuItemWithOptions): CartItem['selectedToppings'] {
  if (!menuItem.toppingCategories || menuItem.toppingCategories.length === 0) {
    return [];
  }
  
  return menuItem.toppingCategories.map(category => {
    // Default basic structure with empty toppingIds array
    const toppingCategory = {
      categoryId: category.id,
      toppingIds: []
    };
    
    // If this category allows multiple same toppings, add the toppingQuantities array
    if (category.allow_multiple_same_topping) {
      return {
        ...toppingCategory,
        toppingQuantities: []
      };
    }
    
    return toppingCategory;
  });
}

export function handleToppingToggle(
  prevToppings: CartItem['selectedToppings'], 
  categoryId: string, 
  toppingId: string, 
  quantity?: number,
  category?: MenuItemWithOptions['toppingCategories'][0]
): CartItem['selectedToppings'] {
  const categoryIndex = prevToppings.findIndex(t => t.categoryId === categoryId);
  
  // If category not found, create a new entry
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
  
  // Handle multiple same topping categories
  if (category?.allow_multiple_same_topping && quantity !== undefined) {
    // Initialize toppingQuantities if it doesn't exist
    const toppingQuantities = currentCategory.toppingQuantities || [];
    const quantityIndex = toppingQuantities.findIndex(t => t.id === toppingId);
    
    let newToppingQuantities;
    if (quantityIndex === -1) {
      // Add new topping quantity
      newToppingQuantities = [...toppingQuantities, { id: toppingId, quantity }];
    } else {
      // Update existing topping quantity
      newToppingQuantities = [...toppingQuantities];
      newToppingQuantities[quantityIndex] = { id: toppingId, quantity };
    }
    
    // Update toppingIds based on quantity
    let newToppingIds;
    if (quantity > 0) {
      // Add to toppingIds if not present and quantity > 0
      newToppingIds = currentCategory.toppingIds.includes(toppingId) 
        ? currentCategory.toppingIds 
        : [...currentCategory.toppingIds, toppingId];
    } else {
      // Remove from toppingIds if quantity = 0
      newToppingIds = currentCategory.toppingIds.filter(id => id !== toppingId);
    }
    
    // Create new toppings array with updated category
    const newToppings = [...prevToppings];
    newToppings[categoryIndex] = {
      ...currentCategory,
      toppingIds: newToppingIds,
      toppingQuantities: newToppingQuantities
    };
    
    return newToppings;
  }
  
  // Regular toggle behavior for standard categories
  if (currentCategory.toppingIds.includes(toppingId)) {
    // Remove topping
    const newToppings = [...prevToppings];
    newToppings[categoryIndex] = {
      ...currentCategory,
      toppingIds: currentCategory.toppingIds.filter(id => id !== toppingId)
    };
    return newToppings;
  } else {
    // Check if max selections would be exceeded
    if (category && category.max_selections > 0) {
      if (category.max_selections === 1) {
        // For single selection, replace existing
        const newToppings = [...prevToppings];
        newToppings[categoryIndex] = {
          ...currentCategory,
          toppingIds: [toppingId]
        };
        return newToppings;
      } else if (currentCategory.toppingIds.length >= category.max_selections) {
        // Max selections reached - we'll handle the toast notification outside this function
        return prevToppings;
      }
    }
    
    // Add topping
    const newToppings = [...prevToppings];
    newToppings[categoryIndex] = {
      ...currentCategory,
      toppingIds: [...currentCategory.toppingIds, toppingId]
    };
    return newToppings;
  }
}
