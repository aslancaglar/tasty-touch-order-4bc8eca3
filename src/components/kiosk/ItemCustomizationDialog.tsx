
import React from "react";
import { Check, MinusCircle, PlusCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { MenuItemWithOptions } from "@/types/database-types";

interface ItemCustomizationDialogProps {
  selectedItem: MenuItemWithOptions | null;
  setSelectedItem: (item: MenuItemWithOptions | null) => void;
  quantity: number;
  setQuantity: (quantity: number) => void;
  specialInstructions: string;
  setSpecialInstructions: (instructions: string) => void;
  selectedOptions: {
    optionId: string;
    choiceIds: string[];
  }[];
  selectedToppings: {
    categoryId: string;
    toppingIds: string[];
  }[];
  handleToggleChoice: (optionId: string, choiceId: string, multiple: boolean) => void;
  handleToggleTopping: (categoryId: string, toppingId: string) => void;
  handleAddToCart: () => void;
  calculateItemPrice: (item: MenuItemWithOptions, options: any[], toppings: any[]) => number;
  getCurrencySymbol: (currency: string) => string;
  restaurant: { currency?: string } | null;
  t: (key: string) => string;
  shouldShowToppingCategory: (category: any) => boolean;
}

const ItemCustomizationDialog: React.FC<ItemCustomizationDialogProps> = ({
  selectedItem,
  setSelectedItem,
  quantity,
  setQuantity,
  specialInstructions,
  setSpecialInstructions,
  selectedOptions,
  selectedToppings,
  handleToggleChoice,
  handleToggleTopping,
  handleAddToCart,
  calculateItemPrice,
  getCurrencySymbol,
  restaurant,
  t,
  shouldShowToppingCategory
}) => {
  if (!selectedItem) return null;
  
  const currencySymbol = getCurrencySymbol(restaurant?.currency || "EUR");
  
  return (
    <Dialog open={!!selectedItem} onOpenChange={open => !open && setSelectedItem(null)}>
      <DialogContent className="w-[95vw] max-w-[95vw] md:w-[85vw] md:max-w-[85vw]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">{selectedItem.name}</DialogTitle>
          <DialogDescription>{selectedItem.description}</DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
          {selectedItem.options && selectedItem.options.map(option => (
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
                      onClick={() => handleToggleChoice(option.id, choice.id, !!option.multiple)}
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

          {selectedItem.toppingCategories && selectedItem.toppingCategories
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
                        onClick={() => handleToggleTopping(category.id, topping.id)}
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
                              handleToggleTopping(category.id, topping.id);
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
                onClick={() => quantity > 1 && setQuantity(quantity - 1)}
              >
                <MinusCircle className="h-4 w-4" />
              </Button>
              <span className="font-medium text-lg">{quantity}</span>
              <Button 
                variant="outline" 
                size="icon" 
                onClick={() => setQuantity(quantity + 1)}
              >
                <PlusCircle className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <div className="w-full">
            <Button 
              onClick={handleAddToCart} 
              className="w-full bg-kiosk-primary text-2xl py-[30px]"
            >
              {t("addToCart")} - {(calculateItemPrice(selectedItem, selectedOptions, selectedToppings) * quantity).toFixed(2)} {currencySymbol}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ItemCustomizationDialog;
