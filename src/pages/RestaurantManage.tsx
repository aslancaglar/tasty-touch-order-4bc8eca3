import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import AdminLayout from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/sonner";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, UtensilsCrossed, Settings, Receipt, Cherry, Plus, Pencil, Trash2, X, Check } from "lucide-react";
import { getIconComponent } from "@/utils/icon-mapping";
import { 
  getRestaurantBySlug, 
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
import { Restaurant, MenuCategory, MenuItem, ToppingCategory, Topping } from "@/types/database-types";
import ImageUpload from "@/components/ui/image-upload";
import { formatCurrency } from "@/lib/utils";

type CategoryWithItems = MenuCategory & {
  items: MenuItem[];
};

type ToppingCategoryWithToppings = ToppingCategory & {
  toppings: Topping[];
};

const RestaurantManage = () => {
  const { id: restaurantSlug } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState("menu");
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [categories, setCategories] = useState<CategoryWithItems[]>([]);
  const [toppingCategories, setToppingCategories] = useState<ToppingCategoryWithToppings[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Dialog states
  const [addCategoryDialogOpen, setAddCategoryDialogOpen] = useState(false);
  const [editCategoryDialogOpen, setEditCategoryDialogOpen] = useState(false);
  const [deleteCategoryDialogOpen, setDeleteCategoryDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<MenuCategory | null>(null);
  
  const [addItemDialogOpen, setAddItemDialogOpen] = useState(false);
  const [editItemDialogOpen, setEditItemDialogOpen] = useState(false);
  const [deleteItemDialogOpen, setDeleteItemDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [selectedCategoryForItem, setSelectedCategoryForItem] = useState<string | null>(null);
  
  const [addToppingCategoryDialogOpen, setAddToppingCategoryDialogOpen] = useState(false);
  const [editToppingCategoryDialogOpen, setEditToppingCategoryDialogOpen] = useState(false);
  const [deleteToppingCategoryDialogOpen, setDeleteToppingCategoryDialogOpen] = useState(false);
  const [selectedToppingCategory, setSelectedToppingCategory] = useState<ToppingCategory | null>(null);
  
  const [addToppingDialogOpen, setAddToppingDialogOpen] = useState(false);
  const [editToppingDialogOpen, setEditToppingDialogOpen] = useState(false);
  const [deleteToppingDialogOpen, setDeleteToppingDialogOpen] = useState(false);
  const [selectedTopping, setSelectedTopping] = useState<Topping | null>(null);
  const [selectedCategoryForTopping, setSelectedCategoryForTopping] = useState<string | null>(null);
  
  // Form states
  const [newCategory, setNewCategory] = useState({
    name: "",
    description: "",
    icon: "utensils"
  });
  
  const [newItem, setNewItem] = useState({
    name: "",
    description: "",
    price: 0,
    tax_percentage: 10,
    promotion_price: null as number | null,
    image: null as string | null
  });
  
  const [newToppingCategory, setNewToppingCategory] = useState({
    name: "",
    description: "",
    icon: "cherry",
    min_selections: 0,
    max_selections: 1
  });
  
  const [newTopping, setNewTopping] = useState({
    name: "",
    price: 0,
    tax_percentage: 10
  });
  
  const { toast: uiToast } = useToast();

  useEffect(() => {
    const fetchRestaurantData = async () => {
      try {
        if (!restaurantSlug) {
          setError("Restaurant ID is required");
          setLoading(false);
          return;
        }
        
        const restaurantData = await getRestaurantBySlug(restaurantSlug);
        if (!restaurantData) {
          setError("Restaurant not found");
          setLoading(false);
          return;
        }
        
        setRestaurant(restaurantData);
        
        // Fetch menu categories and items
        const categoriesData = await getCategoriesByRestaurantId(restaurantData.id);
        const categoriesWithItems = await Promise.all(
          categoriesData.map(async (category) => {
            const items = await getMenuItemsByCategory(category.id);
            return {
              ...category,
              items
            };
          })
        );
        setCategories(categoriesWithItems);
        
        // Fetch topping categories and toppings
        const toppingCategoriesData = await getToppingCategoriesByRestaurantId(restaurantData.id);
        const toppingCategoriesWithToppings = await Promise.all(
          toppingCategoriesData.map(async (category) => {
            const toppings = await getToppingsByCategory(category.id);
            return {
              ...category,
              toppings
            };
          })
        );
        setToppingCategories(toppingCategoriesWithToppings);
        
        setLoading(false);
      } catch (err) {
        console.error("Error fetching restaurant data:", err);
        setError("Failed to load restaurant data");
        setLoading(false);
      }
    };
    
    fetchRestaurantData();
  }, [restaurantSlug]);
  
  // Category handlers
  const handleAddCategory = async () => {
    try {
      if (!restaurant) return;
      
      const newCategoryData = await createCategory({
        name: newCategory.name,
        description: newCategory.description || null,
        icon: newCategory.icon || null,
        restaurant_id: restaurant.id,
        image_url: null
      });
      
      setCategories([...categories, { ...newCategoryData, items: [] }]);
      setAddCategoryDialogOpen(false);
      setNewCategory({ name: "", description: "", icon: "utensils" });
      
      toast({
        title: "Category added",
        description: `${newCategoryData.name} has been added to the menu.`
      });
    } catch (err) {
      console.error("Error adding category:", err);
      uiToast({
        title: "Error",
        description: "Failed to add category",
        variant: "destructive"
      });
    }
  };
  
  const handleEditCategory = async () => {
    try {
      if (!selectedCategory) return;
      
      const updatedCategory = await updateCategory(selectedCategory.id, {
        name: newCategory.name,
        description: newCategory.description || null,
        icon: newCategory.icon || null
      });
      
      setCategories(categories.map(category => 
        category.id === updatedCategory.id 
          ? { ...category, ...updatedCategory } 
          : category
      ));
      
      setEditCategoryDialogOpen(false);
      setSelectedCategory(null);
      
      toast({
        title: "Category updated",
        description: `${updatedCategory.name} has been updated.`
      });
    } catch (err) {
      console.error("Error updating category:", err);
      uiToast({
        title: "Error",
        description: "Failed to update category",
        variant: "destructive"
      });
    }
  };
  
  const handleDeleteCategory = async () => {
    try {
      if (!selectedCategory) return;
      
      await deleteCategory(selectedCategory.id);
      
      setCategories(categories.filter(category => category.id !== selectedCategory.id));
      setDeleteCategoryDialogOpen(false);
      setSelectedCategory(null);
      
      toast({
        title: "Category deleted",
        description: `${selectedCategory.name} has been deleted from the menu.`
      });
    } catch (err) {
      console.error("Error deleting category:", err);
      uiToast({
        title: "Error",
        description: "Failed to delete category",
        variant: "destructive"
      });
    }
  };
  
  // Menu Item handlers
  const handleAddItem = async () => {
    try {
      if (!selectedCategoryForItem) return;
      
      const newItemData = await createMenuItem({
        name: newItem.name,
        description: newItem.description || null,
        price: newItem.price,
        tax_percentage: newItem.tax_percentage,
        promotion_price: newItem.promotion_price,
        image: newItem.image,
        category_id: selectedCategoryForItem
      });
      
      setCategories(categories.map(category => 
        category.id === selectedCategoryForItem 
          ? { ...category, items: [...category.items, newItemData] } 
          : category
      ));
      
      setAddItemDialogOpen(false);
      setSelectedCategoryForItem(null);
      setNewItem({
        name: "",
        description: "",
        price: 0,
        tax_percentage: 10,
        promotion_price: null,
        image: null
      });
      
      toast({
        title: "Item added",
        description: `${newItemData.name} has been added to the menu.`
      });
    } catch (err) {
      console.error("Error adding item:", err);
      uiToast({
        title: "Error",
        description: "Failed to add menu item",
        variant: "destructive"
      });
    }
  };
  
  const handleEditItem = async () => {
    try {
      if (!selectedItem) return;
      
      const updatedItem = await updateMenuItem(selectedItem.id, {
        name: newItem.name,
        description: newItem.description || null,
        price: newItem.price,
        tax_percentage: newItem.tax_percentage,
        promotion_price: newItem.promotion_price,
        image: newItem.image
      });
      
      setCategories(categories.map(category => 
        category.id === selectedItem.category_id 
          ? { 
              ...category, 
              items: category.items.map(item => 
                item.id === updatedItem.id ? updatedItem : item
              ) 
            } 
          : category
      ));
      
      setEditItemDialogOpen(false);
      setSelectedItem(null);
      
      toast({
        title: "Item updated",
        description: `${updatedItem.name} has been updated.`
      });
    } catch (err) {
      console.error("Error updating item:", err);
      uiToast({
        title: "Error",
        description: "Failed to update menu item",
        variant: "destructive"
      });
    }
  };
  
  const handleDeleteItem = async () => {
    try {
      if (!selectedItem) return;
      
      await deleteMenuItem(selectedItem.id);
      
      setCategories(categories.map(category => 
        category.id === selectedItem.category_id 
          ? { 
              ...category, 
              items: category.items.filter(item => item.id !== selectedItem.id) 
            } 
          : category
      ));
      
      setDeleteItemDialogOpen(false);
      setSelectedItem(null);
      
      toast({
        title: "Item deleted",
        description: `${selectedItem.name} has been deleted from the menu.`
      });
    } catch (err) {
      console.error("Error deleting item:", err);
      uiToast({
        title: "Error",
        description: "Failed to delete menu item",
        variant: "destructive"
      });
    }
  };
  
  // Topping Category handlers
  const handleAddToppingCategory = async () => {
    try {
      if (!restaurant) return;
      
      const newToppingCategoryData = await createToppingCategory({
        name: newToppingCategory.name,
        description: newToppingCategory.description || null,
        icon: newToppingCategory.icon || null,
        restaurant_id: restaurant.id,
        min_selections: newToppingCategory.min_selections,
        max_selections: newToppingCategory.max_selections
      });
      
      setToppingCategories([...toppingCategories, { ...newToppingCategoryData, toppings: [] }]);
      setAddToppingCategoryDialogOpen(false);
      setNewToppingCategory({ 
        name: "", 
        description: "", 
        icon: "cherry",
        min_selections: 0,
        max_selections: 1
      });
      
      toast({
        title: "Topping category added",
        description: `${newToppingCategoryData.name} has been added.`
      });
    } catch (err) {
      console.error("Error adding topping category:", err);
      uiToast({
        title: "Error",
        description: "Failed to add topping category",
        variant: "destructive"
      });
    }
  };
  
  const handleEditToppingCategory = async () => {
    try {
      if (!selectedToppingCategory) return;
      
      const updatedToppingCategory = await updateToppingCategory(selectedToppingCategory.id, {
        name: newToppingCategory.name,
        description: newToppingCategory.description || null,
        icon: newToppingCategory.icon || null,
        min_selections: newToppingCategory.min_selections,
        max_selections: newToppingCategory.max_selections
      });
      
      setToppingCategories(toppingCategories.map(category => 
        category.id === updatedToppingCategory.id 
          ? { ...category, ...updatedToppingCategory } 
          : category
      ));
      
      setEditToppingCategoryDialogOpen(false);
      setSelectedToppingCategory(null);
      
      toast({
        title: "Topping category updated",
        description: `${updatedToppingCategory.name} has been updated.`
      });
    } catch (err) {
      console.error("Error updating topping category:", err);
      uiToast({
        title: "Error",
        description: "Failed to update topping category",
        variant: "destructive"
      });
    }
  };
  
  const handleDeleteToppingCategory = async () => {
    try {
      if (!selectedToppingCategory) return;
      
      await deleteToppingCategory(selectedToppingCategory.id);
      
      setToppingCategories(toppingCategories.filter(category => 
        category.id !== selectedToppingCategory.id
      ));
      
      setDeleteToppingCategoryDialogOpen(false);
      setSelectedToppingCategory(null);
      
      toast({
        title: "Topping category deleted",
        description: `${selectedToppingCategory.name} has been deleted.`
      });
    } catch (err) {
      console.error("Error deleting topping category:", err);
      uiToast({
        title: "Error",
        description: "Failed to delete topping category",
        variant: "destructive"
      });
    }
  };
  
  // Topping handlers
  const handleAddTopping = async () => {
    try {
      if (!selectedCategoryForTopping) return;
      
      const newToppingData = await createTopping({
        name: newTopping.name,
        price: newTopping.price,
        tax_percentage: newTopping.tax_percentage,
        category_id: selectedCategoryForTopping
      });
      
      setToppingCategories(toppingCategories.map(category => 
        category.id === selectedCategoryForTopping 
          ? { ...category, toppings: [...category.toppings, newToppingData] } 
          : category
      ));
      
      setAddToppingDialogOpen(false);
      setSelectedCategoryForTopping(null);
      setNewTopping({
        name: "",
        price: 0,
        tax_percentage: 10
      });
      
      toast({
        title: "Topping added",
        description: `${newToppingData.name} has been added.`
      });
    } catch (err) {
      console.error("Error adding topping:", err);
      uiToast({
        title: "Error",
        description: "Failed to add topping",
        variant: "destructive"
      });
    }
  };
  
  const handleEditTopping = async () => {
    try {
      if (!selectedTopping) return;
      
      const updatedTopping = await updateTopping(selectedTopping.id, {
        name: newTopping.name,
        price: newTopping.price,
        tax_percentage: newTopping.tax_percentage
      });
      
      setToppingCategories(toppingCategories.map(category => 
        category.id === selectedTopping.category_id 
          ? { 
              ...category, 
              toppings: category.toppings.map(topping => 
                topping.id === updatedTopping.id ? updatedTopping : topping
              ) 
            } 
          : category
      ));
      
      setEditToppingDialogOpen(false);
      setSelectedTopping(null);
      
      toast({
        title: "Topping updated",
        description: `${updatedTopping.name} has been updated.`
      });
    } catch (err) {
      console.error("Error updating topping:", err);
      uiToast({
        title: "Error",
        description: "Failed to update topping",
        variant: "destructive"
      });
    }
  };
  
  const handleDeleteTopping = async () => {
    try {
      if (!selectedTopping) return;
      
      await deleteTopping(selectedTopping.id);
      
      setToppingCategories(toppingCategories.map(category => 
        category.id === selectedTopping.category_id 
          ? { 
              ...category, 
              toppings: category.toppings.filter(topping => topping.id !== selectedTopping.id) 
            } 
          : category
      ));
      
      setDeleteToppingDialogOpen(false);
      setSelectedTopping(null);
      
      toast({
        title: "Topping deleted",
        description: `${selectedTopping.name} has been deleted.`
      });
    } catch (err) {
      console.error("Error deleting topping:", err);
      uiToast({
        title: "Error",
        description: "Failed to delete topping",
        variant: "destructive"
      });
    }
  };
  
  const handleSaveRestaurantInfo = () => {
    toast({
      title: "Changes saved",
      description: "Restaurant information has been updated."
    });
  };
  
  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">Loading restaurant data...</h2>
            <p className="text-muted-foreground">Please wait while we fetch the restaurant information.</p>
          </div>
        </div>
      </AdminLayout>
    );
  }
  
  if (error || !restaurant) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">Restaurant not found</h2>
            <p className="text-muted-foreground mb-4">{error || "The requested restaurant could not be found."}</p>
            <Button asChild>
              <Link to="/restaurants">Back to Restaurants</Link>
            </Button>
          </div>
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
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">Menu Categories</h2>
                <Dialog open={addCategoryDialogOpen} onOpenChange={setAddCategoryDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Category
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Menu Category</DialogTitle>
                      <DialogDescription>
                        Create a new category for your menu items.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div>
                        <Label htmlFor="category-name">Category Name</Label>
                        <Input 
                          id="category-name" 
                          value={newCategory.name} 
                          onChange={(e) => setNewCategory({...newCategory, name: e.target.value})}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="category-description">Description (Optional)</Label>
                        <Textarea 
                          id="category-description" 
                          value={newCategory.description} 
                          onChange={(e) => setNewCategory({...newCategory, description: e.target.value})}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="category-icon">Icon</Label>
                        <Select 
                          value={newCategory.icon} 
                          onValueChange={(value) => setNewCategory({...newCategory, icon: value})}
                        >
                          <SelectTrigger id="category-icon" className="mt-1">
                            <SelectValue placeholder="Select an icon" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="beef">Beef</SelectItem>
                            <SelectItem value="coffee">Coffee</SelectItem>
                            <SelectItem value="pizza">Pizza</SelectItem>
                            <SelectItem value="sandwich">Sandwich</SelectItem>
                            <SelectItem value="fish">Fish</SelectItem>
                            <SelectItem value="ice-cream">Ice Cream</SelectItem>
                            <SelectItem value="soup">Soup</SelectItem>
                            <SelectItem value="dessert">Dessert</SelectItem>
                            <SelectItem value="salad">Salad</SelectItem>
                            <SelectItem value="utensils">Utensils</SelectItem>
                            <SelectItem value="utensils-crossed">Utensils Crossed</SelectItem>
                            <SelectItem value="cheese">Cheese</SelectItem>
                            <SelectItem value="cherry">Cherry</SelectItem>
                            <SelectItem value="leaf">Leaf</SelectItem>
                          </SelectContent>
                        </Select>
                        <div className="flex items-center mt-2">
                          <span className="mr-2">Preview:</span>
                          {getIconComponent(newCategory.icon)}
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setAddCategoryDialogOpen(false)}>Cancel</Button>
                      <Button onClick={handleAddCategory} disabled={!newCategory.name.trim()}>Add Category</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
              
              {categories.length === 0 ? (
                <div className="text-center py-12 border rounded-lg bg-muted/20">
                  <h3 className="text-lg font-medium mb-2">No Menu Categories</h3>
                  <p className="text-muted-foreground mb-4">Start by adding a category to your menu.</p>
                  <Button onClick={() => setAddCategoryDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add First Category
                  </Button>
                </div>
              ) : (
                <div className="space-y-8">
                  {categories.map((category) => (
                    <div key={category.id} className="border rounded-lg p-6">
                      <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center">
                          {category.icon && (
                            <div className="mr-2 p-1.5 bg-primary/10 rounded-md">
                              {getIconComponent(category.icon)}
                            </div>
                          )}
                          <h3 className="text-lg font-medium">{category.name}</h3>
                          {category.description && (
                            <p className="text-sm text-muted-foreground ml-2">
                              {category.description}
                            </p>
                          )}
                        </div>
                        <div className="flex space-x-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              setSelectedCategory(category);
                              setNewCategory({
                                name: category.name,
                                description: category.description || "",
                                icon: category.icon || "utensils"
                              });
                              setEditCategoryDialogOpen(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              setSelectedCategory(category);
                              setDeleteCategoryDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="text-sm font-medium text-muted-foreground">
                          {category.items.length} {category.items.length === 1 ? 'item' : 'items'}
                        </h4>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            setSelectedCategoryForItem(category.id);
                            setNewItem({
                              name: "",
                              description: "",
                              price: 0,
                              tax_percentage: 10,
                              promotion_price: null,
                              image: null
                            });
                            setAddItemDialogOpen(true);
                          }}
                        >
                          <Plus className="mr-2 h-3 w-3" />
                          Add Item
                        </Button>
                      </div>
                      
                      {category.items.length === 0 ? (
                        <div className="text-center py-6 border rounded-lg bg-muted/10">
                          <p className="text-sm text-muted-foreground">No items in this category</p>
                        </div>
                      ) : (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                          {category.items.map((item) => (
                            <div key={item.id} className="border rounded-lg p-4 relative group">
                              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <div className="flex space-x-1">
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8"
                                    onClick={() => {
                                      setSelectedItem(item);
                                      setNewItem({
                                        name: item.name,
                                        description: item.description || "",
                                        price: item.price,
                                        tax_percentage: item.tax_percentage || 10,
                                        promotion_price: item.promotion_price,
                                        image: item.image
                                      });
                                      setEditItemDialogOpen(true);
                                    }}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8"
                                    onClick={() => {
                                      setSelectedItem(item);
                                      setDeleteItemDialogOpen(true);
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                              
                              <div className="flex items-start">
                                {item.image && (
                                  <div className="w-16 h-16 rounded-md overflow-hidden mr-3 flex-shrink-0">
                                    <img 
                                      src={item.image} 
                                      alt={item.name} 
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                )}
                                <div className="flex-1">
                                  <h4 className="font-medium">{item.name}</h4>
                                  {item.description && (
                                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                                      {item.description}
                                    </p>
                                  )}
                                  <div className="mt-2 flex items-center">
                                    <span className="font-medium">
                                      {formatCurrency(item.price)}
                                    </span>
                                    {item.promotion_price !== null && (
                                      <Badge variant="secondary" className="ml-2">
                                        Sale: {formatCurrency(item.promotion_price)}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="toppings">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">Topping Categories</h2>
                <Dialog open={addToppingCategoryDialogOpen} onOpenChange={setAddToppingCategoryDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Topping Category
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Topping Category</DialogTitle>
                      <DialogDescription>
                        Create a new category for your toppings.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div>
                        <Label htmlFor="topping-category-name">Category Name</Label>
                        <Input 
                          id="topping-category-name" 
                          value={newToppingCategory.name} 
                          onChange={(e) => setNewToppingCategory({...newToppingCategory, name: e.target.value})}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="topping-category-description">Description (Optional)</Label>
                        <Textarea 
                          id="topping-category-description" 
                          value={newToppingCategory.description} 
                          onChange={(e) => setNewToppingCategory({...newToppingCategory, description: e.target.value})}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="topping-category-icon">Icon</Label>
                        <Select 
                          value={newToppingCategory.icon} 
                          onValueChange={(value) => setNewToppingCategory({...newToppingCategory, icon: value})}
                        >
                          <SelectTrigger id="topping-category-icon" className="mt-1">
                            <SelectValue placeholder="Select an icon" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cherry">Cherry</SelectItem>
                            <SelectItem value="cheese">Cheese</SelectItem>
                            <SelectItem value="leaf">Leaf</SelectItem>
                            <SelectItem value="beef">Beef</SelectItem>
                            <SelectItem value="pizza">Pizza</SelectItem>
                            <SelectItem value="utensils">Utensils</SelectItem>
                          </SelectContent>
                        </Select>
                        <div className="flex items-center mt-2">
                          <span className="mr-2">Preview:</span>
                          {getIconComponent(newToppingCategory.icon)}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="min-selections">Minimum Selections</Label>
                          <Input 
                            id="min-selections" 
                            type="number" 
                            min="0"
                            value={newToppingCategory.min_selections} 
                            onChange={(e) => setNewToppingCategory({
                              ...newToppingCategory, 
                              min_selections: parseInt(e.target.value) || 0
                            })}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="max-selections">Maximum Selections</Label>
                          <Input 
                            id="max-selections" 
                            type="number" 
                            min="1"
                            value={newToppingCategory.max_selections} 
                            onChange={(e) => setNewToppingCategory({
                              ...newToppingCategory, 
                              max_selections: parseInt(e.target.value) || 1
                            })}
                            className="mt-1"
                          />
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setAddToppingCategoryDialogOpen(false)}>Cancel</Button>
                      <Button onClick={handleAddToppingCategory} disabled={!newToppingCategory.name.trim()}>Add Category</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
              
              {toppingCategories.length === 0 ? (
                <div className="text-center py-12 border rounded-lg bg-muted/20">
                  <h3 className="text-lg font-medium mb-2">No Topping Categories</h3>
                  <p className="text-muted-foreground mb-4">Start by adding a category for your toppings.</p>
                  <Button onClick={() => setAddToppingCategoryDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add First Topping Category
                  </Button>
                </div>
              ) : (
                <div className="space-y-8">
                  {toppingCategories.map((category) => (
                    <div key={category.id} className="border rounded-lg p-6">
                      <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center">
                          {category.icon && (
                            <div className="mr-2 p-1.5 bg-primary/10 rounded-md">
                              {getIconComponent(category.icon)}
                            </div>
                          )}
                          <h3 className="text-lg font-medium">{category.name}</h3>
                          {category.description && (
                            <p className="text-sm text-muted-foreground ml-2">
                              {category.description}
                            </p>
                          )}
                        </div>
                        <div className="flex space-x-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              setSelectedToppingCategory(category);
                              setNewToppingCategory({
                                name: category.name,
                                description: category.description || "",
                                icon: category.icon || "cherry",
                                min_selections: category.min_selections || 0,
                                max_selections: category.max_selections || 1
                              });
                              setEditToppingCategoryDialogOpen(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              setSelectedToppingCategory(category);
                              setDeleteToppingCategoryDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="flex items-center mb-2 text-sm">
                        <Badge variant="outline" className="mr-2">
                          Min: {category.min_selections || 0}
                        </Badge>
                        <Badge variant="outline">
                          Max: {category.max_selections || 1}
                        </Badge>
                      </div>
                      
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="text-sm font-medium text-muted-foreground">
                          {category.toppings.length} {category.toppings.length === 1 ? 'topping' : 'toppings'}
                        </h4>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            setSelectedCategoryForTopping(category.id);
                            setNewTopping({
                              name: "",
                              price: 0,
                              tax_percentage: 10
                            });
                            setAddToppingDialogOpen(true);
                          }}
                        >
                          <Plus className="mr-2 h-3 w-3" />
                          Add Topping
                        </Button>
                      </div>
                      
                      {category.toppings.length === 0 ? (
                        <div className="text-center py-6 border rounded-lg bg-muted/10">
                          <p className="text-sm text-muted-foreground">No toppings in this category</p>
                        </div>
                      ) : (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                          {category.toppings.map((topping) => (
                            <div key={topping.id} className="border rounded-lg p-4 relative group">
                              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <div className="flex space-x-1">
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8"
                                    onClick={() => {
                                      setSelectedTopping(topping);
                                      setNewTopping({
                                        name: topping.name,
                                        price: topping.price,
                                        tax_percentage: topping.tax_percentage || 10
                                      });
                                      setEditToppingDialogOpen(true);
                                    }}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8"
                                    onClick={() => {
                                      setSelectedTopping(topping);
                                      setDeleteToppingDialogOpen(true);
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                              
                              <div className="flex items-center justify-between">
                                <h4 className="font-medium">{topping.name}</h4>
                                <span className="font-medium">
                                  {formatCurrency(topping.price)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="orders">
              <div className="text-center py-12 border rounded-lg bg-muted/20">
                <h3 className="text-lg font-medium mb-2">Order Management</h3>
                <p className="text-muted-foreground mb-4">Order management features coming soon.</p>
              </div>
            </TabsContent>
            
            <TabsContent value="settings">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-4">Restaurant Information</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label htmlFor="restaurant-name">Restaurant Name</Label>
                      <Input 
                        id="restaurant-name" 
                        defaultValue={restaurant.name} 
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="restaurant-location">Location</Label>
                      <Input 
                        id="restaurant-location" 
                        defaultValue={restaurant.location || ""} 
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="restaurant-slug">URL Slug</Label>
                      <Input 
                        id="restaurant-slug" 
                        defaultValue={restaurant.slug} 
                        className="mt-1"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        This will be used in the URL: {window.location.origin}/r/{restaurant.slug}
                      </p>
                    </div>
                    <div>
                      <Label>Restaurant Image</Label>
                      <div className="mt-1">
                        <ImageUpload 
                          value={restaurant.image_url || ""} 
                          onChange={() => {}} 
                          disabled={true}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Used as the restaurant logo on the kiosk page.
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-6">
                    <Button onClick={handleSaveRestaurantInfo}>
                      Save Changes
                    </Button>
                  </div>
                </div>
                
                <div className="pt-6 border-t">
                  <h3 className="text-lg font-medium mb-4 text-red-600">Danger Zone</h3>
                  <Button variant="destructive">
                    Delete Restaurant
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">
                    This action is irreversible. All restaurant data, including menu items and orders will be permanently deleted.
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      {/* Edit Category Dialog */}
      <Dialog open={editCategoryDialogOpen} onOpenChange={setEditCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Menu Category</DialogTitle>
            <DialogDescription>
              Update the details of this menu category.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="edit-category-name">Category Name</Label>
              <Input 
                id="edit-category-name" 
                value={newCategory.name} 
                onChange={(e) => setNewCategory({...newCategory, name: e.target.value})}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="edit-category-description">Description (Optional)</Label>
              <Textarea 
                id="edit-category-description" 
                value={newCategory.description} 
                onChange={(e) => setNewCategory({...newCategory, description: e.target.value})}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="edit-category-icon">Icon</Label>
              <Select 
                value={newCategory.icon} 
                onValueChange={(value) => setNewCategory({...newCategory, icon: value})}
              >
                <SelectTrigger id="edit-category-icon" className="mt-1">
                  <SelectValue placeholder="Select an icon" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beef">Beef</SelectItem>
                  <SelectItem value="coffee">Coffee</SelectItem>
                  <SelectItem value="pizza">Pizza</SelectItem>
                  <SelectItem value="sandwich">Sandwich</SelectItem>
                  <SelectItem value="fish">Fish</SelectItem>
                  <SelectItem value="ice-cream">Ice Cream</SelectItem>
                  <SelectItem value="soup">Soup</SelectItem>
                  <SelectItem value="dessert">Dessert</SelectItem>
                  <SelectItem value="salad">Salad</SelectItem>
                  <SelectItem value="utensils">Utensils</SelectItem>
                  <SelectItem value="utensils-crossed">Utensils Crossed</SelectItem>
                  <SelectItem value="cheese">Cheese</SelectItem>
                  <SelectItem value="cherry">Cherry</SelectItem>
                  <SelectItem value="leaf">Leaf</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center mt-2">
                <span className="mr-2">Preview:</span>
                {getIconComponent(newCategory.icon)}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditCategoryDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleEditCategory} disabled={!newCategory.name.trim()}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Category Dialog */}
      <Dialog open={deleteCategoryDialogOpen} onOpenChange={setDeleteCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Menu Category</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this category? This will also delete all menu items in this category.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="font-medium">{selectedCategory?.name}</p>
            <p className="text-sm text-muted-foreground mt-1">
              This action cannot be undone.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteCategoryDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteCategory}>Delete Category</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Add Item Dialog */}
      <Dialog open={addItemDialogOpen} onOpenChange={setAddItemDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Menu Item</DialogTitle>
            <DialogDescription>
              Add a new item to your menu.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh]">
            <div className="grid gap-4 py-4 px-1">
              <div>
                <Label htmlFor="item-name">Item Name</Label>
                <Input 
                  id="item-name" 
                  value={newItem.name} 
                  onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="item-description">Description (Optional)</Label>
                <Textarea 
                  id="item-description" 
                  value={newItem.description} 
                  onChange={(e) => setNewItem({...newItem, description: e.target.value})}
                  className="mt-1"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="item-price">Price</Label>
                  <Input 
                    id="item-price" 
                    type="number" 
                    min="0" 
                    step="0.01"
                    value={newItem.price} 
                    onChange={(e) => setNewItem({...newItem, price: parseFloat(e.target.value) || 0})}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="item-tax">Tax Percentage</Label>
                  <Input 
                    id="item-tax" 
                    type="number" 
                    min="0" 
                    max="100"
                    value={newItem.tax_percentage} 
                    onChange={(e) => setNewItem({...newItem, tax_percentage: parseFloat(e.target.value) || 0})}
                    className="mt-1"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="item-promotion-price">Promotion Price (Optional)</Label>
                <Input 
                  id="item-promotion-price" 
                  type="number" 
                  min="0" 
                  step="0.01"
                  value={newItem.promotion_price !== null ? newItem.promotion_price : ''} 
                  onChange={(e) => setNewItem({
                    ...newItem, 
                    promotion_price: e.target.value ? parseFloat(e.target.value) : null
                  })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Item Image (Optional)</Label>
                <div className="mt-1">
                  <ImageUpload 
                    value={newItem.image || ""} 
                    onChange={(url) => setNewItem({...newItem, image: url})} 
                  />
                </div>
              </div>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddItemDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddItem} disabled={!newItem.name.trim() || newItem.price <= 0}>Add Item</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit Item Dialog */}
      <Dialog open={editItemDialogOpen} onOpenChange={setEditItemDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Menu Item</DialogTitle>
            <DialogDescription>
              Update the details of this menu item.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh]">
            <div className="grid gap-4 py-4 px-1">
              <div>
                <Label htmlFor="edit-item-name">Item Name</Label>
                <Input 
                  id="edit-item-name" 
                  value={newItem.name} 
                  onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="edit-item-description">Description (Optional)</Label>
                <Textarea 
                  id="edit-item-description" 
                  value={newItem.description} 
                  onChange={(e) => setNewItem({...newItem, description: e.target.value})}
                  className="mt-1"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-item-price">Price</Label>
                  <Input 
                    id="edit-item-price" 
                    type="number" 
                    min="0" 
                    step="0.01"
                    value={newItem.price} 
                    onChange={(e) => setNewItem({...newItem, price: parseFloat(e.target.value) || 0})}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-item-tax">Tax Percentage</Label>
                  <Input 
                    id="edit-item-tax" 
                    type="number" 
                    min="0" 
                    max="100"
                    value={newItem.tax_percentage} 
                    onChange={(e) => setNewItem({...newItem, tax_percentage: parseFloat(e.target.value) || 0})}
                    className="mt-1"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="edit-item-promotion-price">Promotion Price (Optional)</Label>
                <Input 
                  id="edit-item-promotion-price" 
                  type="number" 
                  min="0" 
                  step="0.01"
                  value={newItem.promotion_price !== null ? newItem.promotion_price : ''} 
                  onChange={(e) => setNewItem({
                    ...newItem, 
                    promotion_price: e.target.value ? parseFloat(e.target.value) : null
                  })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Item Image (Optional)</Label>
                <div className="mt-1">
                  <ImageUpload 
                    value={newItem.image || ""} 
                    onChange={(url) => setNewItem({...newItem, image: url})} 
                  />
                </div>
              </div>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditItemDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleEditItem} disabled={!newItem.name.trim() || newItem.price <= 0}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Item Dialog */}
      <Dialog open={deleteItemDialogOpen} onOpenChange={setDeleteItemDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Menu Item</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this menu item?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="font-medium">{selectedItem?.name}</p>
            <p className="text-sm text-muted-foreground mt-1">
              This action cannot be undone.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteItemDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteItem}>Delete Item</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit Topping Category Dialog */}
      <Dialog open={editToppingCategoryDialogOpen} onOpenChange={setEditToppingCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Topping Category</DialogTitle>
            <DialogDescription>
              Update the details of this topping category.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="edit-topping-category-name">Category Name</Label>
              <Input 
                id="edit-topping-category-name" 
                value={newToppingCategory.name} 
                onChange={(e) => setNewToppingCategory({...newToppingCategory, name: e.target.value})}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="edit-topping-category-description">Description (Optional)</Label>
              <Textarea 
                id="edit-topping-category-description" 
                value={newToppingCategory.description} 
                onChange={(e) => setNewToppingCategory({...newToppingCategory, description: e.target.value})}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="edit-topping-category-icon">Icon</Label>
              <Select 
                value={newToppingCategory.icon} 
                onValueChange={(value) => setNewToppingCategory({...newToppingCategory, icon: value})}
              >
                <SelectTrigger id="edit-topping-category-icon" className="mt-1">
                  <SelectValue placeholder="Select an icon" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cherry">Cherry</SelectItem>
                  <SelectItem value="cheese">Cheese</SelectItem>
                  <SelectItem value="leaf">Leaf</SelectItem>
                  <SelectItem value="beef">Beef</SelectItem>
                  <SelectItem value="pizza">Pizza</SelectItem>
                  <SelectItem value="utensils">Utensils</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center mt-2">
                <span className="mr-2">Preview:</span>
                {getIconComponent(newToppingCategory.icon)}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-min-selections">Minimum Selections</Label>
                <Input 
                  id="edit-min-selections" 
                  type="number" 
                  min="0"
                  value={newToppingCategory.min_selections} 
                  onChange={(e) => setNewToppingCategory({
                    ...newToppingCategory, 
                    min_selections: parseInt(e.target.value) || 0
                  })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="edit-max-selections">Maximum Selections</Label>
                <Input 
                  id="edit-max-selections" 
                  type="number" 
                  min="1"
                  value={newToppingCategory.max_selections} 
                  onChange={(e) => setNewToppingCategory({
                    ...newToppingCategory, 
                    max_selections: parseInt(e.target.value) || 1
                  })}
                  className="mt-1"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditToppingCategoryDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleEditToppingCategory} disabled={!newToppingCategory.name.trim()}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Topping Category Dialog */}
      <Dialog open={deleteToppingCategoryDialogOpen} onOpenChange={setDeleteToppingCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Topping Category</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this topping category? This will also delete all toppings in this category.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="font-medium">{selectedToppingCategory?.name}</p>
            <p className="text-sm text-muted-foreground mt-1">
              This action cannot be undone.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteToppingCategoryDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteToppingCategory}>Delete Category</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Add Topping Dialog */}
      <Dialog open={addToppingDialogOpen} onOpenChange={setAddToppingDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Topping</DialogTitle>
            <DialogDescription>
              Add a new topping to this category.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="topping-name">Topping Name</Label>
              <Input 
                id="topping-name" 
                value={newTopping.name} 
                onChange={(e) => setNewTopping({...newTopping, name: e.target.value})}
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="topping-price">Price</Label>
                <Input 
                  id="topping-price" 
                  type="number" 
                  min="0" 
                  step="0.01"
                  value={newTopping.price} 
                  onChange={(e) => setNewTopping({...newTopping, price: parseFloat(e.target.value) || 0})}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="topping-tax">Tax Percentage</Label>
                <Input 
                  id="topping-tax" 
                  type="number" 
                  min="0" 
                  max="100"
                  value={newTopping.tax_percentage} 
                  onChange={(e) => setNewTopping({...newTopping, tax_percentage: parseFloat(e.target.value) || 0})}
                  className="mt-1"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddToppingDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddTopping} disabled={!newTopping.name.trim()}>Add Topping</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit Topping Dialog */}
      <Dialog open={editToppingDialogOpen} onOpenChange={setEditToppingDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Topping</DialogTitle>
            <DialogDescription>
              Update the details of this topping.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="edit-topping-name">Topping Name</Label>
              <Input 
                id="edit-topping-name" 
                value={newTopping.name} 
                onChange={(e) => setNewTopping({...newTopping, name: e.target.value})}
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-topping-price">Price</Label>
                <Input 
                  id="edit-topping-price" 
                  type="number" 
                  min="0" 
                  step="0.01"
                  value={newTopping.price} 
                  onChange={(e) => setNewTopping({...newTopping, price: parseFloat(e.target.value) || 0})}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="edit-topping-tax">Tax Percentage</Label>
                <Input 
                  id="edit-topping-tax" 
                  type="number" 
                  min="0" 
                  max="100"
                  value={newTopping.tax_percentage} 
                  onChange={(e) => setNewTopping({...newTopping, tax_percentage: parseFloat(e.target.value) || 0})}
                  className="mt-1"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditToppingDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleEditTopping} disabled={!newTopping.name.trim()}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Topping Dialog */}
      <Dialog open={deleteToppingDialogOpen} onOpenChange={setDeleteToppingDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Topping</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this topping?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="font-medium">{selectedTopping?.name}</p>
            <p className="text-sm text-muted-foreground mt-1">
              This action cannot be undone.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteToppingDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteTopping}>Delete Topping</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default RestaurantManage;
