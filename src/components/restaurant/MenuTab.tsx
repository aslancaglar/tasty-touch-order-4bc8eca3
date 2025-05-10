import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2, Loader2, Utensils, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { 
  Restaurant, 
  MenuCategory, 
  MenuItem
} from "@/types/database-types";
import { 
  getCategoriesByRestaurantId, 
  getMenuItemsByCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem
} from "@/services/kiosk-service";
import CategoryForm from "@/components/forms/CategoryForm";
import MenuItemForm from "@/components/forms/MenuItemForm";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/utils/language-utils";

interface MenuTabProps {
  restaurant: Restaurant;
}

// CategoryCard component to replace SortableCategory
const CategoryCard = ({ 
  category, 
  isSelected, 
  onSelect, 
  onEdit, 
  onDelete, 
  isMobile 
}: { 
  category: MenuCategory; 
  isSelected: boolean; 
  onSelect: () => void; 
  onEdit: () => void; 
  onDelete: () => void;
  isMobile?: boolean;
}) => {
  return (
    <div
      className={`border rounded-lg p-3 sm:p-4 cursor-pointer transition-all ${
        isSelected ? 'border-kiosk-primary bg-muted/50' : 'border-border hover:border-muted-foreground'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 sm:space-x-3">
          <div className="p-2 bg-primary/10 rounded-md w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center">
            {category.icon ? (
              <img 
                src={category.icon} 
                alt={category.name}
                className="w-full h-full object-cover rounded"
              />
            ) : (
              <div className="w-full h-full bg-muted rounded flex items-center justify-center">
                <Utensils className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
              </div>
            )}
          </div>
          <div className="overflow-hidden">
            <h3 className="font-medium text-sm sm:text-base truncate">{category.name}</h3>
            <p className="text-xs sm:text-sm text-muted-foreground truncate">
              {category.description || "No description"}
            </p>
            <span className="text-xs text-muted-foreground">Order: {category.display_order || 0}</span>
          </div>
        </div>
        <div className="flex space-x-1 sm:space-x-2 ml-1">
          <Button
            variant="ghost"
            size={isMobile ? "xs" : "icon"}
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
          >
            <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
          </Button>
          <Button
            variant="ghost"
            size={isMobile ? "xs" : "icon"}
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 text-destructive" />
          </Button>
        </div>
      </div>
    </div>
  );
};

const formatTimeDisplay = (timeString: string | null | undefined): string => {
  if (!timeString) return "";
  
  try {
    // Create a date object with the time string
    const [hours, minutes] = timeString.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0);
    
    // Format the time in 12-hour format with AM/PM
    return format(date, 'h:mm a');
  } catch (error) {
    console.error("Error formatting time:", error);
    return timeString;
  }
};

const MenuTab = ({ restaurant }: MenuTabProps) => {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<MenuCategory | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const isMobile = useIsMobile();
  
  const [showCreateCategoryDialog, setShowCreateCategoryDialog] = useState(false);
  const [showUpdateCategoryDialog, setShowUpdateCategoryDialog] = useState(false);
  const [showDeleteCategoryDialog, setShowDeleteCategoryDialog] = useState(false);
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [isUpdatingCategory, setIsUpdatingCategory] = useState(false);
  const [isDeletingCategory, setIsDeletingCategory] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<MenuCategory | null>(null);

  const [showCreateItemDialog, setShowCreateItemDialog] = useState(false);
  const [showUpdateItemDialog, setShowUpdateItemDialog] = useState(false);
  const [showDeleteItemDialog, setShowDeleteItemDialog] = useState(false);
  const [isCreatingItem, setIsCreatingItem] = useState(false);
  const [isUpdatingItem, setIsUpdatingItem] = useState(false);
  const [isDeletingItem, setIsDeletingItem] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);

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

  // Update the useTranslation call to handle string language properly
  const { t } = useTranslation(restaurant.ui_language || "en");

  useEffect(() => {
    const fetchCategories = async () => {
      if (!restaurant?.id) return;
      
      try {
        setLoading(true);
        const data = await getCategoriesByRestaurantId(restaurant.id);
        // Sort categories by display_order
        const sortedCategories = [...data].sort((a, b) => 
          (a.display_order || 0) - (b.display_order || 0)
        );
        setCategories(sortedCategories);
        if (sortedCategories.length > 0) {
          setSelectedCategory(sortedCategories[0]);
        }
        setLoading(false);
      } catch (error) {
        console.error("Error fetching categories:", error);
        toast({
          title: "Error",
          description: "Failed to load categories",
          variant: "destructive"
        });
        setLoading(false);
      }
    };

    fetchCategories();
  }, [restaurant.id, toast]);

  useEffect(() => {
    const fetchMenuItems = async () => {
      if (!selectedCategory) return;
      
      try {
        setLoading(true);
        const items = await getMenuItemsByCategory(selectedCategory.id);
        // Sort menu items by display_order
        const sortedItems = [...items].sort((a, b) => 
          (a.display_order || 0) - (b.display_order || 0)
        );
        setMenuItems(sortedItems);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching menu items:", error);
        setLoading(false);
      }
    };

    fetchMenuItems();
  }, [selectedCategory]);

  const handleAddCategory = async (values: any) => {
    try {
      setIsCreatingCategory(true);
      
      if (!restaurant?.id) {
        throw new Error("Restaurant ID is missing");
      }
      
      const newCategory = await createCategory({
        name: values.name,
        description: values.description || null,
        image_url: values.image_url || null,
        icon: "utensils",
        restaurant_id: restaurant.id,
        display_order: values.display_order ? parseInt(values.display_order, 10) : 0
      });
      
      const updatedCategories = [...categories, newCategory].sort((a, b) => 
        (a.display_order || 0) - (b.display_order || 0)
      );
      setCategories(updatedCategories);
      if (!selectedCategory) {
        setSelectedCategory(newCategory);
      }
      
      toast({
        title: "Success",
        description: `${values.name} has been added to your menu categories.`,
      });
      
      setShowCreateCategoryDialog(false);
    } catch (error) {
      console.error("Error adding category:", error);
      toast({
        title: "Error",
        description: "Failed to add the category",
        variant: "destructive"
      });
    } finally {
      setIsCreatingCategory(false);
    }
  };

  const handleEditCategory = async (categoryId: string, values: any) => {
    try {
      setIsUpdatingCategory(true);
      
      const updatedCategory = await updateCategory(categoryId, {
        name: values.name,
        description: values.description || null,
        image_url: values.image_url || null,
        icon: values.icon || "utensils",
        display_order: values.display_order ? parseInt(values.display_order, 10) : 0
      });
      
      const updatedCategories = categories.map(cat => 
        cat.id === categoryId ? updatedCategory : cat
      ).sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
      
      setCategories(updatedCategories);
      
      toast({
        title: "Success",
        description: `${values.name} has been updated.`,
      });
      
      setShowUpdateCategoryDialog(false);
    } catch (error) {
      console.error("Error updating category:", error);
      toast({
        title: "Error",
        description: "Failed to update the category",
        variant: "destructive"
      });
    } finally {
      setIsUpdatingCategory(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (!categoryToDelete) return;

    try {
      setIsDeletingCategory(true);
      
      await deleteCategory(categoryToDelete.id);
      
      setCategories(categories.filter(cat => cat.id !== categoryToDelete.id));
      setMenuItems([]);
      setSelectedCategory(null);
      
      toast({
        title: "Success",
        description: "The category has been deleted.",
      });
      
      setShowDeleteCategoryDialog(false);
    } catch (error) {
      console.error("Error deleting category:", error);
      toast({
        title: "Error",
        description: "Failed to delete the category",
        variant: "destructive"
      });
    } finally {
      setIsDeletingCategory(false);
    }
  };

  const handleAddMenuItem = async (values: any) => {
    if (!selectedCategory) return;

    try {
      setIsCreatingItem(true);
      
      const newMenuItem = await createMenuItem({
        name: values.name,
        description: values.description || null,
        price: Number(values.price),
        promotion_price: values.promotion_price ? Number(values.promotion_price) : null,
        image: values.image || null,
        category_id: selectedCategory.id,
        topping_categories: values.topping_categories || [],
        in_stock: true,
        display_order: values.display_order ? parseInt(values.display_order, 10) : 0,
        tax_percentage: values.tax_percentage ? Number(values.tax_percentage) : 10,
        available_from: values.available_from || null,
        available_until: values.available_until || null
      });
      
      const updatedItems = [...menuItems, newMenuItem].sort((a, b) => 
        (a.display_order || 0) - (b.display_order || 0)
      );
      setMenuItems(updatedItems);
      
      toast({
        title: "Success",
        description: `${values.name} has been added to the menu.`,
      });
      
      setShowCreateItemDialog(false);
    } catch (error) {
      console.error("Error adding menu item:", error);
      toast({
        title: "Error",
        description: "Failed to add the menu item",
        variant: "destructive"
      });
    } finally {
      setIsCreatingItem(false);
    }
  };

  const handleEditMenuItem = async (values: any) => {
    if (!selectedItem) return;

    try {
      setIsUpdatingItem(true);
      
      const updatedMenuItem = await updateMenuItem(selectedItem.id, {
        name: values.name,
        description: values.description || null,
        price: Number(values.price),
        promotion_price: values.promotion_price ? Number(values.promotion_price) : null,
        image: values.image || null,
        topping_categories: values.topping_categories || [],
        tax_percentage: values.tax_percentage ? Number(values.tax_percentage) : null,
        display_order: values.display_order ? parseInt(values.display_order, 10) : 0,
        available_from: values.available_from || null,
        available_until: values.available_until || null
      });
      
      const updatedItems = menuItems.map(item => 
        item.id === selectedItem.id ? updatedMenuItem : item
      ).sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
      
      setMenuItems(updatedItems);
      
      toast({
        title: "Success",
        description: `${values.name} has been updated.`,
      });
      
      setShowUpdateItemDialog(false);
    } catch (error) {
      console.error("Error updating menu item:", error);
      toast({
        title: "Error",
        description: "Failed to update the menu item",
        variant: "destructive"
      });
    } finally {
      setIsUpdatingItem(false);
    }
  };

  const handleDeleteMenuItem = async () => {
    if (!selectedItem) return;

    try {
      setIsDeletingItem(true);
      
      await deleteMenuItem(selectedItem.id);
      
      setMenuItems(menuItems.filter(item => item.id !== selectedItem.id));
      
      toast({
        title: "Success",
        description: "The menu item has been deleted.",
      });
      
      setShowDeleteItemDialog(false);
    } catch (error) {
      console.error("Error deleting menu item:", error);
      toast({
        title: "Error",
        description: "Failed to delete the menu item",
        variant: "destructive"
      });
    } finally {
      setIsDeletingItem(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold">Menu Categories</h2>
        <p className="text-muted-foreground text-sm">
          Manage menu categories available in your restaurant.
        </p>
      </div>

      <Button onClick={() => setShowCreateCategoryDialog(true)} className="bg-kiosk-primary w-full sm:w-auto">
        <Plus className="mr-2 h-4 w-4" />
        Add Category
      </Button>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {categories.map((category) => (
          <CategoryCard
            key={category.id}
            category={category}
            isSelected={selectedCategory?.id === category.id}
            onSelect={() => setSelectedCategory(category)}
            onEdit={() => {
              setSelectedCategory(category);
              setShowUpdateCategoryDialog(true);
            }}
            onDelete={() => {
              setCategoryToDelete(category);
              setShowDeleteCategoryDialog(true);
            }}
            isMobile={isMobile}
          />
        ))}
      </div>

      <Separator className="my-4 sm:my-6" />

      {selectedCategory && (
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 mb-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold">Menu Items - {selectedCategory.name}</h2>
              <p className="text-sm text-muted-foreground">
                Manage menu items in the selected category.
              </p>
            </div>
            <Button 
              onClick={() => setShowCreateItemDialog(true)} 
              className="bg-kiosk-primary w-full sm:w-auto"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Menu Item
            </Button>
          </div>

          <div className="mt-4 space-y-3 sm:space-y-4">
            {menuItems.map((item) => (
              <div
                key={item.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 border rounded-lg gap-3"
              >
                <div className="flex items-center space-x-3 sm:space-x-4">
                  {item.image && (
                    <img 
                      src={item.image} 
                      alt={item.name} 
                      className="h-14 w-14 sm:h-16 sm:w-16 object-cover rounded-md"
                    />
                  )}
                  <div>
                    <h3 className="font-medium">{item.name}</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">{item.description}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <p className="text-sm font-medium">
                        {getCurrencySymbol(restaurant.currency)}{parseFloat(item.price.toString()).toFixed(2)}
                        {item.promotion_price && (
                          <span className="ml-2 line-through text-muted-foreground">
                            {getCurrencySymbol(restaurant.currency)}{parseFloat(item.promotion_price.toString()).toFixed(2)}
                          </span>
                        )}
                      </p>
                      <span className="text-xs text-muted-foreground">Order: {item.display_order || 0}</span>
                      
                      {/* Display availability time badge if set */}
                      {item.available_from && item.available_until && (
                        <Badge variant="outline" className="flex items-center gap-1 text-xs">
                          <Clock className="h-3 w-3" />
                          {formatTimeDisplay(item.available_from)} - {formatTimeDisplay(item.available_until)}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex space-x-2 self-end sm:self-center mt-2 sm:mt-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setSelectedItem(item);
                      setShowUpdateItemDialog(true);
                    }}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setSelectedItem(item);
                      setShowDeleteItemDialog(true);
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
            
            {menuItems.length === 0 && !loading && (
              <div className="text-center py-10 border rounded-lg bg-muted/20">
                <p className="text-muted-foreground">No items found in this category</p>
                <Button 
                  onClick={() => setShowCreateItemDialog(true)} 
                  variant="outline" 
                  className="mt-4"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add First Menu Item
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Dialogs */}
      <Dialog open={showCreateCategoryDialog} onOpenChange={setShowCreateCategoryDialog}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Category</DialogTitle>
          </DialogHeader>
          <CategoryForm 
            onSubmit={handleAddCategory}
            isLoading={isCreatingCategory}
            initialValues={{ display_order: "0" }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={showUpdateCategoryDialog} onOpenChange={setShowUpdateCategoryDialog}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
          </DialogHeader>
          {selectedCategory && (
            <CategoryForm
              onSubmit={(values) => handleEditCategory(selectedCategory.id, values)}
              initialValues={{
                name: selectedCategory.name,
                description: selectedCategory.description || "",
                icon: selectedCategory.icon || "",
                display_order: selectedCategory.display_order?.toString() || "0"
              }}
              isLoading={isUpdatingCategory}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteCategoryDialog} onOpenChange={setShowDeleteCategoryDialog}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Delete Category</DialogTitle>
          </DialogHeader>
          <p>Are you sure you want to delete category "{categoryToDelete?.name}"?</p>
          <div className="flex justify-end space-x-2 mt-4">
            <Button variant="secondary" onClick={() => setShowDeleteCategoryDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteCategory} disabled={isDeletingCategory}>
              {isDeletingCategory ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showCreateItemDialog} onOpenChange={setShowCreateItemDialog}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Menu Item</DialogTitle>
          </DialogHeader>
          <MenuItemForm 
            onSubmit={handleAddMenuItem}
            isLoading={isCreatingItem}
            restaurantId={restaurant.id}
            initialValues={{ display_order: "0" }}
            language={restaurant.ui_language}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={showUpdateItemDialog} onOpenChange={setShowUpdateItemDialog}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Menu Item</DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <MenuItemForm
              onSubmit={handleEditMenuItem}
              initialValues={{
                name: selectedItem.name,
                description: selectedItem.description || "",
                price: selectedItem.price.toString(),
                promotion_price: selectedItem.promotion_price ? selectedItem.promotion_price.toString() : "",
                image: selectedItem.image || "",
                topping_categories: selectedItem.topping_categories || [],
                tax_percentage: selectedItem.tax_percentage ? selectedItem.tax_percentage.toString() : "10",
                display_order: selectedItem.display_order?.toString() || "0",
                available_from: selectedItem.available_from || "",
                available_until: selectedItem.available_until || ""
              }}
              isLoading={isUpdatingItem}
              restaurantId={restaurant.id}
              language={restaurant.ui_language}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteItemDialog} onOpenChange={setShowDeleteItemDialog}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Delete Menu Item</DialogTitle>
          </DialogHeader>
          <p>Are you sure you want to delete menu item "{selectedItem?.name}"?</p>
          <div className="flex justify-end space-x-2 mt-4">
            <Button variant="secondary" onClick={() => setShowDeleteItemDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteMenuItem} disabled={isDeletingItem}>
              {isDeletingItem ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MenuTab;
