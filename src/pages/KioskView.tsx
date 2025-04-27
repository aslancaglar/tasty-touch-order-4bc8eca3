
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";
import { useRestaurant } from "@/contexts/RestaurantContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ShoppingCart } from "lucide-react";
import {
  getMenuForRestaurant,
  getRestaurantBySlug,
  getMenuItemsByCategory
} from "@/services/kiosk-service";
import { Restaurant, MenuCategory, MenuItem } from "@/types/database-types";
import CartContent from "@/components/kiosk/CartContent";
import { Skeleton } from "@/components/ui/skeleton";

interface RouteParams {
  restaurantSlug?: string;
}

const KioskView = () => {
  const { restaurantSlug } = useParams<keyof RouteParams>();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menu, setMenu] = useState<MenuCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<MenuCategory | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { cartItems } = useCart();
  const { setRestaurant: setContextRestaurant } = useRestaurant();

  useEffect(() => {
    const fetchRestaurant = async () => {
      if (!restaurantSlug) return;
      
      try {
        setLoading(true);
        const restaurantData = await getRestaurantBySlug(restaurantSlug);
        
        if (restaurantData) {
          setRestaurant(restaurantData);
          setContextRestaurant(restaurantData);
        } else {
          console.error("Restaurant not found");
        }
        setLoading(false);
      } catch (error) {
        console.error("Error fetching restaurant:", error);
        setLoading(false);
      }
    };

    fetchRestaurant();
  }, [restaurantSlug, setContextRestaurant]);

  useEffect(() => {
    const fetchMenu = async () => {
      if (!restaurant?.id) return;
      
      try {
        setLoading(true);
        const menuData = await getMenuForRestaurant(restaurant.id);
        setMenu(menuData);
        if (menuData.length > 0) {
          setSelectedCategory(menuData[0]);
        }
        setLoading(false);
      } catch (error) {
        console.error("Error fetching menu:", error);
        setLoading(false);
      }
    };

    fetchMenu();
  }, [restaurant]);

  useEffect(() => {
    const fetchMenuItems = async () => {
      if (!selectedCategory) return;
      
      try {
        setLoading(true);
        const items = await getMenuItemsByCategory(selectedCategory.id);
        // Filter out items that are not in stock
        const availableItems = items.filter(item => item.in_stock);
        setMenuItems(availableItems);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching menu items:", error);
        setLoading(false);
      }
    };

    fetchMenuItems();
  }, [selectedCategory]);

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardHeader>
            <CardTitle><Skeleton className="h-6 w-40" /></CardTitle>
            <CardDescription><Skeleton className="h-4 w-60" /></CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-32 w-full rounded-md" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-8 w-full" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!restaurant) {
    return <div className="text-center py-10">Restaurant not found</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>{restaurant.name}</CardTitle>
          <CardDescription>{restaurant.location}</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-1">
            <ScrollArea className="h-[500px] w-full">
              <div className="flex flex-col space-y-2">
                {menu.map((category) => (
                  <Button
                    key={category.id}
                    variant={selectedCategory?.id === category.id ? "secondary" : "outline"}
                    onClick={() => setSelectedCategory(category)}
                    className="justify-start"
                  >
                    {category.name}
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </div>
          <div className="md:col-span-3">
            {selectedCategory ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {menuItems.map((item) => (
                  <Card key={item.id}>
                    <CardHeader>
                      <CardTitle>{item.name}</CardTitle>
                      <CardDescription>{item.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p>Price: ${item.price}</p>
                      <Button>Add to Cart</Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-10">Select a category to view menu items.</div>
            )}
          </div>
        </CardContent>
      </Card>

      <Sheet>
        <SheetTrigger asChild>
          <Button className="fixed bottom-4 right-4 rounded-full bg-kiosk-primary text-white shadow-lg hover:bg-kiosk-primary/80">
            View Cart ({cartItems.length})
            <ShoppingCart className="ml-2 h-4 w-4" />
          </Button>
        </SheetTrigger>
        <SheetContent className="bg-white">
          <SheetHeader>
            <SheetTitle>Shopping Cart</SheetTitle>
            <SheetDescription>
              Review your items and proceed to checkout.
            </SheetDescription>
          </SheetHeader>
          <CartContent />
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default KioskView;
