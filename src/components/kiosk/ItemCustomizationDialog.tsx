
import React, { memo, useCallback, useEffect, useState } from "react";
import { Check, Plus, Minus, AlertCircle } from "lucide-react";
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
    toppingQuantities?: { [toppingId: string]: number }; // Added map for topping quantities
  }[];
  onToggleChoice: (optionId: string, choiceId: string, multiple: boolean) => void;
  onToggleTopping: (categoryId: string, toppingId: string, quantity?: number) => void; // Added quantity parameter
  quantity: number;
  onQuantityChange: (quantity: number) => void;
  specialInstructions: string;
  onSpecialInstructionsChange: (instructions: string) => void;
  shouldShowToppingCategory: (category: any) => boolean;
  t: (key: string) => string;
  currencySymbol: string;
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
  currencySymbol,
  bgColorClass,
  isVisible
}: {
  category: any;
  selectedCategory: any;
  onToggleTopping: (categoryId: string, toppingId: string, quantity?: number) => void;
  t: (key: string) => string;
  currencySymbol: string;
  bgColorClass: string;
  isVisible: boolean;
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
    className={`space-y-2 p-4 rounded-xl mb-4 ${bgColorClass} relative`}
    style={{
      opacity: isVisible ? 1 : 0,
      transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
      transition: 'opacity 500ms ease, transform 500ms ease'
    }}
  >
      <div className="font-bold text-xl flex items-center">
        {category.name}
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
          
          // Decide what to render based on whether multiple quantities are allowed
          const allowMultiple = category.allow_multiple_same_topping;
          
          return <div 
            key={topping.id} 
            className="flex items-center justify-between border p-2 hover:border-gray-300 cursor-pointer select-none px-[8px] mx-0 my-0 rounded-lg bg-white"
            onClick={(e) => {
              // Handle click on the entire topping item (except when clicking on the +/- buttons)
              // This makes the entire row clickable, not just the + icon
              if (!(e.target as HTMLElement).closest('button')) {
                if (!isSelected) {
                  // If not selected, add it with quantity 1
                  onToggleTopping(category.id, topping.id, allowMultiple ? 1 : undefined);
                }
              }
            }}
          >
              <span className={`flex-1 mr-2 ${isSelected ? 'text-green-700 font-medium' : ''}`}>
                {topping.name}
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
                      className={`${buttonSize} text-white cursor-pointer rounded-full bg-violet-700 p-2 hover:bg-violet-600`} 
                      onClick={(e) => {
                        e.stopPropagation();
                        // Add with quantity 1
                        onToggleTopping(category.id, topping.id, 1);
                      }}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  )
                ) : (
                  // Original toggle UI for single selection
                  !isSelected ? 
                  <Plus 
                    onClick={e => {
                      e.stopPropagation();
                      onToggleTopping(category.id, topping.id);
                    }} 
                    className={`${buttonSize} text-white cursor-pointer rounded-full bg-violet-700 p-2`} 
                  /> : 
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

  // State to track which topping categories are visible (for staggered animation)
  const [visibleCategories, setVisibleCategories] = useState<{ [key: string]: boolean }>({});

  // Reset visibility state when dialog opens/closes or item changes
  useEffect(() => {
    if (isOpen && item) {
      // Reset all categories to invisible initially
      if (item.toppingCategories) {
        const initialVisibility: { [key: string]: boolean } = {};
        item.toppingCategories.forEach(category => {
          initialVisibility[category.id] = false;
        });
        setVisibleCategories(initialVisibility);
        
        // Stagger the appearance of each category with Firefox-compatible approach
        const sortedCategories = [...(item.toppingCategories || [])].sort((a, b) => {
          const orderA = a.display_order ?? 1000;
          const orderB = b.display_order ?? 1000;
          return orderA - orderB;
        });
        
        // Use separate timeouts for each category to ensure Firefox compatibility
        sortedCategories.forEach((category, index) => {
          const timer = setTimeout(() => {
            setVisibleCategories(prev => ({
              ...prev,
              [category.id]: true
            }));
          }, 150 * index + 100); // 100ms initial delay, then 150ms per category
          
          // Clear timeout on component unmount
          return () => clearTimeout(timer);
        });
      }
    } else {
      // Reset visibility when dialog closes
      setVisibleCategories({});
    }
  }, [isOpen, item]);

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
              // Get quantity from toppingQuantities or default to 1
              const toppingQty = selected.toppingQuantities?.[toppingId] || 1;
              price += parseFloat(topping.price.toString()) * toppingQty;
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

  // Sort topping categories by display_order if they exist
  const sortedToppingCategories = item.toppingCategories ? [...item.toppingCategories].sort((a, b) => {
    const orderA = a.display_order ?? 1000; // Default to a high number if undefined
    const orderB = b.display_order ?? 1000;
    return orderA - orderB;
  }) : [];
  
  const hasCustomizations = item.options && item.options.length > 0 || item.toppingCategories && item.toppingCategories.length > 0;
  
  return <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="w-[85vw] max-w-[85vw] max-h-[80vh] p-4 flex flex-col select-none">
        <DialogHeader className="pb-2">
          <DialogTitle className="font-bold text-3xl mx-0 my-0 leading-relaxed">{item.name}</DialogTitle>
          {item.description && <DialogDescription className="text-xl text-gray-800">{item.description}</DialogDescription>}
        </DialogHeader>
        
        <div className="space-y-4 overflow-y-auto pr-2 flex-grow select-none custom-scrollbar">
          {/* Options section - only show if there are options */}
          {item.options && item.options.length > 0 && item.options.map(option => <div key={option.id} className="space-y-1">
              <Label className="font-medium">
                {option.name}
                {option.required && <span className="text-red-500 ml-1">*</span>}
                {option.multiple && <span className="text-sm text-gray-500 ml-2">({t("multipleSelection")})</span>}
              </Label>
              <Option option={option} selectedOption={selectedOptions.find(o => o.optionId === option.id)} onToggleChoice={onToggleChoice} currencySymbol={currencySymbol} />
            </div>)}

          {/* Toppings section - with staggered animation */}
          {sortedToppingCategories.filter(category => shouldShowToppingCategory(category)).map((category, index) => (
            <ToppingCategory 
              key={category.id} 
              category={category} 
              selectedCategory={selectedToppings.find(t => t.categoryId === category.id)} 
              onToggleTopping={onToggleTopping} 
              t={t} 
              currencySymbol={currencySymbol} 
              bgColorClass={CATEGORY_BACKGROUNDS[index % CATEGORY_BACKGROUNDS.length]}
              isVisible={visibleCategories[category.id] || false}
            />
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
            <Button onClick={onAddToCart} className="flex-1 bg-kiosk-primary py-[34px] text-3xl">
              {t("addToCart")} - {calculateItemPrice().toFixed(2)} {currencySymbol}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>;
};

export default memo(ItemCustomizationDialog);
