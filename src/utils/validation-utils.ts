import { MenuItemWithOptions } from '@/types/database-types';
import { SelectedOption, SelectedTopping } from '@/hooks/useOptimizedItemCustomization';

export interface ValidationResult {
  isValid: boolean;
  missingOptions: string[];
  missingToppings: string[];
}

export const validateItemCustomization = (
  item: MenuItemWithOptions,
  selectedOptions: SelectedOption[],
  selectedToppings: SelectedTopping[]
): ValidationResult => {
  console.log('[Validation] Starting validation for item:', item?.id);
  console.log('[Validation] Selected options:', selectedOptions);
  console.log('[Validation] Selected toppings:', selectedToppings);
  
  const missingOptions: string[] = [];
  const missingToppings: string[] = [];

  // Validate required options
  if (item.options) {
    console.log('[Validation] Checking', item.options.length, 'options');
    for (const option of item.options) {
      if (option.required) {
        const selectedOption = selectedOptions.find(so => so.optionId === option.id);
        const hasValidChoice = selectedOption && selectedOption.choiceIds.length > 0;
        
        console.log('[Validation] Option', option.id, ':', {
          required: option.required,
          hasSelection: !!selectedOption,
          choiceCount: selectedOption?.choiceIds.length || 0,
          isValid: hasValidChoice
        });
        
        if (!hasValidChoice) {
          missingOptions.push(option.id);
          console.log('[Validation] Missing required option:', option.id);
        }
      }
    }
  }

  // Validate required topping categories
  if (item.toppingCategories) {
    console.log('[Validation] Checking', item.toppingCategories.length, 'topping categories');
    for (const category of item.toppingCategories) {
      if (category.required) {
        const selectedCategory = selectedToppings.find(st => st.categoryId === category.id);
        const minRequired = category.min_selections > 0 ? category.min_selections : 1;
        const selectedCount = selectedCategory?.toppingIds.length || 0;
        
        console.log('[Validation] Topping category', category.id, ':', {
          required: category.required,
          minRequired,
          selectedCount,
          hasSelection: !!selectedCategory,
          isValid: selectedCount >= minRequired
        });
        
        if (selectedCount < minRequired) {
          missingToppings.push(category.id);
          console.log('[Validation] Missing required topping category:', category.id);
        }
      }
    }
  }

  const result = {
    isValid: missingOptions.length === 0 && missingToppings.length === 0,
    missingOptions,
    missingToppings
  };
  
  console.log('[Validation] Final result:', result);
  return result;
};