import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CartItem, Restaurant, MenuCategory, MenuItemWithOptions } from "@/types/database-types";
import { useToast } from "@/hooks/use-toast";
import { useInactivityTimer } from "@/hooks/useInactivityTimer";
import WelcomePage from "@/components/kiosk/WelcomePage";
import KioskHeader from "@/components/kiosk/KioskHeader";
import MenuCategoryList from "@/components/kiosk/MenuCategoryList";
import MenuItemGrid from "@/components/kiosk/MenuItemGrid";
import ItemCustomizationDialog from "@/components/kiosk/ItemCustomizationDialog";
import OrderSummary from "@/components/kiosk/OrderSummary";
import OrderConfirmationDialog from "@/components/kiosk/OrderConfirmationDialog";
import InactivityDialog from "@/components/kiosk/InactivityDialog";
import CartButton from "@/components/kiosk/CartButton";
import OrderTypeSelection from "@/components/kiosk/OrderTypeSelection";
import TableSelection from "@/components/kiosk/TableSelection";
import PreloadingScreen from "@/components/kiosk/PreloadingScreen";
import { getRestaurantData, preloadImages } from "@/utils/data-preloader";
import { useTranslation, SupportedLanguage } from "@/utils/language-utils";
import { v4 as uuidv4 } from 'uuid';

const KioskView: React.FC = () => {
  const { restaurantSlug } = useParams<{ restaurantSlug: string }>();
  const { toast } = useToast();
  
  // Core state
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItemWithOptions[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // UI state
  const [showWelcome, setShowWelcome] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<MenuItemWithOptions | null>(null);
  const [showCustomization, setShowCustomization] = useState(false);
  const [showOrderSummary, setShowOrderSummary] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [orderNumber, setOrderNumber] = useState<string>("");
  const [placingOrder, setPlacingOrder] = useState(false);
  
  // Order state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderType, setOrderType] = useState<"dine-in" | "takeaway" | null>(null);
  const [tableNumber, setTableNumber] = useState<string | null>(null);
  const [showOrderTypeSelection, setShowOrderTypeSelection] = useState(false);
  const [showTableSelection, setShowTableSelection] = useState(false);
  
  // Preloading state
  const [preloadingComplete, setPreloadingComplete] = useState(false);
  const [preloadingProgress, setPreloadingProgress] = useState(0);

  // Get UI language and translation function
  const uiLanguage = (restaurant?.ui_language as SupportedLanguage) || 'fr';
  const { t } = useTranslation(uiLanguage);

  // Inactivity timer
  const { showInactivityDialog, resetTimer, handleContinue } = useInactivityTimer();

  // Data fetching and effects
  // Data fetching
  useEffect(() => {
    if (restaurantSlug) {
      fetchRestaurantData();
    }
  }, [restaurantSlug]);

  const fetchRestaurantData = async () => {
    try {
      setLoading(true);
      console.log(`Fetching restaurant data for slug: ${restaurantSlug}`);
      
      const data = await getRestaurantData(restaurantSlug);
      
      if (!data.restaurant) {
        setError("Restaurant not found");
        return;
      }

      setRestaurant(data.restaurant);
      setCategories(data.categories);
      setMenuItems(data.menuItems);
      
      // Start preloading images
      const allImages = [
        data.restaurant.image_url,
        data.restaurant.logo_url,
        ...data.categories.map(cat => cat.image_url),
        ...data.menuItems.map(item => item.image)
      ].filter(Boolean) as string[];

      if (allImages.length > 0) {
        await preloadImages(allImages, (progress) => {
          setPreloadingProgress(progress);
        });
      }
      
      setPreloadingComplete(true);
    } catch (error) {
      console.error("Error fetching restaurant data:", error);
      setError("Failed to load restaurant data");
    } finally {
      setLoading(false);
    }
  };

  // Cart management
  const addToCart = (item: CartItem) => {
    console.log("Adding item to cart:", item);
    setCart(prevCart => [...prevCart, item]);
    resetTimer();
  };

  const removeFromCart = (itemId: string) => {
    console.log("Removing item from cart:", itemId);
    setCart(prevCart => prevCart.filter(item => item.id !== itemId));
  };

  const updateCartItemQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(itemId);
      return;
    }
    
    setCart(prevCart => 
      prevCart.map(item => 
        item.id === itemId 
          ? { ...item, quantity: newQuantity }
          : item
      )
    );
  };

  const clearCart = () => {
    console.log("Clearing cart");
    setCart([]);
  };

  // Order management
  const handleStartOrder = () => {
    console.log("Starting order process");
    setShowWelcome(false);
    setShowOrderTypeSelection(true);
    resetTimer();
  };

  const handleOrderTypeSelected = (type: "dine-in" | "takeaway") => {
    console.log("Order type selected:", type);
    setOrderType(type);
    setShowOrderTypeSelection(false);
    
    if (type === "dine-in") {
      setShowTableSelection(true);
    }
  };

  const handleTableSelected = (table: string) => {
    console.log("Table selected:", table);
    setTableNumber(table);
    setShowTableSelection(false);
  };

  const handleBackToWelcome = () => {
    console.log("Returning to welcome screen");
    setShowWelcome(true);
    setShowOrderTypeSelection(false);
    setShowTableSelection(false);
    clearCart();
    setOrderType(null);
    setTableNumber(null);
    setSelectedCategory(null);
  };

  // Order placement with enhanced logging
  const placeOrder = async () => {
    if (!restaurant || cart.length === 0) {
      console.error("Cannot place order: missing restaurant or empty cart");
      return;
    }

    setPlacingOrder(true);
    console.log("Starting order placement process...");
    console.log("Restaurant ID:", restaurant.id);
    console.log("Cart items:", cart.length);
    console.log("Order type:", orderType);
    console.log("Table number:", tableNumber);

    try {
      // Calculate total
      const total = cart.reduce((sum, item) => sum + (item.itemPrice * item.quantity), 0);
      console.log("Order total calculated:", total);

      // Generate order number
      const newOrderNumber = Math.floor(Math.random() * 9000) + 1000;
      console.log("Generated order number:", newOrderNumber);

      // Create order with enhanced logging
      console.log("Creating order in database...");
      const orderData = {
        restaurant_id: restaurant.id,
        total: total,
        status: 'pending' as const,
        customer_name: `Order #${newOrderNumber}`,
        order_type: orderType,
        table_number: tableNumber
      };
      console.log("Order data to insert:", orderData);

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert(orderData)
        .select()
        .single();

      if (orderError) {
        console.error("Order creation error:", orderError);
        console.error("Error details:", {
          code: orderError.code,
          message: orderError.message,
          details: orderError.details,
          hint: orderError.hint
        });
        throw orderError;
      }

      console.log("Order created successfully:", order);

      // Create order items
      console.log("Creating order items...");
      for (const cartItem of cart) {
        console.log(`Processing cart item: ${cartItem.menuItem.name}`);
        
        const { data: orderItem, error: orderItemError } = await supabase
          .from('order_items')
          .insert({
            order_id: order.id,
            menu_item_id: cartItem.menuItem.id,
            quantity: cartItem.quantity,
            price: cartItem.itemPrice,
            special_instructions: cartItem.specialInstructions || null
          })
          .select()
          .single();

        if (orderItemError) {
          console.error("Order item creation error:", orderItemError);
          throw orderItemError;
        }

        console.log("Order item created:", orderItem);

        // Create order item options
        if (cartItem.selectedOptions?.length > 0) {
          console.log("Creating order item options...");
          for (const selectedOption of cartItem.selectedOptions) {
            for (const choiceId of selectedOption.choiceIds) {
              const { error: optionError } = await supabase
                .from('order_item_options')
                .insert({
                  order_item_id: orderItem.id,
                  option_id: selectedOption.optionId,
                  choice_id: choiceId
                });

              if (optionError) {
                console.error("Order item option creation error:", optionError);
                throw optionError;
              }
            }
          }
        }

        // Create order item toppings
        if (cartItem.selectedToppings?.length > 0) {
          console.log("Creating order item toppings...");
          for (const selectedTopping of cartItem.selectedToppings) {
            for (const toppingId of selectedTopping.toppingIds) {
              // Handle multiple quantities if specified
              const quantity = selectedTopping.toppingQuantities?.[toppingId] || 1;
              
              for (let i = 0; i < quantity; i++) {
                const { error: toppingError } = await supabase
                  .from('order_item_toppings')
                  .insert({
                    order_item_id: orderItem.id,
                    topping_id: toppingId
                  });

                if (toppingError) {
                  console.error("Order item topping creation error:", toppingError);
                  throw toppingError;
                }
              }
            }
          }
        }
      }

      console.log("Order placement completed successfully!");
      
      // Show success
      setOrderNumber(newOrderNumber.toString());
      setShowOrderSummary(false);
      setShowConfirmation(true);
      
      toast({
        title: t("order.success"),
        description: t("order.successDesc"),
      });

    } catch (error) {
      console.error("Order placement failed:", error);
      toast({
        title: t("order.error"),
        description: t("order.errorDesc"),
        variant: "destructive",
      });
    } finally {
      setPlacingOrder(false);
    }
  };

  // Item customization, UI helpers, etc
  // Item customization
  const handleItemClick = (item: MenuItemWithOptions) => {
    console.log("Item clicked:", item.name);
    setSelectedItem(item);
    setShowCustomization(true);
    resetTimer();
  };

  const handleCloseCustomization = () => {
    setShowCustomization(false);
    setSelectedItem(null);
  };

  // Cart helpers
  const calculateSubtotal = () => {
    return cart.reduce((sum, item) => sum + (item.itemPrice * item.quantity), 0);
  };

  const calculateTax = () => {
    return cart.reduce((sum, item) => {
      const taxRate = item.menuItem.tax_percentage || 0;
      return sum + (item.itemPrice * item.quantity * taxRate / 100);
    }, 0);
  };

  // Formatting helpers
  const getFormattedOptions = (item: CartItem): string => {
    if (!item.selectedOptions || item.selectedOptions.length === 0) return "";
    
    return item.selectedOptions.map(selectedOption => {
      const option = item.menuItem.options?.find(opt => opt.id === selectedOption.optionId);
      if (!option) return "";
      
      const choices = selectedOption.choiceIds.map(choiceId => {
        const choice = option.choices.find(c => c.id === choiceId);
        return choice ? choice.name : "";
      }).filter(Boolean);
      
      return choices.join(", ");
    }).filter(Boolean).join(", ");
  };

  const getFormattedToppings = (item: CartItem): string => {
    if (!item.selectedToppings || item.selectedToppings.length === 0) return "";
    
    return item.selectedToppings.map(selectedTopping => {
      const category = item.menuItem.toppingCategories?.find(cat => cat.id === selectedTopping.categoryId);
      if (!category) return "";
      
      const toppings = selectedTopping.toppingIds.map(toppingId => {
        const topping = category.toppings.find(t => t.id === toppingId);
        const quantity = selectedTopping.toppingQuantities?.[toppingId] || 1;
        if (!topping) return "";
        
        return quantity > 1 ? `${quantity}x ${topping.name}` : topping.name;
      }).filter(Boolean);
      
      return toppings.join(", ");
    }).filter(Boolean).join(", ");
  };

  // Loading states
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-lg">Loading restaurant...</p>
      </div>
    </div>;
  }

  if (error) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
        <p>{error}</p>
      </div>
    </div>;
  }

  if (!restaurant) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Restaurant not found</h1>
        <p>The restaurant you're looking for doesn't exist.</p>
      </div>
    </div>;
  }

  // Show preloading screen if not complete
  if (!preloadingComplete) {
    return <PreloadingScreen 
      progress={preloadingProgress} 
      uiLanguage={uiLanguage}
    />;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Welcome screen */}
      {showWelcome && (
        <WelcomePage
          restaurant={restaurant}
          onStartOrder={handleStartOrder}
          uiLanguage={uiLanguage}
        />
      )}

      {/* Order type selection */}
      {showOrderTypeSelection && (
        <OrderTypeSelection
          onSelectOrderType={handleOrderTypeSelected}
          onBack={handleBackToWelcome}
          uiLanguage={uiLanguage}
        />
      )}

      {/* Table selection */}
      {showTableSelection && restaurant && (
        <TableSelection
          restaurantId={restaurant.id}
          onSelectTable={handleTableSelected}
          onBack={() => setShowOrderTypeSelection(true)}
          uiLanguage={uiLanguage}
        />
      )}

      {/* Main kiosk interface */}
      {!showWelcome && !showOrderTypeSelection && !showTableSelection && (
        <>
          <KioskHeader
            restaurant={restaurant}
            onBack={handleBackToWelcome}
            orderType={orderType}
            tableNumber={tableNumber}
            uiLanguage={uiLanguage}
          />

          <div className="container mx-auto px-4 py-6">
            <div className="flex gap-6">
              <div className="flex-1">
                <MenuCategoryList
                  categories={categories}
                  selectedCategory={selectedCategory}
                  onCategorySelect={setSelectedCategory}
                  uiLanguage={uiLanguage}
                />

                <MenuItemGrid
                  items={menuItems}
                  selectedCategory={selectedCategory}
                  onItemClick={handleItemClick}
                  uiLanguage={uiLanguage}
                />
              </div>
            </div>
          </div>

          {/* Floating cart button */}
          <CartButton
            cart={cart}
            onOpenCart={() => setShowOrderSummary(true)}
            calculateSubtotal={calculateSubtotal}
            restaurant={restaurant}
            uiLanguage={uiLanguage}
          />
        </>
      )}

      {/* Dialogs */}
      <ItemCustomizationDialog
        isOpen={showCustomization}
        onClose={handleCloseCustomization}
        item={selectedItem}
        onAddToCart={addToCart}
        uiLanguage={uiLanguage}
      />

      <OrderSummary
        isOpen={showOrderSummary}
        onClose={() => setShowOrderSummary(false)}
        cart={cart}
        onPlaceOrder={placeOrder}
        placingOrder={placingOrder}
        calculateSubtotal={calculateSubtotal}
        calculateTax={calculateTax}
        getFormattedOptions={getFormattedOptions}
        getFormattedToppings={getFormattedToppings}
        restaurant={restaurant}
        orderType={orderType}
        tableNumber={tableNumber}
        uiLanguage={uiLanguage}
      />

      <OrderConfirmationDialog
        isOpen={showConfirmation}
        onClose={() => {
          setShowConfirmation(false);
          handleBackToWelcome();
        }}
        cart={cart}
        orderNumber={orderNumber}
        restaurant={restaurant}
        orderType={orderType}
        tableNumber={tableNumber}
        uiLanguage={uiLanguage}
        getFormattedOptions={getFormattedOptions}
        getFormattedToppings={getFormattedToppings}
      />

      <InactivityDialog
        isOpen={showInactivityDialog}
        onContinue={handleContinue}
        onRestart={handleBackToWelcome}
        uiLanguage={uiLanguage}
      />
    </div>
  );
};

export default KioskView;
