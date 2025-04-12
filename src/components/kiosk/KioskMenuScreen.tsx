import React, { useState, useEffect } from "react";
import { Restaurant, MenuCategory, MenuItem } from "@/types/database-types";
import { CartItem, MenuItemWithOptions, SelectedOption, SelectedTopping } from "@/types/kiosk-types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getIconComponent } from "@/utils/icon-mapping";
import { ChevronRight, Home, ShoppingCart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { KioskItemCustomizationScreen } from "@/components/kiosk/KioskItemCustomizationScreen";

// Updated to include passing the selectedItem as prop
type KioskMenuScreenProps = {
  restaurant: Restaurant;
  categories: MenuCategory[];
  cart: CartItem[];
  onSelectItem: (item: MenuItem) => void;
  onViewCart: () => void;
  onGoBack: () => void;
  calculateCartTotal: () => number;
  onAddToCart: (item: CartItem) => void;
};

export const KioskMenuScreen = ({ 
  restaurant, 
  categories, 
  cart, 
  onSelectItem, 
  onViewCart,
  onGoBack,
  calculateCartTotal,
  onAddToCart,
}: KioskMenuScreenProps) => {
  const [activeCategory, setActiveCategory] = useState<string>(
    categories.length > 0 ? categories[0].id : ""
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MenuItemWithOptions | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedOptions, setSelectedOptions] = useState<SelectedOption[]>([]);
  const [selectedToppings, setSelectedToppings] = useState<SelectedTopping[]>([]);
  const [specialInstructions, setSpecialInstructions] = useState("");

  const totalItems = cart.reduce((total, item) => total + item.quantity, 0);
  const totalPrice = calculateCartTotal();
  
  // Get the items for the active category
  const activeItems = categories.find(c => c.id === activeCategory)?.items || [];

  const handleSelectItem = async (item: MenuItem) => {
    // First set basic item details that we have immediately
    setSelectedItem({
      ...item,
      options: [],
      toppingCategories: []
    } as MenuItemWithOptions);
    
    // Then open the dialog
    setDialogOpen(true);
    
    // Finally call parent to fetch full details
    onSelectItem(item);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setSelectedItem(null);
    setQuantity(1);
    setSelectedOptions([]);
    setSelectedToppings([]);
    setSpecialInstructions("");
  };

  // Calculate the price of the current selected item with its options and toppings
  const calculateItemPrice = () => {
    if (!selectedItem) return 0;
    
    let price = parseFloat(selectedItem.price.toString());
    
    // Add option prices
    if (selectedItem.options) {
      selectedItem.options.forEach(option => {
        const selectedOption = selectedOptions.find(o => o.optionId === option.id);
        if (selectedOption) {
          selectedOption.choiceIds.forEach(choiceId => {
            const choice = option.choices.find(c => c.id === choiceId);
            if (choice && choice.price) {
              price += parseFloat(choice.price.toString());
            }
          });
        }
      });
    }
    
    // Add topping prices
    if (selectedItem.toppingCategories) {
      selectedItem.toppingCategories.forEach(category => {
        const selectedToppingCategory = selectedToppings.find(t => t.categoryId === category.id);
        if (selectedToppingCategory) {
          selectedToppingCategory.toppingIds.forEach(toppingId => {
            const topping = category.toppings.find(t => t.id === toppingId);
            if (topping && topping.price) {
              price += parseFloat(topping.price.toString());
            }
          });
        }
      });
    }
    
    return price;
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="bg-red-600 text-white py-4 px-6 flex items-center justify-between">
        <button onClick={onGoBack} className="text-white">
          <Home className="h-6 w-6" />
        </button>
        <h1 className="text-xl font-bold uppercase">MENU</h1>
        <div className="w-6"></div> {/* For balance */}
      </header>
      
      <div className="flex flex-1 overflow-hidden">
        {/* Categories Sidebar */}
        <nav className="w-36 bg-yellow-400 flex flex-col overflow-y-auto">
          {categories.map(category => (
            <button
              key={category.id}
              className={`p-3 flex flex-col items-center text-center transition-colors ${
                activeCategory === category.id 
                  ? 'bg-yellow-500 text-red-900 font-medium' 
                  : 'hover:bg-yellow-300 text-red-800'
              }`}
              onClick={() => setActiveCategory(category.id)}
            >
              {getIconComponent(category.icon || 'coffee')}
              <span className="mt-1 text-xs uppercase">{category.name}</span>
            </button>
          ))}
        </nav>
        
        {/* Items Grid */}
        <main className="flex-1 p-6 bg-yellow-50 overflow-y-auto">
          <h2 className="text-xl font-bold text-red-900 mb-4 uppercase">
            {categories.find(c => c.id === activeCategory)?.name || "MENUS"}
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {activeItems.map(item => (
              <Card key={item.id} className="overflow-hidden hover:shadow-md">
                <div className="flex h-40 bg-gray-200">
                  <img 
                    src={item.image || 'https://via.placeholder.com/400x300'}
                    alt={item.name}
                    className="w-1/2 h-full object-cover"
                  />
                  <div className="w-1/2 p-4 flex flex-col justify-between">
                    <div>
                      <h3 className="font-bold text-lg text-red-900">{item.name}</h3>
                      {item.description && (
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">{item.description}</p>
                      )}
                    </div>
                    <p className="font-bold text-xl">{parseFloat(item.price.toString()).toFixed(2)} €</p>
                  </div>
                </div>
                <div className="p-3 bg-white">
                  <Button 
                    className="w-full bg-red-600 hover:bg-red-700"
                    onClick={() => handleSelectItem(item)}
                  >
                    AJOUTER AU PANIER
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </main>
      </div>
      
      {/* Cart Footer */}
      {cart.length > 0 && (
        <footer className="bg-white border-t border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <ShoppingCart className="h-6 w-6 text-red-600 mr-2" />
              <span className="font-medium">VOTRE COMMANDE ({totalItems})</span>
            </div>
            <div className="flex items-center">
              <span className="font-bold text-lg mr-4">{totalPrice.toFixed(2)} €</span>
              <Button 
                onClick={onViewCart}
                className="bg-green-700 hover:bg-green-800"
              >
                VOIR MA COMMANDE
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </footer>
      )}

      {/* Item Customization Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl p-0 h-[90vh] max-h-[90vh]">
          {selectedItem && (
            <div className="h-full flex flex-col overflow-hidden">
              <DialogTitle className="sr-only">Customize Item</DialogTitle>
              <KioskItemCustomizationScreen
                item={selectedItem}
                quantity={quantity}
                selectedOptions={selectedOptions}
                selectedToppings={selectedToppings}
                specialInstructions={specialInstructions}
                onSetQuantity={setQuantity}
                onToggleChoice={(optionId, choiceId, multiple) => {
                  setSelectedOptions(prev => {
                    const optionIndex = prev.findIndex(o => o.optionId === optionId);
                    if (optionIndex === -1) {
                      return [...prev, { optionId, choiceIds: [choiceId] }];
                    }

                    const option = prev[optionIndex];
                    let newChoiceIds: string[];

                    if (multiple) {
                      if (option.choiceIds.includes(choiceId)) {
                        newChoiceIds = option.choiceIds.filter(id => id !== choiceId);
                      } else {
                        newChoiceIds = [...option.choiceIds, choiceId];
                      }
                    } else {
                      newChoiceIds = [choiceId];
                    }

                    const newOptions = [...prev];
                    newOptions[optionIndex] = { ...option, choiceIds: newChoiceIds };
                    return newOptions;
                  });
                }}
                onToggleTopping={(categoryId, toppingId, maxSelections) => {
                  setSelectedToppings(prev => {
                    const categoryIndex = prev.findIndex(t => t.categoryId === categoryId);
                    if (categoryIndex === -1) {
                      return [...prev, { categoryId, toppingIds: [toppingId] }];
                    }

                    const category = prev[categoryIndex];
                    let newToppingIds: string[];

                    if (category.toppingIds.includes(toppingId)) {
                      newToppingIds = category.toppingIds.filter(id => id !== toppingId);
                    } else {
                      if (maxSelections > 0 && category.toppingIds.length >= maxSelections) {
                        alert(`You can only select ${maxSelections} items from this category.`);
                        return prev;
                      }
                      newToppingIds = [...category.toppingIds, toppingId];
                    }

                    const newToppings = [...prev];
                    newToppings[categoryIndex] = { ...category, toppingIds: newToppingIds };
                    return newToppings;
                  });
                }}
                onSetSpecialInstructions={setSpecialInstructions}
                onAddToCart={() => {
                  if (!selectedItem) return;
    
                  const newItem: CartItem = {
                    id: Date.now().toString(),
                    menuItem: selectedItem,
                    quantity,
                    selectedOptions,
                    selectedToppings,
                    specialInstructions: specialInstructions.trim() || undefined,
                  };
    
                  onAddToCart(newItem); // Use the prop function instead of directly updating state
                  handleDialogClose();
                }}
                onCancel={handleDialogClose}
                calculateItemPrice={calculateItemPrice} // Pass our local calculation function
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
