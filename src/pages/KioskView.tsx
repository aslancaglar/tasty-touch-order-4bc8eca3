import { useEffect, useState } from "react";
import { useLocalCache } from "@/hooks/useLocalCache";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronRight, Clock, MinusCircle, PlusCircle, ShoppingCart, Trash2, Check, Loader2, ChevronLeft, Plus, ArrowRight, Minus, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { getIconComponent } from "@/utils/icon-mapping";
import { supabase } from "@/integrations/supabase/client";
import { getRestaurantBySlug, getMenuForRestaurant, getMenuItemWithOptions, createOrder, createOrderItems, createOrderItemOptions, createOrderItemToppings } from "@/services/kiosk-service";
import { Restaurant, MenuCategory, MenuItem, OrderItem, CartItem, MenuItemWithOptions, ToppingCategory, Topping } from "@/types/database-types";
import WelcomePage from "@/components/kiosk/WelcomePage";
import OrderTypeSelection, { OrderType } from "@/components/kiosk/OrderTypeSelection";
import Cart from "@/components/kiosk/Cart";
import CartButton from "@/components/kiosk/CartButton";
import OrderReceipt from "@/components/kiosk/OrderReceipt";
import { UtensilsCrossed } from "lucide-react";

type CategoryWithItems = MenuCategory & {
  items: MenuItem[];
};

type SelectedToppingCategory = {
  categoryId: string;
  toppingIds: string[];
};

const KioskView = () => {
  const {
    restaurantSlug
  } = useParams<{
    restaurantSlug: string;
  }>();
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
  const {
    toast
  } = useToast();
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
  const { setCache, getCache } = useLocalCache();

  useEffect(() => {
    const fetchRestaurantAndMenu = async () => {
      if (!restaurantSlug) {
        navigate('/');
        return;
      }

      try {
        setLoading(true);
        
        // Try to get restaurant data from cache
        const cachedRestaurant = getCache<Restaurant>(`restaurant-${restaurantSlug}`);
        const cachedMenu = getCache<CategoryWithItems[]>(`menu-${restaurantSlug}`);

        if (cachedRestaurant && cachedMenu) {
          console.log("Using cached data");
          setRestaurant(cachedRestaurant);
          setCategories(cachedMenu);
          if (cachedMenu.length > 0) {
            setActiveCategory(cachedMenu[0].id);
          }
          const lang = cachedRestaurant.ui_language === "en" ? "en" : 
                      cachedRestaurant.ui_language === "tr" ? "tr" : "fr";
          setUiLanguage(lang);
          setLoading(false);
          return;
        }

        // If no cache, fetch from API
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

        const menuData = await getMenuForRestaurant(restaurantData.id);
        
        // Cache the fetched data
        setCache(`restaurant-${restaurantSlug}`, restaurantData);
        setCache(`menu-${restaurantSlug}`, menuData);
        
        setRestaurant(restaurantData);
        setCategories(menuData);
        if (menuData.length > 0) {
          setActiveCategory(menuData[0].id);
        }
        const lang = restaurantData.ui_language === "en" ? "en" : 
                    restaurantData.ui_language === "tr" ? "tr" : "fr";
        setUiLanguage(lang);
        setLoading(false);
      } catch (error) {
        console.error("Erreur lors du chargement du restaurant et du menu:", error);
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

  // ... keep existing code (rest of the component)
};

export default KioskView;
