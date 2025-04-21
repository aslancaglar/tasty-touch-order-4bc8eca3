import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2, Loader2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { 
  Restaurant, 
  ToppingCategory, 
  Topping 
} from "@/types/database-types";
import { 
  getToppingCategoriesByRestaurantId,
  getToppingsByCategory,
  createToppingCategory,
  updateToppingCategory,
  deleteToppingCategory,
  createTopping,
  updateTopping,
  deleteTopping
} from "@/services/kiosk-service";
import { getIconComponent } from "@/utils/icon-mapping";
import ToppingCategoryForm from "@/components/forms/ToppingCategoryForm";
import ToppingForm from "@/components/forms/ToppingForm";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

interface ToppingsTabProps {
  restaurant: Restaurant;
}

const ToppingsTab = ({ restaurant }: ToppingsTabProps) => {
  const [toppingCategories, setToppingCategories] = useState<ToppingCategory[]>([]);
  const [toppings, setToppings] = useState<Record<string, Topping[]>>({});
  const [loading, setLoading] = useState(true);
  
  const [isAddingToppingCategory, setIsAddingToppingCategory] = useState(false);
  const [savingToppingCategory, setSavingToppingCategory] = useState(false);
  const [isEditingToppingCategory, setIsEditingToppingCategory] = useState<string | null>(null);
  const [toppingCategoryToDelete, setToppingCategoryToDelete] = useState<string | null>(null);
  const [isDeletingToppingCategory, setIsDeletingToppingCategory] = useState(false);
  
  const [isAddingTopping, setIsAddingTopping] = useState(false);
  const [selectedCategoryForTopping, setSelectedCategoryForTopping] = useState<string | null>(null);
  const [isEditingTopping, setIsEditingTopping] = useState<string | null>(null);
  const [toppingToDelete, setToppingToDelete] = useState<string | null>(null);
  const [isDeletingTopping, setIsDeletingTopping] = useState(false);
  const [savingTopping, setSavingTopping] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    const fetchToppingCategories = async () => {
      if (!restaurant?.id) return;
      
      try {
        setLoading(true);
        const data = await getToppingCategoriesByRestaurantId(restaurant.id);
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

  const simpleToppingCategories = toppingCategories.map(c => ({
    id: c.id,
    name: c.name,
  }));

  const toppingsByCategory: Record<string, {id: string, name: string}[]> = {};
  Object.entries(toppings).forEach(([catId, tops]) => {
    toppingsByCategory[catId] = tops.map(t => ({id: t.id, name: t.name}));
  });

  const handleAddToppingCategory = async (values: any) => {
    try {
      setSavingToppingCategory(true);
      if (!restaurant?.id) throw new Error("Restaurant ID is missing");
      
      const show_if_selection_id = Array.isArray(values.show_if_selection_id) 
        ? values.show_if_selection_id 
        : [];
        
      const show_if_selection_type = Array.isArray(values.show_if_selection_type) 
        ? values.show_if_selection_type 
        : [];
      
      const newCategory = await createToppingCategory({
        name: values.name,
        description: values.description || null,
        icon: values.icon || "cherry",
        min_selections: values.min_selections || 0,
        max_selections: values.max_selections || 0,
        restaurant_id: restaurant.id,
        show_if_selection_id,
        show_if_selection_type,
      });
      
      setToppingCategories(prevCategories => [...prevCategories, newCategory]);
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
      
      const show_if_selection_id = Array.isArray(values.show_if_selection_id) 
        ? values.show_if_selection_id 
        : [];
        
      const show_if_selection_type = Array.isArray(values.show_if_selection_type) 
        ? values.show_if_selection_type 
        : [];
      
      const updatedCategory = await updateToppingCategory(categoryId, {
        name: values.name,
        description: values.description || null,
        icon: values.icon || "cherry",
        min_selections: values.min_selections || 0,
        max_selections: values.max_selections || 0,
        show_if_selection_id,
        show_if_selection_type,
      });
      
      setToppingCategories(toppingCategories.map(cat => 
        cat.id === categoryId ? updatedCategory : cat
      ));
      
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
      
      await deleteToppingCategory(categoryId);
      
      setToppingCategories(toppingCategories.filter(cat => cat.id !== categoryId));
      
      toast({
        title: "Topping Category Deleted",
        description: "The topping category has been deleted.",
      });
      
      setToppingCategoryToDelete(null);
    } catch (error) {
      console.error("Error deleting topping category:", error);
      
      const errorObj = error as any;
      if (errorObj?.code === "23503" && errorObj?.message?.includes("order_item_toppings")) {
        toast({
          title: "Cannot Delete Category",
          description: "This category cannot be deleted because some of its toppings are used in existing orders.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to delete the topping category. Please try again.",
          variant: "destructive"
        });
      }
    } finally {
      setIsDeletingToppingCategory(false);
    }
  };

  const handleAddTopping = async (categoryId: string, values: any) => {
    try {
      setSavingTopping(true);
      
      if (!restaurant?.id) {
        throw new Error("Restaurant ID is missing");
      }
      
      const newTopping = await createTopping({
        name: values.name,
        price: Number(values.price),
        category_id: categoryId,
        tax_percentage: 10 // Default tax
      });
      
      setToppings(prev => ({
        ...prev,
        [categoryId]: [...(prev[categoryId] || []), newTopping]
      }));
      
      toast({
        title: "Topping Added",
        description: `${values.name} has been added to the menu.`,
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
      
      const updatedTopping = await updateTopping(toppingId, {
        name: values.name,
        price: Number(values.price)
      });
      
      setToppings(prev => {
        const newState = { ...prev };
        Object.keys(newState).forEach(categoryId => {
          newState[categoryId] = newState[categoryId].map(item => 
            item.id === toppingId ? updatedTopping : item
          );
        });
        return newState;
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

  const handleDeleteTopping = async (categoryId: string, toppingId: string) => {
    try {
      setIsDeletingTopping(true);
      
      await deleteTopping(toppingId);
      
      setToppings(prev => ({
        ...prev,
        [categoryId]: prev[categoryId].filter(item => item.id !== toppingId)
      }));
      
      toast({
        title: "Topping Deleted",
        description: "The topping has been deleted.",
      });
      
      setToppingToDelete(null);
    } catch (error) {
      console.error("Error deleting topping:", error);
      
      const errorObj = error as any;
      if (errorObj?.code === "23503" && errorObj?.message?.includes("order_item_toppings")) {
        toast({
          title: "Cannot Delete Topping",
          description: "This topping cannot be deleted because it is used in existing orders.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to delete the topping. Please try again.",
          variant: "destructive"
        });
      }
    } finally {
      setIsDeletingTopping(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Topping Categories</h3>
        <Dialog open={isAddingToppingCategory} onOpenChange={setIsAddingToppingCategory}>
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
              onSubmit={handleAddToppingCategory}
              isLoading={savingToppingCategory}
              toppingCategories={simpleToppingCategories}
              toppingsByCategory={toppingsByCategory}
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
                  {category.icon && getIconComponent(category.icon)}
                </div>
                <div>
                  <span className="font-medium">{category.name}</span>
                  {category.description && (
                    <p className="text-xs text-muted-foreground">{category.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {category.min_selections === 0 && category.max_selections === 0 ? (
                      "Optional"
                    ) : (
                      <>
                        Select {category.min_selections || 0} 
                        {category.max_selections && category.max_selections > 0 ? 
                          ` to ${category.max_selections}` : 
                          "+"
                        }
                      </>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex space-x-1">
                <Dialog open={isEditingToppingCategory === category.id} onOpenChange={(open) => setIsEditingToppingCategory(open ? category.id : null)}>
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
                        icon: category.icon || "",
                        min_selections: category.min_selections || 0,
                        max_selections: category.max_selections || 0,
                        show_if_selection_id: category.show_if_selection_id || [],
                        show_if_selection_type: category.show_if_selection_type || [],
                      }}
                      isLoading={savingToppingCategory}
                      toppingCategories={simpleToppingCategories}
                      toppingsByCategory={toppingsByCategory}
                    />
                  </DialogContent>
                </Dialog>
                <Dialog open={toppingCategoryToDelete === category.id} onOpenChange={(open) => setToppingCategoryToDelete(open ? category.id : null)}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Delete Topping Category</DialogTitle>
                      <DialogDescription>
                        This action cannot be undone. This will permanently delete the category and all its toppings.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                      <Alert className="mb-4" variant="warning">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Warning</AlertTitle>
                        <AlertDescription>
                          This category cannot be deleted if any of its toppings are used in existing orders.
                        </AlertDescription>
                      </Alert>
                      <p>Are you sure you want to delete the category <strong>{category.name}</strong>?</p>
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
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add Topping Category</DialogTitle>
              </DialogHeader>
              <ToppingCategoryForm 
                onSubmit={handleAddToppingCategory}
                isLoading={savingToppingCategory}
                toppingCategories={simpleToppingCategories}
                toppingsByCategory={toppingsByCategory}
              />
            </DialogContent>
          </Dialog>
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-muted-foreground mb-4">No topping categories found for this restaurant</p>
          <Dialog open={isAddingToppingCategory} onOpenChange={setIsAddingToppingCategory}>
            <DialogTrigger asChild>
              <Button className="bg-kiosk-primary">
                <Plus className="mr-2 h-4 w-4" />
                Add First Topping Category
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add Your First Topping Category</DialogTitle>
              </DialogHeader>
              <ToppingCategoryForm 
                onSubmit={handleAddToppingCategory}
                isLoading={savingToppingCategory}
                toppingCategories={simpleToppingCategories}
                toppingsByCategory={toppingsByCategory}
              />
            </DialogContent>
          </Dialog>
        </div>
      )}

      {toppingCategories.length > 0 && (
        <>
          <div className="flex items-center justify-between mt-8">
            <h3 className="text-lg font-medium">Toppings</h3>
            <Button 
              className="bg-kiosk-primary"
              onClick={() => {
                setSelectedCategoryForTopping(toppingCategories[0].id);
                setIsAddingTopping(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Topping
            </Button>
          </div>
          
          {loading ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-4">
              {toppingCategories.map((category) => {
                const categoryToppings = toppings[category.id] || [];
                
                if (categoryToppings.length === 0) {
                  return (
                    <div key={category.id} className="text-center py-4 border rounded-lg">
                      <p className="text-muted-foreground mb-4">No toppings in {category.name}</p>
                      <Button 
                        variant="outline"
                        onClick={() => {
                          setSelectedCategoryForTopping(category.id);
                          setIsAddingTopping(true);
                        }}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add Topping to {category.name}
                      </Button>
                    </div>
                  );
                }
                
                return (
                  <div key={category.id} className="space-y-2">
                    <h4 className="font-medium text-sm text-muted-foreground">{category.name}</h4>
                    <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                      {categoryToppings.map(topping => (
                        <div 
                          key={topping.id} 
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div>
                            <p className="font-medium">{topping.name}</p>
                            <p className="text-sm font-medium text-muted-foreground">
                              ${parseFloat(topping.price.toString()).toFixed(2)}
                            </p>
                          </div>
                          <div className="flex">
                            <Dialog open={isEditingTopping === topping.id} onOpenChange={(open) => setIsEditingTopping(open ? topping.id : null)}>
                              <DialogTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="sm:max-w-[425px]">
                                <DialogHeader>
                                  <DialogTitle>Edit Topping</DialogTitle>
                                </DialogHeader>
                                <ToppingForm 
                                  onSubmit={(values) => handleEditTopping(topping.id, values)}
                                  initialValues={{
                                    name: topping.name,
                                    price: topping.price.toString()
                                  }}
                                  isLoading={savingTopping}
                                />
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
                                  <DialogDescription>
                                    This action cannot be undone. This will permanently delete the topping.
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="py-4">
                                  <Alert className="mb-4" variant="warning">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertTitle>Warning</AlertTitle>
                                    <AlertDescription>
                                      This topping cannot be deleted if it is used in existing orders.
                                    </AlertDescription>
                                  </Alert>
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
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      <Dialog open={isAddingTopping} onOpenChange={(open) => {
        setIsAddingTopping(open);
        if (!open) setSelectedCategoryForTopping(null);
      }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Topping</DialogTitle>
          </DialogHeader>
          {selectedCategoryForTopping && (
            <div className="mb-4">
              <label className="text-sm font-medium mb-1 block">Category</label>
              <select 
                className="w-full px-3 py-2 border rounded-md"
                value={selectedCategoryForTopping}
                onChange={(e) => setSelectedCategoryForTopping(e.target.value)}
              >
                {toppingCategories.map(cat => (
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
