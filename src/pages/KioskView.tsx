import { useState } from "react";
import { useParams } from "react-router-dom";
import {
  ArrowLeft,
  ChevronRight,
  Clock,
  Coffee,
  MinusCircle,
  PlusCircle,
  ShoppingCart,
  UtensilsCrossed,
  Wine,
  Loader2,
  ChevronLeft,
  Trash2,
  Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

// Types
type Category = {
  id: string;
  name: string;
  icon: React.ReactNode;
};

type MenuItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  categoryId: string;
  options?: MenuItemOption[];
};

type MenuItemOption = {
  id: string;
  name: string;
  choices: {
    id: string;
    name: string;
    price: number;
  }[];
  required: boolean;
  multiple: boolean;
};

type CartItem = {
  id: string;
  menuItem: MenuItem;
  quantity: number;
  selectedOptions: {
    optionId: string;
    choiceIds: string[];
  }[];
  specialInstructions?: string;
};

// Mock data
const mockCategories: Category[] = [
  { id: "1", name: "Burgers", icon: <UtensilsCrossed size={16} /> },
  { id: "2", name: "Sides", icon: <UtensilsCrossed size={16} /> },
  { id: "3", name: "Drinks", icon: <Coffee size={16} /> },
  { id: "4", name: "Desserts", icon: <Wine size={16} /> },
];

const mockMenuItems: MenuItem[] = [
  {
    id: "1",
    name: "Classic Burger",
    description: "Beef patty with lettuce, tomato, and our special sauce",
    price: 8.99,
    image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
    categoryId: "1",
    options: [
      {
        id: "size",
        name: "Size",
        choices: [
          { id: "s", name: "Regular", price: 0 },
          { id: "l", name: "Large", price: 2 },
        ],
        required: true,
        multiple: false,
      },
      {
        id: "cheese",
        name: "Extra Cheese",
        choices: [
          { id: "c1", name: "Add American Cheese", price: 1 },
          { id: "c2", name: "Add Swiss Cheese", price: 1.5 },
        ],
        required: false,
        multiple: true,
      },
    ],
  },
  {
    id: "2",
    name: "Cheese Burger",
    description: "Beef patty with American cheese, lettuce, tomato, and mayo",
    price: 9.99,
    image: "https://images.unsplash.com/photo-1550317138-10000687a72b?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
    categoryId: "1",
  },
  {
    id: "3",
    name: "French Fries",
    description: "Crispy golden fries seasoned with salt",
    price: 3.99,
    image: "https://images.unsplash.com/photo-1576107232684-1279f390859f?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
    categoryId: "2",
    options: [
      {
        id: "size",
        name: "Size",
        choices: [
          { id: "s", name: "Small", price: 0 },
          { id: "m", name: "Medium", price: 1 },
          { id: "l", name: "Large", price: 2 },
        ],
        required: true,
        multiple: false,
      },
    ],
  },
  {
    id: "4",
    name: "Onion Rings",
    description: "Crispy battered onion rings",
    price: 4.99,
    image: "https://images.unsplash.com/photo-1639024471283-03518883512d?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
    categoryId: "2",
  },
  {
    id: "5",
    name: "Soft Drink",
    description: "Choose from Coke, Diet Coke, Sprite, or Fanta",
    price: 1.99,
    image: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
    categoryId: "3",
    options: [
      {
        id: "type",
        name: "Type",
        choices: [
          { id: "coke", name: "Coca-Cola", price: 0 },
          { id: "diet", name: "Diet Coke", price: 0 },
          { id: "sprite", name: "Sprite", price: 0 },
          { id: "fanta", name: "Fanta", price: 0 },
        ],
        required: true,
        multiple: false,
      },
      {
        id: "size",
        name: "Size",
        choices: [
          { id: "s", name: "Small", price: 0 },
          { id: "m", name: "Medium", price: 0.5 },
          { id: "l", name: "Large", price: 1 },
        ],
        required: true,
        multiple: false,
      },
    ],
  },
  {
    id: "6",
    name: "Chocolate Shake",
    description: "Rich and creamy chocolate milkshake",
    price: 4.99,
    image: "https://images.unsplash.com/photo-1579954115545-a95591f28bfc?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
    categoryId: "3",
  },
  {
    id: "7",
    name: "Ice Cream",
    description: "Vanilla ice cream with your choice of toppings",
    price: 3.99,
    image: "https://images.unsplash.com/photo-1633933358116-a27b902fad35?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
    categoryId: "4",
    options: [
      {
        id: "toppings",
        name: "Toppings",
        choices: [
          { id: "t1", name: "Chocolate Syrup", price: 0.5 },
          { id: "t2", name: "Caramel", price: 0.5 },
          { id: "t3", name: "Sprinkles", price: 0.5 },
          { id: "t4", name: "Nuts", price: 0.5 },
        ],
        required: false,
        multiple: true,
      },
    ],
  },
  {
    id: "8",
    name: "Chocolate Cake",
    description: "Moist chocolate cake with chocolate frosting",
    price: 5.99,
    image: "https://images.unsplash.com/photo-1588195538326-c5b1e9f80a1b?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
    categoryId: "4",
  },
];

const mockRestaurant = {
  id: "1",
  name: "Burger House",
  logo: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?ixlib=rb-1.2.1&auto=format&fit=crop&w=100&h=100&q=80",
  cover: "https://images.unsplash.com/photo-1571091718767-18b5b1457add?ixlib=rb-1.2.1&auto=format&fit=crop&w=1920&q=80",
  address: "123 Main St, Anytown, USA",
  phone: "(555) 123-4567",
  hours: "9:00 AM - 10:00 PM",
  slug: "burger-house",
};

const KioskView = () => {
  const { restaurantSlug } = useParams<{ restaurantSlug: string }>();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<{ optionId: string; choiceIds: string[] }[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [showCart, setShowCart] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const { toast } = useToast();

  const restaurant = mockRestaurant;

  const handleSelectItem = (item: MenuItem) => {
    setSelectedItem(item);
    setQuantity(1);
    setSpecialInstructions("");
    
    if (item.options && item.options.length > 0) {
      const initialOptions = item.options.map(option => {
        if (option.required && !option.multiple) {
          return {
            optionId: option.id,
            choiceIds: [option.choices[0].id]
          };
        }
        return {
          optionId: option.id,
          choiceIds: []
        };
      });
      setSelectedOptions(initialOptions);
    } else {
      setSelectedOptions([]);
    }
  };

  const handleToggleChoice = (optionId: string, choiceId: string, multiple: boolean) => {
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
  };

  const calculateItemPrice = (item: MenuItem, options: { optionId: string; choiceIds: string[] }[]): number => {
    let price = item.price;
    
    if (item.options) {
      item.options.forEach(option => {
        const selectedOption = options.find(o => o.optionId === option.id);
        if (selectedOption) {
          selectedOption.choiceIds.forEach(choiceId => {
            const choice = option.choices.find(c => c.id === choiceId);
            if (choice) {
              price += choice.price;
            }
          });
        }
      });
    }
    
    return price;
  };

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

  const handleAddToCart = () => {
    if (!selectedItem) return;
    
    const isValid = selectedItem.options?.every(option => {
      if (!option.required) return true;
      
      const selected = selectedOptions.find(o => o.optionId === option.id);
      return selected && selected.choiceIds.length > 0;
    }) ?? true;
    
    if (!isValid) {
      toast({
        title: "Required options",
        description: "Please select all required options before adding to cart",
        variant: "destructive",
      });
      return;
    }
    
    const newItem: CartItem = {
      id: Date.now().toString(),
      menuItem: selectedItem,
      quantity,
      selectedOptions,
      specialInstructions: specialInstructions.trim() || undefined,
    };
    
    setCart(prev => [...prev, newItem]);
    setSelectedItem(null);
    
    toast({
      title: "Added to cart",
      description: `${quantity}x ${selectedItem.name} added to your order`,
    });
  };

  const handleUpdateCartItemQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      handleRemoveCartItem(itemId);
      return;
    }
    
    setCart(prev => prev.map(item => 
      item.id === itemId ? { ...item, quantity: newQuantity } : item
    ));
  };

  const handleRemoveCartItem = (itemId: string) => {
    setCart(prev => prev.filter(item => item.id !== itemId));
  };

  const calculateCartTotal = (): number => {
    return cart.reduce((total, item) => {
      const itemPrice = calculateItemPrice(item.menuItem, item.selectedOptions);
      return total + (itemPrice * item.quantity);
    }, 0);
  };

  const handlePlaceOrder = () => {
    setPlacingOrder(true);
    
    setTimeout(() => {
      setPlacingOrder(false);
      setOrderPlaced(true);
      
      setTimeout(() => {
        setOrderPlaced(false);
        setCart([]);
        setShowCart(false);
      }, 5000);
    }, 2000);
  };

  if (!restaurant) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Restaurant Not Found</h1>
          <p className="text-gray-500 mb-4">The restaurant you're looking for doesn't exist.</p>
          <Button>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div 
        className="h-48 bg-cover bg-center relative"
        style={{ backgroundImage: `url(${restaurant.cover})` }}
      >
        <div className="absolute inset-0 bg-black bg-opacity-50"></div>
        <div className="absolute inset-0 flex items-center justify-between p-6">
          <div className="flex items-center">
            <img 
              src={restaurant.logo} 
              alt={restaurant.name} 
              className="h-16 w-16 rounded-full border-2 border-white mr-4"
            />
            <div>
              <h1 className="text-white text-2xl font-bold">{restaurant.name}</h1>
              <div className="flex items-center text-white text-sm">
                <Clock className="h-4 w-4 mr-1" />
                <span>{restaurant.hours}</span>
              </div>
            </div>
          </div>
          <Button 
            className="bg-white text-kiosk-primary hover:bg-gray-100"
            size="lg"
            onClick={() => setShowCart(true)}
          >
            <ShoppingCart className="mr-2 h-5 w-5" />
            <span>View Order</span>
            {cart.length > 0 && (
              <Badge className="ml-2 bg-kiosk-primary text-white">
                {cart.reduce((total, item) => total + item.quantity, 0)}
              </Badge>
            )}
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <Tabs defaultValue={mockCategories[0].id}>
          <TabsList className="mb-6 bg-white p-1 rounded-lg border">
            {mockCategories.map((category) => (
              <TabsTrigger 
                key={category.id} 
                value={category.id}
                className="data-[state=active]:bg-kiosk-primary data-[state=active]:text-white"
              >
                <span className="flex items-center">
                  {category.icon}
                  <span className="ml-2">{category.name}</span>
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
          
          {mockCategories.map((category) => (
            <TabsContent key={category.id} value={category.id}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {mockMenuItems
                  .filter(item => item.categoryId === category.id)
                  .map(item => (
                    <Card key={item.id} className="overflow-hidden hover:shadow-md transition-shadow">
                      <div 
                        className="h-40 bg-cover bg-center" 
                        style={{ backgroundImage: `url(${item.image})` }}
                      ></div>
                      <div className="p-4">
                        <div className="flex justify-between">
                          <h3 className="font-bold text-lg">{item.name}</h3>
                          <p className="font-bold">${item.price.toFixed(2)}</p>
                        </div>
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">{item.description}</p>
                        <Button 
                          className="w-full mt-4 bg-kiosk-primary"
                          onClick={() => handleSelectItem(item)}
                        >
                          Add to Order
                          <ChevronRight className="h-4 w-4 ml-2" />
                        </Button>
                      </div>
                    </Card>
                  ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {selectedItem && (
        <Dialog open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{selectedItem.name}</DialogTitle>
              <DialogDescription>{selectedItem.description}</DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              {selectedItem.options && selectedItem.options.map((option) => (
                <div key={option.id} className="space-y-2">
                  <Label className="font-medium">
                    {option.name}
                    {option.required && <span className="text-red-500 ml-1">*</span>}
                    {option.multiple && <span className="text-sm text-gray-500 ml-2">(Select multiple)</span>}
                  </Label>
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
                              ? 'border-kiosk-primary bg-primary/5' 
                              : 'border-gray-200 hover:border-gray-300'
                            }
                          `}
                          onClick={() => handleToggleChoice(option.id, choice.id, option.multiple)}
                        >
                          <div className="flex items-center">
                            <div className={`
                              w-5 h-5 mr-3 rounded-full flex items-center justify-center
                              ${isSelected 
                                ? 'bg-kiosk-primary text-white' 
                                : 'border border-gray-300'
                              }
                            `}>
                              {isSelected && <Check className="h-3 w-3" />}
                            </div>
                            <span>{choice.name}</span>
                          </div>
                          {choice.price > 0 && <span>+${choice.price.toFixed(2)}</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              
              <div>
                <Label className="font-medium">Quantity</Label>
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
              
              <div>
                <Label className="font-medium">Special Instructions</Label>
                <textarea 
                  className="w-full mt-2 p-2 border border-gray-300 rounded-md"
                  placeholder="Any special requests or allergies?"
                  rows={2}
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                />
              </div>
            </div>
            
            <DialogFooter>
              <div className="w-full">
                <Button 
                  className="w-full bg-kiosk-primary"
                  onClick={handleAddToCart}
                >
                  Add to Order - ${(calculateItemPrice(selectedItem, selectedOptions) * quantity).toFixed(2)}
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {showCart && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex">
          <div className="ml-auto h-full w-full max-w-md bg-white flex flex-col">
            <div className="p-4 border-b flex items-center justify-between">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setShowCart(false)}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Back to Menu
              </Button>
              <h2 className="font-bold text-lg">Your Order</h2>
              <div className="w-8"></div>
            </div>
            
            <div className="flex-1 overflow-auto p-4">
              {cart.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingCart className="h-12 w-12 mx-auto text-gray-300" />
                  <p className="mt-4 text-gray-500">Your cart is empty</p>
                  <Button 
                    className="mt-4"
                    variant="outline"
                    onClick={() => setShowCart(false)}
                  >
                    Browse Menu
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {cart.map((item) => {
                    const itemTotal = calculateItemPrice(item.menuItem, item.selectedOptions) * item.quantity;
                    
                    return (
                      <div key={item.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-medium">{item.menuItem.name}</h3>
                            <p className="text-sm text-gray-500">${calculateItemPrice(item.menuItem, item.selectedOptions).toFixed(2)}</p>
                          </div>
                          <p className="font-medium">${itemTotal.toFixed(2)}</p>
                        </div>
                        
                        {getFormattedOptions(item) && (
                          <p className="text-sm text-gray-500 mt-1">
                            {getFormattedOptions(item)}
                          </p>
                        )}
                        
                        {item.specialInstructions && (
                          <p className="text-sm italic mt-1">
                            "{item.specialInstructions}"
                          </p>
                        )}
                        
                        <div className="flex items-center justify-between mt-3">
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="text-red-500"
                            onClick={() => handleRemoveCartItem(item.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Remove
                          </Button>
                          
                          <div className="flex items-center space-x-3">
                            <Button 
                              variant="outline" 
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleUpdateCartItemQuantity(item.id, item.quantity - 1)}
                            >
                              <MinusCircle className="h-4 w-4" />
                            </Button>
                            <span>{item.quantity}</span>
                            <Button 
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleUpdateCartItemQuantity(item.id, item.quantity + 1)}
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
            
            {cart.length > 0 && (
              <div className="p-4 border-t">
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Subtotal</span>
                    <span>${calculateCartTotal().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Tax</span>
                    <span>${(calculateCartTotal() * 0.08).toFixed(2)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span>${(calculateCartTotal() * 1.08).toFixed(2)}</span>
                  </div>
                </div>
                
                <Button 
                  className="w-full bg-kiosk-primary"
                  size="lg"
                  onClick={handlePlaceOrder}
                  disabled={placingOrder || orderPlaced}
                >
                  {placingOrder && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {orderPlaced && <Check className="h-4 w-4 mr-2" />}
                  {orderPlaced ? "Order Placed!" : placingOrder ? "Processing..." : "Place Order"}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default KioskView;
