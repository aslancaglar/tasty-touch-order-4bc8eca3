
import React, { memo, useCallback, useEffect, useState, useRef } from "react";
import { Check, Plus, Minus, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { MenuItemWithOptions } from "@/types/database-types";
import { getTranslatedField, SupportedLanguage } from "@/utils/language-utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { useOptimizedMenuItemDetails } from "@/hooks/useOptimizedMenuItemDetails";
import { useOptimizedItemCustomization } from "@/hooks/useOptimizedItemCustomization";
import { canSelectTopping } from "@/utils/topping-utils";
import { OptimizedLoadingDialog } from "./OptimizedLoadingDialog";
import { trackDialogOpen, trackDialogDataLoaded, trackDialogRender } from "@/utils/performance-monitor";
import { validateItemCustomization } from "@/utils/validation-utils";
import { useToast } from "@/hooks/use-toast";

interface ItemCustomizationDialogProps {
  itemId: string | null;
  restaurantId: string;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (cartItem: {
    menuItem: MenuItemWithOptions;
    quantity: number;
    selectedOptions: any[];
    selectedToppings: any[];
    specialInstructions: string;
    itemPrice: number;
  }) => void;
  t: (key: string) => string;
  currencySymbol: string;
  itemDetails?: MenuItemWithOptions | null; // Optional pre-fetched item details
}

// Define alternating background colors for topping categories
const CATEGORY_BACKGROUNDS = ["bg-[#F2FCE2]",
// Soft Green
"bg-[#E5DEFF]",
// Soft Purple
"bg-[#FEF7CD]",
// Soft Yellow
"bg-[#D3E4FD]",
// Soft Blue
"bg-[#FFDEE2]",
// Soft Pink
"bg-[#FDE1D3]" // Soft Peach
];

// Memoize the Option component to prevent unnecessary re-renders
const Option = memo(({
  option,
  selectedOption,
  onToggleChoice,
  currencySymbol,
  uiLanguage,
  isHighlighted = false
}: {
  option: any;
  selectedOption: any;
  onToggleChoice: (optionId: string, choiceId: string, multiple: boolean) => void;
  currencySymbol: string;
  uiLanguage: SupportedLanguage;
  isHighlighted?: boolean;
}) => {
  return <div className={`space-y-1 ${isHighlighted ? 'animate-pulse' : ''}`}>
      {option.choices.map(choice => {
      const isSelected = selectedOption?.choiceIds.includes(choice.id) || false;
      return <div key={choice.id} className={`
              flex items-center justify-between p-2 border rounded-md cursor-pointer select-none transition-all duration-300
              ${isSelected ? 'border-kiosk-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'}
              ${isHighlighted ? 'border-red-500 bg-red-50 shadow-md' : ''}
            `} onClick={() => onToggleChoice(option.id, choice.id, !!option.multiple)}>
            <div className="flex items-center">
              <div className={`
                w-5 h-5 mr-3 rounded-full flex items-center justify-center
                ${isSelected ? 'bg-kiosk-primary text-white' : 'border border-gray-300'}
              `}>
                {isSelected && <Check className="h-3 w-3" />}
              </div>
              <span>{getTranslatedField(choice, 'name', uiLanguage)}</span>
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
  selectedToppings,
  toppingCategories,
  onToggleTopping,
  t,
  currencySymbol,
  bgColorClass,
  isVisible,
  uiLanguage,
  isHighlighted = false
}: {
  category: any;
  selectedCategory: any;
  selectedToppings: any[];
  toppingCategories: any[];
  onToggleTopping: (categoryId: string, toppingId: string, quantity?: number) => void;
  t: (key: string) => string;
  currencySymbol: string;
  bgColorClass: string;
  isVisible: boolean;
  uiLanguage: SupportedLanguage;
  isHighlighted?: boolean;
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

  // Check if this category needs a warning icon (required but not enough selections)
  const selectedToppingsCount = selectedCategory?.toppingIds.length || 0;
  const minRequired = category.required ? category.min_selections > 0 ? category.min_selections : 1 : 0;
  const showWarning = category.required && selectedToppingsCount < minRequired;
  
  // Get topping quantities from the selected category
  const toppingQuantities = selectedCategory?.toppingQuantities || {};
  
  return <div 
    className={`space-y-2 p-4 rounded-xl mb-4 ${bgColorClass} relative transition-all duration-300 ${isHighlighted ? 'border-2 border-red-500 shadow-lg animate-pulse' : 'border-2 border-transparent'}`}
    style={{
      opacity: isVisible ? 1 : 0,
      transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
      transition: 'opacity 500ms ease, transform 500ms ease'
    }}
  >
      <div className="font-bold text-xl flex items-center">
        {getTranslatedField(category, 'name', uiLanguage)}
        {category.required && <span className="text-red-500 ml-1">*</span>}
        <span className="ml-2 text-red-600 font-bold text-base">
          {category.max_selections > 0 ? `(${t("selectUpTo")} ${category.max_selections})` : `(${t("multipleSelection")})`}
        </span>
      </div>
      
      {/* Warning Icon */}
      {showWarning && <div className="absolute top-0 right-4 rounded-full p-1 shadow-md py-[4px] px-[4px] bg-white">
          <AlertCircle className="h-8 w-8 text-[#ea384c]" />
        </div>}

      <div className={`grid ${gridCols} gap-1`}>
        {sortedToppings.map(topping => {
          const isSelected = selectedCategory?.toppingIds.includes(topping.id) || false;
          const quantity = toppingQuantities[topping.id] || 0;
          const buttonSize = "h-10 w-10"; // Same size for both states
          
          // Check if this topping can be selected (considering max_selections limit)
          const canSelect = canSelectTopping(category.id, topping.id, selectedToppings, toppingCategories);
          const isDisabled = !isSelected && !canSelect;
          
          // Decide what to render based on whether multiple quantities are allowed
          const allowMultiple = category.allow_multiple_same_topping;
          
          return <div 
            key={topping.id} 
            className={`flex items-center justify-between border p-2 select-none px-[8px] mx-0 my-0 rounded-lg ${
              isDisabled 
                ? 'bg-gray-100 opacity-50 cursor-not-allowed' 
                : 'bg-white hover:border-gray-300 cursor-pointer'
            }`}
            onClick={(e) => {
              // Handle click on the entire topping item (except when clicking on the +/- buttons)
              // This makes the entire row clickable, not just the + icon
              if (!(e.target as HTMLElement).closest('button') && !isDisabled) {
                if (!isSelected) {
                  // If not selected, add it with quantity 1
                  onToggleTopping(category.id, topping.id, allowMultiple ? 1 : undefined);
                } else if (!allowMultiple) {
                  // If selected and single selection mode, deselect it
                  onToggleTopping(category.id, topping.id);
                }
              }
            }}
          >
              <span className={`flex-1 mr-2 ${isSelected ? 'text-green-700 font-medium' : ''}`}>
                {getTranslatedField(topping, 'name', uiLanguage)}
              </span>
              <div className="flex items-center gap-1 flex-shrink-0 whitespace-nowrap">
                {topping.price > 0 && <span className="text-sm">
                    +{parseFloat(topping.price.toString()).toFixed(2)} {currencySymbol}
                  </span>}
                
                {/* Show different UI based on whether multiple quantities are allowed */}
                {allowMultiple ? (
                  isSelected ? (
                    <div className="flex items-center">
                      <Button 
                        variant="outline" 
                        size="icon" 
                        className="h-8 w-8 rounded-full bg-violet-700 text-white hover:bg-violet-600 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          // Decrement quantity (minimum 0, which removes it)
                          onToggleTopping(category.id, topping.id, Math.max(0, quantity - 1));
                        }}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      
                      <span className="mx-2 font-bold min-w-[20px] text-center">
                        {quantity}
                      </span>
                      
                      <Button 
                        variant="outline" 
                        size="icon" 
                        className="h-8 w-8 rounded-full bg-violet-700 text-white hover:bg-violet-600 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          // Increment quantity
                          onToggleTopping(category.id, topping.id, quantity + 1);
                        }}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <Button 
                      variant="outline" 
                      size="icon" 
                      disabled={isDisabled}
                      className={`${buttonSize} text-white cursor-pointer rounded-full p-2 ${
                        isDisabled 
                          ? 'bg-gray-400 cursor-not-allowed' 
                          : 'bg-violet-700 hover:bg-violet-600'
                      }`} 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!isDisabled) {
                          // Add with quantity 1
                          onToggleTopping(category.id, topping.id, 1);
                        }
                      }}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  )
                ) : (
                  // Original toggle UI for single selection
                  !isSelected ? 
                  <div 
                    onClick={e => {
                      e.stopPropagation();
                      if (!isDisabled) {
                        onToggleTopping(category.id, topping.id);
                      }
                    }} 
                    className={`${buttonSize} text-white rounded-full flex items-center justify-center ${
                      isDisabled 
                        ? 'bg-gray-400 cursor-not-allowed' 
                        : 'bg-violet-700 cursor-pointer hover:bg-violet-600'
                    }`} 
                  >
                    <Plus className="h-4 w-4" />
                  </div> :
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={e => {
                      e.stopPropagation();
                      onToggleTopping(category.id, topping.id);
                    }} 
                    className={`${buttonSize} rounded-full text-white bg-green-700 hover:bg-green-600`}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>;
        })}
      </div>
    </div>;
});
ToppingCategory.displayName = 'ToppingCategory';

// Optimized main component
const ItemCustomizationDialog: React.FC<ItemCustomizationDialogProps> = ({
  itemId,
  restaurantId,
  isOpen,
  onClose,
  onAddToCart,
  t,
  currencySymbol,
  itemDetails: providedItemDetails
}) => {
  
  
  const { language: uiLanguage } = useLanguage();
  const { toast } = useToast();
  
  // Use optimized hooks for data fetching and state management - only fetch if no details provided
  const { itemDetails: fetchedItemDetails, loading, error } = useOptimizedMenuItemDetails(
    providedItemDetails ? null : itemId, 
    restaurantId
  );
  
  // Use provided details if available, otherwise use fetched details
  const itemDetails = providedItemDetails || fetchedItemDetails;
  const {
    selectedOptions,
    selectedToppings,
    quantity,
    specialInstructions,
    visibleToppingCategories,
    handleToggleChoice,
    handleToggleTopping,
    handleQuantityChange,
    handleSpecialInstructionsChange,
    resetCustomization,
    calculatePrice
  } = useOptimizedItemCustomization(itemDetails, currencySymbol);

  // Show optimized loading dialog while fetching item details
  if (loading || !itemDetails) {
    return <OptimizedLoadingDialog isOpen={isOpen && !!itemId} t={t} showSkeleton={true} />;
  }

  // Show error or handle null item
  if (error || !itemDetails) {
    return null;
  }

  // State to track which topping categories are visible (for simplified animation)
  const [visibleCategories, setVisibleCategories] = useState<{ [key: string]: boolean }>({});
  
  // State for validation highlighting
  const [highlightedOptions, setHighlightedOptions] = useState<string[]>([]);
  const [highlightedToppings, setHighlightedToppings] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Refs to scroll to elements
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const toppingRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  
  // Timeout refs for cleanup
  const timeoutRefs = useRef<{ [key: string]: NodeJS.Timeout }>({});
  const lastClickTime = useRef<number>(0);

  // Reset visibility state when dialog opens/closes or item changes
  useEffect(() => {
    if (isOpen && itemId) {
      // Track dialog opening performance
      trackDialogOpen(itemId);
    }
  }, [isOpen, itemId]);

  useEffect(() => {
    if (isOpen && itemDetails) {
      // Track when data is loaded and from where
      const dataSource = providedItemDetails ? 'cache' : 'api';
      if (itemId) {
        trackDialogDataLoaded(itemId, dataSource);
        
        // Track rendering complexity
        const optionsCount = itemDetails.options?.length || 0;
        const toppingsCount = itemDetails.toppingCategories?.reduce((sum, cat) => sum + (cat.toppings?.length || 0), 0) || 0;
        trackDialogRender(itemId, optionsCount, toppingsCount);
      }

      // Reset and show all categories immediately for better performance
      const initialVisibility: { [key: string]: boolean } = {};
      visibleToppingCategories.forEach(category => {
        initialVisibility[category.id] = true;
      });
      setVisibleCategories(initialVisibility);
    } else {
      setVisibleCategories({});
    }
  }, [isOpen, itemDetails, visibleToppingCategories, itemId, providedItemDetails]);

  // Reset customization when dialog closes or item changes
  useEffect(() => {
    if (!isOpen || !itemDetails) {
      resetCustomization();
      setIsSubmitting(false);
      // Clear all timeouts
      Object.values(timeoutRefs.current).forEach(timeout => {
        clearTimeout(timeout);
      });
      timeoutRefs.current = {};
      // Clear highlights
      setHighlightedOptions([]);
      setHighlightedToppings([]);
    }
  }, [isOpen, itemDetails, resetCustomization]);

  // Function to scroll to the first missing required item
  const scrollToMissingItem = useCallback((missingOptions: string[], missingToppings: string[]) => {
    if (!scrollContainerRef.current) return;

    // Find the first missing item (prioritize options, then toppings)
    let targetElement: HTMLElement | null = null;

    if (missingOptions.length > 0) {
      const firstMissingOption = missingOptions[0];
      targetElement = optionRefs.current[firstMissingOption];
    } else if (missingToppings.length > 0) {
      const firstMissingTopping = missingToppings[0];
      targetElement = toppingRefs.current[firstMissingTopping];
    }

    if (targetElement && scrollContainerRef.current) {
      targetElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest'
      });
    }
  }, []);

  // Clear all validation timeouts
  const clearValidationTimeouts = useCallback(() => {
    Object.values(timeoutRefs.current).forEach(timeout => {
      clearTimeout(timeout);
    });
    timeoutRefs.current = {};
  }, []);

  // Optimized add to cart handler with validation, debouncing, and timeout cleanup
  const handleAddToCart = useCallback(() => {
    console.log('[DEBUG] handleAddToCart function called!');
    console.log('[AddToCart] Button clicked - starting validation process');
    console.log('[AddToCart] Current state:', {
      itemId: itemDetails?.id,
      hasItemDetails: !!itemDetails,
      selectedOptionsCount: selectedOptions.length,
      selectedToppingsCount: selectedToppings.length,
      quantity,
      isSubmitting,
      specialInstructions: specialInstructions.length
    });
    
    if (!itemDetails) {
      console.error('[AddToCart] No item details available, aborting');
      return;
    }

    // Debouncing - prevent rapid clicks
    const now = Date.now();
    if (now - lastClickTime.current < 500) {
      console.log('[AddToCart] Click debounced, too soon since last click');
      return;
    }
    lastClickTime.current = now;

    // Prevent multiple submissions
    if (isSubmitting) {
      console.log('[AddToCart] Already submitting, ignoring click');
      return;
    }

    console.log('[AddToCart] Starting validation...');
    console.log('[AddToCart] Selected options:', selectedOptions);
    console.log('[AddToCart] Selected toppings:', selectedToppings);
    
    // Validate required selections with detailed logging
    const validation = validateItemCustomization(itemDetails, selectedOptions, selectedToppings);
    console.log('[AddToCart] Validation result:', {
      isValid: validation.isValid,
      missingOptions: validation.missingOptions,
      missingToppings: validation.missingToppings,
      totalOptionsRequired: itemDetails.options?.filter(o => o.required).length || 0,
      totalToppingsRequired: itemDetails.toppingCategories?.filter(c => c.required).length || 0
    });
    
    if (!validation.isValid) {
      console.log('[AddToCart] Validation failed - showing user feedback');
      
      // Clear any existing timeouts to prevent conflicts
      clearValidationTimeouts();
      
      // Reset highlighting states immediately
      setHighlightedOptions([]);
      setHighlightedToppings([]);
      
      // Scroll to the first missing item first
      scrollToMissingItem(validation.missingOptions, validation.missingToppings);
      
      // Apply highlights after scroll with timeout cleanup
      timeoutRefs.current.highlight = setTimeout(() => {
        console.log('[AddToCart] Applying validation highlights');
        setHighlightedOptions(validation.missingOptions);
        setHighlightedToppings(validation.missingToppings);
      }, 300);
      
      // Show toast notification with specific missing items
      const missingItems: string[] = [];
      
      // Add missing option names
      validation.missingOptions.forEach(optionId => {
        const option = itemDetails.options?.find(o => o.id === optionId);
        if (option) {
          const optionName = getTranslatedField(option, 'name', uiLanguage);
          missingItems.push(optionName);
          console.log('[AddToCart] Missing required option:', optionName);
        }
      });
      
      // Add missing topping category names
      validation.missingToppings.forEach(categoryId => {
        const category = itemDetails.toppingCategories?.find(c => c.id === categoryId);
        if (category) {
          const categoryName = getTranslatedField(category, 'name', uiLanguage);
          missingItems.push(categoryName);
          console.log('[AddToCart] Missing required topping category:', categoryName);
        }
      });
      
      console.log('[AddToCart] Showing toast with missing items:', missingItems);
      toast({
        title: t("requiredSelections") || "Required Selections Missing",
        description: `${t("pleaseMakeSelection") || "Please make a selection for"}: ${missingItems.join(', ')}`,
        variant: "destructive",
      });
      
      // Clear highlights after delay with timeout cleanup
      timeoutRefs.current.clearHighlight = setTimeout(() => {
        console.log('[AddToCart] Clearing validation highlights');
        setHighlightedOptions([]);
        setHighlightedToppings([]);
      }, 2000);
      
      return;
    }
    
    console.log('[AddToCart] Validation passed - proceeding to add to cart');
    
    // Set submitting state to prevent double submission
    setIsSubmitting(true);
    console.log('[AddToCart] Set submitting state to true');
    
    // Clear any validation highlights and timeouts
    clearValidationTimeouts();
    setHighlightedOptions([]);
    setHighlightedToppings([]);
    
    const finalPrice = calculatePrice();
    const cartItem = {
      menuItem: itemDetails,
      quantity,
      selectedOptions,
      selectedToppings,
      specialInstructions,
      itemPrice: finalPrice
    };
    
    console.log('[AddToCart] Built cart item:', {
      itemName: getTranslatedField(itemDetails, 'name', uiLanguage),
      quantity,
      finalPrice,
      selectedOptionsCount: selectedOptions.length,
      selectedToppingsCount: selectedToppings.length,
      hasSpecialInstructions: !!specialInstructions
    });
    
    try {
      console.log('[AddToCart] Calling onAddToCart callback');
      onAddToCart(cartItem);
      console.log('[AddToCart] Successfully added to cart, closing dialog');
      onClose();
    } catch (error) {
      console.error('[AddToCart] Error adding to cart:', error);
      setIsSubmitting(false);
      toast({
        title: "Error",
        description: "Failed to add item to cart. Please try again.",
        variant: "destructive",
      });
    }
  }, [itemDetails, quantity, selectedOptions, selectedToppings, specialInstructions, calculatePrice, onAddToCart, onClose, uiLanguage, t, toast, scrollToMissingItem, isSubmitting, clearValidationTimeouts]);
  
  const handleQuantityDecrease = useCallback(() => {
    handleQuantityChange(quantity - 1);
  }, [quantity, handleQuantityChange]);
  
  const handleQuantityIncrease = useCallback(() => {
    handleQuantityChange(quantity + 1);
  }, [quantity, handleQuantityChange]);
  
  return <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="w-[85vw] max-w-[85vw] max-h-[80vh] p-4 flex flex-col select-none">
        <DialogHeader className="pb-2">
          <DialogTitle className="font-bold text-3xl mx-0 my-0 leading-relaxed">{getTranslatedField(itemDetails, 'name', uiLanguage)}</DialogTitle>
          {itemDetails.description && <DialogDescription className="text-xl text-gray-800">{getTranslatedField(itemDetails, 'description', uiLanguage)}</DialogDescription>}
        </DialogHeader>
        
        <div ref={scrollContainerRef} className="space-y-4 overflow-y-auto pr-2 flex-grow select-none custom-scrollbar">
          {/* Options section - only show if there are options */}
          {itemDetails.options && itemDetails.options.length > 0 && itemDetails.options.map(option => <div 
              key={option.id} 
              className="space-y-1"
              ref={el => optionRefs.current[option.id] = el}
            >
              <Label className="font-medium">
                {getTranslatedField(option, 'name', uiLanguage)}
                {option.required && <span className="text-red-500 ml-1">*</span>}
                {option.multiple && <span className="text-sm text-gray-500 ml-2">({t("multipleSelection")})</span>}
              </Label>
              <Option 
                option={option} 
                selectedOption={selectedOptions.find(o => o.optionId === option.id)} 
                onToggleChoice={handleToggleChoice} 
                currencySymbol={currencySymbol} 
                uiLanguage={uiLanguage}
                isHighlighted={highlightedOptions.includes(option.id)}
              />
            </div>)}

          {/* Toppings section - simplified animation */}
          {visibleToppingCategories.map((category, index) => (
            <div key={category.id} ref={el => toppingRefs.current[category.id] = el}>
              <ToppingCategory 
                category={category} 
                selectedCategory={selectedToppings.find(t => t.categoryId === category.id)} 
                selectedToppings={selectedToppings}
                toppingCategories={itemDetails.toppingCategories || []}
                onToggleTopping={handleToggleTopping} 
                t={t} 
                currencySymbol={currencySymbol} 
                bgColorClass={CATEGORY_BACKGROUNDS[index % CATEGORY_BACKGROUNDS.length]}
                isVisible={visibleCategories[category.id] || false}
                uiLanguage={uiLanguage}
                isHighlighted={highlightedToppings.includes(category.id)}
              />
            </div>
          ))}
        </div>
        
        <DialogFooter className="mt-3 pt-2">
          <div className="w-full flex items-center">
            <div className="flex items-center mr-4">
              <Button className="h-12 w-12 text-3xl flex items-center justify-center rounded-full bg-violet-800 hover:bg-violet-700 text-white" onClick={handleQuantityDecrease}>
                <Minus className="h-6 w-6" />
              </Button>
              <span className="font-medium text-2xl min-w-[40px] text-center">{quantity}</span>
              <Button className="h-12 w-12 text-3xl flex items-center justify-center rounded-full bg-violet-800 hover:bg-violet-700 text-white" onClick={handleQuantityIncrease}>
                <Plus className="h-6 w-6" />
              </Button>
            </div>
            <Button 
              onClick={(e) => {
                console.log('[DEBUG] Add to cart button clicked! Event:', e);
                console.log('[DEBUG] Button disabled state:', isSubmitting);
                console.log('[DEBUG] Current item details exists:', !!itemDetails);
                console.log('[DEBUG] Dialog isOpen:', isOpen);
                console.log('[DEBUG] Selected options:', selectedOptions);
                console.log('[DEBUG] Selected toppings:', selectedToppings);
                e.preventDefault();
                e.stopPropagation();
                handleAddToCart();
              }}
              disabled={isSubmitting}
              className="flex-1 bg-kiosk-primary py-[34px] text-3xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? t("addingToCart") || "Adding..." : `${t("addToCart")} - ${calculatePrice().toFixed(2)} ${currencySymbol}`}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>;
};

export default memo(ItemCustomizationDialog);
