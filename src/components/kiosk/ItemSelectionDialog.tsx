
import React from 'react';
import { MenuItem, MenuItemWithOptions } from '@/types/database-types';
import ItemCustomizationDialog from '@/components/kiosk/ItemCustomizationDialog';
import { calculateItemPrice } from '@/services/kiosk-price-service';
import { useToast } from '@/hooks/use-toast';
import { useKioskToppings } from '@/hooks/useKioskToppings';

interface ItemSelectionDialogProps {
  selectedItem: MenuItemWithOptions | null;
  onClose: () => void;
  onAddToCart: (
    item: MenuItemWithOptions, 
    quantity: number, 
    selectedOptions: { optionId: string; choiceIds: string[] }[],
    selectedToppings: { categoryId: string; toppingIds: string[] }[],
    specialInstructions: string,
    itemPrice: number
  ) => void;
  t: (key: string) => string;
  currencySymbol: string;
}

const ItemSelectionDialog: React.FC<ItemSelectionDialogProps> = ({ 
  selectedItem, 
  onClose, 
  onAddToCart,
  t,
  currencySymbol 
}) => {
  const [quantity, setQuantity] = React.useState(1);
  const [specialInstructions, setSpecialInstructions] = React.useState("");
  const [selectedOptions, setSelectedOptions] = React.useState<{ optionId: string; choiceIds: string[] }[]>([]);
  const { toast } = useToast();
  
  const { 
    selectedToppings, 
    handleToggleTopping, 
    shouldShowToppingCategory,
    resetToppings 
  } = useKioskToppings({
    t,
    selectedItem
  });

  React.useEffect(() => {
    if (!selectedItem) return;
    
    setQuantity(1);
    setSpecialInstructions("");
    
    // Initialize options
    if (selectedItem.options && selectedItem.options.length > 0) {
      const initialOptions = selectedItem.options.map(option => {
        if (option.required && !option.multiple) {
          return {
            optionId: option.id,
            choiceIds: option.choices.length > 0 ? [option.choices[0].id] : []
          };
        }
        return {
          optionId: option.id,
          choiceIds: []
        };
      });
      setSelectedOptions(initialOptions);
    } else {
      setSelectedOptions([]);
    }
    
    // Initialize toppings
    resetToppings(selectedItem.toppingCategories);
  }, [selectedItem, resetToppings]);

  const handleToggleChoice = (optionId: string, choiceId: string, multiple: boolean) => {
    setSelectedOptions(prev => {
      const optionIndex = prev.findIndex(o => o.optionId === optionId);
      if (optionIndex === -1) {
        return [...prev, {
          optionId,
          choiceIds: [choiceId]
        }];
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
  };

  const handleAddToCart = () => {
    if (!selectedItem) return;
    
    const isOptionsValid = selectedItem.options?.every(option => {
      if (!option.required) return true;
      const selected = selectedOptions.find(o => o.optionId === option.id);
      return selected && selected.choiceIds.length > 0;
    }) ?? true;
    
    const isToppingsValid = selectedItem.toppingCategories?.every(category => {
      if (!category.min_selections || category.min_selections <= 0) return true;
      const selected = selectedToppings.find(t => t.categoryId === category.id);
      return selected && selected.toppingIds.length >= category.min_selections;
    }) ?? true;
    
    if (!isOptionsValid || !isToppingsValid) {
      toast({
        title: t("selectionsRequired"),
        description: t("pleaseSelectRequired"),
        variant: "destructive"
      });
      return;
    }
    
    const itemPrice = calculateItemPrice(selectedItem, selectedOptions, selectedToppings);
    onAddToCart(selectedItem, quantity, selectedOptions, selectedToppings, specialInstructions, itemPrice);
    onClose();
  };

  if (!selectedItem) return null;

  return (
    <ItemCustomizationDialog
      item={selectedItem}
      isOpen={!!selectedItem}
      onClose={onClose}
      onAddToCart={handleAddToCart}
      selectedOptions={selectedOptions}
      onToggleChoice={handleToggleChoice}
      selectedToppings={selectedToppings}
      onToggleTopping={handleToggleTopping}
      quantity={quantity}
      onQuantityChange={setQuantity}
      specialInstructions={specialInstructions}
      onSpecialInstructionsChange={setSpecialInstructions}
      shouldShowToppingCategory={shouldShowToppingCategory}
      t={t}
      currencySymbol={currencySymbol}
    />
  );
};

export default ItemSelectionDialog;
