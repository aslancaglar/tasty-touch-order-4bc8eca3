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

  const handleAddToCart = () => {
    if (!selectedItem) return;
    
    // Create the item to add to cart
    const itemToAdd: CartItem = {
      id: crypto.randomUUID(),
      menuItemId: selectedItem.id,
      name: selectedItem.name,
      price: selectedItem.price,
      quantity: quantity,
      specialInstructions: specialInstructions,
      options: selectedOptions.map(option => {
        const optionGroup = selectedItem.options.find(o => o.id === option.optionId);
        const choices = optionGroup?.choices.filter(c => option.choiceIds.includes(c.id)) || [];
        
        return {
          optionId: option.optionId,
          optionName: optionGroup?.name || '',
          choices: choices.map(choice => ({
            choiceId: choice.id,
            choiceName: choice.name,
            price: choice.price || 0
          }))
        };
      }),
      toppings: selectedToppings.flatMap(selectedCategory => {
        const category = selectedItem.topping_categories.find(tc => tc.id === selectedCategory.categoryId);
        return selectedCategory.toppingIds.map(toppingId => {
          const topping = category?.toppings.find(t => t.id === toppingId);
          return {
            toppingId,
            toppingName: topping?.name || '',
            toppingCategoryId: selectedCategory.categoryId,
            toppingCategoryName: category?.name || '',
            price: topping?.price || 0
          };
        });
      })
    };
    
    setCart(prev => [...prev, itemToAdd]);
    setSelectedItem(null);
    setSelectedOptions([]);
    setSelectedToppings([]);
    setQuantity(1);
    setSpecialInstructions("");
    
    toast({
      title: t("addedToCart"),
      description: `${itemToAdd.name} ${t("added")}`,
      variant: "default"
    });
  };

  const handleSelectItem = async (item: MenuItem) => {
    try {
      const itemWithOptions = await getMenuItemWithOptions(item.id);
      setSelectedItem(itemWithOptions);
      setSelectedOptions([]);
      setSelectedToppings([]);
      setQuantity(1);
      setSpecialInstructions("");
      
      // Initialize selected options
      const initialOptions = itemWithOptions.options.map(option => ({
        optionId: option.id,
        choiceIds: option.min_selections > 0 && option.choices.length > 0 ? [option.choices[0].id] : []
      }));
      
      setSelectedOptions(initialOptions);
    } catch (error) {
      console.error("Error fetching menu item details:", error);
    }
  };

  const handleImageClick = (item: MenuItem) => {
    handleSelectItem(item);
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  if (showWelcome) {
    return (
      <WelcomePage
        restaurant={restaurant}
        onStart={() => {
          setShowWelcome(false);
          setShowOrderTypeSelection(true);
        }}
      />
    );
  }
  
  if (showOrderTypeSelection) {
    return (
      <OrderTypeSelection
        restaurant={restaurant}
        onSelectType={(type, tableNumber) => {
          setOrderType(type);
          setTableNumber(tableNumber);
          setShowOrderTypeSelection(false);
        }}
      />
    );
  }
  
  if (orderPlaced) {
    return (
      <OrderReceipt
        restaurant={restaurant}
        orderType={orderType}
        tableNumber={tableNumber}
        onNewOrder={() => {
          setCart([]);
          setOrderPlaced(false);
        }}
      />
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-10 bg-white shadow">
        <div className="container flex items-center justify-between p-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft />
            </Button>
            <h1 className="text-xl font-bold">{restaurant?.name}</h1>
          </div>
          <CartButton
            count={cart.length}
            onClick={() => setIsCartOpen(true)}
          />
        </div>
      </header>
      
      <main className="container pb-24 pt-4">
        <div className="mb-6 overflow-x-auto">
          <div className="flex gap-2 pb-2">
            {categories.map(category => (
              <Button
                key={category.id}
                variant={activeCategory === category.id ? "default" : "outline"}
                onClick={() => setActiveCategory(category.id)}
                className="whitespace-nowrap"
              >
                {category.name}
              </Button>
            ))}
          </div>
        </div>
        
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {categories
            .find(cat => cat.id === activeCategory)
            ?.items.map(item => (
              <Card
                key={item.id}
                className="overflow-hidden transition-all hover:shadow-lg"
              >
                {item.image_url && (
                  <div
                    className="aspect-[4/3] cursor-pointer"
                    onClick={() => handleImageClick(item)}
                  >
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium">{item.name}</h3>
                      <p className="text-sm text-gray-600 line-clamp-2">{item.description}</p>
                    </div>
                    <div className="text-lg font-bold">
                      {getCurrencySymbol(restaurant?.currency || 'EUR')} 
                      {(item.price / 100).toFixed(2)}
                    </div>
                  </div>
                  <Button
                    onClick={() => handleSelectItem(item)}
                    className="mt-2 w-full"
                  >
                    {t("addToCart")}
                  </Button>
                </div>
              </Card>
            ))}
        </div>
      </main>
      
      <Dialog
        open={!!selectedItem}
        onOpenChange={(open) => !open && setSelectedItem(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedItem?.name}</DialogTitle>
            <DialogDescription>{selectedItem?.description}</DialogDescription>
          </DialogHeader>
          
          {selectedItem?.options.map(option => (
            <div key={option.id} className="mb-4">
              <div className="mb-2 flex items-center justify-between">
                <Label className="font-medium">
                  {option.name} 
                  {option.min_selections > 0 && <span className="text-red-500">*</span>}
                </Label>
                {option.max_selections > 1 && (
                  <span className="text-xs text-gray-500">
                    {t("selectUpTo")} {option.max_selections}
                  </span>
                )}
              </div>
              
              <div className="space-y-2">
                {option.choices.map(choice => {
                  const isSelected = selectedOptions
                    .find(o => o.optionId === option.id)
                    ?.choiceIds.includes(choice.id);
                  
                  return (
                    <div key={choice.id} className="flex items-center justify-between rounded-md border p-2">
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant={isSelected ? "default" : "outline"}
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => {
                            setSelectedOptions(prev => {
                              const currentOption = prev.find(o => o.optionId === option.id);
                              
                              if (!currentOption) {
                                return [...prev, { optionId: option.id, choiceIds: [choice.id] }];
                              }
                              
                              if (option.max_selections === 1) {
                                return prev.map(o => 
                                  o.optionId === option.id
                                    ? { ...o, choiceIds: [choice.id] }
                                    : o
                                );
                              }
                              
                              if (isSelected) {
                                return prev.map(o => 
                                  o.optionId === option.id
                                    ? { ...o, choiceIds: o.choiceIds.filter(id => id !== choice.id) }
                                    : o
                                );
                              } else {
                                const selectedCount = currentOption.choiceIds.length;
                                if (selectedCount < option.max_selections) {
                                  return prev.map(o => 
                                    o.optionId === option.id
                                      ? { ...o, choiceIds: [...o.choiceIds, choice.id] }
                                      : o
                                  );
                                } else {
                                  toast({
                                    title: t("maxSelectionsReached"),
                                    description: t("maxSelectionsMessage").replace("{max}", option.max_selections.toString()),
                                    variant: "destructive"
                                  });
                                  return prev;
                                }
                              }
                            });
                          }}
                        >
                          {isSelected ? <Check className="h-4 w-4" /> : null}
                        </Button>
                        <span>{choice.name}</span>
                      </div>
                      {choice.price > 0 && (
                        <span className="text-sm">
                          +{getCurrencySymbol(restaurant?.currency || 'EUR')} 
                          {(choice.price / 100).toFixed(2)}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          
          {selectedItem?.topping_categories.map(category => (
            <div key={category.id} className="mb-4">
              <div className="mb-2 flex items-center justify-between">
                <Label className="font-medium">{category.name}</Label>
                {category.multiple_selection && (
                  <span className="text-xs text-gray-500">
                    {t("multipleSelection")}
                  </span>
                )}
              </div>
              
              <div className="space-y-2">
                {category.toppings.map(topping => {
                  const isSelected = selectedToppings
                    .find(t => t.categoryId === category.id)
                    ?.toppingIds.includes(topping.id);
                  
                  return (
                    <div key={topping.id} className="flex items-center justify-between rounded-md border p-2">
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant={isSelected ? "default" : "outline"}
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => {
                            setSelectedToppings(prev => {
                              const currentCategory = prev.find(t => t.categoryId === category.id);
                              
                              if (!currentCategory) {
                                return [...prev, { categoryId: category.id, toppingIds: [topping.id] }];
                              }
                              
                              if (!category.multiple_selection) {
                                return prev.map(t => 
                                  t.categoryId === category.id
                                    ? { ...t, toppingIds: [topping.id] }
                                    : t
                                );
                              } else {
                                if (isSelected) {
                                  return prev.map(t => 
                                    t.categoryId === category.id
                                      ? { ...t, toppingIds: t.toppingIds.filter(id => id !== topping.id) }
                                      : t
                                  );
                                } else {
                                  return prev.map(t => 
                                    t.categoryId === category.id
                                      ? { ...t, toppingIds: [...t.toppingIds, topping.id] }
                                      : t
                                  );
                                }
                              }
                            });
                          }}
                        >
                          {isSelected ? <Check className="h-4 w-4" /> : null}
                        </Button>
                        <span>{topping.name}</span>
                      </div>
                      {topping.price > 0 && (
                        <span className="text-sm">
                          +{getCurrencySymbol(restaurant?.currency || 'EUR')} 
                          {(topping.price / 100).toFixed(2)}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          
          <div className="mb-4">
            <Label className="mb-2 block font-medium">{t("quantity")}</Label>
            <div className="flex items-center">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setQuantity(q => Math.max(1, q - 1))}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="mx-4 w-8 text-center">{quantity}</span>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setQuantity(q => q + 1)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              onClick={() => {
                const allRequiredSelected = selectedItem?.options.every(option => {
                  if (option.min_selections > 0) {
                    const selections = selectedOptions.find(o => o.optionId === option.id)?.choiceIds.length || 0;
                    return selections >= option.min_selections;
                  }
                  return true;
                });
                
                if (!allRequiredSelected) {
                  toast({
                    title: t("selectionsRequired"),
                    description: t("pleaseSelectRequired"),
                    variant: "destructive"
                  });
                  return;
                }
                
                handleAddToCart();
              }}
            >
              {t("addToCart")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Cart 
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        updateCart={setCart}
        restaurant={restaurant}
        orderType={orderType}
        tableNumber={tableNumber}
        onPlaceOrder={async () => {
          setPlacingOrder(true);
          try {
            await new Promise(r => setTimeout(r, 2000));
            setOrderPlaced(true);
            setIsCartOpen(false);
          } catch (error) {
            console.error("Error placing order:", error);
            toast({
              title: "Error",
              description: "Failed to place order. Please try again.",
              variant: "destructive"
            });
          } finally {
            setPlacingOrder(false);
          }
        }}
        placingOrder={placingOrder}
      />
    </div>
  );
};

export default KioskView;
