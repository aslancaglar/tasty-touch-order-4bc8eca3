import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Restaurant, Topping, ToppingCategory } from "@/types/database-types";
import { 
  getToppingCategoriesByRestaurantId,
  getToppingsByCategory,
  createToppingCategory,
  updateToppingCategory,
  deleteToppingCategory,
  createTopping,
  updateTopping,
  deleteTopping,
  getCategoriesByRestaurantId, // Add this to fetch menu categories
} from "@/services/kiosk-service";
import ToppingCategoryForm from "@/components/forms/ToppingCategoryForm";
import ToppingForm from "@/components/forms/ToppingForm";
import { Card } from "@/components/ui/card";

interface ToppingsTabProps {
  restaurant: Restaurant;
}

const ToppingsTab = ({ restaurant }: ToppingsTabProps) => {
  const [categories, setCategories] = useState<ToppingCategory[]>([]);
  const [toppings, setToppings] = useState<Record<string, Topping[]>>({});
  const [loading, setLoading] = useState(true);
  
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [isEditingCategory, setIsEditingCategory] = useState<string | null>(null);
  const [editingCategoryData, setEditingCategoryData] = useState<ToppingCategory | null>(null);
  const [savingCategory, setSavingCategory] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
  const [isDeletingCategory, setIsDeletingCategory] = useState(false);
  
  const [isAddingTopping, setIsAddingTopping] = useState(false);
  const [selectedCategoryForTopping, setSelectedCategoryForTopping] = useState<string | null>(null);
  const [isEditingTopping, setIsEditingTopping] = useState<string | null>(null);
  const [editingToppingData, setEditingToppingData] = useState<Topping | null>(null);
  const [savingTopping, setSavingTopping] = useState(false);
  const [toppingToDelete, setToppingToDelete] = useState<string | null>(null);
  const [isDeletingTopping, setIsDeletingTopping] = useState(false);
  
  // State for available categories (for conditional display)
  const [availableMenuCategories, setAvailableMenuCategories] = useState<{ id: string; name: string }[]>([]);
  // Predefined order types
  const availableOrderTypes = ["dine-in", "takeaway"];

  const { toast } = useToast();

  useEffect(() => {
    const fetchCategories = async () => {
      if (!restaurant?.id) return;
      
      try {
        setLoading(true);
        const data = await getToppingCategoriesByRestaurantId(restaurant.id);
        setCategories(data);
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

    fetchCategories();
  }, [restaurant, toast]);

  // Fetch menu categories for conditional display options
  useEffect(() => {
    const fetchMenuCategories = async () => {
      if (!restaurant?.id) return;
      
      try {
        const data = await getCategoriesByRestaurantId(restaurant.id);
        const formattedCategories = data.map(cat => ({
          id: cat.id,
          name: cat.name
        }));
        setAvailableMenuCategories(formattedCategories);
      } catch (error) {
        console.error("Error fetching menu categories:", error);
      }
    };

    fetchMenuCategories();
  }, [restaurant]);

  useEffect(() => {
    const fetchToppings = async () => {
      if (categories.length === 0) return;
      
      try {
        setLoading(true);
        const toppingsByCategory: Record<string, Topping[]> = {};
        
        for (const category of categories) {
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
  }, [categories]);

  const handleAddCategory = async (values: any) => {
    try {
      setSavingCategory(true);
      
      console.log("Adding new topping category:", values);
      
      if (!restaurant?.id) {
        throw new Error("Restaurant ID is missing");
      }
      
      const newCategory = await createToppingCategory({
        name: values.name,
        description: values.description || null,
        icon: values.icon || null,
        restaurant_id: restaurant.id,
        min_selections: values.min_selections,
        max_selections: values.max_selections,
        show_if_selection_id: values.show_if_selection_id || [],
        show_if_selection_type: values.show_if_selection_type || []
      });
      
      console.log("New topping category created:", newCategory);
      setCategories(prevCategories => [...prevCategories, newCategory]);
      
      toast({
        title: "Category Added",
        description: `${values.name} has been added to your topping categories.`,
      });
      
      setIsAddingCategory(false);
    } catch (error) {
      console.error("Error adding topping category:", error);
      toast({
        title: "Error",
        description: "Failed to add the topping category. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSavingCategory(false);
    }
  };

  const handleEditCategory = async (categoryId: string, values: any) => {
    try {
      setSavingCategory(true);
      
      console.log("Editing topping category:", categoryId, values);
      
      const updatedCategory = await updateToppingCategory(categoryId, {
        name: values.name,
        description: values.description || null,
        icon: values.icon || null,
        min_selections: values.min_selections,
        max_selections: values.max_selections,
        show_if_selection_id: values.show_if_selection_id || [],
        show_if_selection_type: values.show_if_selection_type || []
      });
      
      console.log("Topping category updated:", updatedCategory);
      setCategories(prevCategories => 
        prevCategories.map(cat => 
          cat.id === categoryId ? updatedCategory : cat
        )
      );
      
      toast({
        title: "Category Updated",
        description: `${values.name} has been updated successfully.`,
      });
      
      setIsEditingCategory(null);
      setEditingCategoryData(null);
    } catch (error) {
      console.error("Error updating topping category:", error);
      toast({
        title: "Error",
        description: "Failed to update the topping category. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSavingCategory(false);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    try {
      setIsDeletingCategory(true);
      
      console.log("Deleting topping category:", categoryId);
      await deleteToppingCategory(categoryId);
      
      console.log("Topping category deleted successfully");
      setCategories(prevCategories => prevCategories.filter(cat => cat.id !== categoryId));
      
      toast({
        title: "Category Deleted",
        description: "The topping category has been deleted.",
      });
      
      setCategoryToDelete(null);
    } catch (error) {
      console.error("Error deleting topping category:", error);
      toast({
        title: "Error",
        description: "Failed to delete the topping category. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsDeletingCategory(false);
    }
  };

  const handleAddTopping = async (categoryId: string, values: any) => {
    try {
      setSavingTopping(true);
      
      console.log("Adding new topping:", values);
      
      const newTopping = await createTopping({
        name: values.name,
        price: Number(values.price),
        category_id: categoryId,
        tax_percentage: 10
      });
      
      console.log("New topping created:", newTopping);
      setToppings(prevToppings => ({
        ...prevToppings,
        [categoryId]: [...(prevToppings[categoryId] || []), newTopping]
      }));
      
      toast({
        title: "Topping Added",
        description: `${values.name} has been added to the topping category.`,
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
      
      console.log("Editing topping:", toppingId, values);
      
      const updatedTopping = await updateTopping(toppingId, {
        name: values.name,
        price: Number(values.price),
        tax_percentage: 10
      });
      
      console.log("Topping updated:", updatedTopping);
      setToppings(prevToppings => {
        const newState = { ...prevToppings };
        Object.keys(newState).forEach(categoryId => {
          newState[categoryId] = newState[categoryId].map(topping => 
            topping.id === toppingId ? updatedTopping : topping
          );
        });
        return newState;
      });
      
      toast({
        title: "Topping Updated",
        description: `${values.name} has been updated successfully.`,
      });
      
      setIsEditingTopping(null);
      setEditingToppingData(null);
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
      
      console.log("Deleting topping:", toppingId);
      await deleteTopping(toppingId);
      
      console.log("Topping deleted successfully");
      setToppings(prevToppings => ({
        ...prevToppings,
        [categoryId]: prevToppings[categoryId].filter(topping => topping.id !== toppingId)
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Topping Categories</h3>
        <Dialog open={isAddingCategory} onOpenChange={setIsAddingCategory}>
          <DialogTrigger asChild>
            <Button className="bg-kiosk-primary">
              <Plus className="mr-2 h-4 w-4" />
              Add Category
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add Topping Category</DialogTitle>
            </DialogHeader>
            <ToppingCategoryForm 
              onSubmit={handleAddCategory}
              isLoading={savingCategory}
              availableCategories={availableMenuCategories}  // Pass menu categories for conditions
              availableSelectionTypes={availableOrderTypes}  // Pass order types
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
            <div key={category.id} className="space-y-2">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">{category.name}</h4>
                  {category.description && (
                    <p className="text-sm text-muted-foreground">{category.description}</p>
                  )}
                </div>
                <div className="flex space-x-1">
                  <Dialog 
                    open={isEditingCategory === category.id} 
                    onOpenChange={(open) => {
                      setIsEditingCategory(open ? category.id : null);
                      if (open) {
                        setEditingCategoryData(category);
                      } else {
                        setEditingCategoryData(null);
                      }
                    }}
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
                      {editingCategoryData && (
                        <ToppingCategoryForm 
                          onSubmit={(values) => handleEditCategory(category.id, values)}
                          initialValues={{
                            name: editingCategoryData.name,
                            description: editingCategoryData.description || "",
                            icon: editingCategoryData.icon || "",
                            min_selections: editingCategoryData.min_selections || 0,
                            max_selections: editingCategoryData.max_selections || 0,
                            show_if_selection_id: editingCategoryData.show_if_selection_id || [],
                            show_if_selection_type: editingCategoryData.show_if_selection_type || []
                          }}
                          isLoading={savingCategory}
                          availableCategories={availableMenuCategories}  // Pass menu categories
                          availableSelectionTypes={availableOrderTypes}  // Pass order types
                        />
                      )}
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
                        <p className="text-sm text-muted-foreground mt-2">This will also delete all toppings in this category.</p>
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
              
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-muted-foreground">Toppings</h4>
                {toppings[category.id]?.map(topping => (
                  <div 
                    key={topping.id} 
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <h5 className="font-medium">{topping.name}</h5>
                      <p className="text-sm text-muted-foreground">€{topping.price.toFixed(2)}</p>
                    </div>
                    <div className="flex space-x-1">
                      <Dialog 
                        open={isEditingTopping === topping.id} 
                        onOpenChange={(open) => {
                          setIsEditingTopping(open ? topping.id : null);
                          if (open) {
                            setEditingToppingData(topping);
                          } else {
                            setEditingToppingData(null);
                          }
                        }}
                      >
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                          <DialogHeader>
                            <DialogTitle>Edit Topping</DialogTitle>
                          </DialogHeader>
                          {editingToppingData && (
                            <ToppingForm 
                              onSubmit={(values) => handleEditTopping(topping.id, values)}
                              initialValues={{
                                name: editingToppingData.name,
                                price: editingToppingData.price.toString()
                              }}
                              isLoading={savingTopping}
                            />
                          )}
                        </DialogContent>
                      </Dialog>
                      <Dialog open={toppingToDelete === topping.id} onOpenChange={(open) => setToppingToDelete(open ? topping.id : null)}>
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
                            <p>Are you sure you want to delete <strong>{topping.name}</strong>?</p>
                          </div>
                          <div className="flex justify-end space-x-2">
                            <Button variant="outline" onClick={() => setToppingToDelete(null)}>
                              Cancel
                            </Button>
                            <Button 
                              variant="destructive" 
                              onClick={() => handleDeleteTopping(category.id, topping.id)}
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
                )) || (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground">No toppings in this category</p>
                  </div>
                )}
                <Dialog open={isAddingTopping && selectedCategoryForTopping === category.id} onOpenChange={(open) => {
                  setIsAddingTopping(open);
                  if (!open) setSelectedCategoryForTopping(null);
                }}>
                  <DialogTrigger asChild>
                    <div className="border border-dashed rounded-lg p-3 flex items-center justify-center cursor-pointer hover:bg-slate-50">
                      <Button variant="ghost" className="w-full h-full flex items-center justify-center">
                        <Plus className="mr-2 h-4 w-4" />
                        Add Topping
                      </Button>
                    </div>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Add Topping</DialogTitle>
                    </DialogHeader>
                    <ToppingForm 
                      onSubmit={(values) => handleAddTopping(category.id, values)}
                      isLoading={savingTopping}
                    />
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
                <DialogTitle>Add Topping Category</DialogTitle>
              </DialogHeader>
              <ToppingCategoryForm 
                onSubmit={handleAddCategory}
                isLoading={savingCategory}
                availableCategories={availableMenuCategories}  // Pass menu categories for conditions
                availableSelectionTypes={availableOrderTypes}  // Pass order types
              />
            </DialogContent>
          </Dialog>
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-muted-foreground mb-4">No topping categories found for this restaurant</p>
          <Dialog open={isAddingCategory} onOpenChange={setIsAddingCategory}>
            <DialogTrigger asChild>
              <Button className="bg-kiosk-primary">
                <Plus className="mr-2 h-4 w-4" />
                Add First Category
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add Your First Topping Category</DialogTitle>
              </DialogHeader>
              <ToppingCategoryForm 
                onSubmit={handleAddCategory}
                isLoading={savingCategory}
                availableCategories={availableMenuCategories}  // Pass menu categories for conditions
                availableSelectionTypes={availableOrderTypes}  // Pass order types
              />
            </DialogContent>
          </Dialog>
        </div>
      )}

      <Dialog open={isAddingTopping} onOpenChange={(open) => {
        setIsAddingTopping(open);
        if (!open) setSelectedCategoryForTopping(null);
      }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Topping</DialogTitle>
          </DialogHeader>
          {categories.length > 0 && (
            <div className="mb-4">
              <label className="text-sm font-medium mb-1 block">Category</label>
              <select 
                className="w-full px-3 py-2 border rounded-md"
                value={selectedCategoryForTopping || ""}
                onChange={(e) => setSelectedCategoryForTopping(e.target.value)}
              >
                <option value="" disabled>Select a category</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
          )}
          <ToppingForm 
            onSubmit={(values) => selectedCategoryForTopping && handleAddTopping(selectedCategoryForTopping, values)}
            isLoading={savingTopping}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ToppingsTab;
