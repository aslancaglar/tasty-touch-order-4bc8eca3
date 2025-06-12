
import { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { MenuItem, OptionChoice, ToppingCategory } from '@/types/database-types';

export interface CartItem {
  id: string;
  menuItem: any; // Keep the existing type
  quantity: number;
  itemPrice: number;
  selectedOptions: any[];
  selectedToppings: any[];
  specialInstructions?: string;
}

interface UseCartManagerProps {
  restaurantId?: string;
}

const useCartManager = (
  existingCart?: CartItem[], 
  onCartUpdate?: (newCart: CartItem[]) => void,
  { restaurantId }: UseCartManagerProps = {}
) => {
  const [cart, setCart] = useState<CartItem[]>(existingCart || []);

  useEffect(() => {
    if (existingCart) {
      setCart(existingCart);
    } else if (restaurantId) {
      // Load cart from localStorage on component mount
      const storedCart = localStorage.getItem(`cart-${restaurantId}`);
      if (storedCart) {
        setCart(JSON.parse(storedCart));
      }
    }
  }, [existingCart, restaurantId]);

  useEffect(() => {
    if (onCartUpdate) {
      onCartUpdate(cart);
    } else if (restaurantId) {
      // Save cart to localStorage whenever it changes
      localStorage.setItem(`cart-${restaurantId}`, JSON.stringify(cart));
    }
  }, [cart, onCartUpdate, restaurantId]);

  const addToCart = useCallback((menuItem: MenuItem, quantity: number = 1, selectedOptions: OptionChoice[] = [], selectedToppings: ToppingCategory[] = [], specialInstructions: string = "") => {
    const newItem: CartItem = {
      id: uuidv4(),
      menuItem: menuItem,
      quantity: quantity,
      itemPrice: menuItem.price,
      selectedOptions: selectedOptions,
      selectedToppings: selectedToppings,
      specialInstructions: specialInstructions
    };
    setCart(prevCart => [...prevCart, newItem]);
  }, []);

  const removeFromCart = useCallback((itemId: string) => {
    setCart(prevCart => prevCart.filter(item => item.id !== itemId));
  }, []);

  const removeItem = useCallback((itemId: string) => {
    setCart(prevCart => prevCart.filter(item => item.id !== itemId));
  }, []);

  const updateQuantity = useCallback((itemId: string, newQuantity: number) => {
    if (newQuantity < 1) {
      removeFromCart(itemId);
      return;
    }
    setCart(prevCart =>
      prevCart.map(item =>
        item.id === itemId ? { ...item, quantity: newQuantity } : item
      )
    );
  }, [removeFromCart]);

  const updateToppingQuantity = useCallback((itemId: string, categoryId: string, toppingId: string, newQuantity: number) => {
    setCart(prevCart =>
      prevCart.map(item => {
        if (item.id !== itemId) return item;
        
        const updatedToppings = item.selectedToppings.map((category: any) => {
          if (category.categoryId !== categoryId) return category;
          
          const updatedQuantities = { ...category.toppingQuantities };
          if (newQuantity <= 0) {
            delete updatedQuantities[toppingId];
            // Also remove from toppingIds if quantity is 0
            const updatedToppingIds = category.toppingIds.filter((id: string) => id !== toppingId);
            return {
              ...category,
              toppingIds: updatedToppingIds,
              toppingQuantities: updatedQuantities
            };
          } else {
            updatedQuantities[toppingId] = newQuantity;
            return {
              ...category,
              toppingQuantities: updatedQuantities
            };
          }
        });
        
        return {
          ...item,
          selectedToppings: updatedToppings
        };
      })
    );
  }, []);

  const removeToppingFromItem = useCallback((itemId: string, categoryId: string, toppingId: string) => {
    setCart(prevCart =>
      prevCart.map(item => {
        if (item.id !== itemId) return item;
        
        const updatedToppings = item.selectedToppings.map((category: any) => {
          if (category.categoryId !== categoryId) return category;
          
          const updatedToppingIds = category.toppingIds.filter((id: string) => id !== toppingId);
          const updatedQuantities = { ...category.toppingQuantities };
          delete updatedQuantities[toppingId];
          
          return {
            ...category,
            toppingIds: updatedToppingIds,
            toppingQuantities: updatedQuantities
          };
        });
        
        return {
          ...item,
          selectedToppings: updatedToppings
        };
      })
    );
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  const calculateTotal = useCallback(() => {
    return cart.reduce((total, item) => total + (item.itemPrice * item.quantity), 0);
  }, [cart]);

  const calculateItemTotal = useCallback((item: CartItem) => {
    return item.itemPrice * item.quantity;
  }, []);

  return {
    cart,
    addToCart,
    removeFromCart,
    removeItem,
    updateQuantity,
    updateToppingQuantity,
    removeToppingFromItem,
    clearCart,
    calculateTotal,
    calculateItemTotal,
  };
};

export default useCartManager;
