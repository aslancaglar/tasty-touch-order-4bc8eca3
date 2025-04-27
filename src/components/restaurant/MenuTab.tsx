import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2, Loader2, Utensils } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
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
import SortableCategory from "./SortableCategory";
import { supabase } from "@/integrations/supabase/client";

interface MenuTabProps {
  restaurant: Restaurant;
}

const MenuTab = ({ restaurant }: MenuTabProps) => {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<MenuCategory | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  
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

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleUpdateCategoryOrder = async (categories: MenuCategory[]) => {
    try {
      const updates = categories.map((category, index) => ({
        id: category.id,
        name: category.name,
        restaurant_id: category.restaurant_id,
        display_order: index
      }));

      const { error } = await supabase
        .from('menu_categories')
        .upsert(updates, { onConflict: 'id' });

      if (error) throw error;
    } catch (error) {
      console.error('Error updating category order:', error);
      toast({
        title: "Error",
        description: "Failed to update category order",
        variant: "destructive"
      });
    }
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      setCategories((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        const newCategories = arrayMove(items, oldIndex, newIndex);
        handleUpdateCategoryOrder(newCategories);
        return newCategories;
      });
    }
  };

  useEffect(() => {
    const fetchCategories = async () => {
      if (!restaurant?.id) return;
      
      try {
        setLoading(true);
        const data = await getCategoriesByRestaurantId(restaurant.id);
        setCategories(data);
        if (data.length > 0) {
          setSelectedCategory(data[0]);
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
        setMenuItems(items);
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
        restaurant_id: restaurant.id
      });
      
      setCategories(prevCategories => [...prevCategories, newCategory]);
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
        icon: values.icon || "utensils"
      });
      
      setCategories(categories.map(cat => 
        cat.id === categoryId ? updatedCategory : cat
      ));
      
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
        topping_categories: values.topping_categories || []
      });
      
      setMenuItems(prev => [...prev, newMenuItem]);
      
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
        tax_percentage: values.tax_percentage ? Number(values.tax_percentage) : null
      });
      
      setMenuItems(menuItems.map(item => 
        item.id === selectedItem.id ? updatedMenuItem : item
      ));
      
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
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Menu Categories</h2>
        <p className="text-muted-foreground">
          Manage menu categories available in your restaurant.
        </p>
      </div>

      <Button onClick={() => setShowCreateCategoryDialog(true)} className="bg-kiosk-primary">
        <Plus className="mr-2 h-4 w-4" />
        Add Category
      </Button>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <SortableContext
            items={categories}
            strategy={verticalListSortingStrategy}
          >
            {categories.map((category) => (
              <SortableCategory
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
              />
            ))}
          </SortableContext>
        </div>
      </DndContext>

      <Separator />

      {selectedCategory && (
        <div>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Menu Items - {selectedCategory.name}</h2>
              <p className="text-muted-foreground">
                Manage menu items in the selected category.
              </p>
            </div>
            <Button onClick={() => setShowCreateItemDialog(true)} className="bg-kiosk-primary">
              <Plus className="mr-2 h-4 w-4" />
              Add Menu Item
            </Button>
          </div>

          <div className="mt-4 space-y-4">
            {menuItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-4 border rounded-lg"
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
                      {getCurrencySymbol(restaurant.currency)}{parseFloat(item.price.toString()).toFixed(2)}
                      {item.promotion_price && (
                        <span className="ml-2 line-through text-muted-foreground">
                          {getCurrencySymbol(restaurant.currency)}{parseFloat(item.promotion_price.toString()).toFixed(2)}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex space-x-2">
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
          </div>
        </div>
      )}

      {/* Dialogs */}
      <Dialog open={showCreateCategoryDialog} onOpenChange={setShowCreateCategoryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Category</DialogTitle>
          </DialogHeader>
          <CategoryForm 
            onSubmit={handleAddCategory}
            isLoading={isCreatingCategory}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={showUpdateCategoryDialog} onOpenChange={setShowUpdateCategoryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
          </DialogHeader>
          {selectedCategory && (
            <CategoryForm
              onSubmit={(values) => handleEditCategory(selectedCategory.id, values)}
              initialValues={{
                name: selectedCategory.name,
                description: selectedCategory.description || "",
                icon: selectedCategory.icon || ""
              }}
              isLoading={isUpdatingCategory}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteCategoryDialog} onOpenChange={setShowDeleteCategoryDialog}>
        <DialogContent>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Menu Item</DialogTitle>
          </DialogHeader>
          <MenuItemForm 
            onSubmit={handleAddMenuItem}
            isLoading={isCreatingItem}
            restaurantId={restaurant.id}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={showUpdateItemDialog} onOpenChange={setShowUpdateItemDialog}>
        <DialogContent>
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
                tax_percentage: selectedItem.tax_percentage ? selectedItem.tax_percentage.toString() : "10"
              }}
              isLoading={isUpdatingItem}
              restaurantId={restaurant.id}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteItemDialog} onOpenChange={setShowDeleteItemDialog}>
        <DialogContent>
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
