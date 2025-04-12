
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ChevronRight,
  Clock,
  MinusCircle,
  PlusCircle,
  ShoppingCart,
  Trash2,
  Check,
  Loader2,
  ChevronLeft,
  Plus,
  ArrowRight,
  Minus,
  ChevronUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { getIconComponent } from "@/utils/icon-mapping";
import { supabase } from "@/integrations/supabase/client";
import { 
  getRestaurantBySlug, 
  getMenuForRestaurant, 
  getMenuItemWithOptions,
  createOrder,
  createOrderItems,
  createOrderItemOptions,
  createOrderItemToppings
} from "@/services/kiosk-service";
import { Restaurant, MenuCategory, MenuItem, OrderItem } from "@/types/database-types";

type CategoryWithItems = MenuCategory & {
  items: MenuItem[];
};

type ToppingCategory = {
  id: string;
  name: string;
  min_selections: number;
  max_selections: number;
  required: boolean;
  toppings: Topping[];
};

type Topping = {
  id: string;
  name: string;
  price: number;
  tax_percentage: number;
};

type MenuItemWithOptions = MenuItem & {
  options?: {
    id: string;
    name: string;
    required: boolean | null;
    multiple: boolean | null;
    choices: {
      id: string;
      name: string;
      price: number | null;
    }[];
  }[];
  toppingCategories?: ToppingCategory[];
};

type CartItem = {
  id: string;
  menuItem: MenuItemWithOptions;
  quantity: number;
  selectedOptions: {
    optionId: string;
    choiceIds: string[];
  }[];
  selectedToppings: {
    categoryId: string;
    toppingIds: string[];
  }[];
  specialInstructions?: string;
};

const KioskView = () => {
  const { restaurantSlug } = useParams<{ restaurantSlug: string }>();
  const navigate = useNavigate();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [categories, setCategories] = useState<CategoryWithItems[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<MenuItemWithOptions | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<{ optionId: string; choiceIds: string[] }[]>([]);
  const [selectedToppings, setSelectedToppings] = useState<{ categoryId: string; toppingIds: string[] }[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [placingOrder, setPlacingOrder] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchRestaurantAndMenu = async () => {
      if (!restaurantSlug) {
        navigate('/');
        return;
      }
      
      try {
        setLoading(true);
        
        const restaurantData = await getRestaurantBySlug(restaurantSlug);
        if (!restaurantData) {
          toast({
            title: "Restaurant not found",
            description: "Sorry, we couldn't find that restaurant.",
            variant: "destructive",
          });
          navigate('/');
          return;
        }
        
        setRestaurant(restaurantData);
        
        const menuData = await getMenuForRestaurant(restaurantData.id);
        setCategories(menuData);
        
        if (menuData.length > 0) {
          setActiveCategory(menuData[0].id);
        }
        
        setLoading(false);
      } catch (error) {
        console.error("Error fetching restaurant and menu:", error);
        toast({
          title: "Error",
          description: "There was a problem loading the menu. Please try again.",
          variant: "destructive",
        });
        setLoading(false);
      }
    };
    
    fetchRestaurantAndMenu();
  }, [restaurantSlug, navigate, toast]);

  // When an item is added to the cart, open the cart drawer
  useEffect(() => {
    if (cart.length > 0) {
      setIsCartOpen(true);
    } else {
      setIsCartOpen(false);
    }
  }, [cart]);

  const fetchToppingCategories = async (menuItemId: string) => {
    try {
      const { data: menuItemToppingCategories, error: toppingCategoriesError } = await supabase
        .from('menu_item_topping_categories')
        .select('topping_category_id')
        .eq('menu_item_id', menuItemId);

      if (toppingCategoriesError) {
        console.error("Error fetching topping categories:", toppingCategoriesError);
        return [];
      }

      if (!menuItemToppingCategories.length) {
        return [];
      }

      const toppingCategoryIds = menuItemToppingCategories.map(mtc => mtc.topping_category_id);
      
      const { data: toppingCategories, error: categoriesError } = await supabase
        .from('topping_categories')
        .select('*')
        .in('id', toppingCategoryIds);

      if (categoriesError) {
        console.error("Error fetching topping category details:", categoriesError);
        return [];
      }

      const toppingCategoriesWithToppings: ToppingCategory[] = await Promise.all(
        toppingCategories.map(async (category) => {
          const { data: toppings, error: toppingsError } = await supabase
            .from('toppings')
            .select('*')
            .eq('category_id', category.id);

          if (toppingsError) {
            console.error(`Error fetching toppings for category ${category.id}:`, toppingsError);
            return {
              ...category,
              required: category.min_selections > 0,
              toppings: []
            };
          }

          return {
            ...category,
            required: category.min_selections > 0,
            toppings: toppings
          };
        })
      );

      return toppingCategoriesWithToppings;
    } catch (error) {
      console.error("Error in fetchToppingCategories:", error);
      return [];
    }
  };

  const handleSelectItem = async (item: MenuItem) => {
    try {
      setLoading(true);
      const itemWithOptions = await getMenuItemWithOptions(item.id);
      
      if (!itemWithOptions) {
        toast({
          title: "Error",
          description: "Could not load item details. Please try again.",
          variant: "destructive",
        });
        return;
      }
      
      const toppingCategories = await fetchToppingCategories(item.id);
      
      const itemWithToppings: MenuItemWithOptions = {
        ...itemWithOptions as MenuItemWithOptions,
        toppingCategories
      };
      
      setSelectedItem(itemWithToppings);
      setQuantity(1);
      setSpecialInstructions("");
      
      if (itemWithOptions.options && itemWithOptions.options.length > 0) {
        const initialOptions = itemWithOptions.options.map(option => {
          if (option.required && !option.multiple) {
            return {
              optionId: option.id,
              choiceIds: option.choices.length > 0 ? [option.choices[0].id] : []
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
      
      if (toppingCategories.length > 0) {
        const initialToppings = toppingCategories.map(category => ({
          categoryId: category.id,
          toppingIds: []
        }));
        setSelectedToppings(initialToppings);
      } else {
        setSelectedToppings([]);
      }
      
      setLoading(false);
    } catch (error) {
      console.error("Error fetching item details:", error);
      toast({
        title: "Error",
        description: "There was a problem loading the item details. Please try again.",
        variant: "destructive",
      });
      setLoading(false);
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

  // Fix the function to properly handle topping toggling
  const handleToggleTopping = (categoryId: string, toppingId: string) => {
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
        if (selectedItem?.toppingCategories) {
          const toppingCategory = selectedItem.toppingCategories.find(c => c.id === categoryId);
          if (toppingCategory && toppingCategory.max_selections > 0) {
            if (category.toppingIds.length >= toppingCategory.max_selections) {
              toast({
                title: "Maximum selections reached",
                description: `You can only select ${toppingCategory.max_selections} items from this category.`,
              });
              return prev;
            }
          }
        }
        newToppingIds = [...category.toppingIds, toppingId];
      }

      const newToppings = [...prev];
      newToppings[categoryIndex] = { ...category, toppingIds: newToppingIds };
      return newToppings;
    });
  };

  const calculateItemPrice = (item: MenuItemWithOptions, options: { optionId: string; choiceIds: string[] }[], toppings: { categoryId: string; toppingIds: string[] }[]): number => {
    let price = parseFloat(item.price.toString());
    
    if (item.options) {
      item.options.forEach(option => {
        const selectedOption = options.find(o => o.optionId === option.id);
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
    
    if (item.toppingCategories) {
      item.toppingCategories.forEach(category => {
        const selectedToppingCategory = toppings.find(t => t.categoryId === category.id);
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

  const handleAddToCart = () => {
    if (!selectedItem) return;
    
    const isOptionsValid = selectedItem.options?.every(option => {
      if (!option.required) return true;
      
      const selected = selectedOptions.find(o => o.optionId === option.id);
      return selected && selected.choiceIds.length > 0;
    }) ?? true;
    
    const isToppingsValid = selectedItem.toppingCategories?.every(category => {
      if (category.min_selections <= 0) return true;
      
      const selected = selectedToppings.find(t => t.categoryId === category.id);
      return selected && selected.toppingIds.length >= category.min_selections;
    }) ?? true;
    
    if (!isOptionsValid || !isToppingsValid) {
      toast({
        title: "Required selections",
        description: "Please make all required selections before adding to cart",
        variant: "destructive",
      });
      return;
    }
    
    const newItem: CartItem = {
      id: Date.now().toString(),
      menuItem: selectedItem,
      quantity,
      selectedOptions,
      selectedToppings,
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
    setCart(prev => {
      const newCart = prev.filter(item => item.id !== itemId);
      if (newCart.length === 0) {
        setIsCartOpen(false);
      }
      return newCart;
    });
  };

  const calculateCartTotal = (): number => {
    return cart.reduce((total, item) => {
      const itemPrice = calculateItemPrice(
        item.menuItem, 
        item.selectedOptions,
        item.selectedToppings
      );
      return total + (itemPrice * item.quantity);
    }, 0);
  };

  const calculateSubtotal = () => {
    return calculateCartTotal();
  };

  const calculateTax = () => {
    return calculateCartTotal() * 0.1; // 10% tax
  };

  const handlePlaceOrder = async () => {
    if (!restaurant || cart.length === 0) return;
    
    try {
      setPlacingOrder(true);
      
      const order = await createOrder({
        restaurant_id: restaurant.id,
        status: 'pending',
        total: calculateCartTotal(),
        customer_name: null
      });
      
      const orderItems = await createOrderItems(
        cart.map(item => ({
          order_id: order.id,
          menu_item_id: item.menuItem.id,
          quantity: item.quantity,
          price: calculateItemPrice(item.menuItem, item.selectedOptions, item.selectedToppings),
          special_instructions: item.specialInstructions || null
        }))
      );
      
      const orderItemOptionsToCreate = [];
      
      const orderItemToppingsToCreate = [];
      
      for (let i = 0; i < cart.length; i++) {
        const cartItem = cart[i];
        const orderItem = orderItems[i];
        
        for (const selectedOption of cartItem.selectedOptions) {
          for (const choiceId of selectedOption.choiceIds) {
            orderItemOptionsToCreate.push({
              order_item_id: orderItem.id,
              option_id: selectedOption.optionId,
              choice_id: choiceId
            });
          }
        }
        
        for (const selectedCategory of cartItem.selectedToppings) {
          for (const toppingId of selectedCategory.toppingIds) {
            orderItemToppingsToCreate.push({
              order_item_id: orderItem.id,
              topping_id: toppingId
            });
          }
        }
      }
      
      if (orderItemOptionsToCreate.length > 0) {
        await createOrderItemOptions(orderItemOptionsToCreate);
      }
      
      if (orderItemToppingsToCreate.length > 0) {
        await createOrderItemToppings(orderItemToppingsToCreate);
      }
      
      setOrderPlaced(true);
      
      toast({
        title: "Order placed",
        description: "Your order has been placed successfully!",
      });
      
      setTimeout(() => {
        setOrderPlaced(false);
        setCart([]);
        setIsCartOpen(false);
        setPlacingOrder(false);
      }, 3000);
      
    } catch (error) {
      console.error("Error placing order:", error);
      
      toast({
        title: "Error",
        description: "There was a problem placing your order. Please try again.",
        variant: "destructive",
      });
      
      setPlacingOrder(false);
    }
  };

  if (loading && !restaurant) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Restaurant Not Found</h1>
          <p className="text-gray-500 mb-4">The restaurant you're looking for doesn't exist.</p>
          <Button onClick={() => navigate('/')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  const activeItems = categories.find(c => c.id === activeCategory)?.items || [];
  const cartItemCount = cart.reduce((total, item) => total + item.quantity, 0);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div 
        className="h-48 bg-cover bg-center relative"
        style={{ backgroundImage: `url(${restaurant.image_url || 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?ixlib=rb-1.2.1&auto=format&fit=crop&w=1920&q=80'})` }}
      >
        <div className="absolute inset-0 bg-black bg-opacity-50"></div>
        <div className="absolute inset-0 flex items-center p-6">
          <div className="flex items-center">
            <img 
              src={restaurant.image_url || 'https://via.placeholder.com/100'} 
              alt={restaurant.name} 
              className="h-20 w-20 rounded-full border-2 border-white mr-4 object-cover"
            />
            <div>
              <h1 className="text-white text-3xl font-bold">{restaurant.name}</h1>
              <div className="flex items-center text-white text-sm mt-1">
                <Clock className="h-4 w-4 mr-1" />
                <span>{restaurant.location || 'Open now'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-64 bg-white border-r border-gray-200 overflow-y-auto">
          <div className="p-4">
            <h2 className="font-bold text-lg mb-4">Menu Categories</h2>
            <div className="space-y-1">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setActiveCategory(category.id)}
                  className={`w-full flex items-center p-3 rounded-lg text-left transition-colors ${
                    activeCategory === category.id
                      ? 'bg-kiosk-primary text-white'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <span className="mr-3">
                    {getIconComponent(category.icon, { 
                      size: 20, 
                      className: activeCategory === category.id ? 'text-white' : 'text-kiosk-primary' 
                    })}
                  </span>
                  <span className="font-medium">{category.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pb-24">
          <div className="p-6">
            <h2 className="text-xl font-bold mb-4">
              {categories.find(c => c.id === activeCategory)?.name || 'Menu Items'}
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeItems.map(item => (
                <Card key={item.id} className="overflow-hidden hover:shadow-md transition-shadow">
                  <div 
                    className="h-40 bg-cover bg-center" 
                    style={{ backgroundImage: `url(${item.image || 'https://via.placeholder.com/400x300'})` }}
                  ></div>
                  <div className="p-4">
                    <div className="flex justify-between">
                      <h3 className="font-bold text-lg">{item.name}</h3>
                      <p className="font-bold">${parseFloat(item.price.toString()).toFixed(2)}</p>
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
          </div>
        </div>
      </div>

      {/* New Cart UI as a bottom drawer */}
      <Drawer open={isCartOpen && cart.length > 0} onOpenChange={setIsCartOpen}>
        <DrawerContent className="max-h-[85vh]">
          <div className="mx-auto w-full max-w-4xl">
            <DrawerHeader className="px-4 sm:px-6 pt-4 pb-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <ShoppingCart className="text-red-500 mr-2" />
                  <DrawerTitle className="text-xl">VOTRE COMMANDE ({cartItemCount})</DrawerTitle>
                </div>
                <DrawerClose asChild>
                  <Button variant="ghost" size="sm" className="gap-2">
                    <ChevronUp className="h-4 w-4" />
                    Collapse Cart
                  </Button>
                </DrawerClose>
              </div>
            </DrawerHeader>
            
            <div className="p-4 sm:p-6 overflow-auto max-h-[50vh]">
              {cart.map((item) => (
                <div key={item.id} className="flex items-center justify-between border-b border-gray-100 pb-4 mb-4">
                  <div className="flex items-start">
                    <img 
                      src={item.menuItem.image || '/placeholder.svg'} 
                      alt={item.menuItem.name} 
                      className="w-16 h-16 object-cover rounded mr-4" 
                    />
                    <div>
                      <h3 className="font-bold">{item.menuItem.name}</h3>
                      <div className="text-sm text-gray-500">
                        {getFormattedOptions(item)}
                        {getFormattedOptions(item) && getFormattedToppings(item) && ", "}
                        {getFormattedToppings(item)}
                      </div>
                      <p className="text-gray-700 font-medium mt-1">
                        {calculateItemPrice(item.menuItem, item.selectedOptions, item.selectedToppings).toFixed(2)} €
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <div className="flex items-center">
                      <Button 
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 rounded-full"
                        onClick={() => handleUpdateCartItemQuantity(item.id, item.quantity - 1)}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="w-8 text-center font-medium">{item.quantity}</span>
                      <Button 
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 rounded-full"
                        onClick={() => handleUpdateCartItemQuantity(item.id, item.quantity + 1)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="ml-2 text-red-500"
                        onClick={() => handleRemoveCartItem(item.id)}
                      >
                        <Trash2 className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="px-4 sm:px-6 pb-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Sous-total:</span>
                  <span className="font-medium">{calculateSubtotal().toFixed(2)} €</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">TVA (10%):</span>
                  <span className="font-medium">{calculateTax().toFixed(2)} €</span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between text-lg font-bold">
                  <span>TOTAL:</span>
                  <span>{(calculateSubtotal() + calculateTax()).toFixed(2)} €</span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mt-6">
                <Button 
                  variant="destructive"
                  className="py-6"
                  onClick={() => setCart([])}
                >
                  ANNULER
                </Button>
                <Button 
                  className="bg-green-800 hover:bg-green-900 text-white py-6"
                  onClick={handlePlaceOrder}
                  disabled={placingOrder || orderPlaced}
                >
                  {placingOrder && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {orderPlaced && <Check className="h-4 w-4 mr-2" />}
                  {orderPlaced ? "CONFIRMÉ" : placingOrder ? "EN COURS..." : "VOIR MA COMMANDE"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Item customization dialog */}
      {selectedItem && (
        <Dialog open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{selectedItem.name}</DialogTitle>
              <DialogDescription>{selectedItem.description}</DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
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
                          onClick={() => handleToggleChoice(option.id, choice.id, !!option.multiple)}
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
                          {choice.price && choice.price > 0 && <span>+${parseFloat(choice.price.toString()).toFixed(2)}</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              
              {selectedItem.toppingCategories && selectedItem.toppingCategories.map((category) => (
                <div key={category.id} className="space-y-3">
                  <div className="font-medium flex items-center">
                    {category.name} 
                    {category.required && <span className="text-red-500 ml-1">*</span>}
                    <span className="text-sm text-gray-500 ml-2">
                      {category.max_selections > 0 
                        ? `(Select up to ${category.max_selections})` 
                        : "(Select multiple)"}
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    {category.toppings.map((topping) => {
                      const selectedCategory = selectedToppings.find(t => t.categoryId === category.id);
                      const isSelected = selectedCategory?.toppingIds.includes(topping.id) || false;
                      
                      return (
                        <div key={topping.id} className="flex items-center justify-between border rounded-md p-3 hover:border-gray-300">
                          <span>{topping.name}</span>
                          <div className="flex items-center gap-2">
                            {topping.price > 0 && (
                              <span className="text-sm">+${parseFloat(topping.price.toString()).toFixed(2)}</span>
                            )}
                            <Button
                              variant="outline"
                              size="icon"
                              className={`h-8 w-8 rounded-full ${isSelected ? 'bg-kiosk-primary text-white border-kiosk-primary' : ''}`}
                              onClick={() => handleToggleTopping(category.id, topping.id)}
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
                  Add to Order - ${(calculateItemPrice(selectedItem, selectedOptions, selectedToppings) * quantity).toFixed(2)}
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default KioskView;
