import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import ToppingForm, { ToppingFormValues } from "@/components/forms/ToppingForm";
import ToppingCategoryForm from "@/components/forms/ToppingCategoryForm";
import { Topping, ToppingCategory } from "@/types/database-types";

// Define the missing interface
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

// Currency symbol helper function
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
    fetchToppings();
  }, [selectedCategory?.id]);
  const fetchCategories = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from('topping_categories').select('*').eq('restaurant_id', restaurant.id).order('created_at', {
        ascending: true
      });
      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching topping categories:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les catégories de compléments",
        variant: "destructive"
      });
    }
  };
  const fetchToppings = async () => {
    if (!selectedCategory?.id) return;
    try {
      const {
        data,
        error
      } = await supabase.from('toppings').select('*').eq('category_id', selectedCategory.id).order('created_at', {
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
      fetchCategories();
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
        category_id: selectedCategory?.id
      }]).select().single();
      if (error) throw error;
      toast({
        title: "Succès",
        description: "Complément créé avec succès"
      });
      fetchToppings();
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
        tax_percentage: parseFloat(formData.tax_percentage || "10")
      }).eq('id', toppingId);
      if (error) throw error;
      toast({
        title: "Succès",
        description: "Complément mis à jour avec succès"
      });
      fetchToppings();
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
      toast({
        title: "Succès",
        description: "Complément supprimé avec succès"
      });
      fetchToppings();
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
  return <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Menu Categories</h2>
        <p className="text-muted-foreground">
          Manage menu categories available in your restaurant.
        </p>
      </div>

      <Button onClick={() => setShowCreateCategoryDialog(true)} className="bg-[#9b87f5] hover:bg-[#8b77e5] text-white">
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Créer une catégorie</DialogTitle>
          </DialogHeader>
          <ToppingCategoryForm
            restaurantId={restaurant.id}
            onSubmit={async (values) => {
              setIsCreatingCategory(true);
              try {
                const { name, description, min_selections, max_selections, conditionToppingIds } = values;
                const { data, error } = await supabase
                  .from('topping_categories')
                  .insert([{
                    name,
                    description,
                    restaurant_id: restaurant.id,
                    min_selections,
                    max_selections,
                    show_if_selection_id: conditionToppingIds
                  }])
                  .select()
                  .single();

                if (error) throw error;
                toast({
                  title: "Succès",
                  description: "Catégorie créée avec succès"
                });
                fetchCategories();
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
            }}
            isLoading={isCreatingCategory}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={showUpdateCategoryDialog} onOpenChange={setShowUpdateCategoryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier la catégorie</DialogTitle>
          </DialogHeader>
          {selectedCategory && (
            <ToppingCategoryForm
              restaurantId={restaurant.id}
              initialValues={{
                ...selectedCategory,
                show_if_selection_id: selectedCategory.show_if_selection_id ?? []
              }}
              onSubmit={async (values) => {
                setIsUpdatingCategory(true);
                try {
                  const { name, description, min_selections, max_selections, conditionToppingIds } = values;
                  const { error } = await supabase
                    .from('topping_categories')
                    .update({
                      name,
                      description,
                      min_selections,
                      max_selections,
                      show_if_selection_id: conditionToppingIds
                    })
                    .eq('id', selectedCategory.id);

                  if (error) throw error;
                  toast({
                    title: "Succès",
                    description: "Catégorie mise à jour avec succès"
                  });
                  fetchCategories();
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
              }}
              isLoading={isUpdatingCategory}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteCategoryDialog} onOpenChange={setShowDeleteCategoryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer la catégorie</DialogTitle>
          </DialogHeader>
          <p>Êtes-vous sûr de vouloir supprimer la catégorie "{selectedCategoryToDelete?.name}" ?</p>
          <Button onClick={handleDeleteCategory} className="bg-red-500 text-white" disabled={isDeletingCategory}>
            {isDeletingCategory ? "Suppression..." : "Supprimer"}
          </Button>
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
          tax_percentage: selectedTopping.tax_percentage?.toString() || "10"
        }} isLoading={isUpdatingTopping} currency={restaurant.currency} />}
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteToppingDialog} onOpenChange={setShowDeleteToppingDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer le complément</DialogTitle>
          </DialogHeader>
          <p>Êtes-vous sûr de vouloir supprimer le complément "{selectedTopping?.name}" ?</p>
          <Button onClick={handleDeleteTopping} className="bg-red-500 text-white" disabled={isDeletingTopping}>
            {isDeletingTopping ? "Suppression..." : "Supprimer"}
          </Button>
        </DialogContent>
      </Dialog>
    </div>;
};
export default ToppingsTab;
