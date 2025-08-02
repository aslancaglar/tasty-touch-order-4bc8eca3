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
  const missingOptions: string[] = [];
  const missingToppings: string[] = [];

  // Validate required options
  if (item.options) {
    for (const option of item.options) {
      if (option.required) {
        const selectedOption = selectedOptions.find(so => so.optionId === option.id);
        if (!selectedOption || selectedOption.choiceIds.length === 0) {
          missingOptions.push(option.id);
        }
      }
    }
  }

  // Validate required topping categories
  if (item.toppingCategories) {
    for (const category of item.toppingCategories) {
      if (category.required) {
        const selectedCategory = selectedToppings.find(st => st.categoryId === category.id);
        const minRequired = category.min_selections > 0 ? category.min_selections : 1;
        const selectedCount = selectedCategory?.toppingIds.length || 0;
        
        if (selectedCount < minRequired) {
          missingToppings.push(category.id);
        }
      }
    }
  }

  return {
    isValid: missingOptions.length === 0 && missingToppings.length === 0,
    missingOptions,
    missingToppings
  };
};