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
  deleteMenuItem
} from "@/services/kiosk-service";
import { Restaurant, MenuCategory, MenuItem, OrderStatus } from "@/types/database-types";
import { getIconComponent } from "@/utils/icon-mapping";
import ImageUpload from "@/components/ImageUpload";
import CategoryForm from "@/components/forms/CategoryForm";
import MenuItemForm from "@/components/forms/MenuItemForm";

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
  icon?: string;
};

type Topping = {
  id: string;
  name: string;
  price: number;
  categoryId: string;
};

const mockToppingCategories: ToppingCategory[] = [
  { id: "1", name: "Cheese", icon: "cheese" },
  { id: "2", name: "Vegetables", icon: "leaf" },
  { id: "3", name: "Sauces", icon: "cherry" },
];

const mockToppings: Topping[] = [
  { id: "1", name: "Cheddar Cheese", price: 1.50, categoryId: "1" },
  { id: "2", name: "Mozzarella", price: 1.75, categoryId: "1" },
  { id: "3", name: "Onions", price: 0.75, categoryId: "2" },
  { id: "4", name: "Tomatoes", price: 0.75, categoryId: "2" },
  { id: "5", name: "Lettuce", price: 0.50, categoryId: "2" },
  { id: "6", name: "Ketchup", price: 0.25, categoryId: "3" },
  { id: "7", name: "Mayo", price: 0.25, categoryId: "3" },
  { id: "8", name: "BBQ Sauce", price: 0.50, categoryId: "3" },
];

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
  const [selectedCategoryForItem, setSelectedCategoryForItem] = useState<string | null>(null);
  const [isEditingMenuItem, setIsEditingMenuItem] = useState<string | null>(null);
  const [menuItemToDelete, setMenuItemToDelete] = useState<string | null>(null);
  const [isDeletingMenuItem, setIsDeletingMenuItem] = useState(false);
  const [savingMenuItem, setSavingMenuItem] = useState(false);
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
                                        ${parseFloat(item.price.toString()).toFixed(2)}
                                        {item.promotion_price && (
                                          <span className="ml-2 line-through text-muted-foreground">
                                            ${parseFloat(item.promotion_price.toString()).toFixed(2)}
                                          </span>
                                        )}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex space-x-2 mt-4 md:mt-0">
                                    <Dialog 
                                      open={isEditingMenuItem === item.id} 
                                      onOpenChange={(open) => setIsEditingMenuItem(open ? item.id : null)}
                                    >
                                      <DialogTrigger asChild>
                                        <Button variant="outline" size="sm">
                                          <Edit className="h-4 w-4 mr-2" />
                                          Edit
                                        </Button>
                                      </DialogTrigger>
                                      <DialogContent className="sm:max-w-[500px]">
                                        <DialogHeader>
                                          <DialogTitle>Edit Menu Item</DialogTitle>
                                        </DialogHeader>
                                        <MenuItemForm 
                                          onSubmit={(values) => handleEditMenuItem(item.id, values)}
                                          initialValues={{
                                            name: item.name,
                                            description: item.description || "",
                                            price: item.price.toString(),
                                            promotion_price: item.promotion_price ? item.promotion_price.toString() : "",
                                            image: item.image || ""
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
                                        <Button variant="outline" size="sm" className="text-red-500">
                                          <Trash2 className="h-4 w-4 mr-2" />
                                          Delete
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
                                            onClick={() => handleDeleteMenuItem(category.id, item.id)}
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
                              ))}
                            </div>
                          );
                        })}
                        <Dialog 
                          open={isAddingMenuItem} 
                          onOpenChange={(open) => {
                            setIsAddingMenuItem(open);
                            if (!open) setSelectedCategoryForItem(null);
                          }}
                        >
                          <DialogTrigger asChild>
                            <div className="border border-dashed rounded-lg p-4 flex items-center justify-center cursor-pointer hover:bg-slate-50">
                              <Button variant="ghost" className="w-full h-full flex items-center justify-center">
                                <Plus className="mr-2 h-4 w-4" />
                                Add New Item
                              </Button>
                            </div>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-[500px]">
                            <DialogHeader>
                              <DialogTitle>Add Menu Item</DialogTitle>
                            </DialogHeader>
                            {selectedCategoryForItem && (
                              <>
                                <div className="mb-4">
                                  <Label>Category</Label>
                                  <div className="flex gap-2 mt-2">
                                    {categories.map(category => (
                                      <Button
                                        key={category.id}
                                        type="button"
                                        variant={selectedCategoryForItem === category.id ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => setSelectedCategoryForItem(category.id)}
                                      >
                                        {category.name}
                                      </Button>
                                    ))}
                                  </div>
                                </div>
                                <MenuItemForm 
                                  onSubmit={(values) => handleAddMenuItem(selectedCategoryForItem, values)}
                                  isLoading={savingMenuItem}
                                />
                              </>
                            )}
                          </DialogContent>
                        </Dialog>
                      </div>
                    )}
                  </>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="toppings">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Topping Categories</h3>
                  <Button className="bg-kiosk-primary">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Category
                  </Button>
                </div>
                
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {mockToppingCategories.map((category) => (
                    <div 
                      key={category.id} 
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-primary/10 rounded-md">
                          {category.icon && getIconComponent(category.icon)}
                        </div>
                        <span className="font-medium">{category.name}</span>
                      </div>
                      <div className="flex space-x-1">
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
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

                <div className="flex items-center justify-between mt-8">
                  <h3 className="text-lg font-medium">Toppings</h3>
                  <Button className="bg-kiosk-primary">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Topping
                  </Button>
                </div>
                
                <div className="space-y-4">
                  {mockToppingCategories.map((category) => {
                    const toppings = mockToppings.filter(t => t.categoryId === category.id);
                    
                    if (toppings.length === 0) {
                      return (
                        <div key={category.id} className="text-center py-4 border rounded-lg">
                          <p className="text-muted-foreground mb-4">No toppings in {category.name}</p>
                          <Button variant="outline">
                            <Plus className="mr-2 h-4 w-4" />
                            Add Topping to {category.name}
                          </Button>
                        </div>
                      );
                    }
                    
                    return (
                      <div key={category.id} className="space-y-2">
                        <h4 className="font-medium text-sm text-muted-foreground">{category.name}</h4>
                        {toppings.map(topping => (
                          <div 
                            key={topping.id} 
                            className="flex items-center justify-between p-4 border rounded-lg"
                          >
                            <div className="flex items-center space-x-4">
                              <div>
                                <h3 className="font-medium">{topping.name}</h3>
                                <p className="text-sm font-medium mt-1">${topping.price.toFixed(2)}</p>
                              </div>
                            </div>
                            <div className="flex space-x-2">
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
                      </div>
                    );
                  })}
                  <div className="border border-dashed rounded-lg p-4 flex items-center justify-center">
                    <Button variant="ghost" className="w-full h-full flex items-center justify-center">
                      <Plus className="mr-2 h-4 w-4" />
                      Add New Topping
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="orders">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Recent Orders</h3>
                </div>
                
                {mockOrders
                  .filter(order => order.restaurantId === restaurant.id)
                  .map((order) => (
                    <div 
                      key={order.id}
                      className="border rounded-lg overflow-hidden"
                    >
                      <div className="flex flex-col md:flex-row justify-between p-4 border-b bg-gray-50">
                        <div className="flex items-center space-x-4">
                          <div>
                            <p className="font-bold">{order.id}</p>
                            <p className="text-sm text-muted-foreground">
                              {order.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4 mt-4 md:mt-0">
                          <div className={`px-2 py-1 rounded text-xs font-medium ${statusColors[order.status]}`}>
                            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                          </div>
                          <p className="text-sm font-bold">${order.total.toFixed(2)}</p>
                        </div>
                      </div>
                      <div className="p-4">
                        <p className="text-sm font-medium mb-2">Order Items:</p>
                        <div className="space-y-2">
                          {order.items.map((item, index) => (
                            <div key={index} className="flex justify-between text-sm">
                              <div>
                                <span className="font-medium">{item.quantity}x </span>
                                {item.name}
                                {item.options && item.options.length > 0 && (
                                  <span className="text-xs text-muted-foreground ml-2">
                                    ({item.options.join(", ")})
                                  </span>
                                )}
                              </div>
                              <span>${(item.price * item.quantity).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                
                {mockOrders.filter(order => order.restaurantId === restaurant.id).length === 0 && (
                  <div className="text-center py-8 border rounded-lg">
                    <p className="text-muted-foreground">No orders yet for this restaurant</p>
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="settings">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-4">Restaurant Information</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="name">Restaurant Name</Label>
                      <Input id="name" defaultValue={restaurant.name} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="slug">URL Slug</Label>
                      <Input id="slug" defaultValue={restaurant.slug} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="location">Location</Label>
                      <Input id="location" defaultValue={restaurant.location || ''} />
                    </div>
                    <div className="md:col-span-2">
                      <ImageUpload
                        value={restaurant.image_url || ''}
                        onChange={(url) => {
                          console.log("New image URL:", url);
                        }}
                        label="Cover Photo"
                      />
                    </div>
                  </div>
                  <Button className="mt-4 bg-kiosk-primary" onClick={handleSaveRestaurantInfo}>Save Changes</Button>
                </div>
                
                <div className="border-t pt-6">
                  <h3 className="text-lg font-medium mb-4">Business Hours</h3>
                  <Button className="mt-4 bg-kiosk-primary">Save Hours</Button>
                </div>
                
                <div className="border-t pt-6">
                  <h3 className="text-lg font-medium mb-4 text-red-600">Danger Zone</h3>
                  <Button variant="destructive">Delete Restaurant</Button>
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
