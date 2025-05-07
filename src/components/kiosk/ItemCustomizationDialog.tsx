import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MenuItemWithOptions, OrderType } from "@/types/database-types";

interface ItemCustomizationDialogProps {
  item: MenuItemWithOptions;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: () => void;
  selectedOptions: { optionId: string; choiceIds: string[] }[];
  onToggleChoice: (optionId: string, choiceId: string, multiple: boolean) => void;
  selectedToppings: { categoryId: string; toppingIds: string[] }[];
  onToggleTopping: (categoryId: string, toppingId: string) => void;
  quantity: number;
  onQuantityChange: (quantity: number) => void;
  specialInstructions: string;
  onSpecialInstructionsChange: (instructions: string) => void;
  shouldShowToppingCategory: (category: MenuItemWithOptions['toppingCategories'][0]) => boolean;
  t: (key: string) => string;
  currencySymbol: string;
}

const ItemCustomizationDialog = ({
  item,
  isOpen,
  onClose,
  onAddToCart,
  selectedOptions,
  onToggleChoice,
  selectedToppings,
  onToggleTopping,
  quantity,
  onQuantityChange,
  specialInstructions,
  onSpecialInstructionsChange,
  shouldShowToppingCategory,
  t,
  currencySymbol
}: ItemCustomizationDialogProps) => {
  const handleQuantityChange = (delta: number) => {
    const newQuantity = Math.max(1, quantity + delta);
    onQuantityChange(newQuantity);
  };

  const isOptionSelected = (optionId: string, choiceId: string) => {
    const option = selectedOptions.find(o => o.optionId === optionId);
    return option ? option.choiceIds.includes(choiceId) : false;
  };

  const isToppingSelected = (categoryId: string, toppingId: string) => {
    const category = selectedToppings.find(t => t.categoryId === categoryId);
    return category ? category.toppingIds.includes(toppingId) : false;
  };

  const getToppingCategorySelectionCount = (categoryId: string) => {
    const category = selectedToppings.find(t => t.categoryId === categoryId);
    return category ? category.toppingIds.length : 0;
  };

  const formatPrice = (price: number) => {
    return `${currencySymbol}${price.toFixed(2)}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md md:max-w-lg lg:max-w-2xl overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">{item.name}</DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          {item.description && (
            <p className="text-gray-600 mb-4">{item.description}</p>
          )}
          
          <div className="flex items-center justify-between mb-6">
            <div className="text-lg font-semibold">
              {formatPrice(item.price)}
            </div>
            
            <div className="flex items-center space-x-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handleQuantityChange(-1)}
                disabled={quantity <= 1}
              >
                -
              </Button>
              <span className="w-8 text-center">{quantity}</span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handleQuantityChange(1)}
              >
                +
              </Button>
            </div>
          </div>
          
          {/* Options */}
          {item.options && item.options.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold mb-2">Options</h3>
              {item.options.map(option => (
                <div key={option.id} className="mb-4">
                  <div className="flex justify-between mb-1">
                    <h4 className="font-medium">{option.name}</h4>
                    {option.required && (
                      <span className="text-sm text-red-500">*</span>
                    )}
                  </div>
                  <div className="space-y-2">
                    {option.choices.map(choice => (
                      <div 
                        key={choice.id}
                        className={`flex items-center justify-between p-2 border rounded-md cursor-pointer ${
                          isOptionSelected(option.id, choice.id) 
                            ? 'border-primary bg-primary/10' 
                            : 'border-gray-200'
                        }`}
                        onClick={() => onToggleChoice(option.id, choice.id, !!option.multiple)}
                      >
                        <span>{choice.name}</span>
                        {choice.price && choice.price > 0 && (
                          <span className="text-sm text-gray-600">
                            +{formatPrice(choice.price)}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Toppings */}
          {item.toppingCategories && item.toppingCategories.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold mb-2">Toppings</h3>
              {item.toppingCategories
                .filter(shouldShowToppingCategory)
                .map(category => (
                  <div key={category.id} className="mb-4">
                    <div className="flex justify-between mb-1">
                      <h4 className="font-medium">{category.name}</h4>
                      <div className="text-sm">
                        {category.min_selections > 0 && (
                          <span className="text-red-500 mr-1">*</span>
                        )}
                        {category.max_selections > 0 && (
                          <span>
                            {getToppingCategorySelectionCount(category.id)}/{category.max_selections}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      {category.toppings.map(topping => (
                        <div 
                          key={topping.id}
                          className={`flex items-center justify-between p-2 border rounded-md cursor-pointer ${
                            isToppingSelected(category.id, topping.id) 
                              ? 'border-primary bg-primary/10' 
                              : 'border-gray-200'
                          }`}
                          onClick={() => onToggleTopping(category.id, topping.id)}
                        >
                          <span>{topping.name}</span>
                          {topping.price > 0 && (
                            <span className="text-sm text-gray-600">
                              +{formatPrice(topping.price)}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          )}
          
          {/* Special Instructions */}
          <div className="mb-6">
            <h3 className="font-semibold mb-2">{t("cart.specialInstructions")}</h3>
            <Textarea 
              placeholder="Any special requests?"
              value={specialInstructions}
              onChange={(e) => onSpecialInstructionsChange(e.target.value)}
              className="w-full"
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="mr-2">
            Cancel
          </Button>
          <Button onClick={onAddToCart}>
            {t("addToCart")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ItemCustomizationDialog;
