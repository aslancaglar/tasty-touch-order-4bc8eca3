import React, { useState, useEffect } from "react";
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
  getCategoriesByRestaurantId, 
  getMenuItemsByCategory,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem
} from "@/services/kiosk-service";
import { clearMenuCache } from "@/services/cache-service";
import { Restaurant, MenuCategory, MenuItem } from "@/types/database-types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import MenuItemForm from "@/components/forms/MenuItemForm";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const MenuTab = ({ restaurant }: { restaurant: Restaurant }) => {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [menuItems, setMenuItems] = useState<Record<string, MenuItem[]>>({});
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [addingMenuItem, setAddingMenuItem] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [updatingItem, setUpdatingItem] = useState(false);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  const { toast } = useToast();

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
          description: "Failed to fetch menu categories. Please try again.",
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

  const handleCategoryChange = (value: string) => {
    setSelectedCategory(value);
  };

  const handleAddMenuItem = async (values: any) => {
    try {
      setAddingMenuItem(true);
      
      if (!selectedCategory) {
        throw new Error("No category selected");
      }
      
      console.log("Adding menu item with values:", values);
      
      const newItem = await createMenuItem({
        name: values.name,
        description: values.description || null,
        price: parseFloat(values.price),
        promotion_price: values.promotion_price ? parseFloat(values.promotion_price) : null,
        image: values.image || null,
        category_id: selectedCategory,
        tax_percentage: values.tax_percentage ? parseFloat(values.tax_percentage) : 10,
        topping_categories: values.topping_categories || [],
        display_order: parseInt(values.display_order) || 0,
        available_from: values.available_from || null,
        available_until: values.available_until || null,
        is_featured: values.is_featured || false // Ensure this field is passed correctly
      });
      
      console.log("New menu item created:", newItem);
      
      // Update menu items state
      setMenuItems(prev => ({
        ...prev,
        [selectedCategory]: [...(prev[selectedCategory] || []), newItem]
      }));
      
      // Clear menu cache
      if (restaurant?.id) {
        clearMenuCache(restaurant.id);
      }
      
      toast({
        title: "Menu Item Added",
        description: `${values.name} has been added to the menu.`,
      });
      
      setIsAddingItem(false);
    } catch (error) {
      console.error("Error adding menu item:", error);
      toast({
        title: "Error",
        description: "Failed to add the menu item. Please try again.",
        variant: "destructive"
      });
    } finally {
      setAddingMenuItem(false);
    }
  };

  const handleUpdateMenuItem = async (itemId: string, values: any) => {
    try {
      setUpdatingItem(true);
      
      console.log("Updating menu item with values:", values);
      
      const updatedItem = await updateMenuItem(itemId, {
        name: values.name,
        description: values.description || null,
        price: parseFloat(values.price),
        promotion_price: values.promotion_price ? parseFloat(values.promotion_price) : null,
        image: values.image || null,
        tax_percentage: values.tax_percentage ? parseFloat(values.tax_percentage) : 10,
        topping_categories: values.topping_categories || [],
        display_order: parseInt(values.display_order) || 0,
        available_from: values.available_from || null,
        available_until: values.available_until || null,
        is_featured: values.is_featured // Make sure we pass the featured status
      });
      
      console.log("Menu item updated:", updatedItem);
      
      // Update menu items in state
      setMenuItems(prev => {
        const categoryItems = [...(prev[updatedItem.category_id] || [])];
        const itemIndex = categoryItems.findIndex(item => item.id === itemId);
        
        if (itemIndex !== -1) {
          categoryItems[itemIndex] = updatedItem;
        }
        
        return {
          ...prev,
          [updatedItem.category_id]: categoryItems
        };
      });
      
      // Clear menu cache
      if (restaurant?.id) {
        clearMenuCache(restaurant.id);
      }
      
      toast({
        title: "Menu Item Updated",
        description: `${values.name} has been updated.`,
      });
      
      setEditingItemId(null);
    } catch (error) {
      console.error("Error updating menu item:", error);
      toast({
        title: "Error",
        description: "Failed to update the menu item. Please try again.",
        variant: "destructive"
      });
    } finally {
      setUpdatingItem(false);
    }
  };

  const handleDeleteMenuItem = async (itemId: string) => {
    try {
      setDeletingItemId(itemId);
      
      await deleteMenuItem(itemId);
      
      // Update menu items in state
      setMenuItems(prev => {
        const updatedMenuItems = {};
        
        for (const categoryId in prev) {
          updatedMenuItems[categoryId] = prev[categoryId].filter(item => item.id !== itemId);
        }
        
        return updatedMenuItems;
      });
      
      // Clear menu cache
      if (restaurant?.id) {
        clearMenuCache(restaurant.id);
      }
      
      toast({
        title: "Menu Item Deleted",
        description: "The menu item has been deleted.",
      });
    } catch (error) {
      console.error("Error deleting menu item:", error);
      toast({
        title: "Error",
        description: "Failed to delete the menu item. Please try again.",
        variant: "destructive"
      });
    } finally {
      setDeletingItemId(null);
    }
  };

  return (
    <div className="space-y-4">
      {loading ? (
        <div className="flex justify-center items-center h-[200px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {categories.length > 0 ? (
            <Tabs defaultValue={categories[0].id} onValueChange={handleCategoryChange}>
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
                            <div className="flex items-center mt-1">
                              <p className="text-sm font-medium">
                                €{parseFloat(item.price.toString()).toFixed(2)}
                                {item.promotion_price && (
                                  <span className="ml-2 line-through text-muted-foreground">
                                    €{parseFloat(item.promotion_price.toString()).toFixed(2)}
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="flex space-x-2 mt-4 md:mt-0">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>Edit Menu Item</DialogTitle>
                                <DialogDescription>Make changes to this menu item.</DialogDescription>
                              </DialogHeader>
                              <MenuItemForm 
                                onSubmit={(values) => handleUpdateMenuItem(item.id, values)}
                                initialValues={{
                                  name: item.name,
                                  description: item.description || "",
                                  price: item.price.toString(),
                                  promotion_price: item.promotion_price ? item.promotion_price.toString() : "",
                                  image: item.image || "",
                                  topping_categories: item.topping_categories || [],
                                  tax_percentage: item.tax_percentage ? item.tax_percentage.toString() : "10",
                                  display_order: item.display_order ? item.display_order.toString() : "0",
                                  available_from: item.available_from || "",
                                  available_until: item.available_until || "",
                                  is_featured: item.is_featured || false
                                }}
                                isLoading={updatingItem}
                                restaurantId={restaurant?.id || ""}
                              />
                            </DialogContent>
                          </Dialog>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="text-red-500"
                                disabled={deletingItemId === item.id}
                              >
                                {deletingItemId === item.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : (
                                  <Trash2 className="h-4 w-4 mr-2" />
                                )}
                                Delete
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action cannot be undone. Are you sure you want to delete this menu item?
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteMenuItem(item.id)}>
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    ))}
                    <Dialog>
                      <DialogTrigger asChild>
                        <div className="border border-dashed rounded-lg p-4 flex items-center justify-center">
                          <Button variant="ghost" className="w-full h-full flex items-center justify-center">
                            <Plus className="mr-2 h-4 w-4" />
                            Add Menu Item
                          </Button>
                        </div>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Add Menu Item</DialogTitle>
                          <DialogDescription>Create a new menu item.</DialogDescription>
                        </DialogHeader>
                        <MenuItemForm 
                          onSubmit={handleAddMenuItem}
                          isLoading={addingMenuItem}
                          restaurantId={restaurant?.id || ""}
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
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MenuTab;
