
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
import { Topping, ToppingCategory } from "@/types/database-types";
import { Loader2, MoreHorizontal, Plus, Trash2, Edit } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabaseClient";
import AddToppingForm from "./AddToppingForm";
import EditToppingForm from "./EditToppingForm";

interface ToppingsListProps {
  restaurantId: string;
  toppings: Topping[];
  toppingCategories: ToppingCategory[];
  isToppingsLoading: boolean;
  onToppingAdded: (topping: Topping) => void;
  onToppingUpdated: (topping: Topping) => void;
  onToppingDeleted: (toppingId: string) => void;
}

const ToppingsList = ({
  restaurantId,
  toppings,
  toppingCategories,
  isToppingsLoading,
  onToppingAdded,
  onToppingUpdated,
  onToppingDeleted,
}: ToppingsListProps) => {
  const { toast } = useToast();
  const [isAddingTopping, setIsAddingTopping] = useState(false);
  const [isUpdatingTopping, setIsUpdatingTopping] = useState(false);
  const [editingTopping, setEditingTopping] = useState<Topping | null>(null);
  const [isDeletingTopping, setIsDeletingTopping] = useState(false);
  const [toppingToDelete, setToppingToDelete] = useState<Topping | null>(null);

  const handleAddTopping = async (values: any) => {
    try {
      setIsAddingTopping(true);
      console.log("Creating topping with values:", values);

      const { data: newTopping, error } = await supabase
        .from("toppings")
        .insert({
          name: values.name,
          description: values.description || null,
          price: values.price,
          image_url: values.image_url || null,
          restaurant_id: restaurantId,
          category_id: values.topping_category_id,
        })
        .select("*");

      if (error) {
        console.error("Error creating topping:", error);
        toast({
          title: "Error",
          description: "Failed to create topping",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "Topping created successfully",
        });
        onToppingAdded(newTopping[0]);
      }
    } catch (error) {
      console.error("Error creating topping:", error);
      toast({
        title: "Error",
        description: "Failed to create topping",
        variant: "destructive",
      });
    } finally {
      setIsAddingTopping(false);
    }
  };

  const handleEditTopping = async (values: any) => {
    try {
      setIsUpdatingTopping(true);
      console.log("Updating topping with values:", values);

      const { data: updatedTopping, error } = await supabase
        .from("toppings")
        .update({
          name: values.name,
          description: values.description || null,
          price: values.price,
          image_url: values.image_url || null,
          category_id: values.topping_category_id,
        })
        .eq("id", editingTopping?.id)
        .select("*");

      if (error) {
        console.error("Error updating topping:", error);
        toast({
          title: "Error",
          description: "Failed to update topping",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "Topping updated successfully",
        });
        onToppingUpdated(updatedTopping[0]);
        setEditingTopping(null);
      }
    } catch (error) {
      console.error("Error updating topping:", error);
      toast({
        title: "Error",
        description: "Failed to update topping",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingTopping(false);
    }
  };

  const handleDeleteTopping = async () => {
    try {
      setIsDeletingTopping(true);

      if (!toppingToDelete) {
        toast({
          title: "Error",
          description: "No topping selected for deletion.",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from("toppings")
        .delete()
        .eq("id", toppingToDelete.id);

      if (error) {
        console.error("Error deleting topping:", error);
        toast({
          title: "Error",
          description: "Failed to delete topping",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "Topping deleted successfully",
        });
        onToppingDeleted(toppingToDelete.id);
      }
    } catch (error) {
      console.error("Error deleting topping:", error);
      toast({
        title: "Error",
        description: "Failed to delete topping",
        variant: "destructive",
      });
    } finally {
      setIsDeletingTopping(false);
      setToppingToDelete(null);
    }
  };

  return (
    <div className="col-span-1">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Toppings</h2>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="bg-kiosk-primary">
              <Plus className="mr-2 h-4 w-4" />
              Add Topping
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Add New Topping</DialogTitle>
              <DialogDescription>
                Create a new topping for your menu.
              </DialogDescription>
            </DialogHeader>
            <AddToppingForm
              onSubmit={handleAddTopping}
              isLoading={isAddingTopping}
              toppingCategories={toppingCategories}
            />
          </DialogContent>
        </Dialog>
      </div>

      {isToppingsLoading ? (
        <div className="flex justify-center items-center h-40">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : toppings.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-lg text-muted-foreground mb-4">
            No toppings found
          </p>
          <p className="text-muted-foreground mb-6">
            Start by adding your first topping
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {toppings.map((topping) => (
            <Card key={topping.id}>
              <CardHeader className="flex items-center justify-between">
                <CardTitle className="text-lg">{topping.name}</CardTitle>
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
                        onClick={() => setEditingTopping(topping)}
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setToppingToDelete(topping)}
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
                  {topping.description || "No description"}
                </p>
                <div className="mt-2 text-sm">
                  Price: ${topping.price}
                </div>
                <div className="mt-2 text-sm">
                  Category: {toppingCategories.find(c => c.id === topping.category_id)?.name || "Unknown"}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Topping Dialog */}
      <Dialog open={!!editingTopping} onOpenChange={() => setEditingTopping(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Topping</DialogTitle>
            <DialogDescription>
              Edit the details of your topping.
            </DialogDescription>
          </DialogHeader>
          <EditToppingForm
            onSubmit={handleEditTopping}
            isLoading={isUpdatingTopping}
            initialValues={editingTopping || undefined}
            toppingCategories={toppingCategories}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Topping Dialog */}
      <Dialog open={!!toppingToDelete} onOpenChange={() => setToppingToDelete(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Delete Topping</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {toppingToDelete?.name || "this topping"}?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setToppingToDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteTopping}
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
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ToppingsList;
