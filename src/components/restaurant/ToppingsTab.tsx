import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import ToppingForm, { ToppingFormValues } from "@/components/forms/ToppingForm";
import ToppingCategoryForm from "@/components/forms/ToppingCategoryForm";
import { Topping, ToppingCategory } from "@/types/database-types";
import { setCacheItem, getCacheItem, clearCache } from "@/services/cache-service";
interface ToppingCategoryWithToppings extends ToppingCategory {
  toppings?: Topping[];
}
interface ToppingsTabProps {
  restaurant: {
    id: string;
    name: string;
    currency?: string;
  };
}
const getCurrencySymbol = (currency: string): string => {
  switch (currency) {
    case 'EUR':
      return '€';
    case 'USD':
      return '$';
    case 'GBP':
      return '£';
    default:
      return currency;
  }
};
const ToppingsTab = ({
  restaurant
}: ToppingsTabProps) => {
  const [categories, setCategories] = useState<ToppingCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<ToppingCategoryWithToppings | null>(null);
  const [showCreateCategoryDialog, setShowCreateCategoryDialog] = useState(false);
  const [showUpdateCategoryDialog, setShowUpdateCategoryDialog] = useState(false);
  const [showDeleteCategoryDialog, setShowDeleteCategoryDialog] = useState(false);
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [isUpdatingCategory, setIsUpdatingCategory] = useState(false);
  const [isDeletingCategory, setIsDeletingCategory] = useState(false);
  const [selectedCategoryToDelete, setSelectedCategoryToDelete] = useState<ToppingCategory | null>(null);
  const [toppings, setToppings] = useState<Topping[]>([]);
  const [selectedTopping, setSelectedTopping] = useState<Topping | null>(null);
  const [showCreateToppingDialog, setShowCreateToppingDialog] = useState(false);
  const [showUpdateToppingDialog, setShowUpdateToppingDialog] = useState(false);
  const [showDeleteToppingDialog, setShowDeleteToppingDialog] = useState(false);
  const [isCreatingTopping, setIsCreatingTopping] = useState(false);
  const [isUpdatingTopping, setIsUpdatingTopping] = useState(false);
  const [isDeletingTopping, setIsDeletingTopping] = useState(false);
  const currencySymbol = getCurrencySymbol(restaurant.currency || 'EUR');
  useEffect(() => {
    fetchCategories();
  }, [restaurant.id]);
  useEffect(() => {
    if (selectedCategory?.id) {
      fetchToppings(categories);
    }
  }, [categories, selectedCategory?.id]);
  const fetchCategories = async () => {
    try {
      // Always clear the cache before fetching to ensure we get fresh data
      clearCache(restaurant.id, 'topping_categories');
      console.log("Fetching topping categories for restaurant:", restaurant.id);

      // Try to get from cache first
      const cachedCategories = getCacheItem<ToppingCategory[]>('topping_categories', restaurant.id);
      if (cachedCategories) {
        console.log("Using cached topping categories");
        setCategories(cachedCategories);
        return;
      }

      // If not in cache, fetch from database
      const {
        data,
        error
      } = await supabase.from('topping_categories').select('*').eq('restaurant_id', restaurant.id).order('created_at', {
        ascending: true
      });
      if (error) throw error;
      console.log("Fetched topping categories:", data);
      setCacheItem('topping_categories', data, restaurant.id);
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching topping categories:', error);
      toast({
        title: "Erreur",
        description: "Failed to load topping categories",
        variant: "destructive"
      });
    }
  };
  const fetchToppings = async (categories: ToppingCategory[]) => {
    if (!selectedCategory?.id) return;
    try {
      const cacheKey = `toppings_${selectedCategory.id}`;
      const cachedToppings = getCacheItem<Topping[]>(cacheKey, restaurant.id);
      if (cachedToppings) {
        console.log("Using cached toppings for category:", selectedCategory.id);
        setToppings(cachedToppings);
        setSelectedCategory(prev => prev ? {
          ...prev,
          toppings: cachedToppings
        } : prev);
        return;
      }
      const {
        data,
        error
      } = await supabase.from('toppings').select('*').eq('category_id', selectedCategory.id).order('display_order', {
        ascending: true
      });
      if (error) throw error;
      if (data) {
        const updatedToppings = data.map(topping => ({
          ...topping,
          tax_percentage: typeof topping.tax_percentage === 'string' ? parseFloat(topping.tax_percentage) : topping.tax_percentage
        }));
        setToppings(updatedToppings);
        setSelectedCategory(prev => prev ? {
          ...prev,
          toppings: updatedToppings
        } : prev);
        setCacheItem(cacheKey, updatedToppings, restaurant.id);
      } else {
        setToppings([]);
        setSelectedCategory(prev => prev ? {
          ...prev,
          toppings: []
        } : prev);
      }
    } catch (error) {
      console.error('Error fetching toppings:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les compléments",
        variant: "destructive"
      });
    }
  };
  const handleDeleteCategory = async () => {
    if (!selectedCategoryToDelete?.id) return;
    try {
      setIsDeletingCategory(true);
      const {
        error
      } = await supabase.from('topping_categories').delete().eq('id', selectedCategoryToDelete.id);
      if (error) throw error;
      toast({
        title: "Succès",
        description: "Catégorie supprimée avec succès"
      });

      // Clear the cache and fetch updated categories
      clearCache(restaurant.id, 'topping_categories');
      await fetchCategories();
      setShowDeleteCategoryDialog(false);
    } catch (error) {
      console.error('Error deleting topping category:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la catégorie",
        variant: "destructive"
      });
    } finally {
      setIsDeletingCategory(false);
    }
  };
  const handleCreateTopping = async (formData: ToppingFormValues) => {
    try {
      setIsCreatingTopping(true);
      const {
        data: newTopping,
        error
      } = await supabase.from('toppings').insert([{
        name: formData.name,
        price: parseFloat(formData.price),
        tax_percentage: parseFloat(formData.tax_percentage || "10"),
        display_order: parseInt(formData.display_order || "0"),
        category_id: selectedCategory?.id
      }]).select().single();
      if (error) throw error;
      if (selectedCategory) {
        clearCache(restaurant.id, `toppings_${selectedCategory.id}`);
      }
      toast({
        title: "Success",
        description: "Topping created successfully"
      });
      fetchToppings(categories);
      setShowCreateToppingDialog(false);
    } catch (error) {
      console.error('Error creating topping:', error);
      toast({
        title: "Erreur",
        description: "Impossible de créer le complément",
        variant: "destructive"
      });
    } finally {
      setIsCreatingTopping(false);
    }
  };
  const handleUpdateTopping = async (toppingId: string, formData: ToppingFormValues) => {
    try {
      setIsUpdatingTopping(true);
      const {
        error
      } = await supabase.from('toppings').update({
        name: formData.name,
        price: parseFloat(formData.price),
        tax_percentage: parseFloat(formData.tax_percentage || "10"),
        display_order: parseInt(formData.display_order || "0")
      }).eq('id', toppingId);
      if (error) throw error;
      if (selectedCategory) {
        clearCache(restaurant.id, `toppings_${selectedCategory.id}`);
      }
      toast({
        title: "Succès",
        description: "Complément mis à jour avec succès"
      });
      fetchToppings(categories);
      setShowUpdateToppingDialog(false);
    } catch (error) {
      console.error('Error updating topping:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le complément",
        variant: "destructive"
      });
    } finally {
      setIsUpdatingTopping(false);
    }
  };
  const handleDeleteTopping = async () => {
    if (!selectedTopping?.id) return;
    try {
      setIsDeletingTopping(true);
      const {
        error
      } = await supabase.from('toppings').delete().eq('id', selectedTopping.id);
      if (error) throw error;
      if (selectedCategory) {
        clearCache(restaurant.id, `toppings_${selectedCategory.id}`);
      }
      toast({
        title: "Succès",
        description: "Complément supprimé avec succès"
      });
      fetchToppings(categories);
      setShowDeleteToppingDialog(false);
    } catch (error) {
      console.error('Error deleting topping:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le complément",
        variant: "destructive"
      });
    } finally {
      setIsDeletingTopping(false);
    }
  };
  const handleCreateCategory = async (values: any) => {
    setIsCreatingCategory(true);
    try {
      const {
        name,
        description,
        min_selections,
        max_selections,
        conditionToppingIds
      } = values;
      console.log("Creating category with values:", values);
      const {
        data,
        error
      } = await supabase.from('topping_categories').insert([{
        name,
        description,
        restaurant_id: restaurant.id,
        min_selections,
        max_selections,
        show_if_selection_id: conditionToppingIds && conditionToppingIds.length > 0 ? conditionToppingIds : null
      }]).select().single();
      if (error) throw error;
      toast({
        title: "Succès",
        description: "Catégorie créée avec succès"
      });

      // Clear the cache and fetch updated categories
      clearCache(restaurant.id, 'topping_categories');
      await fetchCategories();
      setShowCreateCategoryDialog(false);
    } catch (error) {
      console.error('Error creating topping category:', error);
      toast({
        title: "Erreur",
        description: "Impossible de créer la catégorie",
        variant: "destructive"
      });
    } finally {
      setIsCreatingCategory(false);
    }
  };
  const handleUpdateCategory = async (values: any) => {
    if (!selectedCategory) return;
    setIsUpdatingCategory(true);
    try {
      const {
        name,
        description,
        min_selections,
        max_selections,
        conditionToppingIds
      } = values;
      console.log("Updating category with values:", values);
      console.log("Selected condition toppings:", conditionToppingIds);
      const {
        error
      } = await supabase.from('topping_categories').update({
        name,
        description,
        min_selections,
        max_selections,
        show_if_selection_id: conditionToppingIds.length > 0 ? conditionToppingIds : null
      }).eq('id', selectedCategory.id);
      if (error) throw error;
      toast({
        title: "Succès",
        description: "Catégorie mise à jour avec succès"
      });

      // Clear the cache and fetch updated categories
      clearCache(restaurant.id, 'topping_categories');
      await fetchCategories();
      setShowUpdateCategoryDialog(false);
    } catch (error) {
      console.error('Error updating topping category:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour la catégorie",
        variant: "destructive"
      });
    } finally {
      setIsUpdatingCategory(false);
    }
  };
  return <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Toppings Categories</h2>
        <p className="text-muted-foreground">Manage toppings categories available in your restaurant.</p>
      </div>

      <Button onClick={() => setShowCreateCategoryDialog(true)} className="text-white bg-purple-700 hover:bg-purple-600">
        <Plus className="mr-2 h-4 w-4" />
        Add Category
      </Button>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map(category => <div key={category.id} className={`border rounded-lg p-4 cursor-pointer transition-all ${selectedCategory?.id === category.id ? 'ring-2 ring-[#9b87f5] bg-[#9b87f5]/5' : 'hover:border-[#9b87f5]'}`} onClick={() => setSelectedCategory(category)}>
            <div className="flex items-center space-x-3">
              
              <div className="flex-1">
                <h3 className="font-medium">{category.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {category.description || "No description"}
                </p>
              </div>
              <div className="flex space-x-1">
                <Button variant="ghost" size="icon" onClick={e => {
              e.stopPropagation();
              setSelectedCategory(category);
              setShowUpdateCategoryDialog(true);
            }}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={e => {
              e.stopPropagation();
              setSelectedCategoryToDelete(category);
              setShowDeleteCategoryDialog(true);
            }}>
                  <Trash className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          </div>)}
      </div>

      <Separator />

      {selectedCategory && <div>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Menu Items - {selectedCategory.name}</h2>
              <p className="text-muted-foreground">
                Manage menu items available in the selected category.
              </p>
            </div>
            <Button onClick={() => setShowCreateToppingDialog(true)} className="bg-kiosk-primary">
              <Plus className="mr-2 h-4 w-4" />
              Add Item
            </Button>
          </div>

          {/* Displaying toppings */}
          {selectedCategory?.toppings?.map(topping => <div key={topping.id} className="flex items-center justify-between py-2">
              <div>
                <p className="font-medium">{topping.name}</p>
                <div className="text-sm font-medium text-muted-foreground">
                  <span>{currencySymbol}{parseFloat(topping.price.toString()).toFixed(2)}</span>
                  <span className="ml-2">TVA: {topping.tax_percentage || 10}%</span>
                  <span className="ml-2">Ordre: {topping.display_order || 0}</span>
                </div>
              </div>
              <div className="space-x-2">
                <Button variant="ghost" size="icon" onClick={() => {
            setSelectedTopping(topping);
            setShowUpdateToppingDialog(true);
          }}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => {
            setSelectedTopping(topping);
            setShowDeleteToppingDialog(true);
          }}>
                  <Trash className="h-4 w-4" />
                </Button>
              </div>
            </div>)}
        </div>}

      <Dialog open={showCreateCategoryDialog} onOpenChange={setShowCreateCategoryDialog}>
        <DialogContent className="max-h-[90vh] py-5 px-[px]">
          <ScrollArea className="max-h-[80vh] pr-4">
            <DialogHeader>
              <DialogTitle>Créer une catégorie</DialogTitle>
              <DialogDescription>Créez une nouvelle catégorie de compléments</DialogDescription>
            </DialogHeader>
            <ToppingCategoryForm restaurantId={restaurant.id} onSubmit={handleCreateCategory} isLoading={isCreatingCategory} />
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <Dialog open={showUpdateCategoryDialog} onOpenChange={setShowUpdateCategoryDialog}>
        <DialogContent className="max-h-[90vh]">
          <ScrollArea className="max-h-[80vh] pr-4">
            <DialogHeader>
              <DialogTitle>Modifier la catégorie</DialogTitle>
              <DialogDescription>Modifiez les détails de cette catégorie</DialogDescription>
            </DialogHeader>
            {selectedCategory && <ToppingCategoryForm restaurantId={restaurant.id} initialValues={{
            name: selectedCategory.name,
            description: selectedCategory.description || "",
            min_selections: selectedCategory.min_selections || 0,
            max_selections: selectedCategory.max_selections || 0,
            show_if_selection_id: selectedCategory.show_if_selection_id || []
          }} onSubmit={handleUpdateCategory} isLoading={isUpdatingCategory} />}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteCategoryDialog} onOpenChange={setShowDeleteCategoryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer la catégorie</DialogTitle>
            <DialogDescription>Êtes-vous sûr de vouloir supprimer cette catégorie ?</DialogDescription>
          </DialogHeader>
          <p>Êtes-vous sûr de vouloir supprimer la catégorie "{selectedCategoryToDelete?.name}" ?</p>
          <div className="flex justify-end space-x-2 mt-4">
            <Button variant="outline" onClick={() => setShowDeleteCategoryDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleDeleteCategory} variant="destructive" disabled={isDeletingCategory}>
              {isDeletingCategory ? "Suppression..." : "Supprimer"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showCreateToppingDialog} onOpenChange={setShowCreateToppingDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Créer un complément</DialogTitle>
          </DialogHeader>
          <ToppingForm onSubmit={handleCreateTopping} isLoading={isCreatingTopping} currency={restaurant.currency} />
        </DialogContent>
      </Dialog>

      <Dialog open={showUpdateToppingDialog} onOpenChange={setShowUpdateToppingDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le complément</DialogTitle>
          </DialogHeader>
          {selectedTopping && <ToppingForm onSubmit={values => handleUpdateTopping(selectedTopping.id, values)} initialValues={{
          name: selectedTopping.name,
          price: selectedTopping.price?.toString() || "0",
          tax_percentage: selectedTopping.tax_percentage?.toString() || "10",
          display_order: selectedTopping.display_order?.toString() || "0"
        }} isLoading={isUpdatingTopping} currency={restaurant.currency} />}
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteToppingDialog} onOpenChange={setShowDeleteToppingDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer le complément</DialogTitle>
          </DialogHeader>
          <p>Êtes-vous sûr de vouloir supprimer le complément "{selectedTopping?.name}" ?</p>
          <div className="flex justify-end space-x-2 mt-4">
            <Button variant="outline" onClick={() => setShowDeleteToppingDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleDeleteTopping} variant="destructive" disabled={isDeletingTopping}>
              {isDeletingTopping ? "Suppression..." : "Supprimer"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>;
};
export default ToppingsTab;