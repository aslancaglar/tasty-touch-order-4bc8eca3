import { useEffect, useState } from "react";
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
  const {
    toast
  } = useToast();

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
            title: "Restaurant introuvable",
            description: "Désolé, nous n'avons pas pu trouver ce restaurant.",
            variant: "destructive"
          });
          navigate('/');
          return;
        }
        setRestaurant(restaurantData);
        const menuData = await getMenuForRestaurant(restaurantData.id);
        setCategories(menuData);
        if (menuData.length > 0) {
          setActiveCategory(menuData[0].id);
        }
        setLoading(false);
      } catch (error) {
        console.error("Erreur lors du chargement du restaurant et du menu:", error);
        toast({
          title: "Erreur",
          description: "Un problème est survenu lors du chargement du menu. Veuillez réessayer.",
          variant: "destructive"
        });
        setLoading(false);
      }
    };
    fetchRestaurantAndMenu();
  }, [restaurantSlug, navigate, toast]);

  const handleStartOrder = () => {
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
      } = await supabase.from('menu_item_topping_categories').select('topping_category_id').eq('menu_item_id', menuItemId);
      if (toppingCategoriesError) {
        console.error("Erreur lors du chargement des catégories de toppings:", toppingCategoriesError);
        return [];
      }
      if (!menuItemToppingCategories.length) {
        return [];
      }
      const toppingCategoryIds = menuItemToppingCategories.map(mtc => mtc.topping_category_id);
      const {
        data: toppingCategories,
        error: categoriesError
      } = await supabase.from('topping_categories').select('*').in('id', toppingCategoryIds);
      if (categoriesError) {
        console.error("Erreur lors du chargement des détails des catégories de toppings:", categoriesError);
        return [];
      }
      const toppingCategoriesWithToppings = await Promise.all(toppingCategories.map(async category => {
        const {
          data: toppings,
          error: toppingsError
        } = await supabase.from('toppings').select('*').eq('category_id', category.id);
        if (toppingsError) {
          console.error(`Erreur lors du chargement des ingrédients pour la catégorie ${category.id}:`, toppingsError);
          return {
            id: category.id,
            name: category.name,
            min_selections: category.min_selections || 0,
            max_selections: category.max_selections || 0,
            required: category.min_selections ? category.min_selections > 0 : false,
            toppings: []
          };
        }
        return {
          id: category.id,
          name: category.name,
          min_selections: category.min_selections || 0,
          max_selections: category.max_selections || 0,
          required: category.min_selections ? category.min_selections > 0 : false,
          toppings: toppings.map(topping => ({
            id: topping.id,
            name: topping.name,
            price: topping.price,
            tax_percentage: topping.tax_percentage || 0
          }))
        };
      }));
      return toppingCategoriesWithToppings;
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
      const itemWithToppings: MenuItemWithOptions = {
        ...(itemWithOptions as MenuItemWithOptions),
        toppingCategories
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
      if (toppingCategories.length > 0) {
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
            if (category.toppingIds.length >= toppingCategory.max_selections) {
              toast({
                title: "Nombre maximum de sélections atteint",
                description: `Vous ne pouvez sélectionner que ${toppingCategory.max_selections} éléments dans cette catégorie.`
              });
              return prev;
            }
          }
        }
        newToppingIds = [...category.toppingIds, toppingId];
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
      if (category.min_selections <= 0) return true;
      const selected = selectedToppings.find(t => t.categoryId === category.id);
      return selected && selected.toppingIds.length >= category.min_selections;
    }) ?? true;
    
    if (!isOptionsValid || !isToppingsValid) {
      toast({
        title: "Sélections requises",
        description: "Veuillez faire toutes les sélections requises avant d'ajouter au panier",
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
      title: "Ajouté au panier",
      description: `${quantity}x ${selectedItem.name} ajouté à votre commande`
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
        title: "Commande passée",
        description: "Votre commande a été passée avec succès !"
      });
      setTimeout(() => {
        setOrderPlaced(false);
        setCart([]);
        setIsCartOpen(false);
        setPlacingOrder(false);
        setShowWelcome(true);
      }, 3000);
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

  if (loading && !restaurant) {
    return <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>;
  }

  if (!restaurant) {
    return <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Restaurant introuvable</h1>
          <p className="text-gray-500 mb-4">Le restaurant que vous recherchez n'existe pas.</p>
          <Button onClick={() => navigate('/')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour à l'accueil
          </Button>
        </div>
      </div>;
  }

  if (showWelcome) {
    return <WelcomePage restaurant={restaurant} onStart={handleStartOrder} />;
  }

  if (showOrderTypeSelection) {
    return <>
        <div className="fixed inset-0 bg-cover bg-center bg-black/50" style={{
        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.7)), url(${restaurant.image_url || 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?ixlib=rb-1.2.1&auto=format&fit=crop&w=1920&q=80'})`
      }} />
        <OrderTypeSelection isOpen={showOrderTypeSelection} onClose={() => {
        setShowOrderTypeSelection(false);
        setShowWelcome(true);
      }} onSelectOrderType={handleOrderTypeSelected} />
      </>;
  }

  const activeItems = categories.find(c => c.id === activeCategory)?.items || [];
  const cartItemCount = cart.reduce((total, item) => total + item.quantity, 0);
  const cartIsEmpty = cart.length === 0;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="h-48 bg-cover bg-center relative" style={{
      backgroundImage: `url(${restaurant.image_url || 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?ixlib=rb-1.2.1&auto=format&fit=crop&w=1920&q=80'})`
    }}>
        <div className="absolute inset-0 bg-black bg-opacity-50"></div>
        <div className="absolute inset-0 flex items-center p-6">
          <div className="flex items-center">
            <img src={restaurant.image_url || 'https://via.placeholder.com/100'} alt={restaurant.name} className="h-20 w-20 rounded-full border-2 border-white mr-4 object-cover" />
            <div>
              <h1 className="text-white text-3xl font-bold">{restaurant.name}</h1>
              <div className="flex items-center text-white text-sm mt-1">
                <Clock className="h-4 w-4 mr-1" />
                <span>{restaurant.location || 'Ouvert maintenant'}</span>
              </div>
              {orderType && <div className="mt-1 px-3 py-1 bg-white/20 rounded-full text-white text-sm inline-flex items-center">
                  {orderType === 'dine-in' ? <>
                      <span className="mr-1">Sur Place</span>
                      {tableNumber && <span>- Table {tableNumber}</span>}
                    </> : <span>À Emporter</span>}
                </div>}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-64 bg-white border-r border-gray-200 overflow-y-auto">
          <div className="p-4">
            
            <div className="space-y-1">
              {categories.map(category => <button key={category.id} onClick={() => setActiveCategory(category.id)} className={`w-full flex items-center p-3 rounded-lg text-left transition-colors ${activeCategory === category.id ? 'bg-kiosk-primary text-white' : 'hover:bg-gray-100'}`}>
                  <span className="mr-3">
                    {getIconComponent(category.icon, {
                  size: 20,
                  className: activeCategory === category.id ? 'text-white' : 'text-kiosk-primary'
                })}
                  </span>
                  <span className="font-medium">{category.name}</span>
                </button>)}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pb-24">
          <div className="p-6">
            <h2 className="text-xl font-bold mb-4">
              {categories.find(c => c.id === activeCategory)?.name || 'Menu'}
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeItems.map(item => <Card key={item.id} className="overflow-hidden hover:shadow-md transition-shadow">
                  <div className="h-40 bg-cover bg-center" style={{
                backgroundImage: `url(${item.image || 'https://via.placeholder.com/400x300'})`
              }}></div>
                  <div className="p-4">
                    <div className="flex justify-between">
                      <h3 className="font-bold text-lg">{item.name}</h3>
                      <p className="font-bold">{parseFloat(item.price.toString()).toFixed(2)} €</p>
                    </div>
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{item.description}</p>
                    <Button className="w-full mt-4 bg-kiosk-primary" onClick={() => handleSelectItem(item)}>
                      Ajouter à la commande
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </Card>)}
            </div>
          </div>
        </div>
      </div>

      {!isCartOpen && !cartIsEmpty && <CartButton itemCount={cartItemCount} total={calculateCartTotal()} onClick={toggleCart} />}

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
    />

      {selectedItem && <Dialog open={!!selectedItem} onOpenChange={open => !open && setSelectedItem(null)}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{selectedItem.name}</DialogTitle>
              <DialogDescription>{selectedItem.description}</DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
              {selectedItem.options && selectedItem.options.map(option => 
                <div key={option.id} className="space-y-2">
                  <Label className="font-medium">
                    {option.name}
                    {option.required && <span className="text-red-500 ml-1">*</span>}
                    {option.multiple && <span className="text-sm text-gray-500 ml-2">(Sélection multiple)</span>}
                  </Label>
                  <div className="space-y-2">
                    {option.choices.map(choice => {
                const selectedOption = selectedOptions.find(o => o.optionId === option.id);
                const isSelected = selectedOption?.choiceIds.includes(choice.id) || false;
                return <div key={choice.id} className={`
                            flex items-center justify-between p-3 border rounded-md cursor-pointer
                            ${isSelected ? 'border-kiosk-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'}
                          `} onClick={() => handleToggleChoice(option.id, choice.id, !!option.multiple)}>
                          <div className="flex items-center">
                            <div className={`
                              w-5 h-5 mr-3 rounded-full flex items-center justify-center
                              ${isSelected ? 'bg-kiosk-primary text-white' : 'border border-gray-300'}
                            `}>
                              {isSelected && <Check className="h-3 w-3" />}
                            </div>
                            <span>{choice.name}</span>
                          </div>
                          {choice.price && choice.price > 0 && <span>+{parseFloat(choice.price.toString()).toFixed(2)} €</span>}
                        </div>;
              })}
                  </div>
                </div>
              )}

              {selectedItem.toppingCategories && selectedItem.toppingCategories.map(category => (
                <div key={category.id} className="space-y-3">
                  <div className="font-medium flex items-center">
                    {category.name} 
                    {category.required && <span className="text-red-500 ml-1">*</span>}
                    <span className="text-sm text-gray-500 ml-2">
                      {category.max_selections > 0 
                        ? `(Sélectionnez jusqu'à ${category.max_selections})` 
                        : "(Sélection multiple)"}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {category.toppings.map(topping => {
                      const selectedCategory = selectedToppings.find(t => t.categoryId === category.id);
                      const isSelected = selectedCategory?.toppingIds.includes(topping.id) || false;
                      return (
                        <div 
                          key={topping.id} 
                          className="flex items-center justify-between border rounded-md p-3 hover:border-gray-300"
                        >
                          <span>{topping.name}</span>
                          <div className="flex items-center gap-2">
                            {topping.price > 0 && (
                              <span className="text-sm">+{parseFloat(topping.price.toString()).toFixed(2)} €</span>
                            )}
                            <Button 
                              variant="outline" 
                              size="icon" 
                              className={`h-8 w-8 rounded-full ${isSelected ? 'bg-kiosk-primary text-white border-kiosk-primary' : ''}`} 
                              onClick={() => handleToggleTopping(category.id, topping.id)}
                            >
                              {isSelected ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              <div>
                <Label className="font-medium">Quantité</Label>
                <div className="flex items-center space-x-4 mt-2">
                  <Button variant="outline" size="icon" onClick={() => quantity > 1 && setQuantity(quantity - 1)}>
                    <MinusCircle className="h-4 w-4" />
                  </Button>
                  <span className="font-medium text-lg">{quantity}</span>
                  <Button variant="outline" size="icon" onClick={() => setQuantity(quantity + 1)}>
                    <PlusCircle className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <div className="w-full">
                <Button className="w-full bg-kiosk-primary" onClick={handleAddToCart}>
                  Ajouter à la commande - {(calculateItemPrice(selectedItem, selectedOptions, selectedToppings) * quantity).toFixed(2)} €
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>}
    </div>
  );
};

export default KioskView;
