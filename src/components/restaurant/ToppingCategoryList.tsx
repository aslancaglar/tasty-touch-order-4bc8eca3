
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ToppingCategory } from "@/types/database-types";
import { Loader2, MoreHorizontal, Plus, Trash2, Edit, Utensils } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ToppingCategoryForm from "@/components/forms/ToppingCategoryForm";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabaseClient";

interface ToppingCategoryListProps {
  restaurantId: string;
  toppingCategories: ToppingCategory[];
  isToppingCategoriesLoading: boolean;
  onCategoryAdded: (category: ToppingCategory) => void;
  onCategoryUpdated: (category: ToppingCategory) => void;
  onCategoryDeleted: (categoryId: string) => void;
}

const ToppingCategoryList = ({
  restaurantId,
  toppingCategories,
  isToppingCategoriesLoading,
  onCategoryAdded,
  onCategoryUpdated,
  onCategoryDeleted,
}: ToppingCategoryListProps) => {
  const { toast } = useToast();
  const [isAddingToppingCategory, setIsAddingToppingCategory] = useState(false);
  const [isUpdatingToppingCategory, setIsUpdatingToppingCategory] = useState(false);
  const [isDeletingToppingCategory, setIsDeletingToppingCategory] = useState(false);
  const [editingToppingCategory, setEditingToppingCategory] = useState<ToppingCategory | null>(null);
  const [toppingToDelete, setToppingToDelete] = useState<ToppingCategory | null>(null);

  const handleAddToppingCategory = async (values: any) => {
    try {
      setIsAddingToppingCategory(true);
      console.log("Creating topping category with values:", values);

      const { data: newToppingCategory, error } = await supabase
        .from("topping_categories")
        .insert({
          name: values.name,
          description: values.description || null,
          icon: "utensils",
          restaurant_id: restaurantId,
          min_selections: Number(values.min_selections) || 0,
          max_selections:
            values.max_selections !== undefined
              ? Number(values.max_selections)
              : null,
        })
        .select("*");

      if (error) {
        console.error("Error creating topping category:", error);
        toast({
          title: "Error",
          description: "Failed to create topping category",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "Topping category created successfully",
        });
        onCategoryAdded(newToppingCategory[0]);
      }
    } catch (error) {
      console.error("Error creating topping category:", error);
      toast({
        title: "Error",
        description: "Failed to create topping category",
        variant: "destructive",
      });
    } finally {
      setIsAddingToppingCategory(false);
    }
  };

  const handleEditToppingCategory = async (values: any) => {
    try {
      setIsUpdatingToppingCategory(true);
      console.log("Updating topping category with values:", values);

      const { data: updatedToppingCategory, error } = await supabase
        .from("topping_categories")
        .update({
          name: values.name,
          description: values.description || null,
          icon: "utensils",
          min_selections: Number(values.min_selections) || 0,
          max_selections:
            values.max_selections !== undefined
              ? Number(values.max_selections)
              : null,
        })
        .eq("id", editingToppingCategory?.id)
        .select("*");

      if (error) {
        console.error("Error updating topping category:", error);
        toast({
          title: "Error",
          description: "Failed to update topping category",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "Topping category updated successfully",
        });
        onCategoryUpdated(updatedToppingCategory[0]);
        setEditingToppingCategory(null);
      }
    } catch (error) {
      console.error("Error updating topping category:", error);
      toast({
        title: "Error",
        description: "Failed to update topping category",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingToppingCategory(false);
    }
  };

  const handleDeleteToppingCategory = async () => {
    try {
      setIsDeletingToppingCategory(true);

      if (!toppingToDelete) {
        toast({
          title: "Error",
          description: "No topping category selected for deletion.",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from("topping_categories")
        .delete()
        .eq("id", toppingToDelete.id);

      if (error) {
        console.error("Error deleting topping category:", error);
        toast({
          title: "Error",
          description: "Failed to delete topping category",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "Topping category deleted successfully",
        });
        onCategoryDeleted(toppingToDelete.id);
      }
    } catch (error) {
      console.error("Error deleting topping category:", error);
      toast({
        title: "Error",
        description: "Failed to delete topping category",
        variant: "destructive",
      });
    } finally {
      setIsDeletingToppingCategory(false);
      setToppingToDelete(null);
    }
  };

  return (
    <div className="col-span-1">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Topping Categories</h2>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="bg-kiosk-primary">
              <Plus className="mr-2 h-4 w-4" />
              Add Category
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Add New Topping Category</DialogTitle>
              <DialogDescription>
                Create a new category for your toppings.
              </DialogDescription>
            </DialogHeader>
            <ToppingCategoryForm
              onSubmit={handleAddToppingCategory}
              isLoading={isAddingToppingCategory}
            />
          </DialogContent>
        </Dialog>
      </div>

      {isToppingCategoriesLoading ? (
        <div className="flex justify-center items-center h-40">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : toppingCategories.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-lg text-muted-foreground mb-4">
            No topping categories found
          </p>
          <p className="text-muted-foreground mb-6">
            Start by adding your first topping category
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {toppingCategories.map((category) => (
            <Card key={category.id}>
              <CardHeader className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center">
                  <Utensils className="mr-2 h-4 w-4" />
                  {category.name}
                </CardTitle>
                <div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => setEditingToppingCategory(category)}
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setToppingToDelete(category)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {category.description || "No description"}
                </p>
                <div className="mt-2 text-sm">
                  Min Selections: {category.min_selections}
                </div>
                <div className="mt-2 text-sm">
                  Max Selections:{" "}
                  {category.max_selections === null
                    ? "Unlimited"
                    : category.max_selections}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Topping Category Dialog */}
      <Dialog open={!!editingToppingCategory} onOpenChange={() => setEditingToppingCategory(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Topping Category</DialogTitle>
            <DialogDescription>
              Edit the details of your topping category.
            </DialogDescription>
          </DialogHeader>
          <ToppingCategoryForm
            onSubmit={handleEditToppingCategory}
            isLoading={isUpdatingToppingCategory}
            initialValues={editingToppingCategory || undefined}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Topping Category Dialog */}
      <Dialog open={!!toppingToDelete} onOpenChange={() => setToppingToDelete(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Delete Topping Category</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              {toppingToDelete?.name || "this category"}? This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setToppingToDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteToppingCategory}
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
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ToppingCategoryList;
