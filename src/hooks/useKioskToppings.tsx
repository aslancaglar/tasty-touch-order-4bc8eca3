
import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { MenuItemWithOptions } from '@/types/database-types';

interface UseKioskToppingsProps {
  t: (key: string) => string;
  selectedItem: MenuItemWithOptions | null;
}

export const useKioskToppings = ({ t, selectedItem }: UseKioskToppingsProps) => {
  const [selectedToppings, setSelectedToppings] = useState<{
    categoryId: string;
    toppingIds: string[];
  }[]>([]);
  
  const { toast } = useToast();

  const handleToggleTopping = useCallback((categoryId: string, toppingId: string) => {
    setSelectedToppings(prev => {
      const categoryIndex = prev.findIndex(t => t.categoryId === categoryId);
      if (categoryIndex === -1) {
        return [...prev, {
          categoryId,
          toppingIds: [toppingId]
        }];
      }
      
      const category = prev[categoryIndex];
      let newToppingIds: string[];
      
      if (category.toppingIds.includes(toppingId)) {
        newToppingIds = category.toppingIds.filter(id => id !== toppingId);
      } else {
        if (selectedItem?.toppingCategories) {
          const toppingCategory = selectedItem.toppingCategories.find(c => c.id === categoryId);
          if (toppingCategory && toppingCategory.max_selections > 0) {
            if (toppingCategory.max_selections === 1) {
              newToppingIds = [toppingId];
            } else if (category.toppingIds.length >= toppingCategory.max_selections) {
              toast({
                title: t("maxSelectionsReached"),
                description: t("maxSelectionsMessage").replace("{max}", String(toppingCategory.max_selections))
              });
              return prev;
            } else {
              newToppingIds = [...category.toppingIds, toppingId];
            }
          } else {
            newToppingIds = [...category.toppingIds, toppingId];
          }
        } else {
          newToppingIds = [...category.toppingIds, toppingId];
        }
      }
      
      const newToppings = [...prev];
      newToppings[categoryIndex] = {
        ...category,
        toppingIds: newToppingIds
      };
      return newToppings;
    });
  }, [selectedItem, t, toast]);

  const shouldShowToppingCategory = useCallback((category: MenuItemWithOptions['toppingCategories'][0]) => {
    if (!category.show_if_selection_id || category.show_if_selection_id.length === 0) {
      return true;
    }
    return category.show_if_selection_id.some(toppingId => 
      selectedToppings.some(catSelection => 
        catSelection.toppingIds.includes(toppingId)
      )
    );
  }, [selectedToppings]);

  const resetToppings = useCallback((toppingCategories: MenuItemWithOptions['toppingCategories'] | undefined) => {
    if (toppingCategories && toppingCategories.length > 0) {
      const initialToppings = toppingCategories.map(category => ({
        categoryId: category.id,
        toppingIds: []
      }));
      setSelectedToppings(initialToppings);
    } else {
      setSelectedToppings([]);
    }
  }, []);

  return {
    selectedToppings,
    setSelectedToppings,
    handleToggleTopping,
    shouldShowToppingCategory,
    resetToppings
  };
};
