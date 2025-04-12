
import { CartItem, KioskOrderType, MenuItemWithOptions, SelectedOption, SelectedTopping } from "@/types/kiosk-types";
import { Restaurant } from "@/types/database-types";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ChevronLeft, ChevronRight, Loader2, MinusCircle, PlusCircle, Trash2 } from "lucide-react";

type KioskCartScreenProps = {
  cart: CartItem[];
  restaurant: Restaurant;
  orderType: KioskOrderType | null;
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onRemoveItem: (itemId: string) => void;
  onContinueShopping: () => void;
  onPlaceOrder: () => void;
  calculateItemPrice: (
    item: MenuItemWithOptions, 
    options: SelectedOption[], 
    toppings: SelectedTopping[]
  ) => number;
  calculateCartTotal: () => number;
  placingOrder: boolean;
};

export const KioskCartScreen = ({
  cart,
  restaurant,
  orderType,
  onUpdateQuantity,
  onRemoveItem,
  onContinueShopping,
  onPlaceOrder,
  calculateItemPrice,
  calculateCartTotal,
  placingOrder
}: KioskCartScreenProps) => {
  const cartTotal = calculateCartTotal();
  const taxAmount = cartTotal * 0.1; // Assuming 10% tax
  const finalTotal = cartTotal + taxAmount;

  const getFormattedOptions = (item: CartItem): string => {
    if (!item.menuItem.options) return "";
    
    return item.selectedOptions
      .flatMap(selectedOption => {
        const option = item.menuItem.options?.find(o => o.id === selectedOption.optionId);
        if (!option) return [];
        
        return selectedOption.choiceIds.map(choiceId => {
          const choice = option.choices.find(c => c.id === choiceId);
          return choice ? choice.name : "";
        });
      })
      .filter(Boolean)
      .join(", ");
  };

  const getFormattedToppings = (item: CartItem): string => {
    if (!item.menuItem.toppingCategories) return "";
    
    return item.selectedToppings
      .flatMap(selectedCategory => {
        const category = item.menuItem.toppingCategories?.find(c => c.id === selectedCategory.categoryId);
        if (!category) return [];
        
        return selectedCategory.toppingIds.map(toppingId => {
          const topping = category.toppings.find(t => t.id === toppingId);
          return topping ? topping.name : "";
        });
      })
      .filter(Boolean)
      .join(", ");
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 py-4 px-6 flex items-center">
        <button onClick={onContinueShopping} className="text-gray-600 mr-4">
          <ChevronLeft className="h-6 w-6" />
        </button>
        <h1 className="text-xl font-bold">RÉSUMÉ DE COMMANDE</h1>
      </header>
      
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-sm overflow-hidden">
          {/* Order Items */}
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-bold mb-4">ARTICLES COMMANDÉS</h2>
            
            {cart.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">Votre panier est vide</p>
                <Button 
                  className="mt-4 bg-red-600 hover:bg-red-700"
                  onClick={onContinueShopping}
                >
                  PARCOURIR LE MENU
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                {cart.map((item, index) => {
                  const itemPrice = calculateItemPrice(
                    item.menuItem, 
                    item.selectedOptions,
                    item.selectedToppings
                  );
                  const totalPrice = itemPrice * item.quantity;
                  
                  const options = getFormattedOptions(item);
                  const toppings = getFormattedToppings(item);
                  
                  return (
                    <div key={item.id} className={index > 0 ? "pt-6 border-t border-gray-200" : ""}>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-start">
                            <span className="font-bold mr-2">{index + 1}.</span>
                            <div>
                              <h3 className="font-medium text-lg">{item.menuItem.name}</h3>
                              <p className="text-gray-600 text-sm">{itemPrice.toFixed(2)} €</p>
                              
                              {options && (
                                <p className="text-sm mt-1">
                                  <span className="font-medium">+ </span> 
                                  {options}
                                </p>
                              )}
                              
                              {toppings && (
                                <p className="text-sm mt-1">
                                  <span className="font-medium">+ </span> 
                                  {toppings}
                                </p>
                              )}
                              
                              {item.specialInstructions && (
                                <p className="text-sm italic mt-1">
                                  "{item.specialInstructions}"
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <p className="font-bold">{totalPrice.toFixed(2)} €</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between mt-3">
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="text-red-600 border-red-600"
                          onClick={() => onRemoveItem(item.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          SUPPRIMER
                        </Button>
                        
                        <div className="flex items-center space-x-3">
                          <Button 
                            variant="outline" 
                            size="icon"
                            className="h-8 w-8 rounded-full"
                            onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                          >
                            <MinusCircle className="h-4 w-4" />
                          </Button>
                          <span className="w-6 text-center">{item.quantity}</span>
                          <Button 
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 rounded-full"
                            onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                          >
                            <PlusCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          
          {/* Order Summary */}
          {cart.length > 0 && (
            <div className="p-6">
              <div className="space-y-2">
                <div className="flex justify-between text-gray-600">
                  <span>Sous-total</span>
                  <span>{cartTotal.toFixed(2)} €</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>TVA (10%)</span>
                  <span>{taxAmount.toFixed(2)} €</span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span>{finalTotal.toFixed(2)} €</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Footer with Action Buttons */}
      {cart.length > 0 && (
        <footer className="bg-white border-t border-gray-200 p-4">
          <div className="max-w-3xl mx-auto flex items-center justify-between">
            <Button 
              variant="outline" 
              onClick={onContinueShopping}
              className="border-red-600 text-red-600 hover:bg-red-50"
            >
              ANNULER
            </Button>
            
            <Button 
              onClick={onPlaceOrder}
              className="bg-green-700 hover:bg-green-800 text-lg px-8 py-2 h-auto"
              disabled={placingOrder}
            >
              {placingOrder ? (
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              ) : (
                <>
                  VOIR MA COMMANDE
                  <ChevronRight className="h-5 w-5 ml-2" />
                </>
              )}
            </Button>
          </div>
        </footer>
      )}
    </div>
  );
};
