
import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { MenuItem, MenuItemWithOptions } from '@/types/database-types';
import { getMenuItemWithOptions } from '@/services/kiosk-service';
import { supabase } from '@/integrations/supabase/client';

export const useKioskItemSelection = () => {
  const [selectedItem, setSelectedItem] = useState<MenuItemWithOptions | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  
  const fetchToppingCategories = async (menuItemId: string) => {
    try {
      const {
        data: menuItemToppingCategories,
        error: toppingCategoriesError
      } = await supabase
        .from('menu_item_topping_categories')
        .select('topping_category_id, display_order')
        .eq('menu_item_id', menuItemId)
        .order('display_order', { ascending: true });
        
      if (toppingCategoriesError) {
        console.error("Error loading topping categories:", toppingCategoriesError);
        return [];
      }
      
      if (!menuItemToppingCategories.length) {
        return [];
      }

      // Create a map of category ID to display order
      const displayOrderMap = menuItemToppingCategories.reduce((map, relation) => {
        map[relation.topping_category_id] = relation.display_order ?? 1000; // Default to high number if null
        return map;
      }, {} as Record<string, number>);
      
      const toppingCategoryIds = menuItemToppingCategories.map(mtc => mtc.topping_category_id);
      
      const {
        data: toppingCategories,
        error: categoriesError
      } = await supabase
        .from('topping_categories')
        .select('*')
        .in('id', toppingCategoryIds);
        
      if (categoriesError) {
        console.error("Error loading topping category details:", categoriesError);
        return [];
      }
      
      const toppingCategoriesWithToppings = await Promise.all(toppingCategories.map(async category => {
        const {
          data: toppings,
          error: toppingsError
        } = await supabase
          .from('toppings')
          .select('*')
          .eq('category_id', category.id)
          .eq('in_stock', true)
          .order('display_order', { ascending: true });

        if (toppingsError) {
          console.error(`Error loading toppings for category ${category.id}:`, toppingsError);
          return {
            id: category.id,
            name: category.name,
            min_selections: category.min_selections || 0,
            max_selections: category.max_selections || 0,
            required: category.min_selections ? category.min_selections > 0 : false,
            display_order: displayOrderMap[category.id],
            toppings: [],
            show_if_selection_id: category.show_if_selection_id,
            show_if_selection_type: category.show_if_selection_type
          };
        }
        
        return {
          id: category.id,
          name: category.name,
          min_selections: category.min_selections || 0,
          max_selections: category.max_selections || 0,
          required: category.min_selections ? category.min_selections > 0 : false,
          display_order: displayOrderMap[category.id],
          toppings: toppings.map(topping => ({
            id: topping.id,
            name: topping.name,
            price: topping.price,
            tax_percentage: topping.tax_percentage || 0,
            display_order: topping.display_order
          })),
          show_if_selection_id: category.show_if_selection_id,
          show_if_selection_type: category.show_if_selection_type
        };
      }));

      // Sort by display_order and filter out empty categories
      const sortedCategories = toppingCategoriesWithToppings
        .filter(category => category.toppings.length > 0)
        .sort((a, b) => {
          const orderA = a.display_order ?? 1000;
          const orderB = b.display_order ?? 1000;
          return orderA - orderB;
        });
        
      return sortedCategories;
    } catch (error) {
      console.error("Error fetching topping categories:", error);
      return [];
    }
  };

  const handleSelectItem = useCallback(async (item: MenuItem) => {
    try {
      setLoading(true);
      const itemWithOptions = await getMenuItemWithOptions(item.id);
      
      if (!itemWithOptions) {
        toast({
          title: "Error",
          description: "Could not load item details. Please try again.",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }
      
      const toppingCategories = await fetchToppingCategories(item.id);
      
      const itemWithToppings: MenuItemWithOptions = {
        ...(itemWithOptions as MenuItemWithOptions),
        toppingCategories: toppingCategories || []
      };
      
      setSelectedItem(itemWithToppings);
      setLoading(false);
    } catch (error) {
      console.error("Error loading item details:", error);
      toast({
        title: "Error",
        description: "A problem occurred while loading item details. Please try again.",
        variant: "destructive"
      });
      setLoading(false);
    }
  }, [toast]);

  return {
    selectedItem,
    setSelectedItem,
    loading,
    setLoading,
    handleSelectItem,
    fetchToppingCategories
  };
};
