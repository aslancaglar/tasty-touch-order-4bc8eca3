import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  Home,
  Loader2,
  MinusCircle,
  Plus,
  PlusCircle,
  ShoppingBag,
  ShoppingCart,
  Trash2,
  Utensils
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
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
import { Restaurant, MenuCategory, MenuItem } from "@/types/database-types";
import { getIconComponent } from "@/utils/icon-mapping";

import { KioskWelcomeScreen } from "@/components/kiosk/KioskWelcomeScreen";
import { KioskOrderTypeScreen } from "@/components/kiosk/KioskOrderTypeScreen";
import { KioskMenuScreen } from "@/components/kiosk/KioskMenuScreen";
import { KioskCartScreen } from "@/components/kiosk/KioskCartScreen";
import { KioskOrderConfirmationScreen } from "@/components/kiosk/KioskOrderConfirmationScreen";
import { KioskItemCustomizationScreen } from "@/components/kiosk/KioskItemCustomizationScreen";

import { 
  CartItem, 
  KioskOrderType, 
  MenuItemWithOptions,
  OrderStep,
  SelectedOption,
  SelectedTopping
} from "@/types/kiosk-types";

const KioskView = () => {
  const { restaurantSlug } = useParams<{ restaurantSlug: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [orderStep, setOrderStep] = useState<OrderStep>("welcome");
  const [orderType, setOrderType] = useState<KioskOrderType | null>(null);
  
  const [selectedItem, setSelectedItem] = useState<MenuItemWithOptions | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<SelectedOption[]>([]);
  const [selectedToppings, setSelectedToppings] = useState<SelectedTopping[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [specialInstructions, setSpecialInstructions] = useState("");
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);

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

      const toppingCategoriesWithToppings = await Promise.all(
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

  const handleToggleTopping = (categoryId: string, toppingId: string, maxSelections: number) => {
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
          toast({
            title: "Maximum selections reached",
            description: `You can only select ${maxSelections} items from this category.`,
          });
          return prev;
        }
        newToppingIds = [...category.toppingIds, toppingId];
      }

      const newToppings = [...prev];
      newToppings[categoryIndex] = { ...category, toppingIds: newToppingIds };
      return newToppings;
    });
  };

  const calculateItemPrice = (item: MenuItemWithOptions, options: SelectedOption[], toppings: SelectedTopping[]): number => {
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
      const itemPrice = calculateItemPrice(
        item.menuItem, 
        item.selectedOptions,
        item.selectedToppings
      );
      return total + (itemPrice * item.quantity);
    }, 0);
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
      setOrderStep("confirmation");
      
      toast({
        title: "Order placed",
        description: "Your order has been placed successfully!",
      });
      
      setTimeout(() => {
        setCart([]);
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

  const resetOrder = () => {
    setCart([]);
    setOrderType(null);
    setOrderStep("welcome");
    setSelectedItem(null);
    setOrderPlaced(false);
  };

  const goToStep = (step: OrderStep) => {
    setOrderStep(step);
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

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {orderStep === "welcome" && (
        <KioskWelcomeScreen 
          restaurant={restaurant} 
          onStart={() => setOrderStep("orderType")} 
        />
      )}
      
      {orderStep === "orderType" && (
        <KioskOrderTypeScreen 
          restaurant={restaurant}
          onSelectOrderType={(type) => {
            setOrderType(type);
            setOrderStep("menu");
          }}
        />
      )}
      
      {orderStep === "menu" && (
        <KioskMenuScreen 
          restaurant={restaurant}
          categories={categories}
          cart={cart}
          onSelectItem={handleSelectItem}
          onViewCart={() => setOrderStep("cart")}
          onGoBack={() => setOrderStep("orderType")}
          calculateCartTotal={calculateCartTotal}
        />
      )}
      
      {orderStep === "cart" && (
        <KioskCartScreen 
          cart={cart}
          restaurant={restaurant}
          orderType={orderType}
          onUpdateQuantity={handleUpdateCartItemQuantity}
          onRemoveItem={handleRemoveCartItem}
          onContinueShopping={() => setOrderStep("menu")}
          onPlaceOrder={handlePlaceOrder}
          calculateItemPrice={calculateItemPrice}
          calculateCartTotal={calculateCartTotal}
          placingOrder={placingOrder}
        />
      )}
      
      {orderStep === "confirmation" && (
        <KioskOrderConfirmationScreen 
          restaurant={restaurant}
          orderType={orderType}
          onNewOrder={resetOrder}
        />
      )}
    </div>
  );
};

export default KioskView;
