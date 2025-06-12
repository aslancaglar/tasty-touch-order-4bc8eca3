
import { useState, useCallback } from 'react';
import { CartItem } from '@/types/database-types';
import { calculateCartTotals } from '@/utils/price-utils';

export interface CartManagerActions {
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, newQuantity: number) => void;
  removeToppingFromItem: (itemId: string, categoryId: string, toppingId: string) => void;
  updateToppingQuantity: (itemId: string, categoryId: string, toppingId: string, newQuantity: number) => void;
  clearCart: () => void;
}

export const useCartManager = (
  cart: CartItem[],
  onCartUpdate: (newCart: CartItem[]) => void
): CartManagerActions => {
  
  const removeItem = useCallback((itemId: string) => {
    const newCart = cart.filter(item => item.id !== itemId);
    onCartUpdate(newCart);
  }, [cart, onCartUpdate]);

  const updateQuantity = useCallback((itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeItem(itemId);
      return;
    }

    const newCart = cart.map(item => {
      if (item.id === itemId) {
        return { ...item, quantity: newQuantity };
      }
      return item;
    });
    onCartUpdate(newCart);
  }, [cart, onCartUpdate, removeItem]);

  const removeToppingFromItem = useCallback((itemId: string, categoryId: string, toppingId: string) => {
    const newCart = cart.map(item => {
      if (item.id !== itemId) return item;

      const updatedToppings = item.selectedToppings.map(category => {
        if (category.categoryId !== categoryId) return category;

        const newToppingIds = category.toppingIds.filter(id => id !== toppingId);
        const newToppingQuantities = { ...(category.toppingQuantities || {}) };
        delete newToppingQuantities[toppingId];

        return {
          ...category,
          toppingIds: newToppingIds,
          toppingQuantities: newToppingQuantities
        };
      }).filter(category => category.toppingIds.length > 0);

      // Recalculate item price
      const newItemPrice = calculateItemPrice(item.menuItem, item.selectedOptions, updatedToppings);

      return {
        ...item,
        selectedToppings: updatedToppings,
        itemPrice: newItemPrice
      };
    });

    onCartUpdate(newCart);
  }, [cart, onCartUpdate]);

  const updateToppingQuantity = useCallback((itemId: string, categoryId: string, toppingId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeToppingFromItem(itemId, categoryId, toppingId);
      return;
    }

    const newCart = cart.map(item => {
      if (item.id !== itemId) return item;

      const updatedToppings = item.selectedToppings.map(category => {
        if (category.categoryId !== categoryId) return category;

        const newToppingQuantities = {
          ...(category.toppingQuantities || {}),
          [toppingId]: newQuantity
        };

        return {
          ...category,
          toppingQuantities: newToppingQuantities
        };
      });

      // Recalculate item price
      const newItemPrice = calculateItemPrice(item.menuItem, item.selectedOptions, updatedToppings);

      return {
        ...item,
        selectedToppings: updatedToppings,
        itemPrice: newItemPrice
      };
    });

    onCartUpdate(newCart);
  }, [cart, onCartUpdate]);

  const clearCart = useCallback(() => {
    onCartUpdate([]);
  }, [onCartUpdate]);

  return {
    removeItem,
    updateQuantity,
    removeToppingFromItem,
    updateToppingQuantity,
    clearCart
  };
};

// Helper function to calculate item price (moved from KioskView for reusability)
const calculateItemPrice = (
  item: any,
  options: { optionId: string; choiceIds: string[] }[],
  toppings: { categoryId: string; toppingIds: string[]; toppingQuantities?: { [toppingId: string]: number } }[]
): number => {
  let price = parseFloat(item.price.toString());

  // Add option prices
  if (item.options) {
    item.options.forEach((option: any) => {
      const selectedOption = options.find(o => o.optionId === option.id);
      if (selectedOption) {
        selectedOption.choiceIds.forEach(choiceId => {
          const choice = option.choices.find((c: any) => c.id === choiceId);
          if (choice && choice.price) {
            price += parseFloat(choice.price.toString());
          }
        });
      }
    });
  }

  // Add topping prices
  if (item.toppingCategories) {
    item.toppingCategories.forEach((category: any) => {
      const selectedToppingCategory = toppings.find(t => t.categoryId === category.id);
      if (selectedToppingCategory) {
        selectedToppingCategory.toppingIds.forEach(toppingId => {
          const topping = category.toppings.find((t: any) => t.id === toppingId);
          if (topping && topping.price) {
            const quantity = selectedToppingCategory.toppingQuantities?.[toppingId] || 1;
            price += parseFloat(topping.price.toString()) * quantity;
          }
        });
      }
    });
  }

  return price;
};
