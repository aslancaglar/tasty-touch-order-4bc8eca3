import { useEffect, useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowRight, Edit, Plus, Trash2, Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from "@/components/ui/select";
import { getIconComponent } from "@/utils/icon-mapping";
import { getRestaurants, getCategoriesByRestaurantId, getMenuItemsByCategory, deleteCategory } from "@/services/kiosk-service";
import { Restaurant, MenuCategory, MenuItem } from "@/types/database-types";
import { useToast } from "@/hooks/use-toast";

const MenuPage = () => {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState<string | null>(null);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [menuItems, setMenuItems] = useState<Record<string, MenuItem[]>>({});
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchRestaurants = async () => {
      try {
        const data = await getRestaurants();
        setRestaurants(data);
        if (data.length > 0) {
          setSelectedRestaurant(data[0].id);
        }
        setLoading(false);
      } catch (error) {
        console.error("Error fetching restaurants:", error);
        setLoading(false);
      }
    };

    fetchRestaurants();
  }, []);

  useEffect(() => {
    const fetchCategories = async () => {
      if (!selectedRestaurant) return;
      
      try {
        setLoading(true);
        const data = await getCategoriesByRestaurantId(selectedRestaurant);
        setCategories(data);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching categories:", error);
        setLoading(false);
      }
    };

    fetchCategories();
  }, [selectedRestaurant]);

  useEffect(() => {
    const fetchMenuItems = async () => {
      if (categories.length === 0) return;
      
      try {
        setLoading(true);
        const itemsByCategory: Record<string, MenuItem[]> = {};
        
        for (const category of categories) {
          const items = await getMenuItemsByCategory(category.id);
          itemsByCategory[category.id] = items;
        }
        
        setMenuItems(itemsByCategory);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching menu items:", error);
        setLoading(false);
      }
    };

    fetchMenuItems();
  }, [categories]);

  const handleRestaurantChange = (value: string) => {
    setSelectedRestaurant(value);
  };

  const handleDeleteCategory = async (categoryId: string) => {
    try {
      setLoading(true);
      
      console.log(`Starting deletion process for category: ${categoryId}`);
      await deleteCategory(categoryId);
      console.log(`Category successfully deleted: ${categoryId}`);
      
      // Update local state to reflect the deletion
      setCategories(prevCategories => {
        const updatedCategories = prevCategories.filter(cat => cat.id !== categoryId);
        console.log("Updated categories after deletion:", updatedCategories);
        return updatedCategories;
      });
      
      // Also update menuItems state to remove items from deleted category
      setMenuItems(prev => {
        const updatedItems = { ...prev };
        delete updatedItems[categoryId];
        console.log("Updated menu items after category deletion:", updatedItems);
        return updatedItems;
      });
      
      toast({
        title: "Category Deleted",
        description: "The category and its items have been deleted successfully.",
      });
    } catch (error) {
      console.error("Error deleting category:", error);
      toast({
        title: "Error",
        description: "Failed to delete the category. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading && restaurants.length === 0) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center h-[80vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Menu Management</h1>
          <p className="text-muted-foreground">
            Manage your restaurant's menu categories and items
          </p>
        </div>
        <div className="flex space-x-2 mt-4 sm:mt-0">
          <Select value={selectedRestaurant || ""} onValueChange={handleRestaurantChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select Restaurant" />
            </SelectTrigger>
            <SelectContent>
              {restaurants.map(restaurant => (
                <SelectItem key={restaurant.id} value={restaurant.id}>
                  {restaurant.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button className="bg-kiosk-primary">
            <Plus className="mr-2 h-4 w-4" />
            Add Item
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Categories</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {categories.map((category) => (
                  <div 
                    key={category.id} 
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-primary/10 rounded-md">
                        {getIconComponent(category.icon)}
                      </div>
                      <span className="font-medium">{category.name}</span>
                    </div>
                    <div className="flex space-x-1">
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleDeleteCategory(category.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
                <div className="border border-dashed rounded-lg p-4 flex items-center justify-center">
                  <Button variant="ghost" className="w-full h-full flex items-center justify-center">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Category
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Menu Items</CardTitle>
            </CardHeader>
            <CardContent>
              {categories.length > 0 ? (
                <Tabs defaultValue={categories[0].id}>
                  <TabsList className="mb-4">
                    {categories.map((category) => (
                      <TabsTrigger key={category.id} value={category.id} className="flex items-center">
                        {getIconComponent(category.icon)}
                        <span className="ml-2">{category.name}</span>
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  
                  {categories.map((category) => (
                    <TabsContent key={category.id} value={category.id}>
                      <div className="space-y-4">
                        {menuItems[category.id]?.map(item => (
                          <div 
                            key={item.id} 
                            className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 border rounded-lg"
                          >
                            <div className="flex items-center space-x-4">
                              {item.image && (
                                <img 
                                  src={item.image} 
                                  alt={item.name} 
                                  className="h-16 w-16 object-cover rounded-md"
                                />
                              )}
                              <div>
                                <h3 className="font-medium">{item.name}</h3>
                                <p className="text-sm text-muted-foreground">{item.description}</p>
                                <p className="text-sm font-medium mt-1">${parseFloat(item.price.toString()).toFixed(2)}</p>
                              </div>
                            </div>
                            <div className="flex space-x-2 mt-4 md:mt-0">
                              <Button variant="outline" size="sm">
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </Button>
                              <Button variant="outline" size="sm" className="text-red-500">
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </Button>
                            </div>
                          </div>
                        ))}
                        <div className="border border-dashed rounded-lg p-4 flex items-center justify-center">
                          <Button variant="ghost" className="w-full h-full flex items-center justify-center">
                            <Plus className="mr-2 h-4 w-4" />
                            Add New Item to {category.name}
                          </Button>
                        </div>
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>
              ) : (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No categories found for this restaurant.</p>
                  <Button className="mt-4">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Category
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </AdminLayout>
  );
};

export default MenuPage;
