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
import { setCacheItem, getCacheItem } from "@/services/cache-service";
import { useInactivityTimer } from "@/hooks/useInactivityTimer";
import InactivityDialog from "@/components/kiosk/InactivityDialog";
import { useTranslation, SupportedLanguage } from "@/utils/language-utils";

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
  const [uiLanguage, setUiLanguage] = useState<SupportedLanguage>("fr");
  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  const [toppings, setToppings] = useState<Topping[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const cartRef = useRef<HTMLDivElement | null>(null);
  const { toast } = useToast();
  const { t } = useTranslation(uiLanguage);

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
            title: t("restaurants.notFound"),
            description: t("restaurants.sorryNotFound"),
            variant: "destructive"
          });
          navigate('/');
          return;
        }
        setRestaurant(restaurantData);
        const lang = restaurantData.ui_language === "en" ? "en" : restaurantData.ui_language === "tr" ? "tr" : "fr";
        setUiLanguage(lang as SupportedLanguage);
        const menuData = await getMenuForRestaurant(restaurantData.id);

        // Sort categories by display_order before setting state
        const sortedCategories = [...menuData].sort((a, b) => {
          const orderA = a.display_order ?? 1000;
          const orderB = b.display_order ?? 1000;
          return orderA - orderB;
        });

        // Also sort the items within each category
        sortedCategories.forEach(category => {
          category.items = [...category.items].sort((a, b) => {
            const orderA = a.display_order ?? 1000;
            const orderB = b.display_order ?? 1000;
            return orderA - orderB;
          });
        });
        setCategories(sortedCategories);
        if (sortedCategories.length > 0) {
          setActiveCategory(sortedCategories[0].id);
        }
        setLoading(false);
      } catch (error) {
        console.error("Error loading restaurant and menu:", error);
        toast({
          title: t("restaurants.notFound"),
          description: t("restaurants.sorryNotFound"),
          variant: "destructive"
        });
        setLoading(false);
      }
    };
    fetchRestaurantAndMenu();
  }, [restaurantSlug, navigate, toast, t]);

  useEffect(() => {
    if (showWelcome) {
      fullReset();
    }
  }, [showWelcome, fullReset]);

  const handleStartOrder = () => {
    fullReset();
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

  const fetchToppingCategories = async (menuItemId: string) => {
    try {
      const {
        data: menuItemToppingCategories,
        error: toppingCategoriesError
      } = await supabase.from('menu_item_topping_categories').select('topping_category_id, display_order').eq('menu_item_id', menuItemId).order('display_order', {
        ascending: true
      });
      if (toppingCategoriesError) {
        console.error("Error loading topping categories:", toppingCategoriesError);
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
      } = await supabase.from('topping_categories').select('*').in('id', toppingCategoryIds);
      if (categoriesError) {
        console.error("Error loading topping category details:", categoriesError);
        return [];
      }
      const toppingCategoriesWithToppings = await Promise.all(toppingCategories.map(async category => {
        const {
          data: toppings,
          error: toppingsError
        } = await supabase.from('toppings').select('*').eq('category_id', category.id).eq('in_stock', true).order('display_order', {
          ascending: true
        }); // Order toppings by display_order

        if (toppingsError) {
          console.error(`Error loading toppings for category ${category.id}:`, toppingsError);
          return {
            id: category.id,
            name: category.name,
            min_selections: category.min_selections || 0,
            max_selections: category.max_selections || 0,
            required: category.min_selections ? category.min_selections > 0 : false,
            display_order: displayOrderMap[category.id],
            toppings: [],
            show_if_selection_id: category.show_if_selection_id,
            show_if_selection_type: category.show_if_selection_type
          };
        }
        return {
          id: category.id,
          name: category.name,
          min_selections: category.min_selections || 0,
          max_selections: category.max_selections || 0,
          required: category.min_selections ? category.min_selections > 0 : false,
          display_order: displayOrderMap[category.id],
          toppings: toppings.map(topping => ({
            id: topping.id,
            name: topping.name,
            price: topping.price,
            tax_percentage: topping.tax_percentage || 0,
            display_order: topping.display_order
          })),
          show_if_selection_id: category.show_if_selection_id,
          show_if_selection_type: category.show_if_selection_type
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
      console.error("Error retrieving topping categories:", error);
      return [];
    }
  };

  const handleSelectItem = async (item: MenuItem) => {
    try {
      setLoading(true);
      const itemWithOptions = await getMenuItemWithOptions(item.id);
      if (!itemWithOptions) {
        toast({
          title: t("error"),
          description: t("error"),
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
      console.error("Error loading item details:", error);
      toast({
        title: t("error"),
        description: t("order.error"),
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
        if (selectedItem?.toppingCategories) {
          const toppingCategory = selectedItem.toppingCategories.find(c => c.id === categoryId);
          if (toppingCategory && toppingCategory.max_selections > 0) {
            if (toppingCategory.max_selections === 1) {
              newToppingIds = [toppingId];
            } else if (category.toppingIds.length >= toppingCategory.max_selections) {
              toast({
                title: t("menuItem.maxSelectionsReached"),
                description: t("menuItem.maxSelectionsMessage").replace("{max}", String(toppingCategory.max_selections))
              });
              return prev;
            } else {
              newToppingIds = [...category.toppingIds, toppingId];
            }
          } else {
            newToppingIds = [...category.toppingIds, toppingId];
          }
        } else {
          newToppingIds = [...category.toppingIds, toppingId];
        }
      }
      const newToppings = [...prev];
      newToppings[categoryIndex] = {
        ...category,
        toppingIds: newToppingIds
      };
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
    return item.selectedOptions.flatMap(selectedOption => {
      const option = item.menuItem.options?.find(o => o.id === selectedOption.optionId);
      if (!option) return [];
      return selectedOption.choiceIds.map(choiceId => {
        const choice = option.choices.find(c => c.id === choiceId);
        return choice ? choice.name : "";
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
        return topping ? topping.name : "";
      });
    }).filter(Boolean).join(", ");
  };

  const handleAddToCart = () => {
    if (!selectedItem) return;
    const isOptionsValid = selectedItem.options?.every(option => {
      if (!option.required) return true;
      const selected = selectedOptions.find(o => o.optionId === option.id);
      return selected && selected.choiceIds.length > 0;
    }) ?? true;
    const isToppingsValid = selectedItem.toppingCategories?.every(category => {
      if (!category.min_selections || category.min_selections <= 0) return true;
      const selected = selectedToppings.find(t => t.categoryId === category.id);
      return selected && selected.toppingIds.length >= category.min_selections;
    }) ?? true;
    if (!isOptionsValid || !isToppingsValid) {
      toast({
        title: t("menuItem.selectionsRequired"),
        description: t("menuItem.pleaseSelectRequired"),
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
      title: t("cart.addedToCart"),
      description: `${quantity}x ${selectedItem.name} ${t("cart.added")}`
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
      toast({
        title: t("order.success"),
        description: t("order.successDesc")
      });
      setTimeout(() => {
        setOrderPlaced(false);
        setCart([]);
        setIsCartOpen(false);
        setPlacingOrder(false);
        setShowWelcome(true);
        if (categories.length > 0) {
          setActiveCategory(categories[0].id);
        }
      }, 3000);
    } catch (error) {
      console.error("Error placing order:", error);
      toast({
        title: t("error"),
        description: t("order.error"),
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
        title: t("restaurants.notFound"),
        description: t("restaurants.sorryNotFound"),
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
        title: t("error"),
        description: t("error"),
        variant: "destructive"
      });
    }
  };

  const handleRefreshMenu = async () => {
    try {
      setLoading(true);
      setRefreshTrigger(prev => prev + 1);
      if (!restaurant) return;
      const menuData = await getMenuForRestaurant(restaurant.id);

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
      if (sortedMenuData.length > 0) {
        setActiveCategory(sortedMenuData[0].id);
      }
      setCacheItem('categories', sortedMenuData, restaurant.id);
      toast({
        title: t("menuRefreshed"),
        description: t("menuRefreshSuccess")
      });
      setLoading(false);
    } catch (error) {
      console.error("Error refreshing menu:", error);
      toast({
        title: t("error"),
        description: t("error"),
        variant: "destructive"
      });
      setLoading(false);
    }
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
            title: t("restaurants.notFound"),
            description: t("restaurants.sorryNotFound"),
            variant: "destructive"
          });
          navigate('/');
          return;
        }
        setRestaurant(restaurantData);
        const lang = restaurantData.ui_language === "en" ? "en" : restaurantData.ui_language === "tr" ? "tr" : "fr";
        setUiLanguage(lang);
        await fetchCategories();
        setLoading(false);
      } catch (error) {
        console.error("Erreur lors du chargement du restaurant et du menu:", error);
        toast({
          title: t("restaurants.notFound"),
          description: t("restaurants.sorryNotFound"),
          variant: "destructive"
        });
        setLoading(false);
      }
    };
    fetchRestaurantAndMenu();
  }, [restaurantSlug, navigate, toast]);

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

  if (loading && !restaurant) {
    return <div className="flex items-center justify-center h-screen kiosk-view">
        <Loader2 className="h-12 w-12 animate-spin text-purple-700" />
      </div>;
  }

  if (!restaurant) {
    return <div className="flex items-center justify-center h-screen kiosk-view">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">{t("restaurants.notFound")}</h1>
          <p className="text-gray-500 mb-4">{t("restaurants.sorryNotFound")}</p>
          <Button onClick={() => navigate('/')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("restaurants.backToRestaurants")}
          </Button>
        </div>
      </div>;
  }

  if (showWelcome) {
    return <div className="kiosk-view">
        <WelcomePage restaurant={restaurant} onStart={() => {
        fullReset();
        handleStartOrder();
      }} uiLanguage={uiLanguage} />
      </div>;
  }

  if (showOrderTypeSelection) {
    return <div className="kiosk-view">
        <div className="fixed inset-0 bg-cover bg-center bg-black/50" style={{
        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.7)), url(${restaurant.image_url || 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?ixlib=rb-1.2.1&auto=format&fit=crop&w=1920&q=80'})`
      }} />
        <OrderTypeSelection isOpen={showOrderTypeSelection} onClose={() => {
        setShowOrderTypeSelection(false);
        setShowWelcome(true);
      }} onSelectOrderType={handleOrderTypeSelected} uiLanguage={uiLanguage
