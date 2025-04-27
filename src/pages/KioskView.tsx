import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronRight, Clock, MinusCircle, PlusCircle, ShoppingCart, Trash2, Check, Loader2, ChevronLeft, Plus, ArrowRight, Minus, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { getIconComponent } from "@/utils/icon-mapping";
import { supabase } from "@/integrations/supabase/client";
import { getRestaurantBySlug, getMenuForRestaurant, getMenuItemWithOptions, createOrder, createOrderItems, createOrderItemOptions, createOrderItemToppings } from "@/services/kiosk-service";
import { Restaurant, MenuCategory, MenuItem, OrderItem, CartItem, MenuItemWithOptions, ToppingCategory, Topping, OrderType, OrderStatus } from "@/types/database-types";
import WelcomePage from "@/components/kiosk/WelcomePage";
import OrderTypeSelection from "@/components/kiosk/OrderTypeSelection";
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
        const lang = restaurantData.ui_language === "en" ? "en" : restaurantData.ui_language === "tr" ? "tr" : "fr";
        console.log("Setting UI language from restaurant:", lang, restaurantData.ui_language);
        setUiLanguage(lang);
        const menuData = await getMenuForRestaurant(restaurantData.id);
        const menuDataWithInStock = menuData.map(category => ({
          ...category,
          items: category.items.filter(item => item.in_stock)
        }));
        setCategories(menuDataWithInStock);
        if (menuData.length > 0) {
          setActiveCategory(menuData[0].id);
        }
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
  const handleAddToCart = async (item: MenuItemWithOptions) => {
    if (!item) {
      return;
    }
    if (item.options && item.options.length > 0) {
      const requiredOptions = item.options.filter(option => option.required);
      const unselectedRequiredOptions = requiredOptions.filter(option => !selectedOptions.find(so => so.optionId === option.id));
      if (unselectedRequiredOptions.length > 0) {
        toast({
          title: t("selectionsRequired"),
          description: t("pleaseSelectRequired"),
          variant: "destructive"
        });
        return;
      }
    }
    const totalPrice = calculateTotalPrice(item);
    const newCartItem: CartItem = {
      id: item.id,
      menuItem: item,
      quantity: quantity,
      options: selectedOptions,
      toppings: selectedToppings,
      specialInstructions: specialInstructions,
      price: totalPrice
    };
    setCart([...cart, newCartItem]);
    setQuantity(1);
    setSelectedItem(null);
    setSelectedOptions([]);
    setSelectedToppings([]);
    setSpecialInstructions("");
    toast({
      title: t("addedToCart"),
      description: `${item.name} ${t("added")}!`,
      duration: 3000
    });
  };
  const calculateTotalPrice = (item: MenuItemWithOptions) => {
    let itemPrice = item.promotion_price !== null && item.promotion_price !== undefined ? item.promotion_price : item.price;
    let optionsPrice = 0;
    selectedOptions.forEach(selectedOption => {
      selectedOption.choiceIds.forEach(choiceId => {
        const option = item.options?.find(o => o.id === selectedOption.optionId);
        const choice = option?.choices.find(c => c.id === choiceId);
        if (choice) {
          optionsPrice += choice.price || 0;
        }
      });
    });
    let toppingsPrice = 0;
    selectedToppings.forEach(toppingCategory => {
      toppingCategory.toppingIds.forEach(toppingId => {
        categories.forEach(category => {
          category.items.forEach(menuItem => {
            if (menuItem.id === item.id) {
              const topping = categories.find(cat => cat.id === toppingCategory.categoryId)?.items.find(t => t.id === toppingId);
              if (topping) {
                toppingsPrice += topping.price;
              }
            }
          });
        });
      });
    });
    const totalPrice = itemPrice + optionsPrice + toppingsPrice;
    return totalPrice * quantity;
  };
  const handleIncrement = () => {
    setQuantity(quantity + 1);
  };
  const handleDecrement = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };
  const handleOptionSelect = (optionId: string, choiceId: string) => {
    setSelectedOptions(prevOptions => {
      const option = prevOptions.find(opt => opt.optionId === optionId);
      if (option) {
        const choiceExists = option.choiceIds.includes(choiceId);
        if (choiceExists) {
          return prevOptions.map(opt => opt.optionId === optionId ? {
            ...opt,
            choiceIds: opt.choiceIds.filter(id => id !== choiceId)
          } : opt).filter(opt => opt.choiceIds.length > 0);
        } else {
          return prevOptions.map(opt => opt.optionId === optionId ? {
            ...opt,
            choiceIds: [...opt.choiceIds, choiceId]
          } : opt);
        }
      } else {
        return [...prevOptions, {
          optionId: optionId,
          choiceIds: [choiceId]
        }];
      }
    });
  };
  const isChoiceSelected = (optionId: string, choiceId: string) => {
    const option = selectedOptions.find(opt => opt.optionId === optionId);
    return !!option && option.choiceIds.includes(choiceId);
  };
  const handleToppingSelect = (categoryId: string, toppingId: string) => {
    setSelectedToppings(prevToppings => {
      const category = prevToppings.find(cat => cat.categoryId === categoryId);
      if (category) {
        const toppingExists = category.toppingIds.includes(toppingId);
        if (toppingExists) {
          return prevToppings.map(cat => cat.categoryId === categoryId ? {
            ...cat,
            toppingIds: cat.toppingIds.filter(id => id !== toppingId)
          } : cat).filter(cat => cat.toppingIds.length > 0);
        } else {
          return prevToppings.map(cat => cat.categoryId === categoryId ? {
            ...cat,
            toppingIds: [...cat.toppingIds, toppingId]
          } : cat);
        }
      } else {
        return [...prevToppings, {
          categoryId: categoryId,
          toppingIds: [toppingId]
        }];
      }
    });
  };
  const isToppingSelected = (categoryId: string, toppingId: string) => {
    const category = selectedToppings.find(cat => cat.categoryId === categoryId);
    return !!category && category.toppingIds.includes(toppingId);
  };
  const getCategoryById = (categoryId: string) => {
    return categories.find(cat => cat.id === categoryId);
  };
  const handleRemoveCartItem = (itemId: string) => {
    setCart(cart.filter(item => item.id !== itemId));
  };
  const handlePlaceOrder = async () => {
    if (cart.length === 0) {
      toast({
        title: "Your cart is empty",
        description: "Please add items to your cart before placing an order.",
        variant: "destructive"
      });
      return;
    }
    setPlacingOrder(true);
    try {
      if (!restaurant) {
        throw new Error("Restaurant not loaded");
      }
      const orderData = {
        restaurant_id: restaurant.id,
        total: cart.reduce((acc, item) => acc + item.price, 0),
        customer_name: "Kiosk Order",
        status: 'pending' as OrderStatus
      };
      const newOrder = await createOrder(orderData);
      if (!newOrder) {
        throw new Error("Failed to create order");
      }
      const orderItemsData = cart.map(cartItem => ({
        order_id: newOrder.id,
        menu_item_id: cartItem.menuItem.id,
        quantity: cartItem.quantity,
        price: cartItem.price,
        special_instructions: cartItem.specialInstructions || null
      }));
      const newOrderItems = await createOrderItems(orderItemsData);
      if (!newOrderItems) {
        throw new Error("Failed to create order items");
      }
      for (const cartItem of cart) {
        if (cartItem.options && cartItem.options.length > 0) {
          for (const option of cartItem.options) {
            for (const choiceId of option.choiceIds) {
              const orderItem = newOrderItems.find(item => item.menu_item_id === cartItem.menuItem.id);
              if (orderItem) {
                const orderItemOptionData = [{ 
                  order_item_id: orderItem.id, 
                  option_id: option.optionId, 
                  choice_id: choiceId 
                }];
                await createOrderItemOptions(orderItemOptionData);
              }
            }
          }
        }
        if (cartItem.toppings && cartItem.toppings.length > 0) {
          for (const toppingCategory of cartItem.toppings) {
            for (const toppingId of toppingCategory.toppingIds) {
              const orderItem = newOrderItems.find(item => item.menu_item_id === cartItem.menuItem.id);
              if (orderItem) {
                const orderItemToppingData = [{ 
                  order_item_id: orderItem.id,
                  topping_id: toppingId 
                }];
                await createOrderItemToppings(orderItemToppingData);
              }
            }
          }
        }
      }
      setCart([]);
      setOrderPlaced(true);
      toast({
        title: "Order Placed!",
        description: "Your order has been placed successfully.",
        duration: 5000
      });
    } catch (error) {
      console.error("Error placing order:", error);
      toast({
        title: "Error Placing Order",
        description: "There was an error placing your order. Please try again.",
        variant: "destructive"
      });
    } finally {
      setPlacingOrder(false);
    }
  };
  const handleStartNewOrder = () => {
    setOrderPlaced(false);
    setShowWelcome(true);
    setOrderType(null);
    setTableNumber(null);
  };
  const handleSelectOrderType = (type: OrderType, table: string | null = null) => {
    setOrderType(type);
    setTableNumber(table);
    setShowOrderTypeSelection(false);
  };
  return (
    <>
      {showWelcome && restaurant && (
        <WelcomePage
          restaurant={restaurant}
          onStart={() => {
            setShowWelcome(false);
            setShowOrderTypeSelection(true);
          }}
        />
      )}
      {showOrderTypeSelection && restaurant && (
        <OrderTypeSelection 
          restaurant={restaurant as any} 
          onSelectOrderType={handleSelectOrderType as any} 
        />
      )}
      {!showWelcome && !showOrderTypeSelection && restaurant && !orderPlaced && (
        <div className="container mx-auto px-4 py-8">
          <div className="mb-6 flex items-center justify-between">
            <Button variant="ghost" onClick={() => {
              setShowWelcome(true);
              setOrderType(null);
              setTableNumber(null);
            }}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t("backToHome")}
            </Button>
            <div className="flex items-center space-x-4">
              <Button variant="secondary" onClick={() => setIsCartOpen(true)}>
                <ShoppingCart className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">View Cart</span>
                <CartButton cart={cart as any} />
              </Button>
              <select className="rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0 capitalize" value={uiLanguage} onChange={e => setUiLanguage(e.target.value as "fr" | "en" | "tr")}>
                <option value="fr">Français</option>
                <option value="en">English</option>
                <option value="tr">Türkçe</option>
              </select>
            </div>
          </div>
          <h1 className="text-3xl font-bold mb-4">{restaurant.name}</h1>
          <p className="text-muted-foreground mb-4">
            {restaurant.location}
            <span className="ml-2 inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
              <Clock className="mr-1.5 h-3 w-3" />
              {t("open")}
            </span>
          </p>
          {orderType && (
            <div className="mb-4">
              {orderType === "dine_in" && (
                <Badge variant="secondary">
                  <UtensilsCrossed className="mr-2 h-4 w-4" />
                  {t("dineIn")} {tableNumber && `${t("table")} ${tableNumber}`}
                </Badge>
              )}
              {orderType === "takeaway" && (
                <Badge variant="secondary">
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  {t("takeaway")}
                </Badge>
              )}
            </div>
          )}
          <h2 className="text-2xl font-semibold mb-4">{t("menu")}</h2>
          {loading ? (
            <div className="flex justify-center items-center">
              <Loader2 className="mr-2 h-6 w-6 animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {categories.map(category => (
                <div key={category.id}>
                  <h3 className="text-xl font-semibold mb-2 flex items-center">
                    {getIconComponent(category.icon)}
                    <Button variant="link" onClick={() => setActiveCategory(category.id)} className={activeCategory === category.id ? "text-kiosk-primary" : ""}>
                      {category.name}
                    </Button>
                  </h3>
                  <div className="grid grid-cols-1 gap-4">
                    {category.items.map(item => (
                      <Card key={item.id} className="shadow-sm hover:shadow-md transition-shadow duration-200">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="text-lg font-medium">{item.name}</h4>
                              <p className="text-sm text-muted-foreground">
                                {getCurrencySymbol(restaurant.currency)}{parseFloat(item.price.toString()).toFixed(2)}
                              </p>
                            </div>
                            {item.image && (
                              <img src={item.image} alt={item.name} className="w-20 h-20 object-cover rounded-md" />
                            )}
                          </div>
                          <Button className="mt-4 w-full bg-kiosk-primary" onClick={() => setSelectedItem(item)}>
                            {t("addToCart")}
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>{selectedItem?.name}</DialogTitle>
            <DialogDescription>
              {selectedItem?.description}
            </DialogDescription>
          </DialogHeader>
          {selectedItem && (
            <div className="py-4">
              {selectedItem.options && selectedItem.options.length > 0 && selectedItem.options.map(option => (
                <div key={option.id} className="mb-4">
                  <Label className="block font-semibold mb-2">{option.name} {option.required && <span className="text-red-500">*</span>}</Label>
                  {option.multiple ? (
                    <>
                      <p className="text-sm text-muted-foreground">{t("multipleSelection")} - {t("selectUpTo")} {option.choices.length}</p>
                      <div className="grid grid-cols-2 gap-2">
                        {option.choices.map(choice => (
                          <Button key={choice.id} variant={isChoiceSelected(option.id, choice.id) ? "secondary" : "outline"} onClick={() => handleOptionSelect(option.id, choice.id)}>
                            {choice.name} {choice.price !== null && `(+${getCurrencySymbol(restaurant.currency)}${choice.price.toFixed(2)})`}
                          </Button>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {option.choices.map(choice => (
                        <Button key={choice.id} variant={isChoiceSelected(option.id, choice.id) ? "secondary" : "outline"} onClick={() => handleOptionSelect(option.id, choice.id)}>
                          {choice.name} {choice.price !== null && `(+${getCurrencySymbol(restaurant.currency)}${choice.price.toFixed(2)})`}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {categories.map(category => {
                if (!Array.isArray(category.items)) {
                  return null;
                }
                const toppings = category.items.filter(item => selectedItem.topping_categories?.includes(category.id));
                if (toppings.length === 0) {
                  return null;
                }
                return (
                  <div key={category.id} className="mb-4">
                    <Label className="block font-semibold mb-2">{category.name}</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {toppings.map(topping => (
                        <Button key={topping.id} variant={isToppingSelected(category.id, topping.id) ? "secondary" : "outline"} onClick={() => handleToppingSelect(category.id, topping.id)}>
                          {topping.name} (+{getCurrencySymbol(restaurant.currency)}{topping.price.toFixed(2)})
                        </Button>
                      ))}
                    </div>
                  </div>
                );
              })}
              <Label className="block font-semibold mb-2">{t("quantity")}</Label>
              <div className="flex items-center space-x-2 mb-4">
                <Button variant="outline" onClick={handleDecrement} disabled={quantity <= 1}>
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="font-semibold">{quantity}</span>
                <Button variant="outline" onClick={handleIncrement}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <Label htmlFor="specialInstructions" className="block font-semibold mb-2">Special Instructions</Label>
              <textarea id="specialInstructions" className="w-full border rounded-md p-2" value={specialInstructions} onChange={e => setSpecialInstructions(e.target.value)} placeholder="Any special requests?" />
            </div>
          )}
          <DialogFooter>
            <Button type="submit" className="w-full bg-kiosk-primary" onClick={() => {
              if (selectedItem) {
                handleAddToCart(selectedItem);
              }
            }}>
              {t("addToCart")} - {getCurrencySymbol(restaurant.currency)}{selectedItem ? calculateTotalPrice(selectedItem).toFixed(2) : "0.00"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isCartOpen} onOpenChange={() => setIsCartOpen(false)}>
        <DialogContent className="sm:max-w-[625px]">
          <DialogHeader>
            <DialogTitle>Your Cart</DialogTitle>
            <DialogDescription>
              Review and confirm your order.
            </DialogDescription>
          </DialogHeader>
          <Cart 
            cart={cart} 
            restaurant={restaurant} 
            onRemoveItem={handleRemoveCartItem}
            isOpen={true}
            onToggleOpen={() => {}}
            onUpdateQuantity={() => {}}
            onClearCart={() => {}}
            onPlaceOrder={() => {}}
            placingOrder={false}
            orderPlaced={false}
            calculateSubtotal={() => 0}
            calculateTax={() => 0}
            getFormattedOptions={() => ""}
            getFormattedToppings={() => ""}
          />
          <DialogFooter>
            <Button type="submit" className="w-full bg-kiosk-primary" onClick={handlePlaceOrder} disabled={placingOrder}>
              {placingOrder ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Placing Order...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Place Order
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={orderPlaced} onOpenChange={() => setOrderPlaced(false)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Order Confirmation</DialogTitle>
            <DialogDescription>
              Thank you for your order!
            </DialogDescription>
          </DialogHeader>
          <OrderReceipt 
            cart={cart} 
            restaurant={restaurant} 
            orderNumber="12345" 
            orderType="dine-in"
            getFormattedOptions={() => ""}
            getFormattedToppings={() => ""}
          />
          <DialogFooter>
            <Button type="submit" className="w-full bg-kiosk-primary" onClick={handleStartNewOrder}>
              Start New Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default KioskView;
