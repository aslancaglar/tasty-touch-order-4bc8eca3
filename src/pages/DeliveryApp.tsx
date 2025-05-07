import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { getRestaurantBySlug, getMenuForRestaurant, getMenuItemWithOptions } from "@/services/kiosk-service";
import { Restaurant, MenuCategory, MenuItem, MenuItemWithOptions, CartItem, OrderType, UserAddress } from "@/types/database-types";
import { useToast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ShoppingCart } from "lucide-react";
import { calculateCartTotals } from "@/utils/price-utils";
import MenuCategoryList from "@/components/kiosk/MenuCategoryList";
import MenuItemGrid from "@/components/kiosk/MenuItemGrid";
import ItemCustomizationDialog from "@/components/kiosk/ItemCustomizationDialog";
import Cart from "@/components/kiosk/Cart";
import { useTranslation, SupportedLanguage } from "@/utils/language-utils";
import { v4 as uuidv4 } from "uuid";
import LoginRegistrationModal from "@/components/delivery/LoginRegistrationModal";
import CheckoutModal from "@/components/delivery/CheckoutModal";

const CURRENCY_SYMBOLS: Record<string, string> = {
  EUR: "€", USD: "$", GBP: "£", TRY: "₺", JPY: "¥",
  CAD: "$", AUD: "$", CHF: "Fr.", CNY: "¥", RUB: "₽"
};

export default function DeliveryApp() {
  const { restaurantSlug } = useParams();
  const { user, loading: authLoading } = useAuth();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<MenuItemWithOptions | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [selectedOptions, setSelectedOptions] = useState<{optionId: string, choiceIds: string[]}[]>([]);
  const [selectedToppings, setSelectedToppings] = useState<{categoryId: string, toppingIds: string[]}[]>([]);
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [placingOrder, setPlacingOrder] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [userAddresses, setUserAddresses] = useState<UserAddress[]>([]);
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation((restaurant?.ui_language || "en") as SupportedLanguage);

  // Get currency symbol
  const getCurrencySymbol = (currency: string) => {
    return CURRENCY_SYMBOLS[currency?.toUpperCase()] || currency;
  };
  const currencySymbol = getCurrencySymbol(restaurant?.currency || "EUR");

  useEffect(() => {
    const fetchRestaurantData = async () => {
      if (!restaurantSlug) {
        navigate("/");
        return;
      }

      try {
        const data = await getRestaurantBySlug(restaurantSlug);
        if (!data) {
          navigate("/");
          return;
        }
        setRestaurant(data);

        const menuData = await getMenuForRestaurant(data.id);
        setCategories(menuData.sort((a, b) => {
          return (a.display_order || 1000) - (b.display_order || 1000);
        }));

        const allMenuItems = menuData.flatMap(cat => cat.items);
        setMenuItems(allMenuItems);

        if (menuData.length > 0) {
          setActiveCategory(menuData[0].id);
        }
      } catch (error) {
        console.error("Error fetching restaurant data:", error);
        toast({ 
          title: "Error", 
          description: "Failed to load restaurant data", 
          variant: "destructive" 
        });
      } finally {
        setLoading(false);
      }
    };

    fetchRestaurantData();
  }, [restaurantSlug, navigate, toast, refreshTrigger]);

  // Fetch user addresses if user is logged in
  useEffect(() => {
    const fetchUserAddresses = async () => {
      if (user) {
        try {
          const { data, error } = await supabase
            .from('user_addresses')
            .select('*')
            .eq('user_id', user.id);
          
          if (error) throw error;
          setUserAddresses(data || []);
        } catch (error) {
          console.error("Error fetching user addresses:", error);
        }
      }
    };

    fetchUserAddresses();
  }, [user]);

  // Handle menu item selection
  const handleSelectItem = async (item: MenuItem) => {
    try {
      const menuItemWithOptions = await getMenuItemWithOptions(item.id);
      setSelectedItem(menuItemWithOptions);
      resetItemSelections();
    } catch (error) {
      console.error("Error fetching menu item details:", error);
      toast({ 
        title: "Error", 
        description: "Failed to load menu item details", 
        variant: "destructive" 
      });
    }
  };

  // Reset item selections for the modal
  const resetItemSelections = () => {
    setQuantity(1);
    setSelectedOptions([]);
    setSelectedToppings([]);
    setSpecialInstructions("");
  };

  // Toggle choice selection
  const handleToggleChoice = (optionId: string, choiceId: string, multiple: boolean) => {
    setSelectedOptions(prev => {
      const existingOptionIndex = prev.findIndex(o => o.optionId === optionId);
      
      if (existingOptionIndex >= 0) {
        const existingOption = prev[existingOptionIndex];
        const choiceExists = existingOption.choiceIds.includes(choiceId);
        
        if (multiple) {
          // For multi-select, toggle the choice
          const updatedChoices = choiceExists
            ? existingOption.choiceIds.filter(id => id !== choiceId)
            : [...existingOption.choiceIds, choiceId];
            
          if (updatedChoices.length === 0) {
            // Remove the option if no choices left
            return prev.filter(o => o.optionId !== optionId);
          } else {
            // Update the choices
            return prev.map(o => 
              o.optionId === optionId ? { ...o, choiceIds: updatedChoices } : o
            );
          }
        } else {
          // For single-select, replace the choice
          return prev.map(o => 
            o.optionId === optionId ? { ...o, choiceIds: [choiceId] } : o
          );
        }
      } else {
        // Add new option with the selected choice
        return [...prev, { optionId, choiceIds: [choiceId] }];
      }
    });
  };

  // Toggle topping selection
  const handleToggleTopping = (categoryId: string, toppingId: string) => {
    setSelectedToppings(prev => {
      const existingCategoryIndex = prev.findIndex(t => t.categoryId === categoryId);
      
      if (existingCategoryIndex >= 0) {
        const existingCategory = prev[existingCategoryIndex];
        const toppingExists = existingCategory.toppingIds.includes(toppingId);
        
        const toppingCategory = selectedItem?.toppingCategories?.find(tc => tc.id === categoryId);
        const maxSelections = toppingCategory?.max_selections || 0;
        
        if (toppingExists) {
          // Remove the topping
          const updatedToppings = existingCategory.toppingIds.filter(id => id !== toppingId);
          
          if (updatedToppings.length === 0) {
            // Remove the category if no toppings left
            return prev.filter(t => t.categoryId !== categoryId);
          } else {
            // Update the toppings
            return prev.map(t => 
              t.categoryId === categoryId ? { ...t, toppingIds: updatedToppings } : t
            );
          }
        } else if (maxSelections === 0 || existingCategory.toppingIds.length < maxSelections) {
          // Add the topping if under max selections or if no limit
          return prev.map(t => 
            t.categoryId === categoryId 
              ? { ...t, toppingIds: [...t.toppingIds, toppingId] } 
              : t
          );
        } else if (maxSelections === 1) {
          // Replace the topping for single-select
          return prev.map(t => 
            t.categoryId === categoryId ? { ...t, toppingIds: [toppingId] } : t
          );
        } else {
          // Max selections reached
          return prev;
        }
      } else {
        // Add new category with the selected topping
        return [...prev, { categoryId, toppingIds: [toppingId] }];
      }
    });
  };

  // Calculate item price with options and toppings
  const calculateItemPrice = () => {
    if (!selectedItem) return 0;
    
    let price = selectedItem.promotion_price !== null 
      ? Number(selectedItem.promotion_price) 
      : Number(selectedItem.price);
    
    // Add option choice prices
    if (selectedItem.options) {
      selectedItem.options.forEach(option => {
        const selectedOption = selectedOptions.find(o => o.optionId === option.id);
        if (selectedOption) {
          selectedOption.choiceIds.forEach(choiceId => {
            const choice = option.choices.find(c => c.id === choiceId);
            if (choice && choice.price) {
              price += Number(choice.price);
            }
          });
        }
      });
    }
    
    // Add topping prices
    if (selectedItem.toppingCategories) {
      selectedItem.toppingCategories.forEach(category => {
        const selectedCategory = selectedToppings.find(t => t.categoryId === category.id);
        if (selectedCategory) {
          selectedCategory.toppingIds.forEach(toppingId => {
            const topping = category.toppings.find(t => t.id === toppingId);
            if (topping && topping.price) {
              price += Number(topping.price);
            }
          });
        }
      });
    }
    
    return price * quantity;
  };

  // Add current item to cart
  const handleAddToCart = () => {
    if (!selectedItem) return;
    
    // Check if required options are selected
    const missingRequiredOptions = selectedItem.options?.filter(
      option => option.required && !selectedOptions.some(so => so.optionId === option.id)
    );
    
    if (missingRequiredOptions && missingRequiredOptions.length > 0) {
      toast({ 
        title: "Required options", 
        description: `Please select ${missingRequiredOptions.map(o => o.name).join(", ")}`, 
        variant: "destructive" 
      });
      return;
    }
    
    // Check if required topping categories are selected
    const missingRequiredToppings = selectedItem.toppingCategories?.filter(
      category => category.required && 
        (!selectedToppings.some(st => st.categoryId === category.id) || 
          selectedToppings.find(st => st.categoryId === category.id)?.toppingIds.length === 0)
    );
    
    if (missingRequiredToppings && missingRequiredToppings.length > 0) {
      toast({ 
        title: "Required toppings", 
        description: `Please select ${missingRequiredToppings.map(c => c.name).join(", ")}`, 
        variant: "destructive" 
      });
      return;
    }
    
    const itemPrice = calculateItemPrice();
    
    // Create cart item
    const cartItem: CartItem = {
      id: uuidv4(),
      menuItem: selectedItem,
      quantity,
      selectedOptions,
      selectedToppings,
      specialInstructions,
      itemPrice
    };
    
    // Add to cart
    setCart(prev => [...prev, cartItem]);
    setSelectedItem(null);
    
    // Show toast
    toast({ 
      title: "Added to cart", 
      description: `${selectedItem.name} added to your cart` 
    });
  };

  // Update item quantity in cart
  const handleUpdateQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      handleRemoveItem(itemId);
      return;
    }
    
    setCart(prevCart => 
      prevCart.map(item => {
        if (item.id === itemId) {
          const unitPrice = item.itemPrice / item.quantity;
          return {
            ...item,
            quantity: newQuantity,
            itemPrice: unitPrice * newQuantity
          };
        }
        return item;
      })
    );
  };

  // Remove item from cart
  const handleRemoveItem = (itemId: string) => {
    setCart(prevCart => prevCart.filter(item => item.id !== itemId));
  };

  // Clear the entire cart
  const handleClearCart = () => {
    setCart([]);
    setIsCartOpen(false);
  };

  // Check if a topping category should be shown
  const shouldShowToppingCategory = (category: any) => {
    if (!category.show_if_selection_type || !category.show_if_selection_id || 
        category.show_if_selection_type.length === 0 || category.show_if_selection_id.length === 0) {
      return true;
    }
    
    // Check if any of the selected options match the condition
    return selectedOptions.some(option => {
      const optionIndex = category.show_if_selection_type.indexOf("option");
      if (optionIndex >= 0 && category.show_if_selection_id[optionIndex] === option.optionId) {
        return true;
      }
      return false;
    });
  };

  // Format selected options for display
  const getFormattedOptions = (item: CartItem) => {
    if (!item.selectedOptions || item.selectedOptions.length === 0) return "";
    
    return item.selectedOptions.map(selectedOption => {
      const option = item.menuItem.options?.find(o => o.id === selectedOption.optionId);
      if (!option) return "";
      
      const choiceNames = selectedOption.choiceIds.map(choiceId => {
        const choice = option.choices.find(c => c.id === choiceId);
        return choice ? choice.name : "";
      }).filter(name => name);
      
      return `${option.name}: ${choiceNames.join(", ")}`;
    }).filter(text => text).join("; ");
  };

  // Format selected toppings for display
  const getFormattedToppings = (item: CartItem) => {
    if (!item.selectedToppings || item.selectedToppings.length === 0) return "";
    
    return item.selectedToppings.map(selectedTopping => {
      const category = item.menuItem.toppingCategories?.find(tc => tc.id === selectedTopping.categoryId);
      if (!category) return "";
      
      const toppingNames = selectedTopping.toppingIds.map(toppingId => {
        const topping = category.toppings.find(t => t.id === toppingId);
        return topping ? topping.name : "";
      }).filter(name => name);
      
      return `${category.name}: ${toppingNames.join(", ")}`;
    }).filter(text => text).join("; ");
  };

  // Calculate cart subtotal
  const calculateSubtotal = () => {
    return cart.reduce((total, item) => total + item.itemPrice, 0);
  };

  // Calculate cart tax
  const calculateTax = () => {
    return cart.reduce((total, item) => {
      const taxPercentage = item.menuItem.tax_percentage || 10;
      const itemTax = (item.itemPrice * taxPercentage) / 100;
      return total + itemTax;
    }, 0);
  };

  // Handle place order
  const handlePlaceOrder = () => {
    if (!user) {
      // If user is not logged in, show auth modal
      setShowAuthModal(true);
      return;
    }
    
    // Show checkout modal
    setShowCheckoutModal(true);
  };

  // Handle successful checkout
  const handleCheckoutSuccess = () => {
    setPlacingOrder(false);
    setOrderPlaced(true);
    setShowCheckoutModal(false);
    
    // Clear cart after short delay
    setTimeout(() => {
      handleClearCart();
      setOrderPlaced(false);
      
      toast({
        title: "Order placed successfully",
        description: "Thank you for your order!"
      });
    }, 2000);
  };

  // Handle successful authentication
  const handleAuthSuccess = () => {
    setShowAuthModal(false);
    toast({
      title: "Authentication successful",
      description: "You can now place your order."
    });
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Restaurant banner */}
      <div 
        className="w-full h-[30vh] bg-cover bg-center relative"
        style={{ 
          backgroundImage: restaurant?.image_url ? `url(${restaurant.image_url})` : 'none',
          backgroundColor: restaurant?.image_url ? undefined : '#f0f0f0'
        }}
      >
        <div className="absolute inset-0 bg-black bg-opacity-50 flex flex-col items-center justify-center text-white p-4">
          <h1 className="text-4xl md:text-5xl font-bold mb-2">{restaurant?.name}</h1>
          {restaurant?.location && (
            <p className="text-xl opacity-90">{restaurant.location}</p>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col md:flex-row flex-1 container mx-auto py-6 px-4">
        {/* Categories sidebar */}
        <div className="md:w-1/4 mb-4 md:mb-0 md:pr-4">
          <h2 className="text-2xl font-bold mb-4">Menu Categories</h2>
          {!loading && categories.length > 0 && (
            <div className="md:sticky md:top-20">
              <MenuCategoryList 
                categories={categories} 
                activeCategory={activeCategory} 
                setActiveCategory={setActiveCategory} 
              />
            </div>
          )}
        </div>

        {/* Menu items grid */}
        <div className="md:w-3/4 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 300px)' }}>
          {!loading && (
            <MenuItemGrid 
              items={menuItems} 
              handleSelectItem={handleSelectItem} 
              currencySymbol={currencySymbol} 
              t={t} 
              restaurantId={restaurant?.id} 
              refreshTrigger={refreshTrigger}
              categories={categories}
              activeCategory={activeCategory || undefined}
            />
          )}
        </div>
      </div>

      {/* Floating cart button */}
      {cart.length > 0 && !isCartOpen && (
        <div className="fixed bottom-4 right-4 md:bottom-8 md:right-8">
          <Button 
            onClick={() => setIsCartOpen(true)}
            size="lg" 
            className="rounded-full p-6 shadow-lg"
          >
            <ShoppingCart className="h-6 w-6 mr-2" />
            <span className="font-bold">{cart.length}</span>
          </Button>
        </div>
      )}

      {/* Item customization dialog */}
      <ItemCustomizationDialog 
        item={selectedItem}
        isOpen={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        onAddToCart={handleAddToCart}
        selectedOptions={selectedOptions}
        selectedToppings={selectedToppings}
        onToggleChoice={handleToggleChoice}
        onToggleTopping={handleToggleTopping}
        quantity={quantity}
        onQuantityChange={setQuantity}
        specialInstructions={specialInstructions}
        onSpecialInstructionsChange={setSpecialInstructions}
        shouldShowToppingCategory={shouldShowToppingCategory}
        t={t}
        currencySymbol={currencySymbol}
      />

      {/* Cart dialog */}
      <Cart
        cart={cart}
        isOpen={isCartOpen}
        onToggleOpen={() => setIsCartOpen(!isCartOpen)}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onClearCart={handleClearCart}
        onPlaceOrder={handlePlaceOrder}
        placingOrder={placingOrder}
        orderPlaced={orderPlaced}
        calculateSubtotal={calculateSubtotal}
        calculateTax={calculateTax}
        getFormattedOptions={getFormattedOptions}
        getFormattedToppings={getFormattedToppings}
        restaurant={restaurant}
        uiLanguage={restaurant?.ui_language as any}
        t={t}
      />

      {/* Authentication Modal */}
      <LoginRegistrationModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={handleAuthSuccess}
      />

      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={showCheckoutModal}
        onClose={() => setShowCheckoutModal(false)}
        onSuccess={handleCheckoutSuccess}
        cart={cart}
        restaurant={restaurant}
        userAddresses={userAddresses}
        user={user}
        setPlacingOrder={setPlacingOrder}
        calculateSubtotal={calculateSubtotal}
        calculateTax={calculateTax}
        currencySymbol={currencySymbol}
      />
    </div>
  );
}
