
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
  onQuantityChange?: (quantity: number) => void; // Made optional
  specialInstructions: string;
  onSpecialInstructionsChange?: (instructions: string) => void; // Made optional
  shouldShowToppingCategory: (category: any) => boolean;
  t: (key: string) => string;
  currencySymbol: string;
  
  // Added props to match KioskView usage
  setQuantity?: (quantity: number) => void;
  setSpecialInstructions?: (instructions: string) => void;
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
  currencySymbol,
  // Added props
  setQuantity,
  setSpecialInstructions
}) => {
  if (!item) return null;
  
  // Use either the handler or the setter function
  const handleQuantityChange = (newQuantity: number) => {
    if (setQuantity) {
      setQuantity(newQuantity);
    } else if (onQuantityChange) {
      onQuantityChange(newQuantity);
    }
  };
  
  const handleSpecialInstructionsChange = (value: string) => {
    if (setSpecialInstructions) {
      setSpecialInstructions(value);
    } else if (onSpecialInstructionsChange) {
      onSpecialInstructionsChange(value);
    }
  };
  
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
      <DialogContent className="w-[95vw] max-w-[95vw] md:w-[85vw] md:max-w-[85vw]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">{item.name}</DialogTitle>
          <DialogDescription>{item.description}</DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
          {item.options && item.options.map(option => (
            <div key={option.id} className="space-y-2">
              <Label className="font-medium">
                {option.name}
                {option.required && <span className="text-red-500 ml-1">*</span>}
                {option.multiple && <span className="text-sm text-gray-500 ml-2">({t("multipleSelection")})</span>}
              </Label>
              <div className="space-y-2">
                {option.choices.map(choice => {
                  const selectedOption = selectedOptions.find(o => o.optionId === option.id);
                  const isSelected = selectedOption?.choiceIds.includes(choice.id) || false;
                  return (
                    <div 
                      key={choice.id} 
                      className={`
                        flex items-center justify-between p-3 border rounded-md cursor-pointer
                        ${isSelected ? 'border-kiosk-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'}
                      `} 
                      onClick={() => onToggleChoice(option.id, choice.id, !!option.multiple)}
                    >
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
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {item.toppingCategories && item.toppingCategories
            .filter(category => shouldShowToppingCategory(category))
            .map(category => (
              <div key={category.id} className="space-y-3">
                <div className="font-bold text-xl flex items-center">
                  {category.name} 
                  {category.required && <span className="text-red-500 ml-1">*</span>}
                  <span className="ml-2 text-red-600 text-base mx-[10px] font-bold">
                    {category.max_selections > 0 
                      ? `(${t("selectUpTo")} ${category.max_selections})` 
                      : `(${t("multipleSelection")})`
                    }
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {category.toppings.map(topping => {
                    const selectedCategory = selectedToppings.find(t => t.categoryId === category.id);
                    const isSelected = selectedCategory?.toppingIds.includes(topping.id) || false;
                    return (
                      <div
                        key={topping.id}
                        onClick={() => onToggleTopping(category.id, topping.id)}
                        className="flex items-center justify-between border rounded-md p-3 hover:border-gray-300 cursor-pointer"
                      >
                        <span className={`${isSelected ? 'text-green-700 font-medium' : ''}`}>
                          {topping.name}
                        </span>
                        <div className="flex items-center gap-2">
                          {topping.price > 0 && (
                            <span className="text-sm">
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
                            className={`text-5xl px-[10px] rounded-full text-slate-50 font-bold py-[9px] ${
                              isSelected ? 'bg-green-700 hover:bg-green-600' : 'bg-violet-800 hover:bg-violet-700'
                            }`}
                          >
                            {isSelected ? <Check className="h-4 w-4" /> : <PlusCircle className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

          <div>
            <Label className="font-medium">{t("quantity")}</Label>
            <div className="flex items-center space-x-4 mt-2">
              <Button 
                variant="outline" 
                size="icon" 
                onClick={() => quantity > 1 && handleQuantityChange(quantity - 1)}
              >
                <MinusCircle className="h-4 w-4" />
              </Button>
              <span className="font-medium text-lg">{quantity}</span>
              <Button 
                variant="outline" 
                size="icon" 
                onClick={() => handleQuantityChange(quantity + 1)}
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
              onChange={(e) => handleSpecialInstructionsChange(e.target.value)}
              className="mt-1"
            />
          </div>
        </div>
        
        <DialogFooter>
          <div className="w-full">
            <Button 
              onClick={onAddToCart} 
              className="w-full bg-kiosk-primary text-2xl py-[30px]"
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
