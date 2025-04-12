
import { MenuItemWithOptions, SelectedOption, SelectedTopping } from "@/types/kiosk-types";
import { Button } from "@/components/ui/button";
import { Check, ChevronLeft, MinusCircle, Plus, PlusCircle } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

type KioskItemCustomizationScreenProps = {
  item: MenuItemWithOptions;
  quantity: number;
  selectedOptions: SelectedOption[];
  selectedToppings: SelectedTopping[];
  specialInstructions: string;
  onSetQuantity: (quantity: number) => void;
  onToggleChoice: (optionId: string, choiceId: string, multiple: boolean) => void;
  onToggleTopping: (categoryId: string, toppingId: string, maxSelections: number) => void;
  onSetSpecialInstructions: (text: string) => void;
  onAddToCart: () => void;
  onCancel: () => void;
  calculateItemPrice: () => number;
};

export const KioskItemCustomizationScreen = ({
  item,
  quantity,
  selectedOptions,
  selectedToppings,
  specialInstructions,
  onSetQuantity,
  onToggleChoice,
  onToggleTopping,
  onSetSpecialInstructions,
  onAddToCart,
  onCancel,
  calculateItemPrice
}: KioskItemCustomizationScreenProps) => {
  const totalPrice = calculateItemPrice() * quantity;

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <header className="bg-red-600 text-white py-4 px-6 flex items-center">
        <button onClick={onCancel} className="text-white mr-4">
          <ChevronLeft className="h-6 w-6" />
        </button>
        <h1 className="text-xl font-bold">{item.name}</h1>
      </header>
      
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Item Image and Basic Info */}
          <div className="bg-white rounded-lg overflow-hidden shadow-sm">
            <img 
              src={item.image || 'https://via.placeholder.com/800x400'}
              alt={item.name}
              className="w-full h-48 object-cover"
            />
            <div className="p-4">
              <h2 className="text-xl font-bold">{item.name}</h2>
              {item.description && (
                <p className="text-gray-600 mt-1">{item.description}</p>
              )}
              <p className="text-lg font-bold mt-2">{parseFloat(item.price.toString()).toFixed(2)} €</p>
            </div>
          </div>
          
          {/* Options */}
          {item.options && item.options.length > 0 && (
            <div className="bg-white rounded-lg p-4 shadow-sm">
              {item.options.map((option) => (
                <div key={option.id} className="mb-6 last:mb-0">
                  <h3 className="font-medium text-lg mb-3">
                    {option.name}
                    {option.required && <span className="text-red-500 ml-1">*</span>}
                    {option.multiple && <span className="text-sm text-gray-500 ml-2">(Sélection multiple)</span>}
                  </h3>
                  
                  <div className="space-y-2">
                    {option.choices.map((choice) => {
                      const selectedOption = selectedOptions.find(o => o.optionId === option.id);
                      const isSelected = selectedOption?.choiceIds.includes(choice.id) || false;
                      
                      return (
                        <div 
                          key={choice.id}
                          className={`
                            flex items-center justify-between p-3 border rounded-md cursor-pointer
                            ${isSelected 
                              ? 'border-red-500 bg-red-50' 
                              : 'border-gray-200 hover:border-gray-300'
                            }
                          `}
                          onClick={() => onToggleChoice(option.id, choice.id, !!option.multiple)}
                        >
                          <div className="flex items-center">
                            <div className={`
                              w-5 h-5 mr-3 rounded-full flex items-center justify-center
                              ${isSelected 
                                ? 'bg-red-600 text-white' 
                                : 'border border-gray-300'
                              }
                            `}>
                              {isSelected && <Check className="h-3 w-3" />}
                            </div>
                            <span>{choice.name}</span>
                          </div>
                          {choice.price && choice.price > 0 && (
                            <span>+{parseFloat(choice.price.toString()).toFixed(2)} €</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Toppings */}
          {item.toppingCategories && item.toppingCategories.length > 0 && (
            <div className="bg-white rounded-lg p-4 shadow-sm">
              {item.toppingCategories.map((category) => (
                <div key={category.id} className="mb-6 last:mb-0">
                  <h3 className="font-medium text-lg mb-3">
                    {category.name}
                    {category.required && <span className="text-red-500 ml-1">*</span>}
                    <span className="text-sm text-gray-500 ml-2">
                      {category.max_selections > 0 
                        ? `(Max. ${category.max_selections})` 
                        : "(Sélection multiple)"}
                    </span>
                  </h3>
                  
                  <div className="space-y-2">
                    {category.toppings.map((topping) => {
                      const selectedCategory = selectedToppings.find(t => t.categoryId === category.id);
                      const isSelected = selectedCategory?.toppingIds.includes(topping.id) || false;
                      
                      return (
                        <div 
                          key={topping.id} 
                          className="flex items-center justify-between border rounded-md p-3 hover:border-gray-300"
                        >
                          <span>{topping.name}</span>
                          <div className="flex items-center gap-2">
                            {topping.price > 0 && (
                              <span className="text-sm">+{parseFloat(topping.price.toString()).toFixed(2)} €</span>
                            )}
                            <Button
                              variant="outline"
                              size="icon"
                              className={`h-8 w-8 rounded-full ${isSelected ? 'bg-red-600 text-white border-red-600' : ''}`}
                              onClick={() => onToggleTopping(category.id, topping.id, category.max_selections)}
                            >
                              {isSelected ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Quantity */}
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <h3 className="font-medium text-lg mb-3">Quantité</h3>
            <div className="flex items-center space-x-4">
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => quantity > 1 && onSetQuantity(quantity - 1)}
              >
                <MinusCircle className="h-4 w-4" />
              </Button>
              <span className="font-medium text-lg">{quantity}</span>
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => onSetQuantity(quantity + 1)}
              >
                <PlusCircle className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {/* Special Instructions */}
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <Label className="font-medium text-lg block mb-3">Instructions spéciales</Label>
            <textarea 
              className="w-full p-3 border border-gray-300 rounded-md"
              placeholder="Des allergies ou des demandes spéciales ?"
              rows={3}
              value={specialInstructions}
              onChange={(e) => onSetSpecialInstructions(e.target.value)}
            />
          </div>
        </div>
      </div>
      
      {/* Footer with Add to Cart Button */}
      <footer className="bg-white border-t border-gray-200 p-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Button 
            variant="outline" 
            onClick={onCancel}
            className="border-red-600 text-red-600 hover:bg-red-50"
          >
            ANNULER
          </Button>
          
          <Button 
            onClick={onAddToCart}
            className="bg-red-600 hover:bg-red-700 text-lg px-6 py-2 h-auto"
          >
            AJOUTER - {totalPrice.toFixed(2)} €
          </Button>
        </div>
      </footer>
    </div>
  );
};
