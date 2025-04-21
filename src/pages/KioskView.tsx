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

  // Helper function to filter topping categories based on option choices
  function getVisibleToppingCategories(
    toppingCategories: {
      id: string;
      name: string;
      min_selections: number;
      max_selections: number;
      required: boolean;
      toppings: {
        id: string;
        name: string;
        price: number;
        tax_percentage: number;
      }[];
      show_if_selection_id?: string[]; // expects an array of option choice ids
    }[],
    selectedOptions: {
      optionId: string;
      choiceIds: string[];
    }[]
  ) {
    // Flatten all selected choice ids from all selected options
    const allSelectedChoiceIds = selectedOptions.flatMap(opt => opt.choiceIds);

    // Filter topping categories based on their show_if_selection_id property
    return toppingCategories.filter(category => {
      // If no show_if_selection_id property, show this category (it's not conditional)
      if (!category.show_if_selection_id || category.show_if_selection_id.length === 0) {
        return true;
      }
      // Otherwise, check if at least one of the show_if_selection_id values is selected
      return category.show_if_selection_id.some(showId => allSelectedChoiceIds.includes(showId));
    });
  }

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

  // ... rest of the code remains the same ...
};
