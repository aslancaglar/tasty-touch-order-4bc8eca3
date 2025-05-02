
import { useState, useCallback } from 'react';
import { CartItem, MenuItem, MenuItemWithOptions } from '@/types/database-types';
import { useToast } from '@/hooks/use-toast';

interface UseKioskCartProps {
  t: (key: string) => string;
}

export const useKioskCart = ({ t }: UseKioskCartProps) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const { toast } = useToast();

  const toggleCart = useCallback(() => {
    setIsCartOpen(!isCartOpen);
  }, [isCartOpen]);

  const addItemToCart = useCallback((
    selectedItem: MenuItemWithOptions, 
    quantity: number,
    selectedOptions: { optionId: string; choiceIds: string[] }[],
    selectedToppings: { categoryId: string; toppingIds: string[] }[],
    specialInstructions: string,
    itemPrice: number
  ) => {
    const newItem: CartItem = {
      id: Date.now().toString(),
      menuItem: selectedItem,
      quantity,
      selectedOptions,
      selectedToppings,
      specialInstructions: specialInstructions.trim() || undefined,
      itemPrice
    };
    
    setCart(prev => [newItem, ...prev]);
    
    toast({
      title: t("addedToCart"),
      description: `${quantity}x ${selectedItem.name} ${t("added")}`
    });
  }, [t, toast]);

  const updateCartItemQuantity = useCallback((itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeCartItem(itemId);
      return;
    }
    
    setCart(prev => prev.map(item => 
      item.id === itemId ? { ...item, quantity: newQuantity } : item
    ));
  }, []);

  const removeCartItem = useCallback((itemId: string) => {
    setCart(prev => {
      const newCart = prev.filter(item => item.id !== itemId);
      if (newCart.length === 0) {
        setIsCartOpen(false);
      }
      return newCart;
    });
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    setIsCartOpen(false);
  }, []);

  const calculateCartTotal = useCallback((): number => {
    return cart.reduce((total, item) => {
      return total + item.itemPrice * item.quantity;
    }, 0);
  }, [cart]);

  const calculateSubtotal = useCallback(() => {
    return calculateCartTotal();
  }, [calculateCartTotal]);

  const calculateTax = useCallback(() => {
    return calculateCartTotal() * 0.1; // 10% tax
  }, [calculateCartTotal]);

  const getFormattedOptions = useCallback((item: CartItem): string => {
    if (!item.menuItem.options) return "";
    
    return item.selectedOptions
      .flatMap(selectedOption => {
        const option = item.menuItem.options?.find(o => o.id === selectedOption.optionId);
        if (!option) return [];
        
        return selectedOption.choiceIds.map(choiceId => {
          const choice = option.choices.find(c => c.id === choiceId);
          return choice ? choice.name : "";
        });
      })
      .filter(Boolean)
      .join(", ");
  }, []);

  const getFormattedToppings = useCallback((item: CartItem): string => {
    if (!item.menuItem.toppingCategories) return "";
    
    return item.selectedToppings
      .flatMap(selectedCategory => {
        const category = item.menuItem.toppingCategories?.find(c => c.id === selectedCategory.categoryId);
        if (!category) return [];
        
        return selectedCategory.toppingIds.map(toppingId => {
          const topping = category.toppings.find(t => t.id === toppingId);
          return topping ? topping.name : "";
        });
      })
      .filter(Boolean)
      .join(", ");
  }, []);

  return {
    cart,
    isCartOpen,
    toggleCart,
    addItemToCart,
    updateCartItemQuantity,
    removeCartItem,
    clearCart,
    calculateCartTotal,
    calculateSubtotal,
    calculateTax,
    getFormattedOptions,
    getFormattedToppings
  };
};
