import { useState, useCallback, useMemo, useEffect } from 'react';
import { MenuItemWithOptions } from '@/types/database-types';
import { shouldShowToppingCategory as shouldShowToppingCategoryUtil, canSelectTopping } from '@/utils/topping-utils';

export interface SelectedOption {
  optionId: string;
  choiceIds: string[];
}

export interface SelectedTopping {
  categoryId: string;
  toppingIds: string[];
  toppingQuantities?: { [toppingId: string]: number };
}

interface UseOptimizedItemCustomizationResult {
  selectedOptions: SelectedOption[];
  selectedToppings: SelectedTopping[];
  quantity: number;
  specialInstructions: string;
  visibleToppingCategories: any[];
  handleToggleChoice: (optionId: string, choiceId: string, multiple: boolean) => void;
  handleToggleTopping: (categoryId: string, toppingId: string, quantity?: number) => void;
  handleQuantityChange: (newQuantity: number) => void;
  handleSpecialInstructionsChange: (instructions: string) => void;
  resetCustomization: () => void;
  calculatePrice: () => number;
}

export const useOptimizedItemCustomization = (
  item: MenuItemWithOptions | null,
  currencySymbol: string
): UseOptimizedItemCustomizationResult => {
  
  
  const [selectedOptions, setSelectedOptions] = useState<SelectedOption[]>([]);
  const [selectedToppings, setSelectedToppings] = useState<SelectedTopping[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [specialInstructions, setSpecialInstructions] = useState('');

  // Memoize visible topping categories to prevent recalculation
  const visibleToppingCategories = useMemo(() => {
    if (!item?.toppingCategories) return [];
    
    return item.toppingCategories
      .filter(category => shouldShowToppingCategoryUtil(item, category.id, selectedToppings))
      .sort((a, b) => {
        const orderA = a.display_order ?? 1000;
        const orderB = b.display_order ?? 1000;
        return orderA - orderB;
      });
  }, [item, selectedToppings]);

  // Cleanup effect: Remove selected toppings from hidden categories
  useEffect(() => {
    const visibleCategoryIds = new Set(visibleToppingCategories.map(c => c.id));
    
    setSelectedToppings(prev => {
      const filtered = prev.filter(selection => 
        visibleCategoryIds.has(selection.categoryId)
      );
      
      // Only update if something was actually removed
      if (filtered.length !== prev.length) {
        return filtered;
      }
      return prev;
    });
  }, [visibleToppingCategories]);

  // Optimized choice toggle handler
  const handleToggleChoice = useCallback((optionId: string, choiceId: string, multiple: boolean) => {
    setSelectedOptions(prev => {
      const existingIndex = prev.findIndex(opt => opt.optionId === optionId);
      
      if (existingIndex === -1) {
        // New option selection
        return [...prev, { optionId, choiceIds: [choiceId] }];
      }
      
      const existing = prev[existingIndex];
      let newChoiceIds: string[];
      
      if (multiple) {
        // Toggle choice in multiple selection
        newChoiceIds = existing.choiceIds.includes(choiceId)
          ? existing.choiceIds.filter(id => id !== choiceId)
          : [...existing.choiceIds, choiceId];
      } else {
        // Single selection
        newChoiceIds = existing.choiceIds.includes(choiceId) ? [] : [choiceId];
      }
      
      if (newChoiceIds.length === 0) {
        // Remove option if no choices selected
        return prev.filter((_, index) => index !== existingIndex);
      }
      
      // Update existing option
      const newOptions = [...prev];
      newOptions[existingIndex] = { optionId, choiceIds: newChoiceIds };
      return newOptions;
    });
  }, []);

  // Optimized topping toggle handler with max_selections validation
  const handleToggleTopping = useCallback((categoryId: string, toppingId: string, quantity?: number) => {
    setSelectedToppings(prev => {
      // Validate if topping can be selected
      if (!canSelectTopping(categoryId, toppingId, prev, item?.toppingCategories || [])) {
        return prev; // Don't allow selection if limit is reached
      }

      const existingIndex = prev.findIndex(top => top.categoryId === categoryId);
      
      if (existingIndex === -1) {
        // New category selection
        const newTopping: SelectedTopping = {
          categoryId,
          toppingIds: [toppingId]
        };
        
        if (quantity !== undefined && quantity > 0) {
          newTopping.toppingQuantities = { [toppingId]: quantity };
        }
        
        return [...prev, newTopping];
      }
      
      const existing = prev[existingIndex];
      const isSelected = existing.toppingIds.includes(toppingId);
      
      let newToppingIds: string[];
      let newQuantities = { ...existing.toppingQuantities };
      
      if (quantity !== undefined) {
        // Quantity-based selection
        if (quantity === 0) {
          // Remove topping
          newToppingIds = existing.toppingIds.filter(id => id !== toppingId);
          delete newQuantities[toppingId];
        } else {
          // Add or update topping with quantity
          if (!isSelected) {
            newToppingIds = [...existing.toppingIds, toppingId];
          } else {
            newToppingIds = existing.toppingIds;
          }
          newQuantities[toppingId] = quantity;
        }
      } else {
        // Simple toggle
        newToppingIds = isSelected
          ? existing.toppingIds.filter(id => id !== toppingId)
          : [...existing.toppingIds, toppingId];
        
        if (!isSelected) {
          newQuantities[toppingId] = 1;
        } else {
          delete newQuantities[toppingId];
        }
      }
      
      if (newToppingIds.length === 0) {
        // Remove category if no toppings selected
        return prev.filter((_, index) => index !== existingIndex);
      }
      
      // Update existing category
      const newToppings = [...prev];
      newToppings[existingIndex] = {
        categoryId,
        toppingIds: newToppingIds,
        toppingQuantities: Object.keys(newQuantities).length > 0 ? newQuantities : undefined
      };
      return newToppings;
    });
  }, [item?.toppingCategories]);

  // Memoized price calculation - returns per-unit price without quantity multiplication
  const calculatePrice = useCallback(() => {
    if (!item) return 0;
    
    let price = parseFloat(item.price.toString());
    
    // Add option prices
    selectedOptions.forEach(selectedOption => {
      const option = item.options?.find(o => o.id === selectedOption.optionId);
      if (option) {
        selectedOption.choiceIds.forEach(choiceId => {
          const choice = option.choices.find(c => c.id === choiceId);
          if (choice?.price) {
            price += parseFloat(choice.price.toString());
          }
        });
      }
    });
    
    // Add topping prices
    selectedToppings.forEach(selectedTopping => {
      const category = item.toppingCategories?.find(c => c.id === selectedTopping.categoryId);
      if (category) {
        selectedTopping.toppingIds.forEach(toppingId => {
          const topping = category.toppings.find(t => t.id === toppingId);
          if (topping?.price) {
            const qty = selectedTopping.toppingQuantities?.[toppingId] || 1;
            price += parseFloat(topping.price.toString()) * qty;
          }
        });
      }
    });
    
    // Return per-unit price (without quantity multiplication)
    return price;
  }, [item, selectedOptions, selectedToppings]);

  const handleQuantityChange = useCallback((newQuantity: number) => {
    setQuantity(Math.max(1, newQuantity));
  }, []);

  const handleSpecialInstructionsChange = useCallback((instructions: string) => {
    setSpecialInstructions(instructions);
  }, []);

  const resetCustomization = useCallback(() => {
    setSelectedOptions([]);
    setSelectedToppings([]);
    setQuantity(1);
    setSpecialInstructions('');
  }, []);

  return {
    selectedOptions,
    selectedToppings,
    quantity,
    specialInstructions,
    visibleToppingCategories,
    handleToggleChoice,
    handleToggleTopping,
    handleQuantityChange,
    handleSpecialInstructionsChange,
    resetCustomization,
    calculatePrice
  };
};