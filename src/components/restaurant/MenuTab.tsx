import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { 
  Restaurant, 
  MenuCategory, 
  MenuItem,
  ToppingCategory
} from "@/types/database-types";
import { 
  getCategoriesByRestaurantId, 
  getMenuItemsByCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  getToppingCategoriesByRestaurantId
} from "@/services/kiosk-service";
import { getIconComponent } from "@/utils/icon-mapping";
import { Badge } from "@/components/ui/badge";
import CategoryForm from "@/components/forms/CategoryForm";
import MenuItemForm from "@/components/forms/MenuItemForm";

interface MenuTabProps {
  restaurant: Restaurant;
}

const MenuTab = ({ restaurant }: MenuTabProps) => {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [menuItems, setMenuItems] = useState<Record<string, MenuItem[]>>({});
  const [loading, setLoading] = useState(true);
  const [toppingCategories, setToppingCategories] = useState<ToppingCategory[]>([]);
  
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

  const CURRENCY_SYMBOLS: Record<string, string> = {
    EUR: "€",
    USD: "$",
    GBP: "£",
    TRY: "₺",
    JPY: "¥",
    CAD: "$",
    AUD: "$",
    CHF: "Fr.",
    CNY: "¥",
    RUB: "₽"
  };

  const getCurrencySymbol = (currency: string) => {
    const code = currency?.toUpperCase() || "EUR";
    return CURRENCY_SYMBOLS[code] || code;
  };

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
    const fetchToppingCategories = async () => {
      if (!restaurant?.id) return;
      
      try {
        console.log("Fetching topping categories for restaurant ID:", restaurant.id);
        const data = await getToppingCategoriesByRestaurantId(restaurant.id);
        console.log("Fetched topping categories:", data);
        setToppingCategories(data);
      } catch (error) {
        console.error("Error fetching topping categories:", error);
      }
    };

    fetchToppingCategories();
  }, [restaurant]);

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

  const getToppingCategoryName = (id: string) => {
    const category = toppingCategories.find(tc => tc.id === id);
    return category ? category.name : "";
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
        category_id: categoryId,
        topping_categories: values.topping_categories || []
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
        image: values.image || null,
        topping_categories: values.topping_categories || [],
        tax_percentage: values.tax_percentage || "10"
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

  return (
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

      <Card>
        <CardHeader>
          <CardTitle>Menu Items</CardTitle>
        </CardHeader>
        <CardContent>
          {categories.length > 0 ? (
            <Tabs defaultValue={categories[0].id}>
              <TabsList className="flex space-x-2">
                {categories.map((category) => (
                  <TabsTrigger key={category.id} value={category.id}>
                    {category.name}
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
                                {getCurrencySymbol(restaurant.currency)}{parseFloat(item.price.toString()).toFixed(2)}
                                {item.promotion_price && (
                                  <span className="ml-2 line-through text-muted-foreground">
                                    {getCurrencySymbol(restaurant.currency)}{parseFloat(item.promotion_price.toString()).toFixed(2)}
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
                        <div className="flex mt-2 md:mt-0">
                          <Dialog open={isEditingMenuItem === item.id} onOpenChange={(open) => setIsEditingMenuItem(open ? item.id : null)}>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Edit className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[425px]">
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
                                  image: item.image || "",
                                  topping_categories: item.topping_categories || [],
                                  tax_percentage: item.tax_percentage ? item.tax_percentage.toString() : "10"
                                }}
                                isLoading={savingMenuItem}
                                restaurantId={restaurant.id}
                              />
                            </DialogContent>
                          </Dialog>
                          <Dialog open={menuItemToDelete === item.id} onOpenChange={(open) => setMenuItemToDelete(open ? item.id : null)}>
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
                    <Dialog open={isAddingMenuItem} onOpenChange={(open) => {
                      setIsAddingMenuItem(open);
                      if (!open) setSelectedCategoryForItem(null);
                    }}>
                      <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                          <DialogTitle>Add Menu Item</DialogTitle>
                        </DialogHeader>
                        {selectedCategoryForItem && (
                          <div className="mb-4">
                            <label className="text-sm font-medium mb-1 block">Category</label>
                            <select 
                              className="w-full px-3 py-2 border rounded-md"
                              value={selectedCategoryForItem}
                              onChange={(e) => setSelectedCategoryForItem(e.target.value)}
                            >
                              {categories.map(cat => (
                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                              ))}
                            </select>
                          </div>
                        )}
                        <MenuItemForm 
                          onSubmit={(values) => selectedCategoryForItem && handleAddMenuItem(selectedCategoryForItem, values)}
                          isLoading={savingMenuItem}
                          restaurantId={restaurant.id}
                        />
                      </DialogContent>
                    </Dialog>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No items found for this restaurant</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MenuTab;
