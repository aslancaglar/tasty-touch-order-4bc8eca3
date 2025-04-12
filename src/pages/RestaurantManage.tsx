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
  Coffee, 
  Beef, 
  Pizza, 
  Plus, 
  Edit, 
  Trash2, 
  Receipt, 
  Settings,
  Cherry,
  Utensils,
  Image,
  DollarSign,
  Percent
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
  createToppingCategory,
  updateToppingCategory,
  deleteToppingCategory,
  getToppingsByCategory,
  createTopping,
  updateTopping,
  deleteTopping
} from "@/services/kiosk-service";
import { Restaurant, MenuCategory, MenuItem } from "@/types/database-types";
import { getIconComponent } from "@/utils/icon-mapping";
import ImageUpload from "@/components/ImageUpload";
import CategoryForm from "@/components/forms/CategoryForm";
import MenuItemForm from "@/components/forms/MenuItemForm";
import ToppingCategoryForm from "@/components/forms/ToppingCategoryForm";
import ToppingForm from "@/components/forms/ToppingForm";

type OrderStatus = "pending" | "preparing" | "completed" | "cancelled";

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

type ToppingCategory = {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  restaurant_id: string;
  min_selections: number | null;
  max_selections: number | null;
  created_at: string;
  updated_at: string;
};

type Topping = {
  id: string;
  name: string;
  price: number;
  category_id: string;
  tax_percentage: number | null;
  created_at: string;
  updated_at: string;
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
  
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [savingCategory, setSavingCategory] = useState(false);
  const [isEditingCategory, setIsEditingCategory] = useState<string | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
  const [isDeletingCategory, setIsDeletingCategory] = useState(false);
  
  const [isAddingMenuItem, setIsAddingMenuItem] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [savingMenuItem, setSavingMenuItem] = useState(false);
  const [isEditingMenuItem, setIsEditingMenuItem] = useState<string | null>(null);
  const [menuItemToDelete, setMenuItemToDelete] = useState<string | null>(null);
  const [isDeletingMenuItem, setIsDeletingMenuItem] = useState(false);
  
  const [toppingCategories, setToppingCategories] = useState<ToppingCategory[]>([]);
  const [toppings, setToppings] = useState<Record<string, Topping[]>>({});
  const [isAddingToppingCategory, setIsAddingToppingCategory] = useState(false);
  const [savingToppingCategory, setSavingToppingCategory] = useState(false);
  const [isEditingToppingCategory, setIsEditingToppingCategory] = useState<string | null>(null);
  const [toppingCategoryToDelete, setToppingCategoryToDelete] = useState<string | null>(null);
  const [isDeletingToppingCategory, setIsDeletingToppingCategory] = useState(false);
  
  const [isAddingTopping, setIsAddingTopping] = useState(false);
  const [selectedToppingCategory, setSelectedToppingCategory] = useState<string | null>(null);
  const [savingTopping, setSavingTopping] = useState(false);
  const [isEditingTopping, setIsEditingTopping] = useState<string | null>(null);
  const [toppingToDelete, setToppingToDelete] = useState<string | null>(null);
  const [isDeletingTopping, setIsDeletingTopping] = useState(false);
  
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

  useEffect(() => {
    const fetchToppingCategories = async () => {
      if (!restaurant?.id) return;
      
      try {
        setLoading(true);
        console.log("Fetching topping categories for restaurant ID:", restaurant.id);
        const data = await getToppingCategoriesByRestaurantId(restaurant.id);
        console.log("Fetched topping categories:", data);
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

  const handleAddMenuItem = async (values: any) => {
    try {
      setSavingMenuItem(true);
      
      console.log("Adding new menu item:", values);
      
      if (!restaurant?.id) {
        throw new Error("Restaurant ID is missing");
      }
      
      const tax_percentage = values.tax_percentage || 10;
      
      const newMenuItem = await createMenuItem({
        name: values.name,
        description: values.description || null,
        price: values.price,
        tax_percentage: tax_percentage,
        promotion_price: null,
        image: values.image || null,
        category_id: values.category_id
      });
      
      console.log("New menu item created:", newMenuItem);
      
      setMenuItems(prev => {
        const updatedItems = { ...prev };
        const categoryId = values.category_id;
        
        if (!updatedItems[categoryId]) {
          updatedItems[categoryId] = [];
        }
        
        updatedItems[categoryId] = [...updatedItems[categoryId], newMenuItem];
        return updatedItems;
      });
      
      toast({
        title: "Menu Item Added",
        description: `${values.name} has been added to your menu.`,
      });
      
      setIsAddingMenuItem(false);
      setSelectedCategory(null);
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

  const handleEditMenuItem = async (menuItemId: string, values: any) => {
    try {
      setSavingMenuItem(true);
      
      console.log("Editing menu item:", menuItemId, values);
      
      const tax_percentage = values.tax_percentage || 10;
      
      const updatedMenuItem = await updateMenuItem(menuItemId, {
        name: values.name,
        description: values.description || null,
        price: values.price,
        tax_percentage: tax_percentage,
        image: values.image || null,
        category_id: values.category_id,
        promotion_price: values.promotion_price || null
      });
      
      console.log("Menu item updated:", updatedMenuItem);
      
      setMenuItems(prev => {
        const updatedItems = { ...prev };
        const oldCategoryId = Object.keys(updatedItems).find(categoryId => 
          updatedItems[categoryId].some(item => item.id === menuItemId)
        );
        
        if (oldCategoryId) {
          updatedItems[oldCategoryId] = updatedItems[oldCategoryId].filter(
            item => item.id !== menuItemId
          );
          
          if (!updatedItems[updatedMenuItem.category_id]) {
            updatedItems[updatedMenuItem.category_id] = [];
          }
          
          updatedItems[updatedMenuItem.category_id].push(updatedMenuItem);
        }
        
        return updatedItems;
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

  const handleDeleteMenuItem = async (menuItemId: string) => {
    try {
      setIsDeletingMenuItem(true);
      
      console.log("Deleting menu item:", menuItemId);
      await deleteMenuItem(menuItemId);
      
      console.log("Menu item deleted successfully");
      
      setMenuItems(prev => {
        const updatedItems = { ...prev };
        
        Object.keys(updatedItems).forEach(categoryId => {
          updatedItems[categoryId] = updatedItems[categoryId].filter(
            item => item.id !== menuItemId
          );
        });
        
        return updatedItems;
      });
      
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

  const getMenuItemById = (menuItemId: string): MenuItem | null => {
    for (const categoryId in menuItems) {
      const item = menuItems[categoryId].find(item => item.id === menuItemId);
      if (item) return item;
    }
    return null;
  };

  const handleAddToppingCategory = async (values: any) => {
    try {
      setSavingToppingCategory(true);
      
      console.log("Adding new topping category:", values);
      
      if (!restaurant?.id) {
        throw new Error("Restaurant ID is missing");
      }
      
      const newToppingCategory = await createToppingCategory({
        name: values.name,
        description: values.description || null,
        icon: "utensils",
        restaurant_id: restaurant.id,
        min_selections: values.min_selections || 0,
        max_selections: values.max_selections || null
      });
      
      console.log("New topping category created:", newToppingCategory);
      setToppingCategories(prevCategories => [...prevCategories, newToppingCategory]);
      
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
      
      console.log("Editing topping category:", categoryId, values);
      
      const updatedToppingCategory = await updateToppingCategory(categoryId, {
        name: values.name,
        description: values.description || null,
        icon: "utensils",
        min_selections: values.min_selections || 0,
        max_selections: values.max_selections || null
      });
      
      console.log("Topping category updated:", updatedToppingCategory);
      setToppingCategories(categories => 
        categories.map(cat => 
          cat.id === categoryId ? updatedToppingCategory : cat
        )
      );
      
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
      
      console.log("Deleting topping category:", categoryId);
      await deleteToppingCategory(categoryId);
      
      console.log("Topping category deleted successfully");
      setToppingCategories(categories => categories.filter(cat => cat.id !== categoryId));
      
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

  const handleAddTopping = async (values: any) => {
    try {
      setSavingTopping(true);
      
      console.log("Adding new topping:", values);
      
      if (!restaurant?.id) {
        throw new Error("Restaurant ID is missing");
      }
      
      const newTopping = await createTopping({
        name: values.name,
        price: values.price,
        category_id: values.category_id,
        tax_percentage: values.tax_percentage || 10
      });
      
      console.log("New topping created:", newTopping);
      
      setToppings(prev => {
        const updatedItems = { ...prev };
        const categoryId = values.category_id;
        
        if (!updatedItems[categoryId]) {
          updatedItems[categoryId] = [];
        }
        
        updatedItems[categoryId] = [...updatedItems[categoryId], newTopping];
        return updatedItems;
      });
      
      toast({
        title: "Topping Added",
        description: `${values.name} has been added.`,
      });
      
      setIsAddingTopping(false);
      setSelectedToppingCategory(null);
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
      
      console.log("Editing topping:", toppingId, values);
      
      const updatedTopping = await updateTopping(toppingId, {
        name: values.name,
        price: values.price,
        category_id: values.category_id,
        tax_percentage: values.tax_percentage || 10
      });
      
      console.log("Topping updated:", updatedTopping);
      
      setToppings(prev => {
        const updatedItems = { ...prev };
        const oldCategoryId = Object.keys(updatedItems).find(categoryId => 
          updatedItems[categoryId].some(item => item.id === toppingId)
        );
        
        if (oldCategoryId) {
          updatedItems[oldCategoryId] = updatedItems[oldCategoryId].filter(
            item => item.id !== toppingId
          );
          
          if (!updatedItems[updatedTopping.category_id]) {
            updatedItems[updatedTopping.category_id] = [];
          }
          
          updatedItems[updatedTopping.category_id].push(updatedTopping);
        }
        
        return updatedItems;
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

  const handleDeleteTopping = async (toppingId: string) => {
    try {
      setIsDeletingTopping(true);
      
      console.log("Deleting topping:", toppingId);
      await deleteTopping(toppingId);
      
      console.log("Topping deleted successfully");
      
      setToppings(prev => {
        const updatedItems = { ...prev };
        
        Object.keys(updatedItems).forEach(categoryId => {
          updatedItems[categoryId] = updatedItems[categoryId].filter(
            item => item.id !== toppingId
          );
        });
        
        return updatedItems;
      });
      
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

  const getToppingById = (toppingId: string): Topping | null => {
    for (const categoryId in toppings) {
      const item = toppings[categoryId].find(item => item.id === toppingId);
      if (item) return item;
    }
    return null;
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
                    </Dialog>
                  </div>
                ) : (
                  <div className="text-center py-10">
                    <h4 className="text-lg font-medium mb-2">No categories found</h4>
                    <p className="text-muted-foreground mb-4">Add your first menu category to get started.</p>
                    <Button onClick={() => setIsAddingCategory(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Category
                    </Button>
                  </div>
                )}
                
                {/* Menu Items Section */}
                {categories.length > 0 && (
                  <div className="mt-12">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium">Menu Items</h3>
                      <Dialog open={isAddingMenuItem} onOpenChange={setIsAddingMenuItem}>
                        <DialogTrigger asChild>
                          <Button className="bg-kiosk-primary">
                            <Plus className="mr-2 h-4 w-4" />
                            Add Menu Item
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[500px]">
                          <DialogHeader>
                            <DialogTitle>Add Menu Item</DialogTitle>
                          </DialogHeader>
                          <MenuItemForm 
                            onSubmit={handleAddMenuItem}
                            categories={categories}
                            isLoading={savingMenuItem}
                            initialValues={{
                              category_id: selectedCategory || categories[0]?.id || ""
                            }}
                          />
                        </DialogContent>
                      </Dialog>
                    </div>
                    
                    {categories.map((category) => (
                      <div key={category.id} className="mb-8">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-md font-medium">{category.name}</h4>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setSelectedCategory(category.id);
                              setIsAddingMenuItem(true);
                            }}
                            className="text-xs"
                          >
                            <Plus className="mr-1 h-3 w-3" />
                            Add to {category.name}
                          </Button>
                        </div>
                        
                        {menuItems[category.id]?.length ? (
                          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {menuItems[category.id].map((item) => (
                              <div 
                                key={item.id} 
                                className="border rounded-lg overflow-hidden"
                              >
                                {item.image ? (
                                  <div className="h-32 bg-gray-100 relative">
                                    <img 
                                      src={item.image} 
                                      alt={item.name} 
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                ) : (
                                  <div className="h-32 bg-gray-100 flex items-center justify-center">
                                    <Image className="h-8 w-8 text-gray-400" />
                                  </div>
                                )}
                                <div className="p-4">
                                  <div className="flex justify-between items-start mb-1">
                                    <h5 className="font-medium">{item.name}</h5>
                                    <div className="flex items-center font-medium">
                                      <DollarSign className="h-3 w-3 mr-0.5" />
                                      {Number(item.price).toFixed(2)}
                                    </div>
                                  </div>
                                  
                                  {item.description && (
                                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{item.description}</p>
                                  )}
                                  
                                  <div className="flex items-center text-xs text-muted-foreground mb-3">
                                    <div className="flex items-center mr-3">
                                      <Percent className="h-3 w-3 mr-1" />
                                      Tax: {item.tax_percentage}%
                                    </div>
                                    {item.promotion_price !== null && (
                                      <div className="flex items-center">
                                        <DollarSign className="h-3 w-3 mr-1" />
                                        Promo: {Number(item.promotion_price).toFixed(2)}
                                      </div>
                                    )}
                                  </div>
                                  
                                  <div className="flex justify-end space-x-2">
                                    <Dialog 
                                      open={isEditingMenuItem === item.id} 
                                      onOpenChange={(open) => setIsEditingMenuItem(open ? item.id : null)}
                                    >
                                      <DialogTrigger asChild>
                                        <Button variant="ghost" size="sm">
                                          <Edit className="h-4 w-4" />
                                        </Button>
                                      </DialogTrigger>
                                      <DialogContent className="sm:max-w-[500px]">
                                        <DialogHeader>
                                          <DialogTitle>Edit Menu Item</DialogTitle>
                                        </DialogHeader>
                                        <MenuItemForm 
                                          onSubmit={(values) => handleEditMenuItem(item.id, values)}
                                          categories={categories}
                                          initialValues={{
                                            name: item.name,
                                            description: item.description || "",
                                            price: item.price,
                                            tax_percentage: item.tax_percentage?.toString() || "10",
                                            image: item.image || "",
                                            category_id: item.category_id,
                                            promotion_price: item.promotion_price?.toString() || ""
                                          }}
                                          isLoading={savingMenuItem}
                                        />
                                      </DialogContent>
                                    </Dialog>
                                    
                                    <Dialog 
                                      open={menuItemToDelete === item.id} 
                                      onOpenChange={(open) => setMenuItemToDelete(open ? item.id : null)}
                                    >
                                      <DialogTrigger asChild>
                                        <Button variant="ghost" size="sm">
                                          <Trash2 className="h-4 w-4 text-red-500" />
                                        </Button>
                                      </DialogTrigger>
                                      <DialogContent className="sm:max-w-[425px]">
                                        <DialogHeader>
                                          <DialogTitle>Delete Menu Item</DialogTitle>
                                        </DialogHeader>
                                        <div className="py-4">
                                          <p>Are you sure you want to delete <strong>{item.name}</strong>?</p>
                                          <p className="text-sm text-muted-foreground mt-2">This action cannot be undone.</p>
                                        </div>
                                        <div className="flex justify-end space-x-2">
                                          <Button variant="outline" onClick={() => setMenuItemToDelete(null)}>
                                            Cancel
                                          </Button>
                                          <Button 
                                            variant="destructive" 
                                            onClick={() => handleDeleteMenuItem(item.id)}
                                            disabled={isDeletingMenuItem}
                                          >
                                            {isDeletingMenuItem ? (
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
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="border border-dashed rounded-lg p-6 text-center">
                            <p className="text-muted-foreground mb-4">No menu items in this category yet.</p>
                            <Button 
                              variant="outline" 
                              onClick={() => {
                                setSelectedCategory(category.id);
                                setIsAddingMenuItem(true);
                              }}
                            >
                              <Plus className="mr-2 h-4 w-4" />
                              Add Menu Item
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="toppings">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Topping Categories</h3>
                  <Dialog open={isAddingToppingCategory} onOpenChange={setIsAddingToppingCategory}>
                    <DialogTrigger asChild>
                      <Button className="bg-kiosk-primary">
                        <Plus className="mr-2 h-4 w-4" />
                        Add Topping Category
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                      <DialogHeader>
                        <DialogTitle>Add Topping Category</DialogTitle>
                      </DialogHeader>
                      <ToppingCategoryForm 
                        onSubmit={handleAddToppingCategory}
                        isLoading={savingToppingCategory}
                      />
                    </DialogContent>
                  </Dialog>
                </div>
                
                {loading ? (
                  <div className="flex justify-center items-center h-40">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : toppingCategories.length > 0 ? (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {toppingCategories.map((category) => (
                      <div 
                        key={category.id} 
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-primary/10 rounded-md">
                            <Cherry className="h-4 w-4" />
                          </div>
                          <div>
                            <span className="font-medium">{category.name}</span>
                            {category.description && (
                              <p className="text-xs text-muted-foreground">{category.description}</p>
                            )}
                            <div className="text-xs text-muted-foreground mt-1">
                              {category.min_selections !== null && (
                                <span className="mr-3">Min: {category.min_selections}</span>
                              )}
                              {category.max_selections !== null && (
                                <span>Max: {category.max_selections}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex space-x-1">
                          <Dialog 
                            open={isEditingToppingCategory === category.id} 
                            onOpenChange={(open) => setIsEditingToppingCategory(open ? category.id : null)}
                          >
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Edit className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[425px]">
                              <DialogHeader>
                                <DialogTitle>Edit Topping Category</DialogTitle>
                              </DialogHeader>
                              <ToppingCategoryForm 
                                onSubmit={(values) => handleEditToppingCategory(category.id, values)}
                                initialValues={{
                                  name: category.name,
                                  description: category.description || "",
                                  min_selections: category.min_selections,
                                  max_selections: category.max_selections
                                }}
                                isLoading={savingToppingCategory}
                              />
                            </DialogContent>
                          </Dialog>
                          
                          <Dialog 
                            open={toppingCategoryToDelete === category.id} 
                            onOpenChange={(open) => setToppingCategoryToDelete(open ? category.id : null)}
                          >
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[425px]">
                              <DialogHeader>
                                <DialogTitle>Delete Topping Category</DialogTitle>
                              </DialogHeader>
                              <div className="py-4">
                                <p>Are you sure you want to delete the category <strong>{category.name}</strong>?</p>
                                <p className="text-sm text-muted-foreground mt-2">This will also delete all toppings in this category.</p>
                              </div>
                              <div className="flex justify-end space-x-2">
                                <Button variant="outline" onClick={() => setToppingCategoryToDelete(null)}>
                                  Cancel
                                </Button>
                                <Button 
                                  variant="destructive" 
                                  onClick={() => handleDeleteToppingCategory(category.id)}
                                  disabled={isDeletingToppingCategory}
                                >
                                  {isDeletingToppingCategory ? (
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
                    <Dialog open={isAddingToppingCategory} onOpenChange={setIsAddingToppingCategory}>
                      <DialogTrigger asChild>
                        <div className="border border-dashed rounded-lg p-4 flex items-center justify-center cursor-pointer hover:bg-slate-50">
                          <Button variant="ghost" className="w-full h-full flex items-center justify-center">
                            <Plus className="mr-2 h-4 w-4" />
                            Add Topping Category
                          </Button>
                        </div>
                      </DialogTrigger>
                    </Dialog>
                  </div>
                ) : (
                  <div className="text-center py-10">
                    <h4 className="text-lg font-medium mb-2">No topping categories found</h4>
                    <p className="text-muted-foreground mb-4">Add your first topping category to get started.</p>
                    <Button onClick={() => setIsAddingToppingCategory(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Topping Category
                    </Button>
                  </div>
                )}
                
                {/* Toppings Section */}
                {toppingCategories.length > 0 && (
                  <div className="mt-12">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium">Toppings</h3>
                      <Dialog open={isAddingTopping} onOpenChange={setIsAddingTopping}>
                        <DialogTrigger asChild>
                          <Button className="bg-kiosk-primary">
                            <Plus className="mr-2 h-4 w-4" />
                            Add Topping
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[500px]">
                          <DialogHeader>
                            <DialogTitle>Add Topping</DialogTitle>
                          </DialogHeader>
                          <ToppingForm 
                            onSubmit={handleAddTopping}
                            categories={toppingCategories.map(cat => ({
                              id: cat.id,
                              name: cat.name
                            }))}
                            isLoading={savingTopping}
                            initialValues={{
                              category_id: selectedToppingCategory || toppingCategories[0]?.id || ""
                            }}
                          />
                        </DialogContent>
                      </Dialog>
                    </div>
                    
                    {toppingCategories.map((category) => (
                      <div key={category.id} className="mb-8">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-md font-medium">{category.name}</h4>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setSelectedToppingCategory(category.id);
                              setIsAddingTopping(true);
                            }}
                            className="text-xs"
                          >
                            <Plus className="mr-1 h-3 w-3" />
                            Add to {category.name}
                          </Button>
                        </div>
                        
                        {toppings[category.id]?.length ? (
                          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {toppings[category.id].map((item) => (
                              <div 
                                key={item.id} 
                                className="border rounded-lg p-4"
                              >
                                <div className="flex justify-between items-center mb-2">
                                  <h5 className="font-medium">{item.name}</h5>
                                  <div className="flex items-center font-medium">
                                    <DollarSign className="h-3 w-3 mr-0.5" />
                                    {Number(item.price).toFixed(2)}
                                  </div>
                                </div>
                                
                                <div className="flex items-center text-xs text-muted-foreground mb-3">
                                  <div className="flex items-center">
                                    <Percent className="h-3 w-3 mr-1" />
                                    Tax: {item.tax_percentage}%
                                  </div>
                                </div>
                                
                                <div className="flex justify-end space-x-2">
                                  <Dialog 
                                    open={isEditingTopping === item.id} 
                                    onOpenChange={(open) => setIsEditingTopping(open ? item.id : null)}
                                  >
                                    <DialogTrigger asChild>
                                      <Button variant="ghost" size="sm">
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent className="sm:max-w-[500px]">
                                      <DialogHeader>
                                        <DialogTitle>Edit Topping</DialogTitle>
                                      </DialogHeader>
                                      <ToppingForm 
                                        onSubmit={(values) => handleEditTopping(item.id, values)}
                                        categories={toppingCategories.map(cat => ({
                                          id: cat.id,
                                          name: cat.name
                                        }))}
                                        initialValues={{
                                          name: item.name,
                                          price: item.price,
                                          tax_percentage: item.tax_percentage?.toString() || "10",
                                          category_id: item.category_id
                                        }}
                                        isLoading={savingTopping}
                                      />
                                    </DialogContent>
                                  </Dialog>
                                  
                                  <Dialog 
                                    open={toppingToDelete === item.id} 
                                    onOpenChange={(open) => setToppingToDelete(open ? item.id : null)}
                                  >
                                    <DialogTrigger asChild>
                                      <Button variant="ghost" size="sm">
                                        <Trash2 className="h-4 w-4 text-red-500" />
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent className="sm:max-w-[425px]">
                                      <DialogHeader>
                                        <DialogTitle>Delete Topping</DialogTitle>
                                      </DialogHeader>
                                      <div className="py-4">
                                        <p>Are you sure you want to delete <strong>{item.name}</strong>?</p>
                                        <p className="text-sm text-muted-foreground mt-2">This action cannot be undone.</p>
                                      </div>
                                      <div className="flex justify-end space-x-2">
                                        <Button variant="outline" onClick={() => setToppingToDelete(null)}>
                                          Cancel
                                        </Button>
                                        <Button 
                                          variant="destructive" 
                                          onClick={() => handleDeleteTopping(item.id)}
                                          disabled={isDeletingTopping}
                                        >
                                          {isDeletingTopping ? (
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
                          </div>
                        ) : (
                          <div className="border border-dashed rounded-lg p-6 text-center">
                            <p className="text-muted-foreground mb-4">No toppings in this category yet.</p>
                            <Button 
                              variant="outline" 
                              onClick={() => {
                                setSelectedToppingCategory(category.id);
                                setIsAddingTopping(true);
                              }}
                            >
                              <Plus className="mr-2 h-4 w-4" />
                              Add Topping
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="orders">
              <div className="space-y-6">
                <h3 className="text-lg font-medium">Orders</h3>
                
                {mockOrders.length > 0 ? (
                  <div className="divide-y">
                    {mockOrders.map((order) => (
                      <div key={order.id} className="py-4">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <span className="font-medium">{order.id}</span>
                            <span className="text-sm text-muted-foreground ml-2">
                              {new Date(order.date).toLocaleTimeString()}
                            </span>
                          </div>
                          <div className={`px-2 py-1 rounded-full text-xs ${statusColors[order.status]}`}>
                            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                          </div>
                        </div>
                        
                        <div className="text-sm">
                          {order.customerName && (
                            <div className="mb-1">Customer: {order.customerName}</div>
                          )}
                          
                          <div className="space-y-1 my-2">
                            {order.items.map((item, index) => (
                              <div key={index} className="flex justify-between">
                                <div>
                                  {item.quantity}x {item.name}
                                  {item.options && item.options.length > 0 && (
                                    <span className="text-muted-foreground ml-2">
                                      ({item.options.join(", ")})
                                    </span>
                                  )}
                                </div>
                                <div>${(item.price * item.quantity).toFixed(2)}</div>
                              </div>
                            ))}
                          </div>
                          
                          <div className="flex justify-between font-medium pt-2 border-t">
                            <div>Total</div>
                            <div>${order.total.toFixed(2)}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10">
                    <h4 className="text-lg font-medium mb-2">No orders found</h4>
                    <p className="text-muted-foreground">Orders will appear here when customers place them.</p>
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="settings">
              <div className="space-y-6">
                <h3 className="text-lg font-medium">Restaurant Settings</h3>
                
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="restaurantName">Restaurant Name</Label>
                    <Input id="restaurantName" defaultValue={restaurant.name} />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="restaurantSlug">URL Slug</Label>
                    <Input id="restaurantSlug" defaultValue={restaurant.slug} />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="restaurantLocation">Location</Label>
                    <Input id="restaurantLocation" defaultValue={restaurant.location || ""} />
                  </div>
                </div>
                
                <div className="pt-4">
                  <Label htmlFor="restaurantImage">Restaurant Image</Label>
                  <div className="mt-2">
                    <ImageUpload
                      value={restaurant.image_url || ""}
                      onChange={() => {}}
                      label="Restaurant Image"
                    />
                  </div>
                </div>
                
                <div className="flex justify-end pt-4">
                  <Button onClick={handleSaveRestaurantInfo}>
                    Save Settings
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </AdminLayout>
  );
};

export default RestaurantManage;
