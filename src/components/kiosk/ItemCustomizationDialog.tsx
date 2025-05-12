
import React, { memo, useCallback, useState, useEffect, useRef, useMemo } from "react";
import { Check, Plus, Minus, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { MenuItemWithOptions } from "@/types/database-types";
import { Skeleton } from "@/components/ui/skeleton";

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

// Define alternating background colors for topping categories
const CATEGORY_BACKGROUNDS = ["bg-[#F2FCE2]", "bg-[#E5DEFF]", "bg-[#FEF7CD]", "bg-[#D3E4FD]", "bg-[#FFDEE2]", "bg-[#FDE1D3]"];

// Memoize the Option component with proper event management
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
  // Pre-calculate selected state to avoid recalculations during render
  const getIsSelected = useCallback((choiceId: string) => {
    return selectedOption?.choiceIds.includes(choiceId) || false;
  }, [selectedOption]);

  const handleChoiceClick = useCallback((e: React.MouseEvent, optionId: string, choiceId: string, multiple: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    onToggleChoice(optionId, choiceId, multiple);
  }, [onToggleChoice]);

  return (
    <div className="space-y-1">
      {option.choices.map(choice => {
        const isSelected = getIsSelected(choice.id);
        return (
          <div 
            key={choice.id} 
            className={`
              flex items-center justify-between p-2 border rounded-md cursor-pointer select-none
              ${isSelected ? 'border-kiosk-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'}
            `} 
            onClick={(e) => handleChoiceClick(e, option.id, choice.id, !!option.multiple)}
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
            {choice.price && choice.price > 0 && (
              <span>+{parseFloat(choice.price.toString()).toFixed(2)} {currencySymbol}</span>
            )}
          </div>
        );
      })}
    </div>
  );
});
Option.displayName = 'Option';

// Memoize the ToppingCategory component with isolated event handlers
const ToppingCategory = memo(({
  category,
  selectedCategory,
  onToggleTopping,
  t,
  currencySymbol,
  bgColorClass
}: {
  category: any;
  selectedCategory: any;
  onToggleTopping: (categoryId: string, toppingId: string) => void;
  t: (key: string) => string;
  currencySymbol: string;
  bgColorClass: string;
}) => {
  // Sort toppings by display_order - do it with useMemo to avoid recalculation
  const sortedToppings = useMemo(() => {
    return [...category.toppings].sort((a, b) => {
      const orderA = a.display_order ?? 1000;
      const orderB = b.display_order ?? 1000;
      return orderA - orderB;
    });
  }, [category.toppings]);

  // Determine grid columns with useMemo to prevent recalculation
  const gridCols = useMemo(() => {
    const toppingCount = sortedToppings.length;
    if (toppingCount === 1) return "grid-cols-1";
    if (toppingCount === 2) return "grid-cols-2";
    return "grid-cols-3";
  }, [sortedToppings.length]);

  // Check warning state with useMemo
  const showWarning = useMemo(() => {
    const selectedToppingsCount = selectedCategory?.toppingIds.length || 0;
    const minRequired = category.required ? category.min_selections > 0 ? category.min_selections : 1 : 0;
    return category.required && selectedToppingsCount < minRequired;
  }, [category.required, category.min_selections, selectedCategory?.toppingIds.length]);

  // Create stable callback for topping toggle
  const handleToggleTopping = useCallback((e: React.MouseEvent, categoryId: string, toppingId: string) => {
    e.preventDefault();
    e.stopPropagation();
    onToggleTopping(categoryId, toppingId);
  }, [onToggleTopping]);

  // Check if topping is selected - stable function
  const isSelected = useCallback((toppingId: string) => {
    return selectedCategory?.toppingIds.includes(toppingId) || false;
  }, [selectedCategory]);

  return (
    <div className={`space-y-2 p-4 rounded-xl mb-4 ${bgColorClass} relative animate-fadeIn will-change-transform`}>
      <div className="font-bold text-xl flex items-center">
        {category.name}
        {category.required && <span className="text-red-500 ml-1">*</span>}
        <span className="ml-2 text-red-600 font-bold text-base">
          {category.max_selections > 0 ? `(${t("selectUpTo")} ${category.max_selections})` : `(${t("multipleSelection")})`}
        </span>
      </div>
      
      {/* Warning Icon */}
      {showWarning && (
        <div className="absolute top-0 right-4 rounded-full p-1 shadow-md py-[4px] px-[4px] bg-white">
          <AlertCircle className="h-8 w-8 text-[#ea384c]" />
        </div>
      )}

      <div className={`grid ${gridCols} gap-1`}>
        {sortedToppings.map(topping => {
          const toppingSelected = isSelected(topping.id);
          const buttonSize = "h-10 w-10";
          
          return (
            <div 
              key={topping.id} 
              onClick={(e) => handleToggleTopping(e, category.id, topping.id)}
              className="flex items-center justify-between border p-2 hover:border-gray-300 cursor-pointer select-none px-[8px] mx-0 my-0 rounded-lg bg-white"
            >
              <span className={`flex-1 mr-2 ${toppingSelected ? 'text-green-700 font-medium' : ''}`}>
                {topping.name}
              </span>
              <div className="flex items-center gap-1 flex-shrink-0 whitespace-nowrap">
                {topping.price > 0 && (
                  <span className="text-sm">
                    +{parseFloat(topping.price.toString()).toFixed(2)} {currencySymbol}
                  </span>
                )}
                {!toppingSelected ? (
                  <Plus 
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleTopping(category.id, topping.id);
                    }} 
                    className={`${buttonSize} text-white cursor-pointer rounded-full bg-violet-700 p-2`} 
                  />
                ) : (
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleTopping(category.id, topping.id);
                    }} 
                    className={`${buttonSize} rounded-full text-white bg-green-700 hover:bg-green-600`}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});
ToppingCategory.displayName = 'ToppingCategory';

// Main component with improved performance
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
  // State for lazy loading categories
  const [loadedCategories, setLoadedCategories] = useState<number>(0);
  const [isInitialLoad, setIsInitialLoad] = useState<boolean>(true);
  const dialogContentRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<number | null>(null);
  
  // Cache visible categories calculation to avoid recalculation on every render
  const visibleCategories = useMemo(() => {
    if (!item?.toppingCategories) return [];
    return [...item.toppingCategories]
      .sort((a, b) => {
        const orderA = a.display_order ?? 1000;
        const orderB = b.display_order ?? 1000;
        return orderA - orderB;
      })
      .filter(shouldShowToppingCategory);
  }, [item?.toppingCategories, shouldShowToppingCategory]);
  
  // Reset loaded categories when dialog opens/closes or item changes
  useEffect(() => {
    if (isOpen) {
      setIsInitialLoad(true);
      setLoadedCategories(0);
      
      // Clear any existing interval
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      
      // Start loading categories immediately but incrementally
      const loadCategories = () => {
        if (!visibleCategories.length) {
          setIsInitialLoad(false);
          return;
        }
        
        const totalCategories = visibleCategories.length;
        const initialBatch = Math.min(2, totalCategories); // Load first 2 categories instantly
        
        // Load initial batch immediately
        setLoadedCategories(initialBatch);
        
        // Load remaining categories with delay
        if (totalCategories > initialBatch) {
          let loaded = initialBatch;
          intervalRef.current = window.setInterval(() => {
            loaded += 1;
            setLoadedCategories(loaded);
            
            if (loaded >= totalCategories) {
              if (intervalRef.current !== null) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
              }
              setIsInitialLoad(false);
            }
          }, 120); // Load a new category every 120ms
        } else {
          setIsInitialLoad(false);
        }
      };
      
      // Start loading categories after a very short delay
      const timer = setTimeout(loadCategories, 50);
      return () => {
        clearTimeout(timer);
        if (intervalRef.current !== null) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
    }
    
    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isOpen, visibleCategories]);
  
  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  // Memoized price calculation
  const calculateItemPrice = useMemo(() => {
    if (!item) return 0;
    
    let price = parseFloat(item.price.toString());
    
    // Add option prices
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
    
    // Add topping prices
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
  
  // Stable event handlers
  const handleQuantityDecrease = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (quantity > 1) onQuantityChange(quantity - 1);
  }, [quantity, onQuantityChange]);
  
  const handleQuantityIncrease = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onQuantityChange(quantity + 1);
  }, [quantity, onQuantityChange]);

  const handleAddToCartClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onAddToCart();
  }, [onAddToCart]);
  
  // Derived state check for customizations
  const hasCustomizations = useMemo(() => {
    return (item?.options && item.options.length > 0) || 
           (item?.toppingCategories && item.toppingCategories.length > 0);
  }, [item?.options, item?.toppingCategories]);

  if (!item) return null;

  return (
    <Dialog 
      open={isOpen} 
      onOpenChange={(open) => !open && onClose()}
    >
      <DialogContent
        ref={dialogContentRef}
        className="w-[85vw] max-w-[85vw] max-h-[80vh] p-4 flex flex-col select-none"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="pb-2">
          <DialogTitle className="font-bold text-3xl mx-0 my-0 leading-relaxed">{item.name}</DialogTitle>
          {item.description && (
            <DialogDescription className="text-xl text-gray-800">{item.description}</DialogDescription>
          )}
        </DialogHeader>
        
        <div className="space-y-4 overflow-y-auto pr-2 flex-grow select-none">
          {/* Options section - only show if there are options */}
          {item.options && item.options.length > 0 && item.options.map(option => (
            <div key={option.id} className="space-y-1">
              <Label className="font-medium">
                {option.name}
                {option.required && <span className="text-red-500 ml-1">*</span>}
                {option.multiple && <span className="text-sm text-gray-500 ml-2">({t("multipleSelection")})</span>}
              </Label>
              <Option 
                option={option} 
                selectedOption={selectedOptions.find(o => o.optionId === option.id)} 
                onToggleChoice={onToggleChoice} 
                currencySymbol={currencySymbol} 
              />
            </div>
          ))}

          {/* Toppings section - only show loaded categories with animation */}
          {visibleCategories.map((category, index) => {
            // Only render categories that have been "loaded" based on the loadedCategories count
            if (index < loadedCategories) {
              return (
                <ToppingCategory 
                  key={category.id} 
                  category={category} 
                  selectedCategory={selectedToppings.find(t => t.categoryId === category.id)} 
                  onToggleTopping={onToggleTopping} 
                  t={t} 
                  currencySymbol={currencySymbol} 
                  bgColorClass={CATEGORY_BACKGROUNDS[index % CATEGORY_BACKGROUNDS.length]} 
                />
              );
            } else if (isInitialLoad) {
              // Show skeleton for categories that will be loaded
              return (
                <div key={`skeleton-${index}`} className="animate-pulse mb-4">
                  <Skeleton className="h-[120px] w-full rounded-xl" />
                </div>
              );
            }
            return null;
          })}
        </div>
        
        <DialogFooter className="mt-3 pt-2">
          <div className="w-full flex items-center">
            <div className="flex items-center mr-4">
              <Button 
                className="h-12 w-12 text-3xl flex items-center justify-center rounded-full bg-violet-800 hover:bg-violet-700 text-white" 
                onClick={handleQuantityDecrease}
              >
                <Minus className="h-6 w-6" />
              </Button>
              <span className="font-medium text-2xl min-w-[40px] text-center">{quantity}</span>
              <Button 
                className="h-12 w-12 text-3xl flex items-center justify-center rounded-full bg-violet-800 hover:bg-violet-700 text-white" 
                onClick={handleQuantityIncrease}
              >
                <Plus className="h-6 w-6" />
              </Button>
            </div>
            <Button 
              onClick={handleAddToCartClick} 
              className="flex-1 bg-kiosk-primary py-[34px] text-3xl"
            >
              {t("addToCart")} - {calculateItemPrice().toFixed(2)} {currencySymbol}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default memo(ItemCustomizationDialog);
