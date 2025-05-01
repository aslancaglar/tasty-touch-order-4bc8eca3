import React, { memo, useCallback } from "react";
import { Check, Plus, Minus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { MenuItemWithOptions } from "@/types/database-types";
interface ItemCustomizationDialogProps {
  item: MenuItemWithOptions | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: () => void;
  selectedOptions: {
    optionId: string;
    choiceIds: string[];
  }[];
  selectedToppings: {
    categoryId: string;
    toppingIds: string[];
  }[];
  onToggleChoice: (optionId: string, choiceId: string, multiple: boolean) => void;
  onToggleTopping: (categoryId: string, toppingId: string) => void;
  quantity: number;
  onQuantityChange: (quantity: number) => void;
  specialInstructions: string;
  onSpecialInstructionsChange: (instructions: string) => void;
  shouldShowToppingCategory: (category: any) => boolean;
  t: (key: string) => string;
  currencySymbol: string;
}

// Memoize the Option component to prevent unnecessary re-renders
const Option = memo(({
  option,
  selectedOption,
  onToggleChoice,
  currencySymbol
}: {
  option: any;
  selectedOption: any;
  onToggleChoice: (optionId: string, choiceId: string, multiple: boolean) => void;
  currencySymbol: string;
}) => {
  return <div className="space-y-1">
      {option.choices.map(choice => {
      const isSelected = selectedOption?.choiceIds.includes(choice.id) || false;
      return <div key={choice.id} className={`
              flex items-center justify-between p-2 border rounded-md cursor-pointer select-none
              ${isSelected ? 'border-kiosk-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'}
            `} onClick={() => onToggleChoice(option.id, choice.id, !!option.multiple)}>
            <div className="flex items-center">
              <div className={`
                w-5 h-5 mr-3 rounded-full flex items-center justify-center
                ${isSelected ? 'bg-kiosk-primary text-white' : 'border border-gray-300'}
              `}>
                {isSelected && <Check className="h-3 w-3" />}
              </div>
              <span>{choice.name}</span>
            </div>
            {choice.price && choice.price > 0 && <span>+{parseFloat(choice.price.toString()).toFixed(2)} {currencySymbol}</span>}
          </div>;
    })}
    </div>;
});
Option.displayName = 'Option';

// Memoize the ToppingCategory component to prevent unnecessary re-renders
const ToppingCategory = memo(({
  category,
  selectedCategory,
  onToggleTopping,
  t,
  currencySymbol
}: {
  category: any;
  selectedCategory: any;
  onToggleTopping: (categoryId: string, toppingId: string) => void;
  t: (key: string) => string;
  currencySymbol: string;
}) => {
  // Sort toppings by display_order
  const sortedToppings = [...category.toppings].sort((a, b) => {
    const orderA = a.display_order ?? 1000;
    const orderB = b.display_order ?? 1000;
    return orderA - orderB;
  });

  // Determine the number of columns based on topping count
  const toppingCount = sortedToppings.length;
  let gridCols = "grid-cols-3"; // Default 3 columns for 3+ toppings

  if (toppingCount === 1) {
    gridCols = "grid-cols-1"; // 1 column for 1 topping
  } else if (toppingCount === 2) {
    gridCols = "grid-cols-2"; // 2 columns for 2 toppings
  }
  return <div className="space-y-2">
      <div className="font-bold text-lg flex items-center">
        {category.name}
        {category.required && <span className="text-red-500 ml-1">*</span>}
        <span className="ml-2 text-red-600 text-sm font-bold">
          {category.max_selections > 0 ? `(${t("selectUpTo")} ${category.max_selections})` : `(${t("multipleSelection")})`}
        </span>
      </div>
      <div className={`grid ${gridCols} gap-1`}>
        {sortedToppings.map(topping => {
        const isSelected = selectedCategory?.toppingIds.includes(topping.id) || false;
        return <div key={topping.id} onClick={() => onToggleTopping(category.id, topping.id)} className="flex items-center justify-between border rounded-md p-2 hover:border-gray-300 cursor-pointer select-none">
              <span className={`${isSelected ? 'text-green-700 font-medium' : ''}`}>
                {topping.name}
              </span>
              <div className="flex items-center gap-1">
                {topping.price > 0 && <span className="text-sm">
                    +{parseFloat(topping.price.toString()).toFixed(2)} {currencySymbol}
                  </span>}
                {!isSelected ? <Plus onClick={e => {
              e.stopPropagation();
              onToggleTopping(category.id, topping.id);
            }} className="h-6 w-6 text-violet-800 cursor-pointer rounded-full bg-violet-700 py-[24px] px-[24px]" /> : <Button variant="outline" size="icon" onClick={e => {
              e.stopPropagation();
              onToggleTopping(category.id, topping.id);
            }} className={`text-5xl px-[8px] rounded-full text-slate-50 font-bold py-[7px] bg-green-700 hover:bg-green-600`}>
                    <Check className="h-4 w-4" />
                  </Button>}
              </div>
            </div>;
      })}
      </div>
    </div>;
});
ToppingCategory.displayName = 'ToppingCategory';

// Main component with heavy use of memoization
const ItemCustomizationDialog: React.FC<ItemCustomizationDialogProps> = ({
  item,
  isOpen,
  onClose,
  onAddToCart,
  selectedOptions,
  selectedToppings,
  onToggleChoice,
  onToggleTopping,
  quantity,
  onQuantityChange,
  specialInstructions,
  onSpecialInstructionsChange,
  shouldShowToppingCategory,
  t,
  currencySymbol
}) => {
  if (!item) return null;

  // Memoized price calculation to prevent recalculation on every render
  const calculateItemPrice = useCallback(() => {
    if (!item) return 0;
    let price = parseFloat(item.price.toString());
    if (item.options) {
      item.options.forEach(option => {
        const selected = selectedOptions.find(o => o.optionId === option.id);
        if (selected) {
          selected.choiceIds.forEach(choiceId => {
            const choice = option.choices.find(c => c.id === choiceId);
            if (choice && choice.price) {
              price += parseFloat(choice.price.toString());
            }
          });
        }
      });
    }
    if (item.toppingCategories) {
      item.toppingCategories.forEach(category => {
        const selected = selectedToppings.find(t => t.categoryId === category.id);
        if (selected) {
          selected.toppingIds.forEach(toppingId => {
            const topping = category.toppings.find(t => t.id === toppingId);
            if (topping && topping.price) {
              price += parseFloat(topping.price.toString());
            }
          });
        }
      });
    }
    return price * quantity;
  }, [item, selectedOptions, selectedToppings, quantity]);
  const handleQuantityDecrease = useCallback(() => {
    if (quantity > 1) onQuantityChange(quantity - 1);
  }, [quantity, onQuantityChange]);
  const handleQuantityIncrease = useCallback(() => {
    onQuantityChange(quantity + 1);
  }, [quantity, onQuantityChange]);
  const hasCustomizations = item.options && item.options.length > 0 || item.toppingCategories && item.toppingCategories.length > 0;
  return <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="w-[85vw] max-w-[85vw] max-h-[80vh] p-4 flex flex-col select-none">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-xl font-bold">{item.name}</DialogTitle>
          {item.description && <DialogDescription className="text-xl">{item.description}</DialogDescription>}
        </DialogHeader>
        
        <div className="space-y-4 overflow-y-auto pr-2 flex-grow select-none">
          {/* Options section - only show if there are options */}
          {item.options && item.options.length > 0 && item.options.map(option => <div key={option.id} className="space-y-1">
              <Label className="font-medium">
                {option.name}
                {option.required && <span className="text-red-500 ml-1">*</span>}
                {option.multiple && <span className="text-sm text-gray-500 ml-2">({t("multipleSelection")})</span>}
              </Label>
              <Option option={option} selectedOption={selectedOptions.find(o => o.optionId === option.id)} onToggleChoice={onToggleChoice} currencySymbol={currencySymbol} />
            </div>)}

          {/* Toppings section - only show if there are toppings */}
          {item.toppingCategories && item.toppingCategories.filter(category => shouldShowToppingCategory(category)).map(category => <ToppingCategory key={category.id} category={category} selectedCategory={selectedToppings.find(t => t.categoryId === category.id)} onToggleTopping={onToggleTopping} t={t} currencySymbol={currencySymbol} />)}
        </div>
        
        <DialogFooter className="mt-3 pt-2">
          <div className="w-full flex items-center">
            <div className="flex items-center mr-4">
              <Button className="h-12 w-12 text-3xl flex items-center justify-center rounded-full bg-violet-800 hover:bg-violet-700" onClick={handleQuantityDecrease}>
                <Minus className="h-6 w-6" />
              </Button>
              <span className="font-medium text-2xl min-w-[40px] text-center">{quantity}</span>
              <Button className="h-12 w-12 text-3xl flex items-center justify-center rounded-full bg-violet-800 hover:bg-violet-700" onClick={handleQuantityIncrease}>
                <Plus className="h-6 w-6" />
              </Button>
            </div>
            <Button onClick={onAddToCart} className="flex-1 bg-kiosk-primary py-[34px] text-3xl">
              {t("addToCart")} - {calculateItemPrice().toFixed(2)} {currencySymbol}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>;
};
export default memo(ItemCustomizationDialog);