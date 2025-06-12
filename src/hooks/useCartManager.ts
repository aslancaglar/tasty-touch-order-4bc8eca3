
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

const useCartManager = ({ restaurantId }: UseCartManagerProps = {}) => {
  const [cart, setCart] = useState<CartItem[]>([]);

  useEffect(() => {
    // Load cart from localStorage on component mount
    const storedCart = localStorage.getItem(`cart-${restaurantId}`);
    if (storedCart) {
      setCart(JSON.parse(storedCart));
    }
  }, [restaurantId]);

  useEffect(() => {
    // Save cart to localStorage whenever it changes
    localStorage.setItem(`cart-${restaurantId}`, JSON.stringify(cart));
  }, [cart, restaurantId]);

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
    updateQuantity,
    clearCart,
    calculateTotal,
    calculateItemTotal,
  };
};

export default useCartManager;
