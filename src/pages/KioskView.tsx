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
          }
        } else {
          const menuData = await getMenuForRestaurant(restaurantData.id);
          setCategories(menuData);
          if (menuData.length > 0) {
            setActiveCategory(menuData[0].id);
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

  // ... rest of the component code remains unchanged

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
              currencySymbol={getCurrencySymbol(restaurant.currency || "EUR")}
              t={t}
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
          currency={restaurant.currency} 
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
