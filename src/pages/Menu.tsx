import { useEffect, useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowRight, Edit, Plus, Trash2, Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from "@/components/ui/select";
import { getIconComponent } from "@/utils/icon-mapping";
import { 
  getRestaurants, 
  getCategoriesByRestaurantId, 
  getMenuItemsByCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  getToppingCategoriesByRestaurantId,
  getMenuItemById,
  updateMenuItem,
  createMenuItem,
  deleteMenuItem
} from "@/services/kiosk-service";
import { Restaurant, MenuCategory, MenuItem, ToppingCategory } from "@/types/database-types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import CategoryForm from "@/components/forms/CategoryForm";
import MenuItemForm from "@/components/forms/MenuItemForm";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const MenuPage = () => {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState<string | null>(null);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [menuItems, setMenuItems] = useState<Record<string, MenuItem[]>>({});
  const [loading, setLoading] = useState(true);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [savingCategory, setSavingCategory] = useState(false);
  const [toppingCategories, setToppingCategories] = useState<ToppingCategory[]>([]);
  const [editingMenuItem, setEditingMenuItem] = useState<MenuItem | null>(null);
  const [isAddingMenuItem, setIsAddingMenuItem] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [savingMenuItem, setSavingMenuItem] = useState(false);
  const [confirmDeleteItem, setConfirmDeleteItem] = useState<MenuItem | null>(null);
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
        console.log("Fetching categories for restaurant ID:", selectedRestaurant);
        const data = await getCategoriesByRestaurantId(selectedRestaurant);
        console.log("Fetched categories:", data);
        setCategories(data);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching categories:", error);
        toast({
          title: "Error",
          description: "Failed to fetch menu categories. Please try again.",
          variant: "destructive"
        });
        setLoading(false);
      }
    };

    fetchCategories();
  }, [selectedRestaurant, toast]);

  useEffect(() => {
    const fetchToppingCategories = async () => {
      if (!selectedRestaurant) return;
      
      try {
        console.log("Fetching topping categories for restaurant ID:", selectedRestaurant);
        const data = await getToppingCategoriesByRestaurantId(selectedRestaurant);
        console.log("Fetched topping categories:", data);
        setToppingCategories(data);
      } catch (error) {
        console.error("Error fetching topping categories:", error);
      }
    };

    fetchToppingCategories();
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

  const getToppingCategoryName = (id: string) => {
    const category = toppingCategories.find(tc => tc.id === id);
    return category ? category.name : "";
  };

  const handleAddCategory = async (values: any) => {
    try {
      setSavingCategory(true);
      
      if (!selectedRestaurant) {
        throw new Error("No restaurant selected");
      }
      
      console.log("Adding category for restaurant:", selectedRestaurant);
      const newCategory = await createCategory({
        name: values.name,
        description: values.description || null,
        image_url: values.image_url || null,
        icon: "utensils", // Default icon
        restaurant_id: selectedRestaurant
      });
      
      console.log("New category created:", newCategory);
      setCategories([...categories, newCategory]);
      
      toast({
        title: "Category Added",
        description: `${values.name} has been added to your menu categories.`,
      });
      
      setIsAddingCategory(false);
    } catch (error) {
      console.error("Error adding category:", error);
      toast({
        title: "Error",
        description: "Failed to add the category. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSavingCategory(false);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    try {
      setLoading(true);
      
      await deleteCategory(categoryId);
      
      setCategories(categories.filter(cat => cat.id !== categoryId));
      
      toast({
        title: "Category Deleted",
        description: "The category has been deleted.",
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

  const handleAddMenuItem = async (values: any) => {
    if (!selectedCategory) return;
    
    try {
      setSavingMenuItem(true);
      
      const newMenuItem = await createMenuItem({
        name: values.name,
        description: values.description || null,
        price: parseFloat(values.price),
        promotion_price: values.promotion_price ? parseFloat(values.promotion_price) : null,
        image: values.image || null,
        category_id: selectedCategory,
        topping_categories: values.topping_categories || [],
        tax_percentage: values.tax_percentage
      });
      
      setMenuItems(prev => ({
        ...prev,
        [selectedCategory]: [...(prev[selectedCategory] || []), newMenuItem]
      }));
      
      toast({
        title: "Success",
        description: `${values.name} has been added to your menu.`,
      });
      
      setIsAddingMenuItem(false);
    } catch (error) {
      console.error("Error adding menu item:", error);
      toast({
        title: "Error",
        description: "Failed to add the menu item. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSavingMenuItem(false);
    }
  };

  const handleEditMenuItem = async (values: any) => {
    if (!editingMenuItem) return;
    
    try {
      setSavingMenuItem(true);
      
      const updatedMenuItem = await updateMenuItem(editingMenuItem.id, {
        name: values.name,
        description: values.description || null,
        price: parseFloat(values.price),
        promotion_price: values.promotion_price ? parseFloat(values.promotion_price) : null,
        image: values.image || null,
        topping_categories: values.topping_categories || [],
        tax_percentage: values.tax_percentage
      });
      
      const categoryId = editingMenuItem.category_id;
      setMenuItems(prev => {
        const updatedItems = prev[categoryId]?.map(item => 
          item.id === updatedMenuItem.id ? updatedMenuItem : item
        ) || [];
        
        return {
          ...prev,
          [categoryId]: updatedItems
        };
      });
      
      toast({
        title: "Success",
        description: `${values.name} has been updated.`,
      });
      
      setEditingMenuItem(null);
    } catch (error) {
      console.error("Error updating menu item:", error);
      toast({
        title: "Error",
        description: "Failed to update the menu item. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSavingMenuItem(false);
    }
  };

  const handleDeleteMenuItem = async () => {
    if (!confirmDeleteItem) return;
    
    try {
      setLoading(true);
      
      await deleteMenuItem(confirmDeleteItem.id);
      
      const categoryId = confirmDeleteItem.category_id;
      setMenuItems(prev => {
        const updatedItems = prev[categoryId]?.filter(item => 
          item.id !== confirmDeleteItem.id
        ) || [];
        
        return {
          ...prev,
          [categoryId]: updatedItems
        };
      });
      
      toast({
        title: "Success",
        description: "Menu item deleted successfully.",
      });
      
      setConfirmDeleteItem(null);
    } catch (error) {
      console.error("Error deleting menu item:", error);
      toast({
        title: "Error",
        description: "Failed to delete the menu item. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchMenuItemDetails = async (itemId: string) => {
    try {
      const menuItem = await getMenuItemById(itemId);
      if (menuItem) {
        setEditingMenuItem(menuItem);
      }
    } catch (error) {
      console.error("Error fetching menu item details:", error);
      toast({
        title: "Error",
        description: "Failed to fetch menu item details.",
        variant: "destructive"
      });
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
          <Dialog open={isAddingCategory} onOpenChange={setIsAddingCategory}>
            <DialogTrigger asChild>
              <Button className="bg-kiosk-primary">
                <Plus className="mr-2 h-4 w-4" />
                Add Category
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add Menu Category</DialogTitle>
                <DialogDescription>Create a new menu category for your restaurant.</DialogDescription>
              </DialogHeader>
              <CategoryForm 
                onSubmit={handleAddCategory}
                isLoading={savingCategory}
              />
            </DialogContent>
          </Dialog>
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
                <Dialog open={isAddingCategory} onOpenChange={setIsAddingCategory}>
                  <DialogTrigger asChild>
                    <div className="border border-dashed rounded-lg p-4 flex items-center justify-center cursor-pointer hover:bg-slate-50">
                      <Button variant="ghost" className="w-full h-full flex items-center justify-center">
                        <Plus className="mr-2 h-4 w-4" />
                        Add Category
                      </Button>
                    </div>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Add Menu Category</DialogTitle>
                      <DialogDescription>Create a new menu category for your restaurant.</DialogDescription>
                    </DialogHeader>
                    <CategoryForm 
                      onSubmit={handleAddCategory}
                      isLoading={savingCategory}
                    />
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Menu Items</CardTitle>
            </CardHeader>
            <CardContent>
              {categories.length > 0 ? (
                <Tabs defaultValue={categories[0].id} onValueChange={setSelectedCategory}>
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
                                <div className="flex flex-wrap items-center mt-1">
                                  <p className="text-sm font-medium">
                                    €{parseFloat(item.price.toString()).toFixed(2)}
                                    {item.promotion_price && (
                                      <span className="ml-2 line-through text-muted-foreground">
                                        €{parseFloat(item.promotion_price.toString()).toFixed(2)}
                                      </span>
                                    )}
                                  </p>
                                  {item.topping_categories && item.topping_categories.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-1 ml-2">
                                      {item.topping_categories.map((categoryId) => (
                                        <Badge 
                                          key={categoryId} 
                                          className="bg-[#D6BCFA] text-[#4C1D95] hover:bg-[#D6BCFA]/80"
                                        >
                                          {getToppingCategoryName(categoryId)}
                                        </Badge>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex space-x-2 mt-4 md:mt-0">
                              <Dialog open={editingMenuItem?.id === item.id} onOpenChange={(open) => !open && setEditingMenuItem(null)}>
                                <DialogTrigger asChild>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => fetchMenuItemDetails(item.id)}
                                  >
                                    <Edit className="h-4 w-4 mr-2" />
                                    Edit
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[425px]">
                                  <DialogHeader>
                                    <DialogTitle>Edit Menu Item</DialogTitle>
                                    <DialogDescription>Make changes to this menu item.</DialogDescription>
                                  </DialogHeader>
                                  {editingMenuItem && (
                                    <MenuItemForm 
                                      onSubmit={handleEditMenuItem}
                                      initialValues={{
                                        name: editingMenuItem.name,
                                        description: editingMenuItem.description || "",
                                        price: editingMenuItem.price.toString(),
                                        promotion_price: editingMenuItem.promotion_price ? editingMenuItem.promotion_price.toString() : "",
                                        image: editingMenuItem.image || "",
                                        topping_categories: editingMenuItem.topping_categories || [],
                                        tax_percentage: editingMenuItem.tax_percentage?.toString() || "10"
                                      }}
                                      isLoading={savingMenuItem}
                                      restaurantId={selectedRestaurant || ""}
                                      menuItemId={editingMenuItem.id}
                                    />
                                  )}
                                </DialogContent>
                              </Dialog>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="text-red-500"
                                onClick={() => setConfirmDeleteItem(item)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </Button>
                            </div>
                          </div>
                        ))}
                        <Dialog open={isAddingMenuItem && selectedCategory === category.id} onOpenChange={(open) => setIsAddingMenuItem(open)}>
                          <DialogTrigger asChild>
                            <div className="border border-dashed rounded-lg p-4 flex items-center justify-center cursor-pointer hover:bg-slate-50">
                              <Button variant="ghost" className="w-full h-full flex items-center justify-center">
                                <Plus className="mr-2 h-4 w-4" />
                                Add Menu Item
                              </Button>
                            </div>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                              <DialogTitle>Add Menu Item</DialogTitle>
                              <DialogDescription>Create a new menu item.</DialogDescription>
                            </DialogHeader>
                            <MenuItemForm 
                              onSubmit={handleAddMenuItem}
                              isLoading={savingMenuItem}
                              restaurantId={selectedRestaurant || ""}
                            />
                          </DialogContent>
                        </Dialog>
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>
              ) : (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No categories found for this restaurant.</p>
                  <Button className="mt-4" onClick={() => setIsAddingCategory(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Category
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <AlertDialog open={!!confirmDeleteItem} onOpenChange={(open) => !open && setConfirmDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Menu Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{confirmDeleteItem?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteMenuItem} className="bg-red-500 text-white hover:bg-red-600">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
};

export default MenuPage;
