
import React, { memo, useCallback, useState, useEffect, useMemo, useRef } from "react";
import { Check, Plus, Minus, AlertCircle, Loader2 } from "lucide-react";
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
const CATEGORY_BACKGROUNDS = [
  "bg-[#F2FCE2]", // Soft Green
  "bg-[#E5DEFF]", // Soft Purple
  "bg-[#FEF7CD]", // Soft Yellow
  "bg-[#D3E4FD]", // Soft Blue
  "bg-[#FFDEE2]", // Soft Pink
  "bg-[#FDE1D3]"  // Soft Peach
];

// Improved memoized Option component
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
  // Create a stable handler function for each choice to prevent re-renders
  const toggleHandlers = useRef<Record<string, () => void>>({});

  // Pre-compute choices once
  const choices = useMemo(() => option.choices || [], [option.choices]);
  
  // Initialize handlers if they don't exist
  if (Object.keys(toggleHandlers.current).length === 0 && choices.length > 0) {
    choices.forEach(choice => {
      toggleHandlers.current[choice.id] = () => {
        onToggleChoice(option.id, choice.id, !!option.multiple);
      };
    });
  }

  return (
    <div className="space-y-1 select-none">
      {choices.map(choice => {
        const isSelected = selectedOption?.choiceIds.includes(choice.id) || false;
        
        return (
          <div 
            key={choice.id} 
            className={`
              flex items-center justify-between p-2 border rounded-md cursor-pointer select-none
              ${isSelected ? 'border-kiosk-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'}
            `} 
            onClick={toggleHandlers.current[choice.id]}
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
              <span className="select-none">+{parseFloat(choice.price.toString()).toFixed(2)} {currencySymbol}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}, (prevProps, nextProps) => {
  // Enhanced memoization with deep comparison
  if (prevProps.option.id !== nextProps.option.id) return false;
  
  const prevSelectedIds = prevProps.selectedOption?.choiceIds || [];
  const nextSelectedIds = nextProps.selectedOption?.choiceIds || [];
  
  if (prevSelectedIds.length !== nextSelectedIds.length) return false;
  
  const prevIdSet = new Set(prevSelectedIds);
  const nextIdSet = new Set(nextSelectedIds);
  
  for (const id of prevIdSet) {
    if (!nextIdSet.has(id)) return false;
  }
  
  return prevProps.currencySymbol === nextProps.currencySymbol;
});

Option.displayName = 'Option';

// Improved memoized ToppingCategory component
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
  // Create stable handler references for each topping
  const toppingHandlers = useRef<Record<string, (e?: React.MouseEvent) => void>>({});
  
  // Sort toppings by display_order - memoize this calculation
  const sortedToppings = useMemo(() => {
    return [...(category.toppings || [])].sort((a, b) => {
      const orderA = a.display_order ?? 1000;
      const orderB = b.display_order ?? 1000;
      return orderA - orderB;
    });
  }, [category.toppings]);

  // Initialize handlers if they don't exist
  if (Object.keys(toppingHandlers.current).length === 0 && sortedToppings.length > 0) {
    sortedToppings.forEach(topping => {
      toppingHandlers.current[topping.id] = (e?: React.MouseEvent) => {
        if (e) {
          e.preventDefault();
          e.stopPropagation();
        }
        onToggleTopping(category.id, topping.id);
      };
    });
  }

  // Determine the number of columns based on topping count
  const toppingCount = sortedToppings.length;
  const gridCols = useMemo(() => {
    if (toppingCount === 1) return "grid-cols-1"; // 1 column for 1 topping
    if (toppingCount === 2) return "grid-cols-2"; // 2 columns for 2 toppings
    return "grid-cols-3"; // Default 3 columns for 3+ toppings
  }, [toppingCount]);

  // Check if this category needs a warning icon (required but not enough selections)
  const selectedToppingsCount = selectedCategory?.toppingIds.length || 0;
  const minRequired = category.required ? category.min_selections > 0 ? category.min_selections : 1 : 0;
  const showWarning = category.required && selectedToppingsCount < minRequired;
  
  return (
    <div className={`space-y-2 p-4 rounded-xl mb-4 ${bgColorClass} relative select-none`}>
      <div className="font-bold text-xl flex items-center">
        {category.name}
        {category.required && <span className="text-red-500 ml-1">*</span>}
        <span className="ml-2 text-red-600 font-bold text-base select-none">
          {category.max_selections > 0 
            ? `(${t("selectUpTo")} ${category.max_selections})` 
            : `(${t("multipleSelection")})`}
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
          const isSelected = selectedCategory?.toppingIds.includes(topping.id) || false;
          const buttonSize = "h-10 w-10"; // Same size for both states
          const handler = toppingHandlers.current[topping.id];
          
          return (
            <div 
              key={topping.id} 
              onClick={handler} 
              className="flex items-center justify-between border p-2 hover:border-gray-300 cursor-pointer select-none px-[8px] mx-0 my-0 rounded-lg bg-white"
            >
              <span className={`flex-1 mr-2 select-none ${isSelected ? 'text-green-700 font-medium' : ''}`}>
                {topping.name}
              </span>
              <div className="flex items-center gap-1 flex-shrink-0 whitespace-nowrap select-none">
                {topping.price > 0 && (
                  <span className="text-sm select-none">
                    +{parseFloat(topping.price.toString()).toFixed(2)} {currencySymbol}
                  </span>
                )}
                {!isSelected ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handler} 
                    className={`${buttonSize} text-white cursor-pointer rounded-full bg-violet-700 p-2 hover:bg-violet-600`}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={handler} 
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
}, (prevProps, nextProps) => {
  // Enhanced memoization with deep comparison
  if (prevProps.category.id !== nextProps.category.id) return false;
  
  const prevSelectedIds = prevProps.selectedCategory?.toppingIds || [];
  const nextSelectedIds = nextProps.selectedCategory?.toppingIds || [];
  
  if (prevSelectedIds.length !== nextSelectedIds.length) return false;
  
  const prevIdSet = new Set(prevSelectedIds);
  const nextIdSet = new Set(nextSelectedIds);
  
  for (const id of prevIdSet) {
    if (!nextIdSet.has(id)) return false;
  }
  
  return prevProps.currencySymbol === nextProps.currencySymbol &&
         prevProps.bgColorClass === nextProps.bgColorClass;
});

ToppingCategory.displayName = 'ToppingCategory';

// Improved main dialog component
const ItemCustomizationDialog: React.FC<ItemCustomizationDialogProps> = memo(({
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
  // Use refs to store component state that shouldn't trigger rerenders
  const [isLoading, setIsLoading] = useState(true);
  const [visibleToppingCategories, setVisibleToppingCategories] = useState<any[]>([]);
  const loadingTimeoutRef = useRef<number | null>(null);
  const mountedRef = useRef(true);
  
  // Pre-calculate visible categories once to avoid recalculations on hover
  const visibleCategories = useMemo(() => {
    if (!item?.toppingCategories) return [];
    return item.toppingCategories
      .filter(category => shouldShowToppingCategory(category))
      .sort((a, b) => {
        const orderA = a.display_order ?? 1000;
        const orderB = b.display_order ?? 1000;
        return orderA - orderB;
      });
  }, [item?.toppingCategories, shouldShowToppingCategory]);
  
  // Calculate the item price once and memoize it
  const calculateItemPrice = useMemo(() => {
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
  
  // Stable handlers for quantity changes
  const handleQuantityDecrease = useCallback(() => {
    if (quantity > 1) onQuantityChange(quantity - 1);
  }, [quantity, onQuantityChange]);
  
  const handleQuantityIncrease = useCallback(() => {
    onQuantityChange(quantity + 1);
  }, [quantity, onQuantityChange]);
  
  const handleAddToCart = useCallback(() => {
    onAddToCart();
  }, [onAddToCart]);
  
  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  // Setup loading and cleanup effects
  useEffect(() => {
    mountedRef.current = true;
    
    if (isOpen && item) {
      setIsLoading(true);
      
      if (loadingTimeoutRef.current) {
        window.clearTimeout(loadingTimeoutRef.current);
      }
      
      // Show the dialog immediately with a loading state
      loadingTimeoutRef.current = window.setTimeout(() => {
        if (!mountedRef.current) return;
        
        setIsLoading(false);
        
        if (visibleCategories.length > 0) {
          // Reset the visible categories when dialog opens
          setVisibleToppingCategories([]);
          
          // Load all categories at once if there are only a few
          if (visibleCategories.length <= 3) {
            setVisibleToppingCategories(visibleCategories);
          } else {
            // Process in batches for smoother rendering
            const loadNextBatch = (startIndex = 0, batchSize = 2) => {
              if (!mountedRef.current) return;
              
              const nextBatch = visibleCategories.slice(startIndex, startIndex + batchSize);
              setVisibleToppingCategories(prev => [...prev, ...nextBatch]);
              
              if (startIndex + batchSize < visibleCategories.length) {
                loadingTimeoutRef.current = window.setTimeout(() => {
                  loadNextBatch(startIndex + batchSize, batchSize);
                }, 50);
              }
            };
            
            loadNextBatch();
          }
        }
      }, 50);
    }
    
    return () => {
      mountedRef.current = false;
      if (loadingTimeoutRef.current) {
        window.clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, [isOpen, item, visibleCategories]);
  
  // Early return if there's no item to show
  if (!item) return null;

  // Improve dialog opening speed by simplifying initial render
  const hasCustomizations = Boolean(
    (item.options?.length || 0) > 0 || 
    (visibleCategories.length || 0) > 0
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent 
        className="w-[85vw] max-w-[85vw] max-h-[80vh] p-4 flex flex-col select-none"
        onPointerDownOutside={(e) => {
          // Prevent pointer events from bubbling up
          e.preventDefault();
        }}
      >
        <DialogHeader className="pb-2">
          <DialogTitle className="font-bebas text-3xl mx-0 my-0 leading-relaxed select-none">{item.name}</DialogTitle>
          {item.description && (
            <DialogDescription className="text-xl text-gray-800 select-none">{item.description}</DialogDescription>
          )}
        </DialogHeader>
        
        <div className="space-y-4 overflow-y-auto pr-2 flex-grow select-none">
          {isLoading ? (
            // Loading skeleton UI for better user experience
            <>
              <div className="space-y-2">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
              <div className="space-y-2 mt-4">
                <Skeleton className="h-6 w-40" />
                <div className="grid grid-cols-2 gap-2">
                  <Skeleton className="h-12" />
                  <Skeleton className="h-12" />
                  <Skeleton className="h-12" />
                  <Skeleton className="h-12" />
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Options section - only show if there are options */}
              {item.options && item.options.length > 0 && item.options.map(option => (
                <div key={option.id} className="space-y-1">
                  <Label className="font-medium select-none">
                    {option.name}
                    {option.required && <span className="text-red-500 ml-1">*</span>}
                    {option.multiple && (
                      <span className="text-sm text-gray-500 ml-2 select-none">({t("multipleSelection")})</span>
                    )}
                  </Label>
                  <Option 
                    option={option} 
                    selectedOption={selectedOptions.find(o => o.optionId === option.id)} 
                    onToggleChoice={onToggleChoice} 
                    currencySymbol={currencySymbol} 
                  />
                </div>
              ))}

              {/* Toppings section - progressively rendered for better performance */}
              {visibleToppingCategories.map((category, index) => (
                <ToppingCategory 
                  key={category.id} 
                  category={category} 
                  selectedCategory={selectedToppings.find(t => t.categoryId === category.id)} 
                  onToggleTopping={onToggleTopping} 
                  t={t} 
                  currencySymbol={currencySymbol} 
                  bgColorClass={CATEGORY_BACKGROUNDS[index % CATEGORY_BACKGROUNDS.length]} 
                />
              ))}
              
              {/* Show loading indicator if we still have categories to load */}
              {visibleCategories.length > 0 && 
               visibleToppingCategories.length < visibleCategories.length && (
                <div className="flex justify-center py-4 select-none">
                  <Loader2 className="h-8 w-8 animate-spin text-violet-700" />
                  <span className="ml-2 text-violet-700 select-none">Loading more options...</span>
                </div>
              )}
            </>
          )}
        </div>
        
        <DialogFooter className="mt-3 pt-2 select-none">
          <div className="w-full flex items-center select-none">
            <div className="flex items-center mr-4">
              <Button 
                className="h-12 w-12 text-3xl flex items-center justify-center rounded-full bg-violet-800 hover:bg-violet-700 text-white select-none" 
                onClick={handleQuantityDecrease}
                disabled={isLoading}
              >
                <Minus className="h-6 w-6" />
              </Button>
              <span className="font-medium text-2xl min-w-[40px] text-center select-none">{quantity}</span>
              <Button 
                className="h-12 w-12 text-3xl flex items-center justify-center rounded-full bg-violet-800 hover:bg-violet-700 text-white select-none" 
                onClick={handleQuantityIncrease}
                disabled={isLoading}
              >
                <Plus className="h-6 w-6" />
              </Button>
            </div>
            <Button 
              onClick={handleAddToCart} 
              className="flex-1 bg-kiosk-primary py-[34px] text-3xl select-none"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                  <span className="select-none">{t("loading")}</span>
                </>
              ) : (
                <span className="select-none">
                  {t("addToCart")} - {calculateItemPrice.toFixed(2)} {currencySymbol}
                </span>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

ItemCustomizationDialog.displayName = "ItemCustomizationDialog";

export default memo(ItemCustomizationDialog);
