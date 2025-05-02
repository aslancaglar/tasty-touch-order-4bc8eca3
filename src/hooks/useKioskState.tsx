
import { useState, useCallback } from 'react';
import { OrderType, MenuItemWithOptions } from '@/types/database-types';

export const useKioskState = () => {
  const [showWelcome, setShowWelcome] = useState(true);
  const [showOrderTypeSelection, setShowOrderTypeSelection] = useState(false);
  const [orderType, setOrderType] = useState<OrderType>(null);
  const [tableNumber, setTableNumber] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<MenuItemWithOptions | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<{
    optionId: string;
    choiceIds: string[];
  }[]>([]);
  const [selectedToppings, setSelectedToppings] = useState<{
    categoryId: string;
    toppingIds: string[];
  }[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [placingOrder, setPlacingOrder] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  const resetToWelcome = useCallback(() => {
    console.log("Resetting to welcome page - cleaning up all state");
    setShowWelcome(true);
    setShowOrderTypeSelection(false);
    setSelectedItem(null);
    setSelectedOptions([]);
    setSelectedToppings([]);
    setQuantity(1);
    setSpecialInstructions("");
    setOrderType(null);
    setTableNumber(null);
  }, []);

  const handleStartOrder = useCallback(() => {
    setShowWelcome(false);
    setShowOrderTypeSelection(true);
  }, []);

  const handleOrderTypeSelected = useCallback((type: OrderType, table?: string) => {
    setOrderType(type);
    if (table) {
      setTableNumber(table);
    }
    setShowOrderTypeSelection(false);
  }, []);

  const handleToggleChoice = useCallback((optionId: string, choiceId: string, multiple: boolean) => {
    setSelectedOptions(prev => {
      const optionIndex = prev.findIndex(o => o.optionId === optionId);
      if (optionIndex === -1) {
        return [...prev, { optionId, choiceIds: [choiceId] }];
      }
      
      const option = prev[optionIndex];
      let newChoiceIds: string[];
      
      if (multiple) {
        if (option.choiceIds.includes(choiceId)) {
          newChoiceIds = option.choiceIds.filter(id => id !== choiceId);
        } else {
          newChoiceIds = [...option.choiceIds, choiceId];
        }
      } else {
        newChoiceIds = [choiceId];
      }
      
      const newOptions = [...prev];
      newOptions[optionIndex] = { ...option, choiceIds: newChoiceIds };
      return newOptions;
    });
  }, []);

  return {
    showWelcome,
    setShowWelcome,
    showOrderTypeSelection,
    setShowOrderTypeSelection,
    orderType,
    setOrderType,
    tableNumber,
    setTableNumber,
    activeCategory,
    setActiveCategory,
    selectedItem,
    setSelectedItem,
    selectedOptions,
    setSelectedOptions,
    selectedToppings,
    setSelectedToppings,
    quantity,
    setQuantity,
    specialInstructions,
    setSpecialInstructions,
    placingOrder,
    setPlacingOrder,
    orderPlaced,
    setOrderPlaced,
    refreshTrigger,
    setRefreshTrigger,
    resetToWelcome,
    handleStartOrder,
    handleOrderTypeSelected,
    handleToggleChoice
  };
};
