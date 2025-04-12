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

  // Fetch topping categories
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

  // Fetch toppings
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

  // Topping category handlers
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

  // Topping handlers
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
