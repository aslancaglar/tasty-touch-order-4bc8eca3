import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { AdminLayout } from "@/components/layout/AdminLayout";
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
  Percent,
  Leaf,
  Apple
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
import { Restaurant, MenuCategory, MenuItem, ToppingCategory, Topping } from "@/types/database-types";
import { getIconComponent } from "@/utils/icon-mapping";
import ImageUpload from "@/components/ui/image-upload";
import CategoryForm from "@/components/forms/CategoryForm";
import MenuItemForm from "@/components/forms/MenuItemForm";
import ToppingCategoryForm from "@/components/forms/ToppingCategoryForm";
import ToppingForm from "@/components/forms/ToppingForm";
import { formatCurrency } from "@/lib/utils";

type TabType = "menu" | "settings";

type CategoryModalType = {
  open: boolean;
  category?: MenuCategory;
};

type MenuItemModalType = {
  open: boolean;
  menuItem?: MenuItem;
  categoryId: string | null;
};

type ToppingCategoryModalType = {
  open: boolean;
  toppingCategory?: ToppingCategory;
};

type ToppingModalType = {
  open: boolean;
  topping?: Topping;
  toppingCategoryId: string | null;
};

const RestaurantManage = () => {
  const { restaurantId } = useParams<{ restaurantId: string }>();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [toppingCategories, setToppingCategories] = useState<ToppingCategory[]>([]);
  const [toppings, setToppings] = useState<Topping[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>("menu");
  const [loading, setLoading] = useState(true);
  const [categoryModal, setCategoryModal] = useState<CategoryModalType>({ open: false });
  const [menuItemModal, setMenuItemModal] = useState<MenuItemModalType>({ open: false, categoryId: null });
  const [toppingCategoryModal, setToppingCategoryModal] = useState<ToppingCategoryModalType>({ open: false });
  const [toppingModal, setToppingModal] = useState<ToppingModalType>({ open: false, toppingCategoryId: null });
  const { toast } = useToast();

  const fetchData = async () => {
    if (!restaurantId) {
      toast({
        title: "Error",
        description: "Restaurant ID is missing",
        variant: "destructive",
      });
      return;
    }

    try {
      const restaurantData = await getRestaurants();
      if (restaurantData && restaurantData.length > 0) {
        const foundRestaurant = restaurantData.find(r => r.id === restaurantId);
        if (foundRestaurant) {
          setRestaurant(foundRestaurant);
        } else {
          toast({
            title: "Error",
            description: "Restaurant not found",
            variant: "destructive",
          });
          return;
        }
      } else {
        toast({
          title: "Error",
          description: "Restaurant not found",
          variant: "destructive",
        });
        return;
      }

      const categoriesData = await getCategoriesByRestaurantId(restaurantId);
      setCategories(categoriesData);

      const toppingCategoriesData = await getToppingCategoriesByRestaurantId(restaurantId);
      setToppingCategories(toppingCategoriesData);

      let allMenuItems: MenuItem[] = [];
      for (const category of categoriesData) {
        const items = await getMenuItemsByCategory(category.id);
        allMenuItems = allMenuItems.concat(items);
      }
      setMenuItems(allMenuItems);

      let allToppings: Topping[] = [];
      for (const toppingCategory of toppingCategoriesData) {
        const toppingsForCategory = await getToppingsByCategory(toppingCategory.id);
        allToppings = allToppings.concat(toppingsForCategory);
      }
      setToppings(allToppings);

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [restaurantId]);

  const handleCreateCategory = async (categoryData: Omit<MenuCategory, 'id' | 'restaurant_id' | 'created_at' | 'updated_at'>) => {
    if (!restaurantId) return;
    try {
      await createCategory({ ...categoryData, restaurant_id: restaurantId });
      toast({
        title: "Success",
        description: "Category created successfully",
      });
      setCategoryModal({ open: false });
      await fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create category",
        variant: "destructive",
      });
    }
  };

  const handleUpdateCategory = async (categoryId: string, updates: Partial<Omit<MenuCategory, 'id' | 'restaurant_id' | 'created_at' | 'updated_at'>>) => {
    try {
      await updateCategory(categoryId, updates);
      toast({
        title: "Success",
        description: "Category updated successfully",
      });
      setCategoryModal({ open: false });
      await fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update category",
        variant: "destructive",
      });
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    try {
      await deleteCategory(categoryId);
      toast({
        title: "Success",
        description: "Category deleted successfully",
      });
      await fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete category",
        variant: "destructive",
      });
    }
  };

  const handleCreateMenuItem = async (menuItemData: Omit<MenuItem, 'id' | 'category_id' | 'created_at' | 'updated_at'>, categoryId: string) => {
    try {
      await createMenuItem({ 
        ...menuItemData, 
        category_id: categoryId,
        promotion_price: null // Add required field
      });
      toast({
        title: "Success",
        description: "Menu item created successfully",
      });
      setMenuItemModal({ open: false, categoryId: null });
      await fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create menu item",
        variant: "destructive",
      });
    }
  };

  const handleUpdateMenuItem = async (menuItemId: string, updates: Partial<Omit<MenuItem, 'id' | 'created_at' | 'updated_at'>>) => {
    try {
      const updatesWithPromotion = {
        ...updates,
        promotion_price: updates.promotion_price !== undefined ? updates.promotion_price : null
      };
      
      await updateMenuItem(menuItemId, updatesWithPromotion);
      toast({
        title: "Success",
        description: "Menu item updated successfully",
      });
      setMenuItemModal({ open: false, categoryId: null });
      await fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update menu item",
        variant: "destructive",
      });
    }
  };

  const handleDeleteMenuItem = async (menuItemId: string) => {
    try {
      await deleteMenuItem(menuItemId);
      toast({
        title: "Success",
        description: "Menu item deleted successfully",
      });
      await fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete menu item",
        variant: "destructive",
      });
    }
  };

  const handleCreateToppingCategory = async (toppingCategoryData: Omit<ToppingCategory, 'id' | 'restaurant_id' | 'created_at' | 'updated_at'>) => {
    if (!restaurantId) return;
    try {
      await createToppingCategory({ ...toppingCategoryData, restaurant_id: restaurantId });
      toast({
        title: "Success",
        description: "Topping category created successfully",
      });
      setToppingCategoryModal({ open: false });
      await fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create topping category",
        variant: "destructive",
      });
    }
  };

  const handleUpdateToppingCategory = async (categoryId: string, updates: Partial<Omit<ToppingCategory, 'id' | 'restaurant_id' | 'created_at' | 'updated_at'>>) => {
    try {
      await updateToppingCategory(categoryId, updates);
      toast({
        title: "Success",
        description: "Topping category updated successfully",
      });
      setToppingCategoryModal({ open: false });
      await fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update topping category",
        variant: "destructive",
      });
    }
  };

  const handleDeleteToppingCategory = async (categoryId: string) => {
    try {
      await deleteToppingCategory(categoryId);
      toast({
        title: "Success",
        description: "Topping category deleted successfully",
      });
      await fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete topping category",
        variant: "destructive",
      });
    }
  };

  const handleCreateTopping = async (toppingData: Omit<Topping, 'id' | 'category_id' | 'created_at' | 'updated_at'>, categoryId: string) => {
    try {
      await createTopping({ 
        ...toppingData, 
        category_id: categoryId 
      });
      toast({
        title: "Success",
        description: "Topping created successfully",
      });
      setToppingModal({ open: false, toppingCategoryId: null });
      await fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create topping",
        variant: "destructive",
      });
    }
  };

  const handleUpdateTopping = async (toppingId: string, updates: Partial<Omit<Topping, 'id' | 'created_at' | 'updated_at'>>) => {
    try {
      await updateTopping(toppingId, updates);
      toast({
        title: "Success",
        description: "Topping updated successfully",
      });
      setToppingModal({ open: false, toppingCategoryId: null });
      await fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update topping",
        variant: "destructive",
      });
    }
  };

  const handleDeleteTopping = async (toppingId: string) => {
    try {
      await deleteTopping(toppingId);
      toast({
        title: "Success",
        description: "Topping deleted successfully",
      });
      await fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete topping",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  if (!restaurant) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-full">
          <h2>Restaurant not found</h2>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center text-sm font-medium hover:underline">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Dashboard
          </Link>
          <Button variant="outline" onClick={() => setActiveTab(activeTab === "menu" ? "settings" : "menu")}>
            <Settings className="h-4 w-4 mr-2" />
            {activeTab === "menu" ? "Settings" : "Menu"}
          </Button>
        </div>

        {activeTab === "menu" ? (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Menu</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2>Categories</h2>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Category
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Create Category</DialogTitle>
                      </DialogHeader>
                      <CategoryForm onSubmit={handleCreateCategory} />
                    </DialogContent>
                  </Dialog>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {categories.map((category) => (
                    <Card key={category.id} className="relative">
                      <CardHeader className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          {getIconComponent(category.icon)}
                          <CardTitle>{category.name}</CardTitle>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <Edit className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Edit Category</DialogTitle>
                              </DialogHeader>
                              <CategoryForm 
                                onSubmit={(values) => handleUpdateCategory(category.id, values)} 
                                initialValues={category}
                              />
                            </DialogContent>
                          </Dialog>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteCategory(category.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {menuItems
                            .filter((item) => item.category_id === category.id)
                            .map((item) => (
                              <li key={item.id} className="flex items-center justify-between">
                                <span>{item.name}</span>
                                <div className="flex items-center space-x-2">
                                  <Dialog>
                                    <DialogTrigger asChild>
                                      <Button variant="ghost" size="icon">
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                      <DialogHeader>
                                        <DialogTitle>Edit Menu Item</DialogTitle>
                                      </DialogHeader>
                                      <MenuItemForm 
                                        onSubmit={(values) => handleUpdateMenuItem(item.id, values)} 
                                        initialValues={item}
                                        categories={categories}
                                      />
                                    </DialogContent>
                                  </Dialog>
                                  <Button variant="ghost" size="icon" onClick={() => handleDeleteMenuItem(item.id)}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </li>
                            ))}
                        </ul>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button className="w-full">
                              <Plus className="h-4 w-4 mr-2" />
                              Add Menu Item
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Create Menu Item</DialogTitle>
                            </DialogHeader>
                            <MenuItemForm 
                              onSubmit={(values) => handleCreateMenuItem(values, category.id)} 
                              categories={categories}
                            />
                          </DialogContent>
                        </Dialog>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Toppings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2>Topping Categories</h2>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Topping Category
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Create Topping Category</DialogTitle>
                      </DialogHeader>
                      <ToppingCategoryForm 
                        onSubmit={handleCreateToppingCategory}
                        isLoading={false}
                      />
                    </DialogContent>
                  </Dialog>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {toppingCategories.map((toppingCategory) => (
                    <Card key={toppingCategory.id} className="relative">
                      <CardHeader className="flex items-center justify-between">
                        <CardTitle>{toppingCategory.name}</CardTitle>
                        <div className="flex items-center space-x-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <Edit className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Edit Topping Category</DialogTitle>
                              </DialogHeader>
                              <ToppingCategoryForm
                                onSubmit={(values) => handleUpdateToppingCategory(toppingCategory.id, values)}
                                initialValues={toppingCategory}
                                isLoading={false}
                              />
                            </DialogContent>
                          </Dialog>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteToppingCategory(toppingCategory.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {toppings
                            .filter((topping) => topping.category_id === toppingCategory.id)
                            .map((topping) => (
                              <li key={topping.id} className="flex items-center justify-between">
                                <span>{topping.name}</span>
                                <div className="flex items-center space-x-2">
                                  <Dialog>
                                    <DialogTrigger asChild>
                                      <Button variant="ghost" size="icon">
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                      <DialogHeader>
                                        <DialogTitle>Edit Topping</DialogTitle>
                                      </DialogHeader>
                                      <ToppingForm
                                        onSubmit={(values) => handleUpdateTopping(topping.id, values)}
                                        initialValues={topping}
                                        categories={toppingCategories}
                                        isLoading={false}
                                      />
                                    </DialogContent>
                                  </Dialog>
                                  <Button variant="ghost" size="icon" onClick={() => handleDeleteTopping(topping.id)}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </li>
                            ))}
                        </ul>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button className="w-full">
                              <Plus className="h-4 w-4 mr-2" />
                              Add Topping
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Create Topping</DialogTitle>
                            </DialogHeader>
                            <ToppingForm
                              onSubmit={(values) => handleCreateTopping(values, toppingCategory.id)}
                              categories={toppingCategories}
                              isLoading={false}
                            />
                          </DialogContent>
                        </Dialog>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    defaultValue={restaurant.name}
                    disabled
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    defaultValue={restaurant.location || ""}
                    disabled
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="coverImage">Cover Image</Label>
                <ImageUpload
                  value={restaurant.image_url || ""}
                  onChange={(url) => {
                    setRestaurant({ ...restaurant, image_url: url });
                  }}
                />
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
};

export default RestaurantManage;
