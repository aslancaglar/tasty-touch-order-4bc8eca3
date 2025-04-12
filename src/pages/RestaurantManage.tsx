import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import AdminLayout from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { 
  ArrowLeft, 
  UtensilsCrossed, 
  Cherry, 
  Plus, 
  Edit, 
  Trash2, 
  Receipt, 
  Settings,
  Utensils
} from "lucide-react";
import { 
  getRestaurants, 
  getCategoriesByRestaurantId, 
  getMenuItemsByCategory, 
  createCategory,
  updateCategory,
  deleteCategory,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  getToppingCategoriesByRestaurantId,
  getToppingsByCategory,
  createToppingCategory,
  updateToppingCategory,
  deleteToppingCategory,
  createTopping,
  updateTopping,
  deleteTopping
} from "@/services/kiosk-service";
import { 
  Restaurant, 
  MenuCategory, 
  MenuItem, 
  OrderStatus, 
  ToppingCategory, 
  Topping 
} from "@/types/database-types";
import { getIconComponent } from "@/utils/icon-mapping";
import ImageUpload from "@/components/ImageUpload";
import CategoryForm from "@/components/forms/CategoryForm";
import MenuItemForm from "@/components/forms/MenuItemForm";
import ToppingCategoryForm from "@/components/forms/ToppingCategoryForm";
import ToppingForm from "@/components/forms/ToppingForm";

type OrderItem = {
  name: string;
  quantity: number;
  price: number;
  options?: string[];
};

type Order = {
  id: string;
  restaurantId: string;
  status: OrderStatus;
  items: OrderItem[];
  total: number;
  date: Date;
  customerName?: string;
};

const mockOrders: Order[] = [
  {
    id: "ORD-1001",
    restaurantId: "1",
    status: "pending",
    items: [
      { name: "Classic Burger", quantity: 2, price: 8.99 },
      { name: "Fries", quantity: 1, price: 3.99 },
    ],
    total: 21.97,
    date: new Date(Date.now() - 1000 * 60 * 5) // 5 minutes ago
  },
];

const statusColors = {
  pending: "bg-yellow-100 text-yellow-800",
  preparing: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800"
};

const RestaurantManage = () => {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState("menu");
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [menuItems, setMenuItems] = useState<Record<string, MenuItem[]>>({});
  const [loading, setLoading] = useState(true);
  
  // Menu category state
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [savingCategory, setSavingCategory] = useState(false);
  const [isEditingCategory, setIsEditingCategory] = useState<string | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
  const [isDeletingCategory, setIsDeletingCategory] = useState(false);
  
  // Menu item state
  const [isAddingMenuItem, setIsAddingMenuItem] = useState(false);
  const [selectedCategoryForItem, setSelectedCategoryForItem] = useState<string | null>(null);
  const [isEditingMenuItem, setIsEditingMenuItem] = useState<string | null>(null);
  const [menuItemToDelete, setMenuItemToDelete] = useState<string | null>(null);
  const [isDeletingMenuItem, setIsDeletingMenuItem] = useState(false);
  const [savingMenuItem, setSavingMenuItem] = useState(false);
  
  // Topping category state
  const [toppingCategories, setToppingCategories] = useState<ToppingCategory[]>([]);
  const [toppings, setToppings] = useState<Record<string, Topping[]>>({});
  const [isAddingToppingCategory, setIsAddingToppingCategory] = useState(false);
  const [savingToppingCategory, setSavingToppingCategory] = useState(false);
  const [isEditingToppingCategory, setIsEditingToppingCategory] = useState<string | null>(null);
  const [toppingCategoryToDelete, setToppingCategoryToDelete] = useState<string | null>(null);
  const [isDeletingToppingCategory, setIsDeletingToppingCategory] = useState(false);
  
  // Topping item state
  const [isAddingTopping, setIsAddingTopping] = useState(false);
  const [selectedCategoryForTopping, setSelectedCategoryForTopping] = useState<string | null>(null);
  const [isEditingTopping, setIsEditingTopping] = useState<string | null>(null);
  const [toppingToDelete, setToppingToDelete] = useState<string | null>(null);
  const [isDeletingTopping, setIsDeletingTopping] = useState(false);
  const [savingTopping, setSavingTopping] = useState(false);
  
  const { toast } = useToast();
  
  useEffect(() => {
    const fetchRestaurant = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        const restaurants = await getRestaurants();
        const foundRestaurant = restaurants.find(r => r.id === id);
        
        if (foundRestaurant) {
          setRestaurant(foundRestaurant);
        } else {
          toast({
            title: "Error",
            description: "Restaurant not found",
            variant: "destructive"
          });
        }
        setLoading(false);
      } catch (error) {
        console.error("Error fetching restaurant:", error);
        toast({
          title: "Error",
          description: "Failed to load restaurant data",
          variant: "destructive"
        });
        setLoading(false);
      }
    };

    fetchRestaurant();
  }, [id, toast]);

  useEffect(() => {
    const fetchCategories = async () => {
      if (!restaurant?.id) return;
      
      try {
        setLoading(true);
        console.log("Fetching categories for restaurant ID:", restaurant.id);
        const data = await getCategoriesByRestaurantId(restaurant.id);
        console.log("Fetched categories:", data);
        setCategories(data);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching categories:", error);
        toast({
          title: "Error",
          description: "Failed to load categories. Please try again.",
          variant: "destructive"
        });
        setLoading(false);
      }
    };

    fetchCategories();
  }, [restaurant, toast]);

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

  // New effect for fetching topping categories
  useEffect(() => {
    const fetchToppingCategories = async () => {
      if (!restaurant?.id) return;
      
      try {
        setLoading(true);
        const data = await getToppingCategoriesByRestaurantId(restaurant.id);
        setToppingCategories(data);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching topping categories:", error);
        toast({
          title: "Error",
          description: "Failed to load topping categories. Please try again.",
          variant: "destructive"
        });
        setLoading(false);
      }
    };

    fetchToppingCategories();
  }, [restaurant, toast]);

  // New effect for fetching toppings
  useEffect(() => {
    const fetchToppings = async () => {
      if (toppingCategories.length === 0) return;
      
      try {
        setLoading(true);
        const toppingsByCategory: Record<string, Topping[]> = {};
        
        for (const category of toppingCategories) {
          const items = await getToppingsByCategory(category.id);
          toppingsByCategory[category.id] = items;
        }
        
        setToppings(toppingsByCategory);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching toppings:", error);
        setLoading(false);
      }
    };

    fetchToppings();
  }, [toppingCategories]);

  const handleSaveRestaurantInfo = () => {
    toast({
      title: "Not Implemented",
      description: "This feature will be implemented in a future update",
    });
  };

  const handleAddCategory = async (values: any) => {
    try {
      setSavingCategory(true);
      
      console.log("Adding new category:", values);
      
      if (!restaurant?.id) {
        throw new Error("Restaurant ID is missing");
      }
      
      const newCategory = await createCategory({
        name: values.name,
        description: values.description || null,
        image_url: values.image_url || null,
        icon: "utensils",
        restaurant_id: restaurant.id
      });
      
      console.log("New category created:", newCategory);
      setCategories(prevCategories => [...prevCategories, newCategory]);
      
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

  const handleEditCategory = async (categoryId: string, values: any) => {
    try {
      setSavingCategory(true);
      
      console.log("Editing category:", categoryId, values);
      
      const updatedCategory = await updateCategory(categoryId, {
        name: values.name,
        description: values.description || null,
        image_url: values.image_url || null,
        icon: values.icon || "utensils"
      });
      
      console.log("Category updated:", updatedCategory);
      setCategories(categories.map(cat => 
        cat.id === categoryId ? updatedCategory : cat
      ));
      
      toast({
        title: "Category Updated",
        description: `${values.name} has been updated.`,
      });
      
      setIsEditingCategory(null);
    } catch (error) {
      console.error("Error updating category:", error);
      toast({
        title: "Error",
        description: "Failed to update the category. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSavingCategory(false);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    try {
      setIsDeletingCategory(true);
      
      console.log("Deleting category:", categoryId);
      await deleteCategory(categoryId);
      
      console.log("Category deleted successfully");
      setCategories(categories.filter(cat => cat.id !== categoryId));
      
      toast({
        title: "Category Deleted",
        description: "The category has been deleted.",
      });
      
      setCategoryToDelete(null);
    } catch (error) {
      console.error("Error deleting category:", error);
      toast({
        title: "Error",
        description: "Failed to delete the category. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsDeletingCategory(false);
    }
  };

  const handleAddMenuItem = async (categoryId: string, values: any) => {
    try {
      setSavingMenuItem(true);
      
      console.log("Adding new menu item:", values);
      
      if (!restaurant?.id) {
        throw new Error("Restaurant ID is missing");
      }
      
      const newMenuItem = await createMenuItem({
        name: values.name,
        description: values.description || null,
        price: Number(values.price),
        promotion_price: values.promotion_price ? Number(values.promotion_price) : null,
        image: values.image || null,
        category_id: categoryId
      });
      
      console.log("New menu item created:", newMenuItem);
      setMenuItems(prev => ({
        ...prev,
        [categoryId]: [...(prev[categoryId] || []), newMenuItem]
      }));
      
      toast({
        title: "Menu Item Added",
        description: `${values.name} has been added to the menu.`,
      });
      
      setIsAddingMenuItem(false);
      setSelectedCategoryForItem(null);
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

  const handleEditMenuItem = async (itemId: string, values: any) => {
    try {
      setSavingMenuItem(true);
      
      console.log("Editing menu item:", itemId, values);
      
      const updatedMenuItem = await updateMenuItem(itemId, {
        name: values.name,
        description: values.description || null,
        price: Number(values.price),
        promotion_price: values.promotion_price ? Number(values.promotion_price) : null,
        image: values.image || null
      });
      
      console.log("Menu item updated:", updatedMenuItem);
      
      setMenuItems(prev => {
        const newState = { ...prev };
        Object.keys(newState).forEach(categoryId => {
          newState[categoryId] = newState[categoryId].map(item => 
            item.id === itemId ? updatedMenuItem : item
          );
        });
        return newState;
      });
      
      toast({
        title: "Menu Item Updated",
        description: `${values.name} has been updated.`,
      });
      
      setIsEditingMenuItem(null);
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

  const handleDeleteMenuItem = async (categoryId: string, itemId: string) => {
    try {
      setIsDeletingMenuItem(true);
      
      console.log("Deleting menu item:", itemId);
      await deleteMenuItem(itemId);
      
      console.log("Menu item deleted successfully");
      setMenuItems(prev => ({
        ...prev,
        [categoryId]: prev[categoryId].filter(item => item.id !== itemId)
      }));
      
      toast({
        title: "Menu Item Deleted",
        description: "The menu item has been deleted.",
      });
      
      setMenuItemToDelete(null);
    } catch (error) {
      console.error("Error deleting menu item:", error);
      toast({
        title: "Error",
        description: "Failed to delete the menu item. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsDeletingMenuItem(false);
    }
  };

  // New handlers for topping categories
  const handleAddToppingCategory = async (values: any) => {
    try {
      setSavingToppingCategory(true);
      
      if (!restaurant?.id) {
        throw new Error("Restaurant ID is missing");
      }
      
      const newCategory = await createToppingCategory({
        name: values.name,
        description: values.description || null,
        icon: values.icon || "cherry",
        min_selections: values.min_selections || 0,
        max_selections: values.max_selections || 0,
        restaurant_id: restaurant.id
      });
      
      setToppingCategories(prevCategories => [...prevCategories, newCategory]);
      
      toast({
        title: "Topping Category Added",
        description: `${values.name} has been added to your topping categories.`,
      });
      
      setIsAddingToppingCategory(false);
    } catch (error) {
      console.error("Error adding topping category:", error);
      toast({
        title: "Error",
        description: "Failed to add the topping category. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSavingToppingCategory(false);
    }
  };

  const handleEditToppingCategory = async (categoryId: string, values: any) => {
    try {
      setSavingToppingCategory(true);
      
      const updatedCategory = await updateToppingCategory(categoryId, {
        name: values.name,
        description: values.description || null,
        icon: values.icon || "cherry",
        min_selections: values.min_selections || 0,
        max_selections: values.max_selections || 0
      });
      
      setToppingCategories(toppingCategories.map(cat => 
        cat.id === categoryId ? updatedCategory : cat
      ));
      
      toast({
        title: "Topping Category Updated",
        description: `${values.name} has been updated.`,
      });
      
      setIsEditingToppingCategory(null);
    } catch (error) {
      console.error("Error updating topping category:", error);
      toast({
        title: "Error",
        description: "Failed to update the topping category. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSavingToppingCategory(false);
    }
  };

  const handleDeleteToppingCategory = async (categoryId: string) => {
    try {
      setIsDeletingToppingCategory(true);
      
      await deleteToppingCategory(categoryId);
      
      setToppingCategories(toppingCategories.filter(cat => cat.id !== categoryId));
      
      toast({
        title: "Topping Category Deleted",
        description: "The topping category has been deleted.",
      });
      
      setToppingCategoryToDelete(null);
    } catch (error) {
      console.error("Error deleting topping category:", error);
      toast({
        title: "Error",
        description: "Failed to delete the topping category. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsDeletingToppingCategory(false);
    }
  };

  // New handlers for toppings
  const handleAddTopping = async (categoryId: string, values: any) => {
    try {
      setSavingTopping(true);
      
      if (!restaurant?.id) {
        throw new Error("Restaurant ID is missing");
      }
      
      const newTopping = await createTopping({
        name: values.name,
        price: Number(values.price),
        category_id: categoryId,
        tax_percentage: 10 // Default tax
      });
      
      setToppings(prev => ({
        ...prev,
        [categoryId]: [...(prev[categoryId] || []), newTopping]
      }));
      
      toast({
        title: "Topping Added",
        description: `${values.name} has been added to the menu.`,
      });
      
      setIsAddingTopping(false);
      setSelectedCategoryForTopping(null);
    } catch (error) {
      console.error("Error adding topping:", error);
      toast({
        title: "Error",
        description: "Failed to add the topping. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSavingTopping(false);
    }
  };

  const handleEditTopping = async (toppingId: string, values: any) => {
    try {
      setSavingTopping(true);
      
      const updatedTopping = await updateTopping(toppingId, {
        name: values.name,
        price: Number(values.price)
      });
      
      setToppings(prev => {
        const newState = { ...prev };
        Object.keys(newState).forEach(categoryId => {
          newState[categoryId] = newState[categoryId].map(item => 
            item.id === toppingId ? updatedTopping : item
          );
        });
        return newState;
      });
      
      toast({
        title: "Topping Updated",
        description: `${values.name} has been updated.`,
      });
      
      setIsEditingTopping(null);
    } catch (error) {
      console.error("Error updating topping:", error);
      toast({
        title: "Error",
        description: "Failed to update the topping. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSavingTopping(false);
    }
  };

  const handleDeleteTopping = async (categoryId: string, toppingId: string) => {
    try {
      setIsDeletingTopping(true);
      
      await deleteTopping(toppingId);
      
      setToppings(prev => ({
        ...prev,
        [categoryId]: prev[categoryId].filter(item => item.id !== toppingId)
      }));
      
      toast({
        title: "Topping Deleted",
        description: "The topping has been deleted.",
      });
      
      setToppingToDelete(null);
    } catch (error) {
      console.error("Error deleting topping:", error);
      toast({
        title: "Error",
        description: "Failed to delete the topping. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsDeletingTopping(false);
    }
  };

  if (loading && !restaurant) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center h-[80vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  if (!restaurant) {
    return (
      <AdminLayout>
        <div className="text-center py-10">
          <h1 className="text-2xl font-bold mb-4">Restaurant not found</h1>
          <Button asChild>
            <Link to="/restaurants">Back to Restaurants</Link>
          </Button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="flex items-center mb-8">
        <Button variant="ghost" asChild className="mr-4">
          <Link to="/restaurants">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Restaurants
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{restaurant.name}</h1>
          <p className="text-muted-foreground">{restaurant.location || "No location set"}</p>
        </div>
      </div>
      
      <Card className="mb-8">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle>Restaurant Management</CardTitle>
            <Button variant="outline" asChild>
              <Link to={`/r/${restaurant.slug}`} target="_blank">
                View Kiosk
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-4 mb-8">
              <TabsTrigger value="menu" className="flex items-center">
                <UtensilsCrossed className="mr-2 h-4 w-4" />
                Menu
              </TabsTrigger>
              <TabsTrigger value="toppings" className="flex items-center">
                <Cherry className="mr-2 h-4 w-4" />
                Toppings
              </TabsTrigger>
              <TabsTrigger value="orders" className="flex items-center">
                <Receipt className="mr-2 h-4 w-4" />
                Orders
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="menu">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Menu Categories</h3>
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
                      </DialogHeader>
                      <CategoryForm 
                        onSubmit={handleAddCategory}
                        isLoading={savingCategory}
                      />
                    </DialogContent>
                  </Dialog>
                </div>
                
                {loading ? (
                  <div className="flex justify-center items-center h-40">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : categories.length > 0 ? (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {categories.map((category) => (
                      <div 
                        key={category.id} 
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-primary/10 rounded-md">
                            {category.icon && getIconComponent(category.icon)}
                          </div>
                          <div>
                            <span className="font-medium">{category.name}</span>
                            {category.description && (
                              <p className="text-xs text-muted-foreground">{category.description}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex space-x-1">
                          <Dialog open={isEditingCategory === category.id} onOpenChange={(open) => setIsEditingCategory(open ? category.id : null)}>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Edit className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[425px]">
                              <DialogHeader>
                                <DialogTitle>Edit Category</DialogTitle>
                              </DialogHeader>
                              <CategoryForm 
                                onSubmit={(values) => handleEditCategory(category.id, values)}
                                initialValues={{
                                  name: category.name,
                                  description: category.description || "",
                                  icon: category.icon || "",
                                  image_url: category.image_url || ""
                                }}
                                isLoading={savingCategory}
                              />
                            </DialogContent>
                          </Dialog>
                          <Dialog open={categoryToDelete === category.id} onOpenChange={(open) => setCategoryToDelete(open ? category.id : null)}>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[425px]">
                              <DialogHeader>
                                <DialogTitle>Delete Category</DialogTitle>
                              </DialogHeader>
                              <div className="py-4">
                                <p>Are you sure you want to delete the category <strong>{category.name}</strong>?</p>
                                <p className="text-sm text-muted-foreground mt-2">This will also delete all menu items in this category.</p>
                              </div>
                              <div className="flex justify-end space-x-2">
                                <Button variant="outline" onClick={() => setCategoryToDelete(null)}>
                                  Cancel
                                </Button>
                                <Button 
                                  variant="destructive" 
                                  onClick={() => handleDeleteCategory(category.id)}
                                  disabled={isDeletingCategory}
                                >
                                  {isDeletingCategory ? (
                                    <>
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                      Deleting...
                                    </>
                                  ) : (
                                    "Delete"
                                  )}
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
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
                        </DialogHeader>
                        <CategoryForm 
                          onSubmit={handleAddCategory}
                          isLoading={savingCategory}
                        />
                      </DialogContent>
                    </Dialog>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-4">No categories found for this restaurant</p>
                    <Dialog open={isAddingCategory} onOpenChange={setIsAddingCategory}>
                      <DialogTrigger asChild>
                        <Button className="bg-kiosk-primary">
                          <Plus className="mr-2 h-4 w-4" />
                          Add First Category
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                          <DialogTitle>Add Your First Menu Category</DialogTitle>
                        </DialogHeader>
                        <CategoryForm 
                          onSubmit={handleAddCategory}
                          isLoading={savingCategory}
                        />
                      </DialogContent>
                    </Dialog>
                  </div>
                )}

                {categories.length > 0 && (
                  <>
                    <div className="flex items-center justify-between mt-8">
                      <h3 className="text-lg font-medium">Menu Items</h3>
                      <Button 
                        className="bg-kiosk-primary"
                        onClick={() => {
                          setSelectedCategoryForItem(categories[0].id);
                          setIsAddingMenuItem(true);
                        }}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add Item
                      </Button>
                    </div>
                    
                    {loading ? (
                      <div className="flex justify-center items-center h-40">
                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {categories.map((category) => {
                          const items = menuItems[category.id] || [];
                          
                          if (items.length === 0) {
                            return (
                              <div key={category.id} className="text-center py-4 border rounded-lg">
                                <p className="text-muted-foreground mb-4">No items in {category.name}</p>
                                <Button 
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedCategoryForItem(category.id);
                                    setIsAddingMenuItem(true);
                                  }}
                                >
                                  <Plus className="mr-2 h-4 w-4" />
                                  Add Item to {category.name}
                                </Button>
                              </div>
                            );
                          }
                          
                          return (
                            <div key={category.id} className="space-y-2">
                              <h4 className="font-medium text-sm text-muted-foreground">{category.name}</h4>
                              {items.map(item => (
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
                                      <p className="text-sm font-medium mt-1">
                                        ${parseFloat(item.price.toString
