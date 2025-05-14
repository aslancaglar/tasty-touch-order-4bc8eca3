
import { MenuItemWithOptions, CartItem } from '@/types/database-types';

export const prepareInitialToppings = (menuItem: MenuItemWithOptions): CartItem['selectedToppings'] => {
  if (!menuItem.toppingCategories || menuItem.toppingCategories.length === 0) {
    return [];
  }

  return menuItem.toppingCategories.map(category => {
    // If this category allows multiple same topping, initialize with toppingQuantities array
    if (category.allow_multiple_same_topping) {
      return {
        categoryId: category.id,
        toppingIds: [],
        toppingQuantities: [] // Initialize empty quantities array
      };
    }
    
    // Regular category without multiple same topping
    return {
      categoryId: category.id,
      toppingIds: []
    };
  });
};

export const handleToppingToggle = (
  prevToppings: CartItem['selectedToppings'],
  categoryId: string,
  toppingId: string,
  quantity?: number,
  category?: any
): CartItem['selectedToppings'] => {
  const categoryIndex = prevToppings.findIndex(t => t.categoryId === categoryId);
  
  // If category not found in selected toppings
  if (categoryIndex === -1) {
    // Handle new category with multiple same topping support
    if (category?.allow_multiple_same_topping && quantity !== undefined) {
      return [
        ...prevToppings,
        {
          categoryId,
          toppingIds: quantity > 0 ? [toppingId] : [],
          toppingQuantities: quantity > 0 ? [{
            id: toppingId,
            quantity
          }] : []
        }
      ];
    }
    
    // Regular new category
    return [...prevToppings, {
      categoryId,
      toppingIds: [toppingId]
    }];
  }
  
  // Get the current category from previous toppings
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
        // Max selections reached - we'll return the original state
        // This should ideally be handled with a toast message in the component 
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
};
