
// src/utils/topping-utils.ts
import { CartItem, MenuItem, SelectedToppingCategory, ToppingCategory } from "@/types/database-types";

export function calculateToppingPrice(
  menuItem: MenuItem,
  selectedToppings: SelectedToppingCategory[]
): number {
  if (!menuItem.toppingCategories || !selectedToppings) return 0;

  let totalToppingPrice = 0;

  // Iterate through each selected topping category
  for (const selectedCategory of selectedToppings) {
    // Find the corresponding topping category definition in the menu item
    const categoryDefinition = menuItem.toppingCategories.find(
      (cat) => cat.id === selectedCategory.categoryId
    );

    if (!categoryDefinition) continue;

    // Go through each selected topping in this category
    for (const toppingId of selectedCategory.toppingIds) {
      // Find the topping in the category
      const topping = categoryDefinition.toppings.find(
        (t) => t.id === toppingId
      );
      
      if (topping) {
        // Check if we have multiple quantities of this topping
        const quantity = categoryDefinition.allow_multiple_same_topping && 
          selectedCategory.toppingQuantities && 
          selectedCategory.toppingQuantities[toppingId] 
            ? selectedCategory.toppingQuantities[toppingId] 
            : 1;
            
        // Add the topping price multiplied by quantity
        totalToppingPrice += (parseFloat(topping.price.toString()) * quantity);
      }
    }
  }

  return totalToppingPrice;
}

// Helper function to add/remove a topping from the cart item's selected toppings
export function toggleTopping(
  cartItem: CartItem,
  categoryId: string,
  toppingId: string,
  enabled: boolean,
  quantity: number = 1
): CartItem {
  // Clone the cart item to avoid mutating the original
  const newItem = { ...cartItem };
  
  // Initialize selectedToppings array if it doesn't exist
  if (!newItem.selectedToppings) {
    newItem.selectedToppings = [];
  }

  // Find the topping category in the item
  const category = newItem.menuItem.toppingCategories?.find(cat => cat.id === categoryId);
  if (!category) return newItem;
  
  // Check if we already have this category in the selected toppings
  let selectedCategory = newItem.selectedToppings.find(
    (cat) => cat.categoryId === categoryId
  );

  if (!selectedCategory) {
    // If the category doesn't exist in selections and we're enabling, create it
    if (enabled) {
      selectedCategory = {
        categoryId,
        toppingIds: [],
        toppingQuantities: {}
      };
      newItem.selectedToppings.push(selectedCategory);
    } else {
      // If we're trying to disable a topping that isn't selected, just return
      return newItem;
    }
  }

  if (enabled) {
    // Add the topping if not already in the list
    if (!selectedCategory.toppingIds.includes(toppingId)) {
      selectedCategory.toppingIds.push(toppingId);
    }
    
    // If this category allows multiple of the same topping, track quantities
    if (category.allow_multiple_same_topping) {
      // Initialize toppingQuantities if it doesn't exist
      if (!selectedCategory.toppingQuantities) {
        selectedCategory.toppingQuantities = {};
      }
      
      // Set the quantity for this topping
      selectedCategory.toppingQuantities[toppingId] = quantity;
    }
  } else {
    // Remove the topping
    selectedCategory.toppingIds = selectedCategory.toppingIds.filter(
      (id) => id !== toppingId
    );
    
    // Also remove the quantity entry if it exists
    if (selectedCategory.toppingQuantities && selectedCategory.toppingQuantities[toppingId]) {
      delete selectedCategory.toppingQuantities[toppingId];
    }
    
    // If no more toppings in this category, remove the category
    if (selectedCategory.toppingIds.length === 0) {
      newItem.selectedToppings = newItem.selectedToppings.filter(
        (cat) => cat.categoryId !== categoryId
      );
    }
  }

  // Update the item price to include selected toppings
  const optionsPrice = cartItem.optionsPrice || 0;
  const toppingsPrice = calculateToppingPrice(newItem.menuItem, newItem.selectedToppings);
  const basePrice = parseFloat(String(newItem.menuItem.price));
  newItem.itemPrice = basePrice + optionsPrice + toppingsPrice;

  return newItem;
}

// Helper to increment/decrement topping quantity
export function updateToppingQuantity(
  cartItem: CartItem,
  categoryId: string,
  toppingId: string,
  newQuantity: number
): CartItem {
  // Clone the cart item to avoid mutating the original
  const newItem = { ...cartItem };
  
  // Check if the category allows multiple same topping
  const category = newItem.menuItem.toppingCategories?.find(cat => cat.id === categoryId);
  if (!category || !category.allow_multiple_same_topping) return newItem;
  
  // Find the selected category
  const selectedCategory = newItem.selectedToppings?.find(cat => cat.categoryId === categoryId);
  if (!selectedCategory) return newItem;
  
  // Ensure we have a toppingQuantities object
  if (!selectedCategory.toppingQuantities) {
    selectedCategory.toppingQuantities = {};
  }
  
  if (newQuantity <= 0) {
    // If quantity is 0 or less, remove the topping completely
    return toggleTopping(newItem, categoryId, toppingId, false);
  } else {
    // If the topping isn't selected yet, add it first
    if (!selectedCategory.toppingIds.includes(toppingId)) {
      selectedCategory.toppingIds.push(toppingId);
    }
    
    // Update the quantity
    selectedCategory.toppingQuantities[toppingId] = newQuantity;
    
    // Update the item price
    const optionsPrice = cartItem.optionsPrice || 0;
    const toppingsPrice = calculateToppingPrice(newItem.menuItem, newItem.selectedToppings || []);
    const basePrice = parseFloat(String(newItem.menuItem.price));
    newItem.itemPrice = basePrice + optionsPrice + toppingsPrice;
  }
  
  return newItem;
}

// Helper function to check if a topping is selected
export function isToppingSelected(
  cartItem: CartItem,
  categoryId: string,
  toppingId: string
): boolean {
  const selectedCategory = cartItem.selectedToppings?.find(
    (cat) => cat.categoryId === categoryId
  );
  return !!selectedCategory?.toppingIds.includes(toppingId);
}

// Helper function to get the quantity of a selected topping
export function getToppingQuantity(
  cartItem: CartItem,
  categoryId: string,
  toppingId: string
): number {
  const selectedCategory = cartItem.selectedToppings?.find(
    (cat) => cat.categoryId === categoryId
  );
  
  if (!selectedCategory || !selectedCategory.toppingIds.includes(toppingId)) {
    return 0;
  }
  
  return selectedCategory.toppingQuantities?.[toppingId] || 1;
}
