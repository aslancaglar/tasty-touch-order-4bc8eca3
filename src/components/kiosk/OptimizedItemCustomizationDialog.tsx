import React, { memo, useCallback, useEffect, useState, useMemo } from "react";
import { Check, Plus, Minus, AlertCircle, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { getTranslatedField, SupportedLanguage } from "@/utils/language-utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { getOptimizedMenuItemWithDetails } from "@/services/optimized-kiosk-service";

interface OptimizedItemCustomizationDialogProps {
  menuItemId: string | null;
  restaurantId: string;
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
    toppingQuantities?: { [toppingId: string]: number };
  }[];
  onToggleChoice: (optionId: string, choiceId: string, multiple: boolean) => void;
  onToggleTopping: (categoryId: string, toppingId: string, quantity?: number) => void;
  quantity: number;
  onQuantityChange: (quantity: number) => void;
  specialInstructions: string;
  onSpecialInstructionsChange: (instructions: string) => void;
  shouldShowToppingCategory: (category: any) => boolean;
  t: (key: string) => string;
  currencySymbol: string;
}

// Simplified category background colors
const CATEGORY_BACKGROUNDS = [
  "bg-green-50",
  "bg-blue-50", 
  "bg-purple-50",
  "bg-yellow-50",
  "bg-pink-50",
  "bg-orange-50"
];

// Optimized Option component with minimal rendering
const OptimizedOption = memo(({
  option,
  selectedOption,
  onToggleChoice,
  currencySymbol,
  uiLanguage
}: {
  option: any;
  selectedOption: any;
  onToggleChoice: (optionId: string, choiceId: string, multiple: boolean) => void;
  currencySymbol: string;
  uiLanguage: SupportedLanguage;
}) => {
  return (
    <div className="space-y-2">
      {option.choices.map((choice: any) => {
        const isSelected = selectedOption?.choiceIds.includes(choice.id) || false;
        return (
          <div
            key={choice.id}
            className={`
              flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors
              ${isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground'}
            `}
            onClick={() => onToggleChoice(option.id, choice.id, !!option.multiple)}
          >
            <div className="flex items-center">
              <div className={`
                w-5 h-5 mr-3 rounded-full flex items-center justify-center transition-colors
                ${isSelected ? 'bg-primary text-primary-foreground' : 'border border-border'}
              `}>
                {isSelected && <Check className="h-3 w-3" />}
              </div>
              <span>{getTranslatedField(choice, 'name', uiLanguage)}</span>
            </div>
            {choice.price && choice.price > 0 && (
              <span className="text-sm text-muted-foreground">
                +{parseFloat(choice.price.toString()).toFixed(2)} {currencySymbol}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
});
OptimizedOption.displayName = 'OptimizedOption';

// Optimized Topping component with reduced animations
const OptimizedTopping = memo(({
  topping,
  categoryId,
  isSelected,
  quantity,
  allowMultiple,
  onToggleTopping,
  currencySymbol,
  uiLanguage
}: {
  topping: any;
  categoryId: string;
  isSelected: boolean;
  quantity: number;
  allowMultiple: boolean;
  onToggleTopping: (categoryId: string, toppingId: string, quantity?: number) => void;
  currencySymbol: string;
  uiLanguage: SupportedLanguage;
}) => {
  const handleToppingClick = useCallback((e: React.MouseEvent) => {
    if (!(e.target as HTMLElement).closest('button')) {
      if (!isSelected) {
        onToggleTopping(categoryId, topping.id, allowMultiple ? 1 : undefined);
      }
    }
  }, [categoryId, topping.id, isSelected, allowMultiple, onToggleTopping]);

  const handleDecrement = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleTopping(categoryId, topping.id, Math.max(0, quantity - 1));
  }, [categoryId, topping.id, quantity, onToggleTopping]);

  const handleIncrement = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleTopping(categoryId, topping.id, quantity + 1);
  }, [categoryId, topping.id, quantity, onToggleTopping]);

  const handleAdd = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleTopping(categoryId, topping.id, allowMultiple ? 1 : undefined);
  }, [categoryId, topping.id, allowMultiple, onToggleTopping]);

  const handleToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleTopping(categoryId, topping.id);
  }, [categoryId, topping.id, onToggleTopping]);

  return (
    <div 
      className="flex items-center justify-between border p-3 rounded-lg bg-card cursor-pointer hover:border-muted-foreground transition-colors"
      onClick={handleToppingClick}
    >
      <span className={`flex-1 mr-2 ${isSelected ? 'text-primary font-medium' : ''}`}>
        {getTranslatedField(topping, 'name', uiLanguage)}
      </span>
      <div className="flex items-center gap-2 flex-shrink-0">
        {topping.price > 0 && (
          <span className="text-sm text-muted-foreground">
            +{parseFloat(topping.price.toString()).toFixed(2)} {currencySymbol}
          </span>
        )}
        
        {allowMultiple ? (
          isSelected ? (
            <div className="flex items-center">
              <Button 
                variant="outline" 
                size="icon" 
                className="h-8 w-8 rounded-full"
                onClick={handleDecrement}
              >
                <Minus className="h-4 w-4" />
              </Button>
              
              <span className="mx-2 font-bold min-w-[20px] text-center">
                {quantity}
              </span>
              
              <Button 
                variant="outline" 
                size="icon" 
                className="h-8 w-8 rounded-full"
                onClick={handleIncrement}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button 
              variant="outline" 
              size="icon" 
              className="h-8 w-8 rounded-full"
              onClick={handleAdd}
            >
              <Plus className="h-4 w-4" />
            </Button>
          )
        ) : (
          !isSelected ? 
          <Button 
            variant="outline" 
            size="icon" 
            className="h-8 w-8 rounded-full"
            onClick={handleAdd}
          >
            <Plus className="h-4 w-4" />
          </Button> : 
          <Button 
            variant="outline" 
            size="icon" 
            className="h-8 w-8 rounded-full"
            onClick={handleToggle}
          >
            <Check className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
});
OptimizedTopping.displayName = 'OptimizedTopping';

// Optimized ToppingCategory component
const OptimizedToppingCategory = memo(({
  category,
  selectedCategory,
  onToggleTopping,
  t,
  currencySymbol,
  bgColorClass,
  uiLanguage
}: {
  category: any;
  selectedCategory: any;
  onToggleTopping: (categoryId: string, toppingId: string, quantity?: number) => void;
  t: (key: string) => string;
  currencySymbol: string;
  bgColorClass: string;
  uiLanguage: SupportedLanguage;
}) => {
  // Memoize sorted toppings
  const sortedToppings = useMemo(() => {
    return [...category.toppings].sort((a, b) => {
      const orderA = a.display_order ?? 1000;
      const orderB = b.display_order ?? 1000;
      return orderA - orderB;
    });
  }, [category.toppings]);

  // Memoize grid columns calculation
  const gridCols = useMemo(() => {
    const toppingCount = sortedToppings.length;
    if (toppingCount === 1) return "grid-cols-1";
    if (toppingCount === 2) return "grid-cols-2";
    return "grid-cols-3";
  }, [sortedToppings.length]);

  // Memoize warning state
  const showWarning = useMemo(() => {
    const selectedToppingsCount = selectedCategory?.toppingIds.length || 0;
    const minRequired = category.required ? (category.min_selections > 0 ? category.min_selections : 1) : 0;
    return category.required && selectedToppingsCount < minRequired;
  }, [category.required, category.min_selections, selectedCategory?.toppingIds.length]);

  const toppingQuantities = selectedCategory?.toppingQuantities || {};

  return (
    <div className={`space-y-3 p-4 rounded-lg mb-4 ${bgColorClass} relative`}>
      <div className="font-bold text-xl flex items-center">
        {getTranslatedField(category, 'name', uiLanguage)}
        {category.required && <span className="text-destructive ml-1">*</span>}
        <span className="ml-2 text-muted-foreground font-normal text-base">
          {category.max_selections > 0 
            ? `(${t("selectUpTo")} ${category.max_selections})` 
            : `(${t("multipleSelection")})`
          }
        </span>
      </div>
      
      {showWarning && (
        <div className="absolute top-2 right-4 rounded-full p-1 bg-background shadow-md">
          <AlertCircle className="h-6 w-6 text-destructive" />
        </div>
      )}

      <div className={`grid ${gridCols} gap-2`}>
        {sortedToppings.map((topping) => {
          const isSelected = selectedCategory?.toppingIds.includes(topping.id) || false;
          const quantity = toppingQuantities[topping.id] || 0;
          
          return (
            <OptimizedTopping
              key={topping.id}
              topping={topping}
              categoryId={category.id}
              isSelected={isSelected}
              quantity={quantity}
              allowMultiple={category.allow_multiple_same_topping}
              onToggleTopping={onToggleTopping}
              currencySymbol={currencySymbol}
              uiLanguage={uiLanguage}
            />
          );
        })}
      </div>
    </div>
  );
});
OptimizedToppingCategory.displayName = 'OptimizedToppingCategory';

// Loading skeleton component
const DialogSkeleton = () => (
  <div className="space-y-4">
    <div className="space-y-2">
      <Skeleton className="h-8 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
    </div>
    <div className="space-y-3">
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-20 w-full" />
    </div>
  </div>
);

// Main optimized dialog component
const OptimizedItemCustomizationDialog: React.FC<OptimizedItemCustomizationDialogProps> = ({
  menuItemId,
  restaurantId,
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
  const { language: uiLanguage } = useLanguage();
  const [item, setItem] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch item data when dialog opens
  useEffect(() => {
    if (isOpen && menuItemId && restaurantId) {
      const fetchItemData = async () => {
        setIsLoading(true);
        setError(null);
        try {
          console.log(`[OptimizedDialog] Fetching data for item ${menuItemId}`);
          const itemData = await getOptimizedMenuItemWithDetails(menuItemId, restaurantId);
          setItem(itemData);
          console.log(`[OptimizedDialog] Successfully loaded item data`);
        } catch (err) {
          console.error(`[OptimizedDialog] Error loading item data:`, err);
          setError('Failed to load item details');
        } finally {
          setIsLoading(false);
        }
      };

      fetchItemData();
    } else {
      setItem(null);
      setError(null);
    }
  }, [isOpen, menuItemId, restaurantId]);

  // Memoized price calculation
  const totalPrice = useMemo(() => {
    if (!item) return 0;
    
    let price = parseFloat(item.price.toString());
    
    // Add option prices
    if (item.options) {
      item.options.forEach((option: any) => {
        const selected = selectedOptions.find(o => o.optionId === option.id);
        if (selected) {
          selected.choiceIds.forEach(choiceId => {
            const choice = option.choices.find((c: any) => c.id === choiceId);
            if (choice && choice.price) {
              price += parseFloat(choice.price.toString());
            }
          });
        }
      });
    }
    
    // Add topping prices
    if (item.toppingCategories) {
      item.toppingCategories.forEach((category: any) => {
        const selected = selectedToppings.find(t => t.categoryId === category.id);
        if (selected) {
          selected.toppingIds.forEach(toppingId => {
            const topping = category.toppings.find((t: any) => t.id === toppingId);
            if (topping && topping.price) {
              const toppingQty = selected.toppingQuantities?.[toppingId] || 1;
              price += parseFloat(topping.price.toString()) * toppingQty;
            }
          });
        }
      });
    }
    
    return price * quantity;
  }, [item, selectedOptions, selectedToppings, quantity]);

  // Memoized quantity handlers
  const handleQuantityDecrease = useCallback(() => {
    if (quantity > 1) onQuantityChange(quantity - 1);
  }, [quantity, onQuantityChange]);
  
  const handleQuantityIncrease = useCallback(() => {
    onQuantityChange(quantity + 1);
  }, [quantity, onQuantityChange]);

  // Memoized sorted topping categories
  const sortedToppingCategories = useMemo(() => {
    if (!item?.toppingCategories) return [];
    return [...item.toppingCategories].sort((a, b) => {
      const orderA = a.display_order ?? 1000;
      const orderB = b.display_order ?? 1000;
      return orderA - orderB;
    });
  }, [item?.toppingCategories]);

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="w-[85vw] max-w-[85vw] max-h-[80vh] p-4 flex flex-col">
        {isLoading ? (
          <>
            <DialogHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Loader2 className="h-6 w-6 animate-spin" />
                <DialogTitle>Loading...</DialogTitle>
              </div>
            </DialogHeader>
            <div className="flex-grow overflow-y-auto">
              <DialogSkeleton />
            </div>
          </>
        ) : error ? (
          <>
            <DialogHeader className="pb-2">
              <DialogTitle className="text-destructive">Error</DialogTitle>
              <DialogDescription>{error}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>Close</Button>
            </DialogFooter>
          </>
        ) : item ? (
          <>
            <DialogHeader className="pb-2">
              <DialogTitle className="font-bold text-2xl leading-relaxed">
                {getTranslatedField(item, 'name', uiLanguage)}
              </DialogTitle>
              {item.description && (
                <DialogDescription className="text-lg text-muted-foreground">
                  {getTranslatedField(item, 'description', uiLanguage)}
                </DialogDescription>
              )}
            </DialogHeader>
            
            <div className="space-y-4 overflow-y-auto pr-2 flex-grow">
              {/* Options section */}
              {item.options && item.options.length > 0 && item.options.map((option: any) => (
                <div key={option.id} className="space-y-2">
                  <Label className="font-medium text-base">
                    {getTranslatedField(option, 'name', uiLanguage)}
                    {option.required && <span className="text-destructive ml-1">*</span>}
                    {option.multiple && (
                      <span className="text-sm text-muted-foreground ml-2">
                        ({t("multipleSelection")})
                      </span>
                    )}
                  </Label>
                  <OptimizedOption 
                    option={option} 
                    selectedOption={selectedOptions.find(o => o.optionId === option.id)} 
                    onToggleChoice={onToggleChoice} 
                    currencySymbol={currencySymbol} 
                    uiLanguage={uiLanguage} 
                  />
                </div>
              ))}

              {/* Toppings section */}
              {sortedToppingCategories
                .filter(category => shouldShowToppingCategory(category))
                .map((category, index) => (
                  <OptimizedToppingCategory 
                    key={category.id} 
                    category={category} 
                    selectedCategory={selectedToppings.find(t => t.categoryId === category.id)} 
                    onToggleTopping={onToggleTopping} 
                    t={t} 
                    currencySymbol={currencySymbol} 
                    bgColorClass={CATEGORY_BACKGROUNDS[index % CATEGORY_BACKGROUNDS.length]}
                    uiLanguage={uiLanguage}
                  />
                ))}
            </div>
            
            <DialogFooter className="mt-3 pt-2">
              <div className="w-full flex items-center gap-4">
                <div className="flex items-center">
                  <Button 
                    className="h-12 w-12 rounded-full" 
                    variant="outline"
                    onClick={handleQuantityDecrease}
                  >
                    <Minus className="h-5 w-5" />
                  </Button>
                  <span className="font-medium text-xl min-w-[40px] text-center mx-3">
                    {quantity}
                  </span>
                  <Button 
                    className="h-12 w-12 rounded-full" 
                    variant="outline"
                    onClick={handleQuantityIncrease}
                  >
                    <Plus className="h-5 w-5" />
                  </Button>
                </div>
                <Button 
                  onClick={onAddToCart} 
                  className="flex-1 py-6 text-lg"
                  disabled={isLoading}
                >
                  {t("addToCart")} - {totalPrice.toFixed(2)} {currencySymbol}
                </Button>
              </div>
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};

export default memo(OptimizedItemCustomizationDialog);