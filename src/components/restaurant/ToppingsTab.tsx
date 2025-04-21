import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Plus, Pencil, Trash } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import ToppingForm, { ToppingFormValues } from "@/components/forms/ToppingForm";
import { Topping, ToppingCategory } from "@/types/database-types";
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
import SortableCategory from "./SortableCategory";

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

interface ToppingFormData {
  name: string;
  price: string;
  tax_percentage?: string;
}

interface ToppingsTabProps {
  restaurant: {
    id: string;
    name: string;
    currency?: string;
  };
}

interface ToppingCategoryWithToppings extends ToppingCategory {
  toppings?: Topping[];
}

const getCurrencySymbol = (currencyCode: string): string => {
  const code = (currencyCode || "EUR").toUpperCase();
  return CURRENCY_SYMBOLS[code] || code;
};

const ToppingsTab: React.FC<ToppingsTabProps> = ({ restaurant }) => {
  const [categories, setCategories] = useState<ToppingCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<ToppingCategoryWithToppings | null>(null);
  const [showCreateCategoryDialog, setShowCreateCategoryDialog] = useState(false);
  const [showUpdateCategoryDialog, setShowUpdateCategoryDialog] = useState(false);
  const [showDeleteCategoryDialog, setShowDeleteCategoryDialog] = useState(false);
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [isUpdatingCategory, setIsUpdatingCategory] = useState(false);
  const [isDeletingCategory, setIsDeletingCategory] = useState(false);
  const [categoryName, setCategoryName] = useState("");
  const [categoryDescription, setCategoryDescription] = useState("");
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

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchCategories();
  }, [restaurant.id]);

  useEffect(() => {
    fetchToppings();
  }, [selectedCategory?.id]);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('topping_categories')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .order('display_order', { ascending: true });

      if (error) throw error;

      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching topping categories:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les catégories de compléments",
        variant: "destructive",
      });
    }
  };

  const fetchToppings = async () => {
    if (!selectedCategory?.id) return;

    try {
      const { data, error } = await supabase
        .from('toppings')
        .select('*')
        .eq('category_id', selectedCategory.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (data) {
        const updatedToppings = data.map(topping => ({
          ...topping,
          tax_percentage: typeof topping.tax_percentage === 'string' ? parseFloat(topping.tax_percentage) : topping.tax_percentage
        }));
        setToppings(updatedToppings);
        setSelectedCategory(prev => prev ? { ...prev, toppings: updatedToppings } : prev);
      } else {
        setToppings([]);
        setSelectedCategory(prev => prev ? { ...prev, toppings: [] } : prev);
      }
    } catch (error) {
      console.error('Error fetching toppings:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les compléments",
        variant: "destructive",
      });
    }
  };

  const handleCreateCategory = async () => {
    try {
      setIsCreatingCategory(true);
      const { data, error } = await supabase
        .from('topping_categories')
        .insert([
          {
            name: categoryName,
            description: categoryDescription,
            restaurant_id: restaurant.id,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Catégorie créée avec succès",
      });

      fetchCategories();
      setShowCreateCategoryDialog(false);
      setCategoryName("");
      setCategoryDescription("");
    } catch (error) {
      console.error('Error creating topping category:', error);
      toast({
        title: "Erreur",
        description: "Impossible de créer la catégorie",
        variant: "destructive",
      });
    } finally {
      setIsCreatingCategory(false);
    }
  };

  const handleUpdateCategory = async () => {
    if (!selectedCategory?.id) return;

    try {
      setIsUpdatingCategory(true);
      const { error } = await supabase
        .from('topping_categories')
        .update({
          name: categoryName,
          description: categoryDescription,
        })
        .eq('id', selectedCategory.id);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Catégorie mise à jour avec succès",
      });

      fetchCategories();
      setShowUpdateCategoryDialog(false);
      setCategoryName("");
      setCategoryDescription("");
    } catch (error) {
      console.error('Error updating topping category:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour la catégorie",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingCategory(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (!selectedCategoryToDelete?.id) return;

    try {
      setIsDeletingCategory(true);
      const { error } = await supabase
        .from('topping_categories')
        .delete()
        .eq('id', selectedCategoryToDelete.id);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Catégorie supprimée avec succès",
      });

      fetchCategories();
      setShowDeleteCategoryDialog(false);
    } catch (error) {
      console.error('Error deleting topping category:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la catégorie",
        variant: "destructive",
      });
    } finally {
      setIsDeletingCategory(false);
    }
  };

  const handleCreateTopping = async (formData: ToppingFormValues) => {
    try {
      setIsCreatingTopping(true);
      const { data: newTopping, error } = await supabase
        .from('toppings')
        .insert([
          {
            name: formData.name,
            price: parseFloat(formData.price),
            tax_percentage: parseFloat(formData.tax_percentage || "10"),
            category_id: selectedCategory?.id,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Complément créé avec succès",
      });

      fetchToppings();
      setShowCreateToppingDialog(false);
    } catch (error) {
      console.error('Error creating topping:', error);
      toast({
        title: "Erreur",
        description: "Impossible de créer le complément",
        variant: "destructive",
      });
    } finally {
      setIsCreatingTopping(false);
    }
  };

  const handleUpdateTopping = async (toppingId: string, formData: ToppingFormValues) => {
    try {
      setIsUpdatingTopping(true);
      const { error } = await supabase
        .from('toppings')
        .update({
          name: formData.name,
          price: parseFloat(formData.price),
          tax_percentage: parseFloat(formData.tax_percentage || "10"),
        })
        .eq('id', toppingId);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Complément mis à jour avec succès",
      });

      fetchToppings();
      setShowUpdateToppingDialog(false);
    } catch (error) {
      console.error('Error updating topping:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le complément",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingTopping(false);
    }
  };

  const handleDeleteTopping = async () => {
    if (!selectedTopping?.id) return;

    try {
      setIsDeletingTopping(true);
      const { error } = await supabase
        .from('toppings')
        .delete()
        .eq('id', selectedTopping.id);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Complément supprimé avec succès",
      });

      fetchToppings();
      setShowDeleteToppingDialog(false);
    } catch (error) {
      console.error('Error deleting topping:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le complément",
        variant: "destructive",
      });
    } finally {
      setIsDeletingTopping(false);
    }
  };

  const handleToppingCategoryDragEnd = async (event: any) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      setCategories((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        const newCategories = arrayMove(items, oldIndex, newIndex);
        
        // Update the order in the database
        handleUpdateToppingCategoryOrder(newCategories);
        
        return newCategories;
      });
    }
  };

  const handleUpdateToppingCategoryOrder = async (orderedCategories: ToppingCategory[]) => {
    try {
      const updates = orderedCategories.map((category, index) => ({
        id: category.id,
        display_order: index
      }));

      const { error } = await supabase
        .from('topping_categories')
        .upsert(updates);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Category order updated successfully",
      });
    } catch (error) {
      console.error('Error updating category order:', error);
      toast({
        title: "Error",
        description: "Failed to update category order",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Catégories de compléments</h2>
        <p className="text-muted-foreground">
          Gérer les catégories de compléments disponibles dans votre restaurant.
        </p>
      </div>

      <Button onClick={() => setShowCreateCategoryDialog(true)} className="bg-kiosk-primary">
        <Plus className="mr-2 h-4 w-4" />
        Ajouter une catégorie
      </Button>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleToppingCategoryDragEnd}
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
                  setCategoryName(category.name);
                  setCategoryDescription(category.description || "");
                  setShowUpdateCategoryDialog(true);
                }}
                onDelete={() => {
                  setSelectedCategoryToDelete(category);
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
              <h2 className="text-2xl font-bold">Compléments - {selectedCategory.name}</h2>
              <p className="text-muted-foreground">
                Gérer les compléments disponibles dans la catégorie sélectionnée.
              </p>
            </div>
            <Button onClick={() => setShowCreateToppingDialog(true)} className="bg-kiosk-primary">
              <Plus className="mr-2 h-4 w-4" />
              Ajouter un complément
            </Button>
          </div>

          {/* Displaying toppings */}
          {selectedCategory?.toppings?.map((topping) => (
            <div key={topping.id} className="flex items-center justify-between py-2">
              <div>
                <p className="font-medium">{topping.name}</p>
                <div className="text-sm font-medium text-muted-foreground">
                  <span>{currencySymbol}{parseFloat(topping.price.toString()).toFixed(2)}</span>
                  <span className="ml-2">TVA: {topping.tax_percentage || 10}%</span>
                </div>
              </div>
              <div className="space-x-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setSelectedTopping(topping);
                    setShowUpdateToppingDialog(true);
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setSelectedTopping(topping);
                    setShowDeleteToppingDialog(true);
                  }}
                >
                  <Trash className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showCreateCategoryDialog} onOpenChange={setShowCreateCategoryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Créer une catégorie</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Nom
              </Label>
              <Input id="name" value={categoryName} onChange={(e) => setCategoryName(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                Description
              </Label>
              <Input id="description" value={categoryDescription} onChange={(e) => setCategoryDescription(e.target.value)} className="col-span-3" />
            </div>
          </div>
          <Button onClick={handleCreateCategory} className="bg-kiosk-primary" disabled={isCreatingCategory}>
            {isCreatingCategory ? "Création..." : "Créer"}
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog open={showUpdateCategoryDialog} onOpenChange={setShowUpdateCategoryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier la catégorie</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Nom
              </Label>
              <Input id="name" value={categoryName} onChange={(e) => setCategoryName(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                Description
              </Label>
              <Input id="description" value={categoryDescription} onChange={(e) => setCategoryDescription(e.target.value)} className="col-span-3" />
            </div>
          </div>
          <Button onClick={handleUpdateCategory} className="bg-kiosk-primary" disabled={isUpdatingCategory}>
            {isUpdatingCategory ? "Mise à jour..." : "Mettre à jour"}
          </Button>
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
          <ToppingForm
            onSubmit={handleCreateTopping}
            isLoading={isCreatingTopping}
            currency={restaurant.currency}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={showUpdateToppingDialog} onOpenChange={setShowUpdateToppingDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le complément</DialogTitle>
          </DialogHeader>
          {selectedTopping && (
            <ToppingForm
              onSubmit={(values) => handleUpdateTopping(selectedTopping.id, values)}
              initialValues={{
                name: selectedTopping.name,
                price: selectedTopping.price?.toString() || "0",
                tax_percentage: selectedTopping.tax_percentage?.toString() || "10",
              }}
              isLoading={isUpdatingTopping}
              currency={restaurant.currency}
            />
          )}
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
    </div>
  );
};

export default ToppingsTab;
