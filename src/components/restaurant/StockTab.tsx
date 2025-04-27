
import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Package, PackageOpen } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getCategoriesByRestaurantId,
  getMenuItemsByCategory,
  getToppingCategoriesByRestaurantId,
  getToppingsByCategory,
  updateMenuItem,
  updateTopping,
} from "@/services/kiosk-service";
import { Restaurant, MenuCategory, MenuItem, ToppingCategory, Topping } from "@/types/database-types";

interface StockTabProps {
  restaurant: Restaurant;
}

const StockTab = ({ restaurant }: StockTabProps) => {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [toppingCategories, setToppingCategories] = useState<ToppingCategory[]>([]);
  const [menuItems, setMenuItems] = useState<Record<string, MenuItem[]>>({});
  const [toppings, setToppings] = useState<Record<string, Topping[]>>({});
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await getCategoriesByRestaurantId(restaurant.id);
        setCategories(data);
        fetchMenuItems(data);
      } catch (error) {
        console.error("Error fetching categories:", error);
        toast({
          title: "Error",
          description: "Failed to load categories",
          variant: "destructive",
        });
      }
    };

    const fetchToppingCategories = async () => {
      try {
        const data = await getToppingCategoriesByRestaurantId(restaurant.id);
        setToppingCategories(data);
        fetchToppings(data);
      } catch (error) {
        console.error("Error fetching topping categories:", error);
        toast({
          title: "Error",
          description: "Failed to load topping categories",
          variant: "destructive",
        });
      }
    };

    fetchCategories();
    fetchToppingCategories();
  }, [restaurant.id, toast]);

  const fetchMenuItems = async (categories: MenuCategory[]) => {
    try {
      setLoading(true);
      const itemsByCategory: Record<string, MenuItem[]> = {};
      
      for (const category of categories) {
        const items = await getMenuItemsByCategory(category.id);
        itemsByCategory[category.id] = items;
      }
      
      setMenuItems(itemsByCategory);
    } catch (error) {
      console.error("Error fetching menu items:", error);
      toast({
        title: "Error",
        description: "Failed to load menu items",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchToppings = async (categories: ToppingCategory[]) => {
    try {
      const toppingsByCategory: Record<string, Topping[]> = {};
      
      for (const category of categories) {
        const items = await getToppingsByCategory(category.id);
        toppingsByCategory[category.id] = items;
      }
      
      setToppings(toppingsByCategory);
    } catch (error) {
      console.error("Error fetching toppings:", error);
      toast({
        title: "Error",
        description: "Failed to load toppings",
        variant: "destructive",
      });
    }
  };

  const handleMenuItemStockToggle = async (item: MenuItem) => {
    try {
      const updatedItem = await updateMenuItem(item.id, {
        ...item,
        in_stock: !item.in_stock,
      });

      setMenuItems(prev => ({
        ...prev,
        [item.category_id]: prev[item.category_id].map(menuItem =>
          menuItem.id === item.id ? updatedItem : menuItem
        ),
      }));

      toast({
        title: "Success",
        description: `${item.name} is now ${!item.in_stock ? 'in' : 'out of'} stock`,
      });
    } catch (error) {
      console.error("Error updating stock status:", error);
      toast({
        title: "Error",
        description: "Failed to update stock status",
        variant: "destructive",
      });
    }
  };

  const handleToppingStockToggle = async (topping: Topping) => {
    try {
      const updatedTopping = await updateTopping(topping.id, {
        ...topping,
        in_stock: !topping.in_stock,
      });

      setToppings(prev => ({
        ...prev,
        [topping.category_id]: prev[topping.category_id].map(t =>
          t.id === topping.id ? updatedTopping : t
        ),
      }));

      toast({
        title: "Success",
        description: `${topping.name} is now ${!topping.in_stock ? 'in' : 'out of'} stock`,
      });
    } catch (error) {
      console.error("Error updating topping stock status:", error);
      toast({
        title: "Error",
        description: "Failed to update topping stock status",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div>Loading stock management...</div>;
  }

  return (
    <Tabs defaultValue="menu-items">
      <TabsList className="mb-4">
        <TabsTrigger value="menu-items">Menu Items</TabsTrigger>
        <TabsTrigger value="toppings">Toppings</TabsTrigger>
      </TabsList>

      <TabsContent value="menu-items">
        <div className="space-y-6">
          {categories.map((category) => (
            <Card key={category.id} className="p-6">
              <h3 className="text-lg font-semibold mb-4">{category.name}</h3>
              <div className="space-y-4">
                {menuItems[category.id]?.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center space-x-4">
                      {item.image && (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="h-12 w-12 object-cover rounded-md"
                        />
                      )}
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.description}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {item.in_stock ? (
                        <Package className="h-4 w-4 text-green-500" />
                      ) : (
                        <PackageOpen className="h-4 w-4 text-red-500" />
                      )}
                      <Switch
                        checked={item.in_stock}
                        onCheckedChange={() => handleMenuItemStockToggle(item)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </TabsContent>

      <TabsContent value="toppings">
        <div className="space-y-6">
          {toppingCategories.map((category) => (
            <Card key={category.id} className="p-6">
              <h3 className="text-lg font-semibold mb-4">{category.name}</h3>
              <div className="space-y-4">
                {toppings[category.id]?.map((topping) => (
                  <div
                    key={topping.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{topping.name}</p>
                      <p className="text-sm text-gray-600">
                        €{topping.price.toFixed(2)}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {topping.in_stock ? (
                        <Package className="h-4 w-4 text-green-500" />
                      ) : (
                        <PackageOpen className="h-4 w-4 text-red-500" />
                      )}
                      <Switch
                        checked={topping.in_stock}
                        onCheckedChange={() => handleToppingStockToggle(topping)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </TabsContent>
    </Tabs>
  );
};

export default StockTab;
