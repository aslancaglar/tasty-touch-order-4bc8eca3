import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ShoppingCart, Coffee } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { 
  getRestaurantBySlug, 
  getCategoriesByRestaurantId, 
  getMenuItemsByCategory, 
  getToppingsByCategory,
  getToppingCategoriesByRestaurantId 
} from "@/services/kiosk-service";
import WelcomePage from "@/components/kiosk/WelcomePage";
import OrderTypeSelection from "@/components/kiosk/OrderTypeSelection";
import TableSelection from "@/components/kiosk/TableSelection";
import Cart from "@/components/kiosk/Cart";
import CartButton from "@/components/kiosk/CartButton";
import { supabase } from "@/integrations/supabase/client";
import { Restaurant, MenuCategory, MenuItem, CartItem, MenuItemWithOptions, ToppingCategory, Topping } from "@/types/database-types";
import { calculateCartTotals } from "@/utils/price-utils";

const KioskView: React.FC = () => {
  const { restaurantSlug } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menuCategories, setMenuCategories] = useState<MenuCategory[]>([]);
  const [menuItems, setMenuItems] = useState<Record<string, MenuItem[]>>({});
  const [toppingCategories, setToppingCategories] = useState<ToppingCategory[]>([]);
  const [toppings, setToppings] = useState<Record<string, Topping[]>>({});
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [welcomePhase, setWelcomePhase] = useState<"welcome" | "orderType" | "tableSelection" | "menu">(
    "welcome"
  );
  const [orderType, setOrderType] = useState<"dine-in" | "takeaway" | null>(null);
  const [tableNumber, setTableNumber] = useState<string | null>(null);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [selectedMenuItem, setSelectedMenuItem] = useState<MenuItemWithOptions | null>(null);
  const [selectedToppings, setSelectedToppings] = useState<
    Array<{ categoryId: string; toppingIds: string[] }>
  >([]);
  
  const handleToggleTopping = (categoryId: string, toppingId: string) => {
    setSelectedToppings(prev => {
      const categoryIndex = prev.findIndex(t => t.categoryId === categoryId);
      if (categoryIndex === -1) {
        return [...prev, {
          categoryId,
          toppingIds: [toppingId]
        }];
      }
      const category = prev[categoryIndex];
      let newToppingIds: string[];
      if (category.toppingIds.includes(toppingId)) {
        newToppingIds = category.toppingIds.filter(id => id !== toppingId);
      } else {
        if (selectedMenuItem?.toppingCategories) {
          const toppingCategory = selectedMenuItem.toppingCategories.find(c => c.id === categoryId);
          if (toppingCategory && toppingCategory.max_selections > 0) {
            if (category.toppingIds.length >= toppingCategory.max_selections) {
              toast({
                title: "Nombre maximum de sélections atteint",
                description: `Vous ne pouvez sélectionner que ${toppingCategory.max_selections} éléments dans cette catégorie.`
              });
              return prev;
            }
          }
        }
        newToppingIds = [...category.toppingIds, toppingId];
      }
      const newToppings = [...prev];
      newToppings[categoryIndex] = {
        ...category,
        toppingIds: newToppingIds
      };
      
      // Force a re-render to update conditional categories visibility
      setTimeout(() => {
        setSelectedToppings([...newToppings]);
      }, 10);
      
      return newToppings;
    });
  };

  // Function to determine if a topping category should be shown based on conditions
  const shouldShowToppingCategory = (category: ToppingCategory) => {
    if (!category.show_if_selection_id || category.show_if_selection_id.length === 0) {
      return true; // No conditions, always show
    }

    // Check if all required selections are present
    return category.show_if_selection_id.every((selectionId, index) => {
      const selectionType = category.show_if_selection_type?.[index] || "";
      
      if (selectionType === "category") {
        // Check if any topping from this category is selected
        return selectedToppings.some(selected => 
          selected.categoryId === selectionId && selected.toppingIds.length > 0
        );
      } else if (selectionType === "topping") {
        // Check if this specific topping is selected
        return selectedToppings.some(selected => 
          selected.toppingIds.includes(selectionId)
        );
      }
      
      return false; // Unknown selection type
    });
  };

  useEffect(() => {
    const fetchRestaurantData = async () => {
      if (!restaurantSlug) return;
      try {
        const fetchedRestaurant = await getRestaurantBySlug(restaurantSlug);
        if (fetchedRestaurant) {
          setRestaurant(fetchedRestaurant);
          
          const categories = await getCategoriesByRestaurantId(fetchedRestaurant.id);
          setMenuCategories(categories);
          
          const initialMenuItems: Record<string, MenuItem[]> = {};
          for (const category of categories) {
            const items = await getMenuItemsByCategory(category.id);
            initialMenuItems[category.id] = items;
          }
          setMenuItems(initialMenuItems);

          const toppingCategoriesData = await getToppingCategoriesByRestaurantId(fetchedRestaurant.id);
          setToppingCategories(toppingCategoriesData);

          const initialToppings: Record<string, Topping[]> = {};
          for (const toppingCategory of toppingCategoriesData) {
            const tops = await getToppingsByCategory(toppingCategory.id);
            initialToppings[toppingCategory.id] = tops;
          }
          setToppings(initialToppings);
        } else {
          toast({
            title: "Restaurant Not Found",
            description: "The requested restaurant does not exist.",
            variant: "destructive",
          });
          navigate("/");
        }
      } catch (error) {
        console.error("Error fetching restaurant data:", error);
        toast({
          title: "Error",
          description: "Failed to load restaurant data.",
          variant: "destructive",
        });
        navigate("/");
      }
    };

    fetchRestaurantData();
  }, [restaurantSlug, navigate, toast]);

  const handleAddToCart = async (menuItem: MenuItem) => {
    if (!restaurant) {
      toast({
        title: "Error",
        description: "Restaurant data not loaded yet.",
        variant: "destructive",
      });
      return;
    }

    try {
      const menuItemWithOptions: MenuItemWithOptions = {
        ...menuItem,
        options: [],
        toppingCategories: []
      };

      // Fetch topping categories and toppings
      const toppingCategoriesData = await getToppingCategoriesByRestaurantId(restaurant.id);
      const toppingCategoriesWithToppings = await Promise.all(
        toppingCategoriesData.map(async (category) => {
          const toppingsForCategory = await getToppingsByCategory(category.id);
          return {
            ...category,
            toppings: toppingsForCategory,
          };
        })
      );
      menuItemWithOptions.toppingCategories = toppingCategoriesWithToppings;

      setSelectedMenuItem(menuItemWithOptions);

      // Calculate the base item price
      let itemPrice = menuItem.promotion_price !== null ? menuItem.promotion_price : menuItem.price;

      // Add the selected item to the cart
      const newItem: CartItem = {
        id: uuidv4(),
        menuItem: menuItemWithOptions,
        quantity: 1,
        selectedOptions: [],
        selectedToppings: selectedToppings,
        itemPrice: itemPrice,
      };
      setCart((prevCart) => [...prevCart, newItem]);
      toast({
        title: "Added to Cart",
        description: `${menuItem.name} has been added to your cart.`,
      });
      setIsCartOpen(true);
    } catch (error) {
      console.error("Error adding item to cart:", error);
      toast({
        title: "Error",
        description: "Failed to add item to cart.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateCartQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      handleRemoveCartItem(itemId);
      return;
    }

    setCart((prevCart) =>
      prevCart.map((item) => {
        if (item.id === itemId) {
          return { ...item, quantity: newQuantity };
        }
        return item;
      })
    );
  };

  const handleRemoveCartItem = (itemId: string) => {
    setCart((prevCart) => prevCart.filter((item) => item.id !== itemId));
  };

  const handleClearCart = () => {
    setCart([]);
  };

  const handlePlaceOrder = async () => {
    if (cart.length === 0) {
      toast({
        title: "Cart is Empty",
        description: "Please add items to your cart before placing an order.",
        variant: "destructive",
      });
      return;
    }

    if (!restaurant) {
      toast({
        title: "Error",
        description: "Restaurant data not loaded yet.",
        variant: "destructive",
      });
      return;
    }

    setPlacingOrder(true);
    try {
      const { total } = calculateCartTotals(cart);

      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert([
          {
            restaurant_id: restaurant.id,
            status: 'pending',
            total: total,
            order_type: orderType,
            table_number: tableNumber,
          },
        ])
        .select()
        .single();

      if (orderError || !orderData) {
        throw new Error(`Failed to create order: ${orderError?.message}`);
      }

      const orderId = orderData.id;

      // Create order items
      for (const cartItem of cart) {
        const { menuItem, quantity, itemPrice } = cartItem;

        const { error: orderItemError } = await supabase
          .from('order_items')
          .insert([
            {
              order_id: orderId,
              menu_item_id: menuItem.id,
              quantity: quantity,
              price: itemPrice,
            },
          ]);

        if (orderItemError) {
          throw new Error(`Failed to create order item: ${orderItemError.message}`);
        }
      }

      setCart([]);
      setOrderPlaced(true);
      toast({
        title: "Order Placed",
        description: "Your order has been placed successfully!",
      });
    } catch (error: any) {
      console.error("Error placing order:", error);
      toast({
        title: "Order Failed",
        description: `Failed to place order: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setPlacingOrder(false);
    }
  };

  const getFormattedOptions = (item: CartItem) => {
    return item.selectedOptions
      .map((option) => {
        const menuItemOption = item.menuItem.options?.find((o) => o.id === option.optionId);
        if (!menuItemOption) return null;

        const choices = menuItemOption.choices
          .filter((choice) => option.choiceIds.includes(choice.id))
          .map((choice) => choice.name);

        return `${menuItemOption.name}: ${choices.join(", ")}`;
      })
      .filter(Boolean)
      .join(", ");
  };

  const getFormattedToppings = (item: CartItem) => {
    return item.selectedToppings
      .map((selected) => {
        const category = item.menuItem.toppingCategories?.find((cat) => cat.id === selected.categoryId);
        if (!category) return null;

        const toppingNames = category.toppings
          .filter((topping) => selected.toppingIds.includes(topping.id))
          .map((topping) => topping.name);

        return `${category.name}: ${toppingNames.join(", ")}`;
      })
      .filter(Boolean)
      .join(", ");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {welcomePhase === "welcome" && (
        <WelcomePage 
          restaurant={restaurant} 
          onStart={() => setWelcomePhase("orderType")} 
        />
      )}
      
      {welcomePhase === "orderType" && (
        <OrderTypeSelection
          isOpen={welcomePhase === "orderType"}
          onClose={() => setWelcomePhase("welcome")}
          onSelectOrderType={(type) => {
            setOrderType(type);
            if (type === "dine-in") {
              setWelcomePhase("tableSelection");
            } else {
              setWelcomePhase("menu");
            }
          }}
        />
      )}
      
      {welcomePhase === "tableSelection" && (
        <TableSelection
          isOpen={welcomePhase === "tableSelection"}
          onClose={() => setWelcomePhase("orderType")}
          onSelectTable={(tableNum) => {
            setTableNumber(tableNum);
            setWelcomePhase("menu");
          }}
          restaurant={restaurant}
        />
      )}
      
      {welcomePhase === "menu" && (
        <>
          <div className="container mx-auto px-4 py-6">
            <div className="flex items-center justify-between mb-6">
              <Button
                variant="ghost"
                className="flex items-center text-gray-600"
                onClick={() => navigate("/")}
              >
                <ArrowLeft className="mr-2 h-5 w-5" />
                {restaurant?.name || "Restaurant"}
              </Button>
              
              <div className="text-right">
                {orderType && (
                  <div className="text-sm text-gray-500 mb-1">
                    {orderType === "dine-in" ? "Sur place" : "À emporter"}
                    {tableNumber && ` - Table ${tableNumber}`}
                  </div>
                )}
              </div>
            </div>
            
            {menuCategories.length > 0 && (
              <Tabs 
                value={selectedCategory || menuCategories[0].id} 
                onValueChange={setSelectedCategory}
                className="w-full"
              >
                <ScrollArea className="w-full pb-4">
                  <TabsList className="flex w-max space-x-2 bg-transparent">
                    {menuCategories.map((category) => (
                      <TabsTrigger
                        key={category.id}
                        value={category.id}
                        className="px-4 py-2 data-[state=active]:bg-green-800 data-[state=active]:text-white"
                      >
                        {category.name}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </ScrollArea>
                
                {menuCategories.map((category) => (
                  <TabsContent key={category.id} value={category.id} className="mt-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {menuItems[category.id]?.map((item) => (
                        <Card 
                          key={item.id} 
                          className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                          onClick={() => {
                            handleAddToCart(item);
                          }}
                        >
                          <div 
                            className="h-40 bg-cover bg-center"
                            style={{ 
                              backgroundImage: item.image 
                                ? `url(${item.image})` 
                                : 'url(/placeholder.svg)' 
                            }}
                          />
                          <div className="p-4">
                            <h3 className="font-bold">{item.name}</h3>
                            {item.description && (
                              <p className="text-sm text-gray-500 line-clamp-2 mt-1">
                                {item.description}
                              </p>
                            )}
                            <div className="mt-2 font-semibold text-green-800">
                              {(item.promotion_price || item.price).toFixed(2)} €
                              {item.promotion_price && (
                                <span className="ml-2 text-gray-500 line-through text-sm">
                                  {item.price.toFixed(2)} €
                                </span>
                              )}
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            )}
          </div>
          
          <CartButton 
            itemCount={cart.reduce((total, item) => total + item.quantity, 0)} 
            total={calculateCartTotals(cart).total}
            onClick={() => setIsCartOpen(true)} 
          />
          
          <Cart 
            cart={cart} 
            isOpen={isCartOpen} 
            onToggleOpen={() => setIsCartOpen(!isCartOpen)} 
            onUpdateQuantity={(itemId, quantity) => {
              handleUpdateCartQuantity(itemId, quantity);
            }} 
            onRemoveItem={(itemId) => {
              handleRemoveCartItem(itemId);
            }} 
            onClearCart={() => {
              handleClearCart();
            }} 
            onPlaceOrder={() => {
              handlePlaceOrder();
            }} 
            placingOrder={placingOrder} 
            orderPlaced={orderPlaced} 
            calculateSubtotal={() => calculateCartTotals(cart).subtotal} 
            calculateTax={() => calculateCartTotals(cart).tax} 
            getFormattedOptions={(item) => {
              return getFormattedOptions(item);
            }} 
            getFormattedToppings={(item) => {
              return getFormattedToppings(item);
            }} 
            restaurant={restaurant} 
            orderType={orderType} 
            tableNumber={tableNumber} 
          />
        </>
      )}
    </div>
  );
};

export default KioskView;
