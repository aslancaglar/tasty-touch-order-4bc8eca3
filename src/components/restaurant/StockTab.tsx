import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Package, PackageOpen, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { getCategoriesByRestaurantId, getMenuItemsByCategory, getToppingCategoriesByRestaurantId, getToppingsByCategory, updateMenuItem, updateTopping } from "@/services/kiosk-service";
import { Restaurant, MenuCategory, MenuItem, ToppingCategory, Topping } from "@/types/database-types";
import { useIsMobile } from "@/hooks/use-mobile";
import { clearCache } from "@/services/cache-service";
import { CACHE_KEYS } from "@/services/data-preloader";

interface StockTabProps {
  restaurant: Restaurant;
}

const StockTab = ({
  restaurant
}: StockTabProps) => {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [toppingCategories, setToppingCategories] = useState<ToppingCategory[]>([]);
  const [menuItems, setMenuItems] = useState<Record<string, MenuItem[]>>({});
  const [toppings, setToppings] = useState<Record<string, Topping[]>>({});
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedToppingCategory, setSelectedToppingCategory] = useState<string | null>(null);
  const isMobile = useIsMobile();
  
  const { toast } = useToast();
  
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await getCategoriesByRestaurantId(restaurant.id);
        // Sort categories by display_order
        const sortedCategories = [...data].sort((a, b) => 
          (a.display_order || 0) - (b.display_order || 0)
        );
        setCategories(sortedCategories);
        if (sortedCategories.length > 0) {
          setSelectedCategory(sortedCategories[0].id);
        }
      } catch (error) {
        console.error("Error fetching categories:", error);
        toast({
          title: "Error",
          description: "Failed to load categories",
          variant: "destructive"
        });
      }
    };
    
    const fetchToppingCategories = async () => {
      try {
        const data = await getToppingCategoriesByRestaurantId(restaurant.id);
        // Sort topping categories by display_order
        const sortedCategories = [...data].sort((a, b) => 
          (a.display_order || 0) - (b.display_order || 0)
        );
        setToppingCategories(sortedCategories);
        if (sortedCategories.length > 0) {
          setSelectedToppingCategory(sortedCategories[0].id);
        }
      } catch (error) {
        console.error("Error fetching topping categories:", error);
        toast({
          title: "Error",
          description: "Failed to load topping categories",
          variant: "destructive"
        });
      }
    };
    
    fetchCategories();
    fetchToppingCategories();
  }, [restaurant.id, toast]);

  useEffect(() => {
    const fetchMenuItems = async () => {
      if (!selectedCategory) return;
      
      try {
        setLoading(true);
        const items = await getMenuItemsByCategory(selectedCategory);
        // Sort menu items by display_order
        const sortedItems = [...items].sort((a, b) => 
          (a.display_order || 0) - (b.display_order || 0)
        );
        setMenuItems(prev => ({
          ...prev,
          [selectedCategory]: sortedItems
        }));
        setLoading(false);
      } catch (error) {
        console.error(`Error fetching menu items for category ${selectedCategory}:`, error);
        toast({
          title: "Error",
          description: "Failed to load menu items",
          variant: "destructive"
        });
        setLoading(false);
      }
    };
    
    if (selectedCategory) {
      fetchMenuItems();
    }
  }, [selectedCategory, toast]);

  useEffect(() => {
    const fetchToppings = async () => {
      if (!selectedToppingCategory) return;
      
      try {
        setLoading(true);
        const items = await getToppingsByCategory(selectedToppingCategory);
        // Sort toppings by display_order
        const sortedToppings = [...items].sort((a, b) => 
          (a.display_order || 0) - (b.display_order || 0)
        );
        setToppings(prev => ({
          ...prev,
          [selectedToppingCategory]: sortedToppings
        }));
        setLoading(false);
      } catch (error) {
        console.error(`Error fetching toppings for category ${selectedToppingCategory}:`, error);
        toast({
          title: "Error",
          description: "Failed to load toppings",
          variant: "destructive"
        });
        setLoading(false);
      }
    };
    
    if (selectedToppingCategory) {
      fetchToppings();
    }
  }, [selectedToppingCategory, toast]);

  const handleMenuItemStockToggle = async (item: MenuItem) => {
    try {
      const updatedItem = await updateMenuItem(item.id, {
        ...item,
        in_stock: !item.in_stock
      });
      
      setMenuItems(prev => ({
        ...prev,
        [item.category_id]: prev[item.category_id].map(menuItem => 
          menuItem.id === item.id ? updatedItem : menuItem
        ).sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
      }));
      
      // Clear cache for this restaurant's menu items when stock changes
      clearCache(restaurant.id, CACHE_KEYS.CATEGORIES);
      clearCache(restaurant.id, `${CACHE_KEYS.MENU_ITEM_PREFIX}${item.id}`);
      
      toast({
        title: "Success",
        description: `${item.name} is now ${!item.in_stock ? 'in' : 'out of'} stock`
      });
    } catch (error) {
      console.error("Error updating stock status:", error);
      toast({
        title: "Error",
        description: "Failed to update stock status",
        variant: "destructive"
      });
    }
  };

  const handleToppingStockToggle = async (topping: Topping) => {
    try {
      const updatedTopping = await updateTopping(topping.id, {
        ...topping,
        in_stock: !topping.in_stock
      });
      
      setToppings(prev => ({
        ...prev,
        [topping.category_id]: prev[topping.category_id].map(t => 
          t.id === topping.id ? updatedTopping : t
        ).sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
      }));
      
      // Clear cache for this restaurant's toppings when stock changes
      clearCache(restaurant.id, CACHE_KEYS.TOPPING_CATEGORIES);
      clearCache(restaurant.id, `${CACHE_KEYS.TOPPINGS_PREFIX}${topping.category_id}`);
      
      toast({
        title: "Success",
        description: `${topping.name} is now ${!topping.in_stock ? 'in' : 'out of'} stock`
      });
    } catch (error) {
      console.error("Error updating topping stock status:", error);
      toast({
        title: "Error",
        description: "Failed to update topping stock status",
        variant: "destructive"
      });
    }
  };

  if (loading && !selectedCategory && !selectedToppingCategory) {
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
          {/* Menu Categories Horizontal Scroll */}
          <div className="overflow-x-auto pb-4">
            <div className="flex space-x-2">
              {categories.map(category => (
                <Button 
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  variant={selectedCategory === category.id ? "default" : "outline"}
                  className="whitespace-nowrap"
                >
                  {category.name}
                  {selectedCategory === category.id && (
                    <ChevronRight className="ml-1 h-4 w-4" />
                  )}
                </Button>
              ))}
            </div>
          </div>

          {/* Selected Category Items */}
          {selectedCategory && menuItems[selectedCategory] && (
            <Card>
              <CardContent className="pt-6">
                <h3 className="text-lg font-semibold mb-4">
                  {categories.find(c => c.id === selectedCategory)?.name}
                </h3>
                <div className="space-y-4">
                  {menuItems[selectedCategory]?.length > 0 ? (
                    menuItems[selectedCategory]?.map(item => (
                      <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
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
                            <span className="text-xs text-muted-foreground">Order: {item.display_order || 0}</span>
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
                    ))
                  ) : (
                    <div className="text-center py-6 text-muted-foreground">
                      No items found in this category
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </TabsContent>

      <TabsContent value="toppings">
        <div className="space-y-6">
          {/* Topping Categories Horizontal Scroll */}
          <div className="overflow-x-auto pb-4">
            <div className="flex space-x-2">
              {toppingCategories.map(category => (
                <Button 
                  key={category.id}
                  onClick={() => setSelectedToppingCategory(category.id)}
                  variant={selectedToppingCategory === category.id ? "default" : "outline"}
                  className="whitespace-nowrap"
                >
                  {category.name}
                  {selectedToppingCategory === category.id && (
                    <ChevronRight className="ml-1 h-4 w-4" />
                  )}
                </Button>
              ))}
            </div>
          </div>

          {/* Selected Topping Category Items */}
          {selectedToppingCategory && toppings[selectedToppingCategory] && (
            <Card>
              <CardContent className="pt-6">
                <h3 className="text-lg font-semibold mb-4">
                  {toppingCategories.find(c => c.id === selectedToppingCategory)?.name}
                </h3>
                <div className="space-y-4">
                  {toppings[selectedToppingCategory]?.length > 0 ? (
                    toppings[selectedToppingCategory]?.map(topping => (
                      <div key={topping.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <p className="font-medium">{topping.name}</p>
                          <div className="flex flex-col xs:flex-row xs:items-center xs:gap-3">
                            <p className="text-sm text-gray-600">
                              €{topping.price.toFixed(2)}
                            </p>
                            <span className="text-xs text-muted-foreground">Order: {topping.display_order || 0}</span>
                          </div>
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
                    ))
                  ) : (
                    <div className="text-center py-6 text-muted-foreground">
                      No toppings found in this category
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </TabsContent>
    </Tabs>
  );
};

export default StockTab;
