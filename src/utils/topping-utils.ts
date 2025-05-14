
import { CartItem, MenuItemWithOptions } from "@/types/database-types";

// Function to get the quantity of a specific topping in a cart item
export const getToppingQuantity = (
  item: CartItem,
  categoryId: string,
  toppingId: string
): number => {
  const selectedCategory = item.selectedToppings.find(t => t.categoryId === categoryId);
  if (!selectedCategory) return 0;
  
  // Check if the topping is selected
  if (!selectedCategory.toppingIds.includes(toppingId)) return 0;
  
  // Return the quantity from toppingQuantities or default to 1 if not defined
  return selectedCategory.toppingQuantities?.[toppingId] || 1;
};

// Function to calculate the total cost of toppings for a cart item
export const calculateToppingsCost = (item: CartItem): number => {
  let cost = 0;
  
  if (!item.menuItem.toppingCategories) return cost;
  
  item.selectedToppings.forEach(selectedCategory => {
    const category = item.menuItem.toppingCategories?.find(
      c => c.categoryId === selectedCategory.categoryId
    );
    
    if (category) {
      selectedCategory.toppingIds.forEach(toppingId => {
        const topping = category.toppings.find(t => t.id === toppingId);
        if (topping) {
          // Get quantity (default to 1)
          const quantity = selectedCategory.toppingQuantities?.[toppingId] || 1;
          cost += parseFloat(topping.price.toString()) * quantity;
        }
      });
    }
  });
  
  return cost;
};

// Function to determine if a topping category should be shown based on conditions
export const shouldShowToppingCategory = (
  category: {
    id: string;
    show_if_selection_id?: string[] | null;
    show_if_selection_type?: string[] | null;
  },
  selectedToppings: {
    categoryId: string;
    toppingIds: string[];
  }[]
): boolean => {
  // If no conditions, always show
  if (
    (!category.show_if_selection_id || category.show_if_selection_id.length === 0) &&
    (!category.show_if_selection_type || category.show_if_selection_type.length === 0)
  ) {
    return true;
  }

  // Check if any selected toppings match the conditions
  return selectedToppings.some(selectedCategory => 
    selectedCategory.toppingIds.some(toppingId => 
      category.show_if_selection_id?.includes(toppingId)
    )
  );
};

// Function to handle toggling a topping with quantity support
export const handleToggleTopping = (
  categoryId: string,
  toppingId: string,
  quantity: number | undefined,
  selectedToppings: {
    categoryId: string;
    toppingIds: string[];
    toppingQuantities?: { [toppingId: string]: number };
  }[],
  allowMultipleQuantities: boolean = false
): {
  categoryId: string;
  toppingIds: string[];
  toppingQuantities?: { [toppingId: string]: number };
}[] => {
  // Find if we already have this category
  const categoryIndex = selectedToppings.findIndex(t => t.categoryId === categoryId);
  
  if (categoryIndex === -1) {
    // Category not found, add it with the topping
    const newToppingQuantities: { [toppingId: string]: number } = {};
    if (allowMultipleQuantities && quantity !== undefined && quantity > 0) {
      newToppingQuantities[toppingId] = quantity;
    }
    
    return [
      ...selectedToppings,
      {
        categoryId,
        toppingIds: [toppingId],
        toppingQuantities: Object.keys(newToppingQuantities).length > 0 ? newToppingQuantities : undefined
      }
    ];
  } else {
    // Category found, check if topping is already selected
    const category = selectedToppings[categoryIndex];
    const toppingIndex = category.toppingIds.indexOf(toppingId);
    
    // Handle multiple quantities
    if (allowMultipleQuantities && quantity !== undefined) {
      const updatedToppingQuantities = { ...(category.toppingQuantities || {}) };
      
      if (quantity <= 0) {
        // Remove the topping completely if quantity is 0 or negative
        delete updatedToppingQuantities[toppingId];
        
        return selectedToppings.map((cat, i) =>
          i === categoryIndex
            ? {
                ...cat,
                toppingIds: cat.toppingIds.filter(id => id !== toppingId),
                toppingQuantities: Object.keys(updatedToppingQuantities).length > 0 ? updatedToppingQuantities : undefined
              }
            : cat
        ).filter(cat => cat.toppingIds.length > 0);
      } else {
        // Update quantity and ensure topping is in toppingIds
        updatedToppingQuantities[toppingId] = quantity;
        
        return selectedToppings.map((cat, i) =>
          i === categoryIndex
            ? {
                ...cat,
                toppingIds: toppingIndex === -1 ? [...cat.toppingIds, toppingId] : cat.toppingIds,
                toppingQuantities: updatedToppingQuantities
              }
            : cat
        );
      }
    } else {
      // Simple toggle behavior for non-quantity toppings
      if (toppingIndex === -1) {
        // Topping not found, add it
        return selectedToppings.map((cat, i) =>
          i === categoryIndex
            ? {
                ...cat,
                toppingIds: [...cat.toppingIds, toppingId]
              }
            : cat
        );
      } else {
        // Topping found, remove it
        const updatedToppingIds = category.toppingIds.filter(id => id !== toppingId);
        
        if (updatedToppingIds.length === 0) {
          // Remove the category if no toppings left
          return selectedToppings.filter((_, i) => i !== categoryIndex);
        }
        
        return selectedToppings.map((cat, i) =>
          i === categoryIndex
            ? {
                ...cat,
                toppingIds: updatedToppingIds
              }
            : cat
        );
      }
    }
  }
};

// Format toppings for display with quantities
export const getFormattedToppings = (item: CartItem): string => {
  if (!item.selectedToppings || item.selectedToppings.length === 0) {
    return '';
  }
  
  return item.selectedToppings
    .map(selectedCategory => {
      const category = item.menuItem.toppingCategories?.find(c => c.id === selectedCategory.categoryId);
      if (!category) return '';
      
      return selectedCategory.toppingIds
        .map(toppingId => {
          const topping = category.toppings.find(t => t.id === toppingId);
          if (!topping) return '';
          
          const quantity = selectedCategory.toppingQuantities?.[toppingId];
          return quantity && quantity > 1 ? `${quantity}x ${topping.name}` : topping.name;
        })
        .filter(Boolean)
        .join(', ');
    })
    .filter(Boolean)
    .join(', ');
};
