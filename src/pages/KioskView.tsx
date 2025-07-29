import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { getRestaurantBySlug, getMenuForRestaurant, getMenuItemWithOptions, createOrder, createOrderItems, createOrderItemOptions, createOrderItemToppings } from "@/services/kiosk-service";
import { Restaurant, MenuCategory, MenuItem, CartItem, MenuItemWithOptions, OrderType, Topping } from "@/types/database-types";
import { supabase } from "@/integrations/supabase/client";
import WelcomePage from "@/components/kiosk/WelcomePage";
import OrderTypeSelection from "@/components/kiosk/OrderTypeSelection";
import Cart from "@/components/kiosk/Cart";
import CartButton from "@/components/kiosk/CartButton";
import KioskHeader from "@/components/kiosk/KioskHeader";
import MenuCategoryList from "@/components/kiosk/MenuCategoryList";
import MenuItemGrid from "@/components/kiosk/MenuItemGrid";
import ItemCustomizationDialog from "@/components/kiosk/ItemCustomizationDialog";
import NetworkErrorBoundary from "@/components/error/NetworkErrorBoundary";
import { setCacheItem, getCacheItem, clearMenuCache, forceFlushMenuCache, isCacheNeedsRefresh } from "@/services/cache-service";
import { useInactivityTimer } from "@/hooks/useInactivityTimer";
import InactivityDialog from "@/components/kiosk/InactivityDialog";
import OrderConfirmationDialog from "@/components/kiosk/OrderConfirmationDialog";
import { preloadAllRestaurantData, PreloaderState } from "@/utils/data-preloader";
import PreloadingScreen from "@/components/kiosk/PreloadingScreen";
import { useConnectionStatus, useNetworkAwareFetch } from "@/hooks/use-network-aware-fetch";
import { getTranslation, SupportedLanguage, getTranslatedField } from "@/utils/language-utils";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { LanguageSync } from "@/components/kiosk/LanguageSync";
import { testNetworkConnectivity } from "@/utils/service-worker";

type CategoryWithItems = MenuCategory & {
  items: MenuItem[];
};
type SelectedToppingCategory = {
  categoryId: string;
  toppingIds: string[];
  toppingQuantities?: { [toppingId: string]: number }; // Added toppingQuantities map
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
  const [uiLanguage, setUiLanguage] = useState<SupportedLanguage>("fr");
  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  const [toppings, setToppings] = useState<Topping[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showConfirmationDialog, setShowConfirmationDialog] = useState(false);
  const [confirmedOrderNumber, setConfirmedOrderNumber] = useState<string>("0");
  const cartRef = useRef<HTMLDivElement | null>(null);
  const {
    toast
  } = useToast();

  // Add new states for enhanced error handling
  const [isPreloading, setIsPreloading] = useState(false);
  const [preloadState, setPreloadState] = useState<PreloaderState>({
    isLoading: false,
    progress: 0,
    stage: 'idle',
    error: null
  });
  const [dataPreloaded, setDataPreloaded] = useState(false);
  const [networkHealthy, setNetworkHealthy] = useState(true);

  // Get connection status for offline awareness
  const connectionStatus = useConnectionStatus();

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

  const t = (key: string): string => {
    return getTranslation(key, uiLanguage as SupportedLanguage);
  };

  // Enhanced connectivity monitoring
  useEffect(() => {
    const checkConnectivity = async () => {
      const isHealthy = await testNetworkConnectivity();
      setNetworkHealthy(isHealthy);
      
      if (!isHealthy && connectionStatus === 'online') {
        console.warn('[KioskView] Network appears unhealthy despite being online');
        toast({
          title: "Connexion limitée",
          description: "La connexion semble instable. Mode cache activé.",
          variant: "destructive"
        });
      }
    };

    // Check connectivity periodically
    const interval = setInterval(checkConnectivity, 30000); // Every 30 seconds
    checkConnectivity(); // Initial check

    return () => clearInterval(interval);
  }, [connectionStatus, toast]);

  // Show offline status when connection changes
  useEffect(() => {
    if (connectionStatus === 'offline' && restaurant) {
      toast({
        title: "Mode hors ligne",
        description: "Utilisation des données en cache. Certaines fonctions peuvent être limitées.",
        variant: "destructive"
      });
    } else if (connectionStatus === 'online' && restaurant && !networkHealthy) {
      toast({
        title: "Reconnexion en cours",
        description: "Synchronisation des données...",
      });
    }
  }, [connectionStatus, restaurant, networkHealthy, toast]);

  // Modify resetToWelcome to keep preloaded data and reset language
  const resetToWelcome = () => {
    console.log("Resetting to welcome page - cleaning up all state");
    setShowWelcome(true);
    setShowOrderTypeSelection(false);
    setCart([]);
    setIsCartOpen(false);
    setSelectedItem(null);
    setSelectedOptions([]);
    setSelectedToppings([]);
    setQuantity(1);
    setSpecialInstructions("");
    setOrderType(null);
    setTableNumber(null);
    setOrderPlaced(false); 
    setPlacingOrder(false);
    // Reset language to restaurant default
    if (restaurant) {
      const defaultLang: SupportedLanguage = restaurant.ui_language === "en" ? "en" : restaurant.ui_language === "tr" ? "tr" : "fr";
      setUiLanguage(defaultLang);
    }
    if (categories.length > 0) {
      setActiveCategory(categories[0].id);
    }
  };

  const {
    showDialog,
    handleContinue,
    handleCancel,
    fullReset
  } = useInactivityTimer(resetToWelcome);
  const handleConfirmationClose = () => {
    // Reset the kiosk to the welcome page after order confirmation
    setShowConfirmationDialog(false);
    resetToWelcome();
  };

  // Enhanced data preloading with better error handling
  const preloadAllData = async (forceRefresh = false) => {
    if (!restaurantSlug) return;
    
    try {
      setIsPreloading(true);
      setPreloadState({
        isLoading: true,
        progress: 0,
        stage: 'idle',
        error: null
      });

      console.log(`[KioskView] Preloading data - Force refresh: ${forceRefresh}, Network: ${connectionStatus}`);

      const restaurant = await preloadAllRestaurantData(
        restaurantSlug,
        { forceRefresh: forceRefresh && connectionStatus === 'online' }, // Only force refresh if online
        (state) => setPreloadState(state)
      );

        if (restaurant) {
        setRestaurant(restaurant);
        const lang: SupportedLanguage = restaurant.ui_language === "en" ? "en" : restaurant.ui_language === "tr" ? "tr" : "fr";
        setUiLanguage(lang);
        
        // Get cached categories
        const menuCacheKey = `categories_${restaurant.id}`;
        const cachedCategories = getCacheItem<CategoryWithItems[]>(menuCacheKey, restaurant.id);
        
        if (cachedCategories && cachedCategories.length > 0) {
          setCategories(cachedCategories);
          if (cachedCategories.length > 0) {
            setActiveCategory(cachedCategories[0].id);
          }
          setLoading(false);
          setDataPreloaded(true);
          
          // Show cache notice if offline
          if (connectionStatus === 'offline') {
            toast({
              title: "Mode hors ligne",
              description: "Données en cache chargées. Fonctionnalités limitées.",
              variant: "destructive"
            });
          }
        } else {
          // No cached categories, need to load them if online
          if (connectionStatus === 'online') {
            await preloadAllData(false);
          } else {
            // Offline with no cache - show error
            throw new Error("Aucune donnée en cache disponible hors ligne");
          }
          setDataPreloaded(true);
        }
      }
      
      setLoading(false);
      setIsPreloading(false);
    } catch (error) {
      console.error("Error during preloading:", error);
      setLoading(false);
      setIsPreloading(false);
      
      // Enhanced error handling with cache fallback
      const cachedRestaurant = getCacheItem<Restaurant>(`restaurant_${restaurantSlug}`, 'global');
      if (cachedRestaurant) {
        setRestaurant(cachedRestaurant);
        
        // Get cached categories for this restaurant
        const menuCacheKey = `categories_${cachedRestaurant.id}`;
        const cachedCategories = getCacheItem<CategoryWithItems[]>(menuCacheKey, cachedRestaurant.id);
        
        if (cachedCategories && cachedCategories.length > 0) {
          setCategories(cachedCategories);
          if (cachedCategories.length > 0) {
            setActiveCategory(cachedCategories[0].id);
          }
          setDataPreloaded(true);
          
          toast({
            title: "Mode hors ligne",
            description: "Utilisation des données en cache. Fonctionnalités limitées.",
            variant: "destructive"
          });
        } else {
          throw error; // No cached data available
        }
      } else {
        // No cached data, show error
        toast({
          title: t("restaurantNotFound"),
          description: connectionStatus === 'offline' 
            ? "Aucune donnée en cache disponible hors ligne"
            : t("sorryNotFound"),
          variant: "destructive"
        });
        navigate('/');
      }
    }
  };

  // Enhanced initial data loading
  useEffect(() => {
    const fetchRestaurantAndMenu = async () => {
      if (!restaurantSlug) {
        navigate('/');
        return;
      }
      
      setLoading(true);
      
      // First check if we have a cached restaurant
      const cachedRestaurant = getCacheItem<Restaurant>(`restaurant_${restaurantSlug}`, 'global');
      
      if (cachedRestaurant) {
        console.log(`[KioskView] Found cached restaurant, loading immediately`);
        setRestaurant(cachedRestaurant);
        const lang: SupportedLanguage = cachedRestaurant.ui_language === "en" ? "en" : cachedRestaurant.ui_language === "tr" ? "tr" : "fr";
        setUiLanguage(lang);
        
        // Get cached categories
        const menuCacheKey = `categories_${cachedRestaurant.id}`;
        const cachedCategories = getCacheItem<CategoryWithItems[]>(menuCacheKey, cachedRestaurant.id);
        
        if (cachedCategories && cachedCategories.length > 0) {
          setCategories(cachedCategories);
          if (cachedCategories.length > 0) {
            setActiveCategory(cachedCategories[0].id);
          }
          setLoading(false);
          setDataPreloaded(true);
          
          // If we're online and data is stale, refresh in background
          if (connectionStatus === 'online' && isCacheNeedsRefresh(menuCacheKey, cachedRestaurant.id)) {
            console.log(`[KioskView] Cache is stale, refreshing in background`);
            preloadAllData(true);
          }
        } else {
          // No cached categories, need to load them
          await preloadAllData(connectionStatus === 'online');
          setDataPreloaded(true);
        }
      } else {
        // No cached restaurant, need to fetch everything
        console.log(`[KioskView] No cached restaurant, fetching fresh data`);
        await preloadAllData(true);
        setDataPreloaded(true);
      }
    };
    
    fetchRestaurantAndMenu();
  }, [restaurantSlug, navigate, connectionStatus]);

  useEffect(() => {
    if (showWelcome) {
      fullReset();
    }
  }, [showWelcome, fullReset]);

  // Modified handleStartOrder to avoid unnecessary data refresh
  const handleStartOrder = () => {
    fullReset();
    
    // Only refresh data if not already preloaded, we have stale data that's older than 5 minutes, and we're online
    if (!dataPreloaded && restaurant && connectionStatus === 'online') {
      const menuCacheKey = `categories_${restaurant.id}`;
      if (isCacheNeedsRefresh(menuCacheKey, restaurant.id)) {
        console.log("[KioskView] Cache needs refresh, loading fresh data in background");
        toast({
          title: t("refreshMenu"),
          description: "Refreshing menu data in the background...",
        });
        preloadAllData(true);
      } else {
        console.log("[KioskView] Cache is recent enough, using existing data");
      }
    } else {
      console.log("[KioskView] Data already preloaded, skipping refresh");
    }
    
    setShowWelcome(false);
    setShowOrderTypeSelection(true);
  };

  const handleOrderTypeSelected = (type: OrderType, table?: string) => {
    setOrderType(type);
    if (table) {
      setTableNumber(table);
    }
    setShowOrderTypeSelection(false);
  };

  // Add isCacheStale function
  const isCacheStale = (key: string, restaurantId: string): boolean => {
    const timestamp = getCacheTimestamp(key, restaurantId);
    if (!timestamp) return true;
    
    return Date.now() - timestamp > 24 * 60 * 60 * 1000; // 24 hours
  };

  // Add getCacheTimestamp function
  const getCacheTimestamp = (key: string, restaurantId: string): number | null => {
    const cacheKey = `kiosk_cache_${restaurantId}_${key}`;
    const cached = localStorage.getItem(cacheKey);
    
    if (!cached) return null;
    
    try {
      const cacheData = JSON.parse(cached);
      return cacheData.timestamp;
    } catch (e) {
      return null;
    }
  };

  const fetchToppingCategories = async (menuItemId: string) => {
    try {
      const {
        data: menuItemToppingCategories,
        error: toppingCategoriesError
      } = await supabase.from('menu_item_topping_categories').select('topping_category_id, display_order').eq('menu_item_id', menuItemId).order('display_order', {
        ascending: true
      });
      if (toppingCategoriesError) {
        console.error("Erreur lors du chargement des catégories de toppings:", toppingCategoriesError);
        return [];
      }
      if (!menuItemToppingCategories.length) {
        return [];
      }

      // Create a map of category ID to display order
      const displayOrderMap = menuItemToppingCategories.reduce((map, relation) => {
        map[relation.topping_category_id] = relation.display_order ?? 1000; // Default to high number if null
        return map;
      }, {} as Record<string, number>);
      const toppingCategoryIds = menuItemToppingCategories.map(mtc => mtc.topping_category_id);
      const {
        data: toppingCategories,
        error: categoriesError
      } = await supabase.from('topping_categories').select('*, name_fr, name_en, name_tr, description_fr, description_en, description_tr').in('id', toppingCategoryIds);
      if (categoriesError) {
        console.error("Erreur lors du chargement des détails des catégories de toppings:", categoriesError);
        return [];
      }
      const toppingCategoriesWithToppings = await Promise.all(toppingCategories.map(async category => {
        const {
          data: toppings,
          error: toppingsError
        } = await supabase.from('toppings').select('*, name_fr, name_en, name_tr').eq('category_id', category.id).eq('in_stock', true).order('display_order', {
          ascending: true
        }); // Order toppings by display_order

        if (toppingsError) {
          console.error(`Erreur lors du chargement des ingrédients pour la catégorie ${category.id}:`, toppingsError);
          return {
            id: category.id,
            name: category.name,
            min_selections: category.min_selections || 0,
            max_selections: category.max_selections || 0,
            required: category.min_selections ? category.min_selections > 0 : false,
            display_order: displayOrderMap[category.id],
            // Use display_order from relation
            toppings: [],
            show_if_selection_id: category.show_if_selection_id,
            show_if_selection_type: category.show_if_selection_type,
            allow_multiple_same_topping: category.allow_multiple_same_topping || false // Include allow_multiple_same_topping property
          };
        }
        return {
          id: category.id,
          name: category.name,
          min_selections: category.min_selections || 0,
          max_selections: category.max_selections || 0,
          required: category.min_selections ? category.min_selections > 0 : false,
          display_order: displayOrderMap[category.id],
          // Use display_order from relation
          toppings: toppings.map(topping => ({
            id: topping.id,
            name: topping.name,
            price: topping.price,
            tax_percentage: topping.tax_percentage || 0,
            display_order: topping.display_order
          })),
          show_if_selection_id: category.show_if_selection_id,
          show_if_selection_type: category.show_if_selection_type,
          allow_multiple_same_topping: category.allow_multiple_same_topping || false // Include allow_multiple_same_topping property
        };
      }));

      // Sort by display_order
      const sortedCategories = toppingCategoriesWithToppings.filter(category => category.toppings.length > 0).sort((a, b) => {
        const orderA = a.display_order ?? 1000;
        const orderB = b.display_order ?? 1000;
        return orderA - orderB;
      });
      return sortedCategories;
    } catch (error) {
      console.error("Erreur lors de la récupération des catégories de toppings:", error);
      return [];
    }
  };
  const handleSelectItem = async (item: MenuItem) => {
    try {
      setLoading(true);
      const itemWithOptions = await getMenuItemWithOptions(item.id);
      if (!itemWithOptions) {
        toast({
          title: "Erreur",
          description: "Impossible de charger les détails de l'article. Veuillez réessayer.",
          variant: "destructive"
        });
        return;
      }
      const toppingCategories = await fetchToppingCategories(item.id);

      // Always show customization dialog, removing the direct add-to-cart path for items without options/toppings
      const itemWithToppings: MenuItemWithOptions = {
        ...(itemWithOptions as MenuItemWithOptions),
        toppingCategories: toppingCategories || []
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
      if (toppingCategories && toppingCategories.length > 0) {
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
      console.error("Erreur lors du chargement des détails de l'article:", error);
      toast({
        title: "Erreur",
        description: "Un problème est survenu lors du chargement des détails de l'article. Veuillez réessayer.",
        variant: "destructive"
      });
      setLoading(false);
    }
  };
  const handleToggleChoice = (optionId: string, choiceId: string, multiple: boolean) => {
    setSelectedOptions(prev => {
      const optionIndex = prev.findIndex(o => o.optionId === optionId);
      if (optionIndex === -1) {
        return [...prev, {
          optionId,
          choiceIds: [choiceId]
        }];
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
      newOptions[optionIndex] = {
        ...option,
        choiceIds: newChoiceIds
      };
      return newOptions;
    });
  };
  const handleToggleTopping = (categoryId: string, toppingId: string, quantity?: number) => {
    console.log(`Toggle topping: ${toppingId} in category ${categoryId} with quantity: ${quantity}`);
    setSelectedToppings(prev => {
      const categoryIndex = prev.findIndex(t => t.categoryId === categoryId);
      if (categoryIndex === -1) {
        // If category doesn't exist yet in selection
        if (quantity && quantity > 0) {
          // If quantity is provided and positive, add with quantity
          return [...prev, {
            categoryId,
            toppingIds: [toppingId],
            toppingQuantities: { [toppingId]: quantity }
          }];
        } else if (quantity === 0) {
          // If quantity is 0, don't add
          return prev;
        } else {
          // If no quantity provided (toggle), add without quantity
          return [...prev, {
            categoryId,
            toppingIds: [toppingId]
          }];
        }
      }

      // Category already exists
      const category = prev[categoryIndex];
      let newToppingIds: string[];
      let newToppingQuantities = { ...(category.toppingQuantities || {}) };

      // Handle quantity if provided
      if (quantity !== undefined) {
        if (quantity > 0) {
          // Add or update quantity
          newToppingIds = [...new Set([...category.toppingIds, toppingId])]; // Ensure unique IDs
          newToppingQuantities[toppingId] = quantity;
        } else {
          // Remove if quantity is 0
          newToppingIds = category.toppingIds.filter(id => id !== toppingId);
          delete newToppingQuantities[toppingId];
        }
      } else {
        // Toggle behavior (no quantity provided)
        if (category.toppingIds.includes(toppingId)) {
          newToppingIds = category.toppingIds.filter(id => id !== toppingId);
          delete newToppingQuantities[toppingId];
        } else {
          // Check max selections for the category
          if (selectedItem?.toppingCategories) {
            const toppingCategory = selectedItem.toppingCategories.find(c => c.id === categoryId);
            if (toppingCategory && toppingCategory.max_selections > 0) {
              if (toppingCategory.max_selections === 1) {
                newToppingIds = [toppingId];
                newToppingQuantities = { [toppingId]: 1 };  
              } else if (category.toppingIds.length >= toppingCategory.max_selections) {
                toast({
                  title: t("maxSelectionsReached"),
                  description: t("maxSelectionsMessage").replace("{max}", String(toppingCategory.max_selections))
                });
                return prev;
              } else {
                newToppingIds = [...category.toppingIds, toppingId];
                newToppingQuantities[toppingId] = 1; // Default to 1 for toggle
              }
            } else {
              newToppingIds = [...category.toppingIds, toppingId];
              newToppingQuantities[toppingId] = 1; // Default to 1 for toggle
            }
          } else {
            newToppingIds = [...category.toppingIds, toppingId];
            newToppingQuantities[toppingId] = 1; // Default to 1 for toggle
          }
        }
      }

      const newToppings = [...prev];
      newToppings[categoryIndex] = {
        ...category,
        toppingIds: newToppingIds,
        toppingQuantities: newToppingQuantities
      };

      console.log("Updated topping selection:", newToppingIds);
      console.log("Updated topping quantities:", newToppingQuantities);

      return newToppings;
    });
  };
  const calculateItemPrice = (item: MenuItemWithOptions, options: {
    optionId: string;
    choiceIds: string[];
  }[], toppings: SelectedToppingCategory[]): number => {
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
              // Get quantity from toppingQuantities map or default to 1
              const quantity = selectedToppingCategory.toppingQuantities?.[toppingId] || 1;
              price += parseFloat(topping.price.toString()) * quantity;
            }
          });
        }
      });
    }
    return price;
  };
  const getFormattedOptions = (item: CartItem): string => {
    if (!item.menuItem.options) return "";
    return item.selectedOptions.flatMap(selectedOption => {
      const option = item.menuItem.options?.find(o => o.id === selectedOption.optionId);
      if (!option) return [];
      return selectedOption.choiceIds.map(choiceId => {
        const choice = option.choices.find(c => c.id === choiceId);
        return choice ? getTranslatedField(choice, 'name', uiLanguage) : "";
      });
    }).filter(Boolean).join(", ");
  };
  const getFormattedToppings = (item: CartItem): string => {
    if (!item.menuItem.toppingCategories) return "";
    return item.selectedToppings.flatMap(selectedCategory => {
      const category = item.menuItem.toppingCategories?.find(c => c.id === selectedCategory.categoryId);
      if (!category) return [];
      return selectedCategory.toppingIds.map(toppingId => {
        const topping = category.toppings.find(t => t.id === toppingId);
        return topping ? getTranslatedField(topping, 'name', uiLanguage) : "";
      });
    }).filter(Boolean).join(", ");
  };
  const handleAddToCart = () => {
    if (!selectedItem) return;
    
    // Validate options as before - no change needed here
    const isOptionsValid = selectedItem.options?.every(option => {
      if (!option.required) return true;
      const selected = selectedOptions.find(o => o.optionId === option.id);
      return selected && selected.choiceIds.length > 0;
    }) ?? true;
    
    // Updated validation for topping categories - only validate visible categories
    const isToppingsValid = selectedItem.toppingCategories?.every(category => {
      // Skip validation for categories that are not visible
      if (!shouldShowToppingCategory(category)) return true;
      
      // Only validate min_selections for visible categories
      if (!category.min_selections || category.min_selections <= 0) return true;
      const selected = selectedToppings.find(t => t.categoryId === category.id);
      return selected && selected.toppingIds.length >= category.min_selections;
    }) ?? true;
    
    if (!isOptionsValid || !isToppingsValid) {
      toast({
        title: t("selectionsRequired"),
        description: t("pleaseSelectRequired"),
        variant: "destructive"
      });
      return;
    }
    
    const itemPrice = calculateItemPrice(selectedItem, selectedOptions, selectedToppings);
    const newItem: CartItem = {
      id: Date.now().toString(),
      menuItem: selectedItem,
      quantity,
      selectedOptions,
      selectedToppings,
      specialInstructions: specialInstructions.trim() || undefined,
      itemPrice
    };
    setCart(prev => [newItem, ...prev]);
    setSelectedItem(null);
    toast({
      title: t("addedToCart"),
      description: `${quantity}x ${selectedItem.name} ${t("added")}`
    });
  };
  const handleUpdateCartItemQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      handleRemoveCartItem(itemId);
      return;
    }
    setCart(prev => prev.map(item => item.id === itemId ? {
      ...item,
      quantity: newQuantity
    } : item));
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
      return total + item.itemPrice * item.quantity;
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
    
    // Check if we're offline
    if (connectionStatus === 'offline') {
      toast({
        title: "Mode hors ligne",
        description: "Impossible de passer commande hors ligne. Reconnectez-vous pour continuer.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setPlacingOrder(true);
      const order = await createOrder({
        restaurant_id: restaurant.id,
        status: 'pending',
        total: calculateCartTotal(),
        customer_name: null
      });
      const orderItems = await createOrderItems(cart.map(item => ({
        order_id: order.id,
        menu_item_id: item.menuItem.id,
        quantity: item.quantity,
        price: item.itemPrice,
        special_instructions: item.specialInstructions || null
      })));
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
      
      // Get the order number - this will be a simple counter format (#390)
      const { count } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('restaurant_id', restaurant.id);
      
      setConfirmedOrderNumber(String(count || 1));
      
      // Show the confirmation dialog instead of immediately resetting
      setShowConfirmationDialog(true);
      setIsCartOpen(false);
      
      // No need to reset immediately as the dialog will handle redirection
      
    } catch (error) {
      console.error("Erreur lors de la commande:", error);
      toast({
        title: "Erreur",
        description: "Un problème est survenu lors de la commande. Veuillez réessayer.",
        variant: "destructive"
      });
      setPlacingOrder(false);
    }
  };
  const toggleCart = () => {
    setIsCartOpen(!isCartOpen);
  };
  const shouldShowToppingCategory = (category: MenuItemWithOptions['toppingCategories'][0]) => {
    if (!category.show_if_selection_id || category.show_if_selection_id.length === 0) {
      return true;
    }
    return category.show_if_selection_id.some(toppingId => selectedToppings.some(catSelection => catSelection.toppingIds.includes(toppingId)));
  };
  const fetchCategories = async () => {
    try {
      if (!restaurant) return;
      const cachedCategories = getCacheItem<CategoryWithItems[]>('categories', restaurant.id);
      if (cachedCategories) {
        console.log("Using cached categories");

        // Sort cached categories by display_order before using them
        const sortedCategories = [...cachedCategories].sort((a, b) => {
          const orderA = a.display_order ?? 1000;
          const orderB = b.display_order ?? 1000;
          return orderA - orderB;
        });

        // Also sort items within each category
        sortedCategories.forEach(category => {
          category.items = [...category.items].sort((a, b) => {
            const orderA = a.display_order ?? 1000;
            const orderB = b.display_order ?? 1000;
            return orderA - orderB;
          });
        });
        setCategories(sortedCategories || []);
        if (sortedCategories.length > 0) {
          setActiveCategory(sortedCategories[0].id);
        }
        setLoading(false);
        return;
      }
      const data = await getRestaurantBySlug(restaurantSlug || '');
      if (!data) throw new Error("Restaurant not found");
      const menuData = await getMenuForRestaurant(data.id);

      // Sort the menuData before setting state or caching
      const sortedMenuData = [...menuData].sort((a, b) => {
        const orderA = a.display_order ?? 1000;
        const orderB = b.display_order ?? 1000;
        return orderA - orderB;
      });

      // Also sort items within each category
      sortedMenuData.forEach(category => {
        category.items = [...category.items].sort((a, b) => {
          const orderA = a.display_order ?? 1000;
          const orderB = b.display_order ?? 1000;
          return orderA - orderB;
        });
      });
      setCategories(sortedMenuData);
      setCacheItem('categories', sortedMenuData, data.id);
      if (sortedMenuData.length > 0) {
        setActiveCategory(sortedMenuData[0].id);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
      toast({
        title: t("restaurantNotFound"),
        description: t("sorryNotFound"),
        variant: "destructive"
      });
    }
  };
  const fetchToppings = async () => {
    if (!selectedCategory?.id || !restaurant?.id) return;
    try {
      const cacheKey = `toppings_${selectedCategory.id}`;
      const cachedToppings = getCacheItem<Topping[]>(cacheKey, restaurant.id);
      if (cachedToppings) {
        console.log("Using cached toppings for category:", selectedCategory.id);
        setToppings(cachedToppings);
        setSelectedCategory(prev => prev ? {
          ...prev,
          toppings: cachedToppings
        } : prev);
        return;
      }
      const {
        data,
        error
      } = await supabase.from('toppings').select('*').eq('category_id', selectedCategory.id).order('created_at', {
        ascending: true
      });
      if (error) throw error;
      const updatedToppings = data.map(topping => ({
        ...topping,
        tax_percentage: typeof topping.tax_percentage === 'string' ? parseFloat(topping.tax_percentage) : topping.tax_percentage
      }));
      setCacheItem(cacheKey, updatedToppings, restaurant.id);
      setToppings(updatedToppings);
      setSelectedCategory(prev => prev ? {
        ...prev,
        toppings: updatedToppings
      } : prev);
    } catch (error) {
      console.error('Error fetching toppings:', error);
      toast({
        title: "Error",
        description: "Unable to load toppings",
        variant: "destructive"
      });
    }
  };

  // Enhanced menu refresh with network awareness
  const handleRefreshMenu = async () => {
    if (connectionStatus === 'offline') {
      toast({
        title: "Mode hors ligne",
        description: "Impossible de rafraîchir en mode hors ligne",
        variant: "destructive"
      });
      return;
    }

    try {
      if (!restaurant) return;
      
      setLoading(true);
      console.log("[MenuRefresh] Starting menu refresh operation");
      
      toast({
        title: t("refreshMenu"),
        description: t("cache.refreshing"),
        duration: 3000,
      });
      
      console.log("[MenuRefresh] Force flushing all menu cache");
      forceFlushMenuCache(restaurant.id);
      
      console.log("[MenuRefresh] Preloading fresh data with forceRefresh=true");
      await preloadAllRestaurantData(
        restaurantSlug || "",
        { forceRefresh: true },
        (state) => {
          console.log(`[MenuRefresh] Preload progress: ${state.stage} - ${state.progress}%`);
          setPreloadState(state);
        }
      );
      
      console.log("[MenuRefresh] Refresh operation completed successfully, reloading the application");
      
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      
    } catch (error) {
      console.error("[MenuRefresh] Error refreshing menu:", error);
      toast({
        title: t("cache.refreshError"),
        description: "Failed to refresh menu",
        variant: "destructive"
      });
      setLoading(false);
    }
  };

  useEffect(() => {
    // Add a style tag to prevent selection throughout the kiosk view
    const styleTag = document.createElement('style');
    styleTag.innerHTML = `
      .kiosk-view {
        user-select: none;
        -webkit-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
      }
      
      .kiosk-view * {
        user-select: none;
        -webkit-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
      }
      
      /* Only allow selection in the special instructions textarea */
      .kiosk-view textarea {
        user-select: text;
        -webkit-user-select: text;
        -moz-user-select: text;
        -ms-user-select: text;
      }
    `;
    document.head.appendChild(styleTag);

    // Clean up on unmount
    return () => {
      document.head.removeChild(styleTag);
    };
  }, []);

  // Show preloading screen if preloading
  if (isPreloading) {
    return <NetworkErrorBoundary onRetry={() => preloadAllData(true)}>
      <PreloadingScreen 
        state={preloadState}
        onRetry={() => preloadAllData(true)} 
        uiLanguage={uiLanguage} 
      />
    </NetworkErrorBoundary>;
  }

  if (loading && !restaurant) {
    return <NetworkErrorBoundary onRetry={() => preloadAllData(true)}>
      <div className="flex items-center justify-center h-screen kiosk-view">
        <Loader2 className="h-12 w-12 animate-spin text-purple-700" />
      </div>
    </NetworkErrorBoundary>;
  }

  if (!restaurant) {
    return <NetworkErrorBoundary onRetry={() => preloadAllData(true)}>
      <div className="flex items-center justify-center h-screen kiosk-view">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">{t("restaurantNotFound")}</h1>
          <p className="text-gray-500 mb-4">{t("sorryNotFound")}</p>
          <Button onClick={() => navigate('/')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("backToHome")}
          </Button>
        </div>
      </div>
    </NetworkErrorBoundary>;
  }

  if (showWelcome) {
    return <NetworkErrorBoundary onRetry={() => preloadAllData(true)}>
      <LanguageProvider initialLanguage={uiLanguage}>
        <LanguageSync onLanguageChange={(lang) => {
          console.log('Language changed to:', lang);
          setUiLanguage(lang);
        }}>
          <WelcomePage 
            restaurant={restaurant} 
            onStart={() => {
              fullReset();
              handleStartOrder();
            }} 
            uiLanguage={uiLanguage}
            isDataLoading={isPreloading || loading} 
          />
        </LanguageSync>
      </LanguageProvider>
    </NetworkErrorBoundary>;
  }

  if (showOrderTypeSelection) {
    return <NetworkErrorBoundary onRetry={() => preloadAllData(true)}>
      <LanguageProvider initialLanguage={uiLanguage}>
        <LanguageSync onLanguageChange={(lang) => {
          console.log('Language maintained during order type selection:', lang);
          setUiLanguage(lang);
        }}>
          <div className="kiosk-view">
            <div className="fixed inset-0 bg-cover bg-center bg-black/50" style={{
              backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.7)), url(${restaurant.image_url || 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?ixlib=rb-1.2.1&auto=format&fit=crop&w=1920&q=80'})`
            }} />
            <OrderTypeSelection isOpen={showOrderTypeSelection} onClose={() => {
              setShowOrderTypeSelection(false);
              setShowWelcome(true);
            }} onSelectOrderType={handleOrderTypeSelected} uiLanguage={uiLanguage} />
            
            <InactivityDialog isOpen={showDialog} onContinue={handleContinue} onCancel={handleCancel} t={t} />
          </div>
        </LanguageSync>
      </LanguageProvider>
    </NetworkErrorBoundary>;
  }

  const activeItems = categories.find(c => c.id === activeCategory)?.items || [];
  const cartItemCount = cart.reduce((total, item) => total + item.quantity, 0);
  const cartIsEmpty = cart.length === 0;

  return <NetworkErrorBoundary onRetry={() => preloadAllData(true)}>
    <LanguageProvider initialLanguage={uiLanguage}>
      <LanguageSync onLanguageChange={(lang) => {
        console.log('Language maintained during main menu:', lang);
        setUiLanguage(lang);
      }}>
        <div className="h-screen flex flex-col overflow-hidden kiosk-view">
      {/* Fixed height header - 12vh */}
      <div className="h-[12vh] min-h-[120px] flex-shrink-0">
        <KioskHeader restaurant={restaurant} orderType={orderType} tableNumber={tableNumber} t={t} onRefresh={handleRefreshMenu} />
      </div>

      {/* Content area with fixed sidebar and scrollable menu grid */}
      <div className="flex flex-1 overflow-hidden">
        {/* Fixed width sidebar - 16vw */}
        <div className="w-64 min-w-[220px] max-w-[280px] bg-white border-r border-gray-200 overflow-y-auto flex-shrink-0">
          <MenuCategoryList categories={categories} activeCategory={activeCategory} setActiveCategory={setActiveCategory} uiLanguage={uiLanguage} />
        </div>

        {/* Scrollable menu grid area */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            <MenuItemGrid 
              items={categories.flatMap(c => c.items)} 
              handleSelectItem={handleSelectItem} 
              currencySymbol={getCurrencySymbol(restaurant.currency || "EUR")} 
              t={t} 
              restaurantId={restaurant?.id} 
              refreshTrigger={refreshTrigger}
              categories={categories}
              uiLanguage={uiLanguage}
            />
          </div>
        </div>
      </div>

      {!isCartOpen && !cartIsEmpty && <CartButton itemCount={cartItemCount} total={calculateCartTotal()} onClick={toggleCart} uiLanguage={uiLanguage} currency={restaurant.currency} />}

      <div ref={cartRef} className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg" style={{
        maxHeight: "60vh"
      }}>
        <Cart cart={cart} isOpen={isCartOpen} onToggleOpen={toggleCart} onUpdateQuantity={handleUpdateCartItemQuantity} onRemoveItem={handleRemoveCartItem} onClearCart={() => setCart([])} onPlaceOrder={handlePlaceOrder} placingOrder={placingOrder} orderPlaced={orderPlaced} calculateSubtotal={calculateSubtotal} calculateTax={calculateTax} getFormattedOptions={getFormattedOptions} getFormattedToppings={getFormattedToppings} restaurant={restaurant} orderType={orderType} tableNumber={tableNumber} uiLanguage={uiLanguage} t={t} />
      </div>

      {selectedItem && <ItemCustomizationDialog item={selectedItem} isOpen={!!selectedItem} onClose={() => setSelectedItem(null)} onAddToCart={handleAddToCart} selectedOptions={selectedOptions} onToggleChoice={handleToggleChoice} selectedToppings={selectedToppings} onToggleTopping={handleToggleTopping} quantity={quantity} onQuantityChange={setQuantity} specialInstructions={specialInstructions} onSpecialInstructionsChange={setSpecialInstructions} shouldShowToppingCategory={shouldShowToppingCategory} t={t} currencySymbol={getCurrencySymbol(restaurant?.currency || "EUR")} uiLanguage={uiLanguage} />}

      <InactivityDialog isOpen={showDialog} onContinue={handleContinue} onCancel={handleCancel} t={t} />
      
      {/* Order Confirmation Dialog */}
      <OrderConfirmationDialog 
        isOpen={showConfirmationDialog}
        onClose={handleConfirmationClose}
        cart={cart}
        orderNumber={confirmedOrderNumber}
        restaurant={restaurant}
        orderType={orderType}
        tableNumber={tableNumber}
        uiLanguage={uiLanguage}
        getFormattedOptions={getFormattedOptions}
        getFormattedToppings={getFormattedToppings}
      />
        </div>
      </LanguageSync>
    </LanguageProvider>
  </NetworkErrorBoundary>;
};

export default KioskView;
