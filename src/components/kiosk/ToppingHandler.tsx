
import { useState, useEffect } from 'react';
import { MenuItemWithOptions, CartItem } from '@/types/database-types';
import { prepareInitialToppings, handleToppingToggle } from '@/utils/topping-utils';

interface ToppingHandlerProps {
  children: (
    selectedToppings: CartItem['selectedToppings'],
    onToggleTopping: (categoryId: string, toppingId: string, quantity?: number) => void
  ) => React.ReactNode;
  menuItem: MenuItemWithOptions;
}

const ToppingHandler: React.FC<ToppingHandlerProps> = ({ children, menuItem }) => {
  const [selectedToppings, setSelectedToppings] = useState<CartItem['selectedToppings']>(
    prepareInitialToppings(menuItem)
  );

  // Reset selected toppings when menu item changes
  useEffect(() => {
    setSelectedToppings(prepareInitialToppings(menuItem));
  }, [menuItem.id]);

  const onToggleTopping = (categoryId: string, toppingId: string, quantity?: number) => {
    const category = menuItem.toppingCategories?.find(c => c.id === categoryId);
    
    // Update selected toppings
    setSelectedToppings(prevToppings => 
      handleToppingToggle(prevToppings, categoryId, toppingId, quantity, category)
    );
  };

  return <>{children(selectedToppings, onToggleTopping)}</>;
};

export default ToppingHandler;
