
import React from "react";
import { Check, MinusCircle, PlusCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { MenuItemWithOptions } from "@/types/database-types";
import { Textarea } from "@/components/ui/textarea"; 

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
  
  const calculateItemPrice = () => {
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
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="w-[95vw] max-w-[95vw] md:w-[85vw] md:max-w-[85vw] max-h-[95vh] p-3 md:p-4 flex flex-col">
        <DialogHeader className="px-1 py-2 space-y-1">
          <DialogTitle className="text-xl md:text-2xl font-bold">{item.name}</DialogTitle>
          <DialogDescription className="text-sm md:text-base">{item.description}</DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 flex-1 overflow-y-auto pr-2 py-2">
          {item.options && item.options.map(option => (
            <div key={option.id} className="space-y-1.5">
              <Label className="font-medium">
                {option.name}
                {option.required && <span className="text-red-500 ml-1">*</span>}
                {option.multiple && <span className="text-xs md:text-sm text-gray-500 ml-2">({t("multipleSelection")})</span>}
              </Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                {option.choices.map(choice => {
                  const selectedOption = selectedOptions.find(o => o.optionId === option.id);
                  const isSelected = selectedOption?.choiceIds.includes(choice.id) || false;
                  return (
                    <div 
                      key={choice.id} 
                      className={`
                        flex items-center justify-between p-2 md:p-3 border rounded-md cursor-pointer
                        ${isSelected ? 'border-kiosk-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'}
                      `} 
                      onClick={() => onToggleChoice(option.id, choice.id, !!option.multiple)}
                    >
                      <div className="flex items-center">
                        <div className={`
                          w-4 h-4 mr-2 md:w-5 md:h-5 md:mr-3 rounded-full flex items-center justify-center
                          ${isSelected ? 'bg-kiosk-primary text-white' : 'border border-gray-300'}
                        `}>
                          {isSelected && <Check className="h-2 w-2 md:h-3 md:w-3" />}
                        </div>
                        <span className="text-sm md:text-base">{choice.name}</span>
                      </div>
                      {choice.price && choice.price > 0 && <span className="text-sm md:text-base">+{parseFloat(choice.price.toString()).toFixed(2)} {currencySymbol}</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {item.toppingCategories && item.toppingCategories
            .filter(category => shouldShowToppingCategory(category))
            .map(category => (
              <div key={category.id} className="space-y-2">
                <div className="font-medium text-lg md:text-xl flex items-center flex-wrap">
                  {category.name} 
                  {category.required && <span className="text-red-500 ml-1">*</span>}
                  <span className="ml-2 text-red-600 text-xs md:text-sm mx-[5px] font-medium">
                    {category.max_selections > 0 
                      ? `(${t("selectUpTo")} ${category.max_selections})` 
                      : `(${t("multipleSelection")})`
                    }
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5">
                  {category.toppings.map(topping => {
                    const selectedCategory = selectedToppings.find(t => t.categoryId === category.id);
                    const isSelected = selectedCategory?.toppingIds.includes(topping.id) || false;
                    return (
                      <div
                        key={topping.id}
                        onClick={() => onToggleTopping(category.id, topping.id)}
                        className="flex items-center justify-between border rounded-md p-2 hover:border-gray-300 cursor-pointer"
                      >
                        <span className={`${isSelected ? 'text-green-700 font-medium' : ''} text-sm truncate`}>
                          {topping.name}
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          {topping.price > 0 && (
                            <span className="text-xs mr-1">
                              +{parseFloat(topping.price.toString()).toFixed(2)} {currencySymbol}
                            </span>
                          )}
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleTopping(category.id, topping.id);
                            }}
                            className={`text-4xl p-1 h-7 w-7 rounded-full text-slate-50 font-bold ${
                              isSelected ? 'bg-green-700 hover:bg-green-600' : 'bg-violet-800 hover:bg-violet-700'
                            }`}
                          >
                            {isSelected ? <Check className="h-3 w-3" /> : <PlusCircle className="h-3 w-3" />}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

          <div className="flex items-center justify-between py-2">
            <Label className="font-medium">{t("quantity")}</Label>
            <div className="flex items-center space-x-3">
              <Button 
                variant="outline" 
                size="icon" 
                className="h-8 w-8"
                onClick={() => quantity > 1 && onQuantityChange(quantity - 1)}
              >
                <MinusCircle className="h-4 w-4" />
              </Button>
              <span className="font-medium text-lg w-6 text-center">{quantity}</span>
              <Button 
                variant="outline" 
                size="icon"
                className="h-8 w-8"
                onClick={() => onQuantityChange(quantity + 1)}
              >
                <PlusCircle className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div>
            <Label htmlFor="special-instructions" className="font-medium">Special Instructions</Label>
            <Textarea 
              id="special-instructions"
              placeholder="Any special requests..."
              value={specialInstructions}
              onChange={(e) => onSpecialInstructionsChange(e.target.value)}
              className="mt-1 resize-none h-16"
            />
          </div>
        </div>
        
        <DialogFooter className="mt-3">
          <div className="w-full">
            <Button 
              onClick={onAddToCart} 
              className="w-full bg-kiosk-primary text-xl py-6"
            >
              {t("addToCart")} - {calculateItemPrice().toFixed(2)} {currencySymbol}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ItemCustomizationDialog;
