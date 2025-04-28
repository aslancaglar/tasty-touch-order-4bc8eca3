
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { 
  getRestaurantBySlug, 
  getMenuForRestaurant, 
  getMenuItemWithOptions,
  createOrder,
  createOrderItems,
  createOrderItemOptions,
  createOrderItemToppings
} from "@/services/kiosk-service";
import { Restaurant, MenuCategory, MenuItem, CartItem, MenuItemWithOptions, OrderType } from "@/types/database-types";
import { supabase } from "@/integrations/supabase/client";
import WelcomePage from "@/components/kiosk/WelcomePage";
import OrderTypeSelection from "@/components/kiosk/OrderTypeSelection";
import Cart from "@/components/kiosk/Cart";
import CartButton from "@/components/kiosk/CartButton";
import KioskHeader from "@/components/kiosk/KioskHeader";
import MenuCategoryList from "@/components/kiosk/MenuCategoryList";
import MenuItemGrid from "@/components/kiosk/MenuItemGrid";
import ItemCustomizationDialog from "@/components/kiosk/ItemCustomizationDialog";
import { cacheKeys, getCache, setCache } from "@/utils/cache-utils";
import { calculateCartTotals } from "@/utils/price-utils";

type CategoryWithItems = MenuCategory & {
  items: MenuItem[];
};

type SelectedToppingCategory = {
  categoryId: string;
  toppingIds: string[];
};

const KioskView = () => {
  const { restaurantSlug } = useParams<{ restaurantSlug: string }>();
  const navigate = useNavigate();
  const [showWelcome, setShowWelcome] = useState(true);
  const [showOrderTypeSelection, setShowOrderTypeSelection] = useState(false);
  const [orderType, setOrderType] = useState<OrderType>(null);
  const [tableNumber, setTableNumber] = useState<string | null>(null);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [categories, setCategories] = useState<CategoryWithItems[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<MenuItemWithOptions | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<{
    optionId: string;
    choiceIds: string[];
  }[]>([]);
  const [selectedToppings, setSelectedToppings] = useState<SelectedToppingCategory[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [placingOrder, setPlacingOrder] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [uiLanguage, setUiLanguage] = useState<"fr" | "en" | "tr">("fr");
  const [activeItems, setActiveItems] = useState<MenuItem[]>([]);
  
  const { toast } = useToast();
  
  const CURRENCY_SYMBOLS: Record<string, string> = {
    EUR: "€",
    USD: "$",
    GBP: "£",
    TRY: "₺",
    JPY: "¥",
    CAD: "$",
    AUD: "$",
    CHF: "Fr.",
    CNY: "¥",
    RUB: "₽"
  };
  
  const getCurrencySymbol = (currency: string) => {
    const code = currency?.toUpperCase() || "EUR";
    return CURRENCY_SYMBOLS[code] || code;
  };
  
  const translations = {
    fr: {
      restaurantNotFound: "Restaurant introuvable",
      sorryNotFound: "Désolé, nous n'avons pas pu trouver ce restaurant.",
      backToHome: "Retour à l'accueil",
      open: "Ouvert maintenant",
      dineIn: "Sur Place",
      table: "Table",
      takeaway: "À Emporter",
      menu: "Menu",
      addToCart: "Ajouter au panier",
      selectionsRequired: "Sélections requises",
      pleaseSelectRequired: "Veuillez faire toutes les sélections requises avant d'ajouter au panier",
      addedToCart: "Ajouté au panier",
      added: "ajouté à votre commande",
      quantity: "Quantité",
      multipleSelection: "Sélection multiple",
      selectUpTo: "Sélectionnez jusqu'à",
      maxSelectionsReached: "Nombre maximum de sélections atteint",
      maxSelectionsMessage: "Vous ne pouvez sélectionner que {max} éléments dans cette catégorie."
    },
    en: {
      restaurantNotFound: "Restaurant not found",
      sorryNotFound: "Sorry, we couldn't find this restaurant.",
      backToHome: "Back to home",
      open: "Now open",
      dineIn: "Dine In",
      table: "Table",
      takeaway: "Takeaway",
      menu: "Menu",
      addToCart: "Add to cart",
      selectionsRequired: "Selections required",
      pleaseSelectRequired: "Please make all required selections before adding to cart",
      addedToCart: "Added to cart",
      added: "added to your order",
      quantity: "Quantity",
      multipleSelection: "Multiple selection",
      selectUpTo: "Select up to",
      maxSelectionsReached: "Maximum selections reached",
      maxSelectionsMessage: "You can only select {max} items in this category."
    },
    tr: {
      restaurantNotFound: "Restoran bulunamadı",
      sorryNotFound: "Üzgünüz, bu restoranı bulamadık.",
      backToHome: "Ana sayfaya dön",
      open: "Şimdi açık",
      dineIn: "Yerinde Yeme",
      table: "Masa",
      takeaway: "Paket Servis",
      menu: "Menü",
      addToCart: "Sepete ekle",
      selectionsRequired: "Gerekli seçimler",
      pleaseSelectRequired: "Sepete eklemeden önce lütfen tüm gerekli seçimleri yapın",
      addedToCart: "Sepete eklendi",
      added: "siparişinize eklendi",
      quantity: "Miktar",
      multipleSelection: "Çoklu seçim",
      selectUpTo: "En fazla seçin",
      maxSelectionsReached: "Maksimum seçimlere ulaşıldı",
      maxSelectionsMessage: "Bu kategoride sadece {max} öğe seçebilirsiniz."
    }
  };
  
  const t = (key: keyof typeof translations.en) => {
    return translations[uiLanguage][key];
  };

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
            title: t("restaurantNotFound"),
            description: t("sorryNotFound"),
            variant: "destructive"
          });
          navigate('/');
          return;
        }
        
        setRestaurant(restaurantData);
        
        // Try to get cached menu data
        const cachedMenu = getCache<CategoryWithItems[]>(cacheKeys.categories(restaurantData.id));
        if (cachedMenu) {
          setCategories(cachedMenu);
          if (cachedMenu.length > 0) {
            setActiveCategory(cachedMenu[0].id);
            setActiveItems(cachedMenu[0].items);
          }
        } else {
          const menuData = await getMenuForRestaurant(restaurantData.id);
          setCategories(menuData);
          if (menuData.length > 0) {
            setActiveCategory(menuData[0].id);
            setActiveItems(menuData[0].items);
          }
          // Cache the menu data
          setCache(cacheKeys.categories(restaurantData.id), menuData);
        }
        
        const lang = restaurantData.ui_language === "en" ? "en" : restaurantData.ui_language === "tr" ? "tr" : "fr";
        setUiLanguage(lang);
        
        setLoading(false);
      } catch (error) {
        console.error("Error loading restaurant and menu:", error);
        toast({
          title: t("restaurantNotFound"),
          description: t("sorryNotFound"),
          variant: "destructive"
        });
        setLoading(false);
      }
    };
    
    fetchRestaurantAndMenu();
  }, [restaurantSlug, navigate, toast]);

  // Update active items when active category changes
  useEffect(() => {
    if (activeCategory) {
      const activeCategory_data = categories.find(c => c.id === activeCategory);
      if (activeCategory_data) {
        setActiveItems(activeCategory_data.items);
      }
    }
  }, [activeCategory, categories]);

  // Cart related functions
  const cartItemCount = cart.reduce((total, item) => total + item.quantity, 0);
  const cartIsEmpty = cartItemCount === 0;
  
  const toggleCart = () => {
    setIsCartOpen(!isCartOpen);
  };
  
  const calculateCartTotal = () => {
    return cart.reduce((total, item) => total + (item.itemPrice * item.quantity), 0);
  };

  const calculateSubtotal = () => {
    const { subtotal } = calculateCartTotals(cart);
    return subtotal;
  };
  
  const calculateTax = () => {
    const { tax } = calculateCartTotals(cart);
    return tax;
  };
  
  const handleUpdateCartItemQuantity = (itemId: string, quantity: number) => {
    if (quantity < 1) {
      handleRemoveCartItem(itemId);
      return;
    }
    
    setCart(prevCart => {
      return prevCart.map(item => {
        if (item.id === itemId) {
          return { ...item, quantity };
        }
        return item;
      });
    });
  };
  
  const handleRemoveCartItem = (itemId: string) => {
    setCart(prevCart => prevCart.filter(item => item.id !== itemId));
  };
  
  const handlePlaceOrder = async () => {
    // Order placement logic would go here
    setPlacingOrder(true);
    
    // Simulate order placement
    setTimeout(() => {
      setPlacingOrder(false);
      setOrderPlaced(true);
      
      // Clear cart and reset after some delay
      setTimeout(() => {
        setCart([]);
        setIsCartOpen(false);
        setOrderPlaced(false);
      }, 2000);
    }, 1500);
  };
  
  // Item customization functions
  const handleSelectItem = async (item: MenuItem) => {
    try {
      const itemWithOptions = await getMenuItemWithOptions(item.id);
      setSelectedItem(itemWithOptions);
      setQuantity(1);
      setSelectedOptions([]);
      setSelectedToppings([]);
      setSpecialInstructions("");
    } catch (error) {
      console.error("Error loading item details:", error);
      toast({
        title: "Error",
        description: "Failed to load item details",
        variant: "destructive"
      });
    }
  };
  
  const handleToggleChoice = (optionId: string, choiceId: string, multiple: boolean) => {
    setSelectedOptions(prev => {
      // Find if we already have this option
      const existingOption = prev.find(o => o.optionId === optionId);
      
      if (!existingOption) {
        // Option doesn't exist yet, create it
        return [...prev, { optionId, choiceIds: [choiceId] }];
      }
      
      // Option exists
      if (multiple) {
        // For multiple selection
        const hasChoice = existingOption.choiceIds.includes(choiceId);
        
        if (hasChoice) {
          // Remove the choice
          const updatedChoices = existingOption.choiceIds.filter(id => id !== choiceId);
          if (updatedChoices.length === 0) {
            // No choices left, remove the option
            return prev.filter(o => o.optionId !== optionId);
          }
          return prev.map(o => o.optionId === optionId ? { ...o, choiceIds: updatedChoices } : o);
        } else {
          // Add the choice
          return prev.map(o => o.optionId === optionId ? { ...o, choiceIds: [...o.choiceIds, choiceId] } : o);
        }
      } else {
        // For single selection, replace the existing choice
        return prev.map(o => o.optionId === optionId ? { ...o, choiceIds: [choiceId] } : o);
      }
    });
  };
  
  const handleToggleTopping = (categoryId: string, toppingId: string) => {
    setSelectedToppings(prev => {
      // Find if we already have this category
      const existingCategory = prev.find(c => c.categoryId === categoryId);
      
      if (!existingCategory) {
        // Category doesn't exist yet, create it
        return [...prev, { categoryId, toppingIds: [toppingId] }];
      }
      
      // Category exists, check if topping is selected
      const hasToppingSelected = existingCategory.toppingIds.includes(toppingId);
      
      if (hasToppingSelected) {
        // Remove the topping
        const updatedToppings = existingCategory.toppingIds.filter(id => id !== toppingId);
        if (updatedToppings.length === 0) {
          // No toppings left in category, remove the category
          return prev.filter(c => c.categoryId !== categoryId);
        }
        return prev.map(c => c.categoryId === categoryId ? { ...c, toppingIds: updatedToppings } : c);
      } else {
        // Add the topping
        return prev.map(c => c.categoryId === categoryId ? { ...c, toppingIds: [...c.toppingIds, toppingId] } : c);
      }
    });
  };
  
  const shouldShowToppingCategory = (category: any) => {
    // Logic to determine if a topping category should be shown based on selections
    if (!category.show_if_selection_type || !category.show_if_selection_id) return true;
    
    // Check if any of the required selections are made
    for (let i = 0; i < category.show_if_selection_type.length; i++) {
      const type = category.show_if_selection_type[i];
      const id = category.show_if_selection_id[i];
      
      if (type === 'option') {
        // Check if option is selected
        const optionSelected = selectedOptions.some(o => 
          o.optionId === id || o.choiceIds.includes(id)
        );
        if (optionSelected) return true;
      } else if (type === 'topping') {
        // Check if topping is selected
        const toppingSelected = selectedToppings.some(t => 
          t.categoryId === id || t.toppingIds.includes(id)
        );
        if (toppingSelected) return true;
      }
    }
    
    return false;
  };
  
  const calculateItemPrice = (item: MenuItemWithOptions | null) => {
    if (!item) return 0;
    
    let basePrice = parseFloat(item.price.toString());
    
    // Add option choice prices
    selectedOptions.forEach(selectedOption => {
      const option = item.options?.find(opt => opt.id === selectedOption.optionId);
      if (option) {
        selectedOption.choiceIds.forEach(choiceId => {
          const choice = option.choices.find(c => c.id === choiceId);
          if (choice && choice.price) {
            basePrice += parseFloat(choice.price.toString());
          }
        });
      }
    });
    
    // Add topping prices
    selectedToppings.forEach(selectedCategory => {
      const category = item.toppingCategories?.find(cat => cat.id === selectedCategory.categoryId);
      if (category) {
        selectedCategory.toppingIds.forEach(toppingId => {
          const topping = category.toppings.find(t => t.id === toppingId);
          if (topping) {
            basePrice += parseFloat(topping.price.toString());
          }
        });
      }
    });
    
    return basePrice * quantity;
  };
  
  const handleAddToCart = () => {
    if (!selectedItem) return;
    
    // Check if all required options are selected
    const requiredOptions = selectedItem.options?.filter(option => option.required);
    const allRequiredSelected = requiredOptions?.every(option => 
      selectedOptions.some(selected => selected.optionId === option.id)
    ) ?? true;
    
    if (!allRequiredSelected) {
      toast({
        title: t("selectionsRequired"),
        description: t("pleaseSelectRequired"),
        variant: "destructive"
      });
      return;
    }
    
    // Create cart item
    const newCartItem: CartItem = {
      id: crypto.randomUUID(),
      menuItem: selectedItem,
      quantity: quantity,
      selectedOptions: selectedOptions,
      selectedToppings: selectedToppings,
      specialInstructions: specialInstructions,
      itemPrice: calculateItemPrice(selectedItem) / quantity, // Per item price
    };
    
    // Add to cart
    setCart(prevCart => [...prevCart, newCartItem]);
    
    // Close dialog and show confirmation
    setSelectedItem(null);
    toast({
      title: t("addedToCart"),
      description: `${selectedItem.name} ${t("added")}`,
    });
  };
  
  const getFormattedOptions = (item: CartItem): string => {
    if (!item.selectedOptions || item.selectedOptions.length === 0) return "";
    
    return item.selectedOptions
      .map(selectedOption => {
        const option = item.menuItem.options?.find(o => o.id === selectedOption.optionId);
        if (!option) return "";
        
        const choiceNames = selectedOption.choiceIds.map(choiceId => {
          const choice = option.choices.find(c => c.id === choiceId);
          return choice ? choice.name : "";
        }).filter(Boolean);
        
        return choiceNames.join(', ');
      })
      .filter(Boolean)
      .join(', ');
  };
  
  const getFormattedToppings = (item: CartItem): string => {
    if (!item.selectedToppings || item.selectedToppings.length === 0) return "";
    
    return item.selectedToppings
      .map(selectedCategory => {
        const category = item.menuItem.toppingCategories?.find(c => c.id === selectedCategory.categoryId);
        if (!category) return "";
        
        const toppingNames = selectedCategory.toppingIds.map(toppingId => {
          const topping = category.toppings.find(t => t.id === toppingId);
          return topping ? topping.name : "";
        }).filter(Boolean);
        
        return `${category.name}: ${toppingNames.join(', ')}`;
      })
      .filter(Boolean)
      .join('; ');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <KioskHeader 
        restaurant={restaurant}
        orderType={orderType}
        tableNumber={tableNumber}
        t={t}
      />

      <div className="flex flex-1 overflow-hidden">
        <div className="w-64 bg-white border-r border-gray-200 overflow-y-auto">
          <MenuCategoryList 
            categories={categories}
            activeCategory={activeCategory}
            setActiveCategory={setActiveCategory}
            restaurantId={restaurant?.id || ""}
          />
        </div>

        <div className="flex-1 overflow-y-auto pb-24">
          <div className="p-6">
            <h2 className="text-xl font-bold mb-4">
              {categories.find(c => c.id === activeCategory)?.name || t("menu")}
            </h2>
            
            <MenuItemGrid 
              items={activeItems}
              handleSelectItem={handleSelectItem}
              currencySymbol={getCurrencySymbol(restaurant?.currency || "EUR")}
              t={t}
              restaurantId={restaurant?.id || ""}
            />
          </div>
        </div>
      </div>

      {!isCartOpen && !cartIsEmpty && (
        <CartButton 
          itemCount={cartItemCount} 
          total={calculateCartTotal()} 
          onClick={toggleCart} 
          uiLanguage={uiLanguage} 
          currency={restaurant?.currency} 
        />
      )}

      <Cart 
        cart={cart} 
        isOpen={isCartOpen} 
        onToggleOpen={toggleCart} 
        onUpdateQuantity={handleUpdateCartItemQuantity} 
        onRemoveItem={handleRemoveCartItem} 
        onClearCart={() => setCart([])} 
        onPlaceOrder={handlePlaceOrder} 
        placingOrder={placingOrder} 
        orderPlaced={orderPlaced} 
        calculateSubtotal={calculateSubtotal} 
        calculateTax={calculateTax} 
        getFormattedOptions={getFormattedOptions} 
        getFormattedToppings={getFormattedToppings} 
        restaurant={restaurant} 
        orderType={orderType} 
        tableNumber={tableNumber} 
        showOrderSummaryOnly={false} 
        uiLanguage={uiLanguage} 
      />

      <ItemCustomizationDialog 
        selectedItem={selectedItem}
        setSelectedItem={setSelectedItem}
        quantity={quantity}
        setQuantity={setQuantity}
        specialInstructions={specialInstructions}
        setSpecialInstructions={setSpecialInstructions}
        selectedOptions={selectedOptions}
        selectedToppings={selectedToppings}
        handleToggleChoice={handleToggleChoice}
        handleToggleTopping={handleToggleTopping}
        handleAddToCart={handleAddToCart}
        calculateItemPrice={calculateItemPrice}
        getCurrencySymbol={getCurrencySymbol}
        restaurant={restaurant}
        t={t}
        shouldShowToppingCategory={shouldShowToppingCategory}
      />
    </div>
  );
};

export default KioskView;
