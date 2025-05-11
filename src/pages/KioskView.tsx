import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from 'next/router';
import { CartItem, MenuItem } from "@/types/database-types";
import { calculateCartTotals } from "@/utils/price-utils";
import { getFormattedOptions, getFormattedToppings } from "@/utils/receipt-templates";
import { useDebounce } from "@/hooks/use-debounce";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation, SupportedLanguage } from "@/utils/language-utils";
import { useToast } from "@/hooks/use-toast";

import Menu from "@/components/kiosk/Menu";
import Cart from "@/components/kiosk/Cart";
import OrderTypeSelector from "@/components/kiosk/OrderTypeSelector";
import OrderSummary from "@/components/kiosk/OrderSummary";
import OrderConfirmationPage from "@/components/kiosk/OrderConfirmationPage";
import WelcomeScreen from "@/components/kiosk/WelcomeScreen";
import { Skeleton } from "@/components/ui/skeleton";

const KioskView = () => {
  const [restaurant, setRestaurant] = useState<any>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300);
  const [showOrderTypeSelector, setShowOrderTypeSelector] = useState(false);
  const [showOrderSummary, setShowOrderSummary] = useState(false);
  const [showOrderConfirmation, setShowOrderConfirmation] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [orderType, setOrderType] = useLocalStorage<"dine-in" | "takeaway" | null>("orderType", null);
  const [tableNumber, setTableNumber] = useLocalStorage<string | null>("tableNumber", null);
  const [orderNumber, setOrderNumber] = useState<string>("0");
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { restaurantId } = router.query;
  const { toast } = useToast();
  const { t } = useTranslation(restaurant?.ui_language as "fr" | "en" | "tr");

  const orderSummaryRef = useRef<any>(null);

  const fetchRestaurantAndMenuItems = useCallback(async () => {
    setIsLoading(true);
    try {
      if (restaurantId) {
        const { data: restaurantData, error: restaurantError } = await supabase
          .from('restaurants')
          .select('*')
          .eq('id', restaurantId)
          .single();

        if (restaurantError) {
          console.error("Error fetching restaurant:", restaurantError);
          return;
        }

        setRestaurant(restaurantData);

        const { data: menuItemsData, error: menuItemsError } = await supabase
          .from('menu_items')
          .select('*')
          .eq('restaurant_id', restaurantId);

        if (menuItemsError) {
          console.error("Error fetching menu items:", menuItemsError);
          return;
        }

        setMenuItems(menuItemsData);
      }
    } finally {
      setIsLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    fetchRestaurantAndMenuItems();
  }, [fetchRestaurantAndMenuItems]);

  const handleAddToCart = (menuItem: MenuItem) => {
    setCart((prevCart) => {
      const existingItemIndex = prevCart.findIndex((item) => item.menuItem.id === menuItem.id);

      if (existingItemIndex > -1) {
        const newCart = [...prevCart];
        newCart[existingItemIndex].quantity += 1;
        newCart[existingItemIndex].itemPrice = menuItem.price;
        return newCart;
      } else {
        return [...prevCart, { menuItem: menuItem, quantity: 1, itemPrice: menuItem.price, selectedOptions: [], selectedToppings: [] }];
      }
    });
  };

  const handleRemoveFromCart = (itemId: string) => {
    setCart((prevCart) => {
      const newCart = prevCart.filter((item) => item.menuItem.id !== itemId);
      return newCart;
    });
  };

  const handleIncreaseQuantity = (itemId: string) => {
    setCart((prevCart) => {
      const newCart = prevCart.map((item) => {
        if (item.menuItem.id === itemId) {
          return { ...item, quantity: item.quantity + 1 };
        }
        return item;
      });
      return newCart;
    });
  };

  const handleDecreaseQuantity = (itemId: string) => {
    setCart((prevCart) => {
      const newCart = prevCart.map((item) => {
        if (item.menuItem.id === itemId && item.quantity > 1) {
          return { ...item, quantity: item.quantity - 1 };
        }
        return item;
      });
      return newCart;
    });
  };

  const handleClearCart = () => {
    setCart([]);
  };

  const calculateSubtotal = () => {
    return cart.reduce((total, item) => total + (item.itemPrice * item.quantity), 0);
  };

  const calculateTax = () => {
    const subtotal = calculateSubtotal();
    const taxRate = 0.10; // 10% tax rate
    return subtotal * taxRate;
  };

  const filteredMenuItems = menuItems.filter((item) =>
    item.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
  );

  const handleSelectOrderType = (type: "dine-in" | "takeaway") => {
    setOrderType(type);
    setShowOrderTypeSelector(false);
    setShowOrderSummary(true);
  };

  const handlePlaceOrder = async () => {
    setPlacingOrder(true);

    try {
      if (!restaurant?.id) {
        console.error("Restaurant ID is missing.");
        return;
      }

      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert([
          {
            restaurant_id: restaurant.id,
            order_type: orderType,
            table_number: tableNumber,
            total_amount: calculateSubtotal() + calculateTax(),
            order_date: new Date().toISOString(),
            items: cart.map(item => ({
              menu_item_id: item.menuItem.id,
              quantity: item.quantity,
              item_price: item.itemPrice,
              selected_options: item.selectedOptions,
              selected_toppings: item.selectedToppings
            }))
          }
        ])
        .select()
        .single();

      if (orderError) {
        console.error("Error placing order:", orderError);
        return;
      }

      if (orderSummaryRef.current) {
        setOrderNumber(orderSummaryRef.current.getOrderNumber());
      }

      setShowOrderConfirmation(true);
      setShowOrderSummary(false);

    } catch (error) {
      console.error("Error placing order:", error);
      toast({
        title: t("order.error"),
        description: t("order.errorPrinting"),
        variant: "destructive"
      });
    } finally {
      setPlacingOrder(false);
    }
  };

  const handleOrderConfirmationComplete = () => {
    setCart([]);
    setShowOrderConfirmation(false);
    setOrderType(null);
    setTableNumber(null);
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden kiosk-view">
      <header className="bg-white p-4 shadow-md z-10">
        <div className="container mx-auto flex items-center justify-between">
          <div>
            {isLoading ? (
              <Skeleton className="h-8 w-48" />
            ) : (
              <h1 className="text-2xl font-bold">{restaurant?.name || "Restaurant Name"}</h1>
            )}
          </div>
          <input
            type="text"
            placeholder="Search menu items..."
            className="p-2 border rounded w-64"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </header>

      <div className="flex flex-1 overflow-auto">
        <Menu
          menuItems={filteredMenuItems}
          onAddToCart={handleAddToCart}
          isLoading={isLoading}
        />
        <Cart
          cart={cart}
          onRemoveFromCart={handleRemoveFromCart}
          onIncreaseQuantity={handleIncreaseQuantity}
          onDecreaseQuantity={handleDecreaseQuantity}
          onClearCart={handleClearCart}
          onShowOrderTypeSelector={() => setShowOrderTypeSelector(true)}
          cartTotal={calculateCartTotals(cart).total}
        />
      </div>

      {showOrderTypeSelector && (
        <OrderTypeSelector
          isOpen={showOrderTypeSelector}
          onClose={() => setShowOrderTypeSelector(false)}
          onSelectOrderType={handleSelectOrderType}
          setTableNumber={setTableNumber}
          tableNumber={tableNumber}
        />
      )}

      {showOrderSummary && (
        <OrderSummary
          ref={orderSummaryRef}
          isOpen={showOrderSummary}
          onClose={() => setShowOrderSummary(false)}
          cart={cart}
          onPlaceOrder={handlePlaceOrder}
          placingOrder={placingOrder}
          calculateSubtotal={calculateSubtotal}
          calculateTax={calculateTax}
          getFormattedOptions={getFormattedOptions}
          getFormattedToppings={getFormattedToppings}
          restaurant={restaurant}
          orderType={orderType}
          tableNumber={tableNumber}
          uiLanguage={restaurant?.ui_language as "fr" | "en" | "tr"}
        />
      )}

      {showOrderConfirmation && (
        <OrderConfirmationPage
          orderNumber={orderNumber}
          total={calculateSubtotal() + calculateTax()}
          onTimerComplete={handleOrderConfirmationComplete}
          uiLanguage={restaurant?.ui_language as SupportedLanguage}
          currency={restaurant?.currency}
        />
      )}

      {!restaurant && !showOrderTypeSelector && !showOrderSummary && !showOrderConfirmation && (
        <WelcomeScreen onStartOrder={() => setShowOrderTypeSelector(true)} />
      )}
    </div>
  );
};

export default KioskView;
