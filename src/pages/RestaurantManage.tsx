import AdminLayout from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Edit,
  MoreHorizontal,
  Plus,
  Trash2,
  Loader2,
  Utensils,
} from "lucide-react";
import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Restaurant, ToppingCategory, Topping } from "@/types/database-types";
import { getRestaurantById } from "@/services/kiosk-service";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import ToppingCategoryForm from "@/components/forms/ToppingCategoryForm";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Textarea } from "@/components/ui/textarea";

interface RestaurantManageParams {
  id: string;
}

const RestaurantManage = () => {
  const { id } = useParams<RestaurantManageParams>();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();
  const [isAddingToppingCategory, setIsAddingToppingCategory] =
    useState(false);
  const [toppingCategories, setToppingCategories] = useState<
    ToppingCategory[]
  >([]);
  const [isToppingCategoriesLoading, setIsToppingCategoriesLoading] =
    useState(false);
  const [isUpdatingToppingCategory, setIsUpdatingToppingCategory] =
    useState(false);
  const [editingToppingCategory, setEditingToppingCategory] =
    useState<ToppingCategory | null>(null);
  const [isDeletingToppingCategory, setIsDeletingToppingCategory] =
    useState(false);
  const [toppingToDelete, setToppingToDelete] = useState<
    ToppingCategory | null
  >(null);
  const [isToppingsLoading, setIsToppingsLoading] = useState(false);
  const [toppings, setToppings] = useState<Topping[]>([]);
  const [isAddingTopping, setIsAddingTopping] = useState(false);
  const [isUpdatingTopping, setIsUpdatingTopping] = useState(false);
  const [editingTopping, setEditingTopping] = useState<Topping | null>(null);
  const [isDeletingTopping, setIsDeletingTopping] = useState(false);
  const [toppingToDeleteItem, setToppingToDeleteItem] =
    useState<Topping | null>(null);

  const fetchRestaurant = async () => {
    if (!id) {
      toast({
        title: "Error",
        description: "Restaurant ID is missing",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      const data = await getRestaurantById(id);
      setRestaurant(data);
    } catch (error) {
      console.error("Error fetching restaurant:", error);
      toast({
        title: "Error",
        description: "Failed to load restaurant",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchToppingCategories = async () => {
    if (!id) {
      return;
    }

    try {
      setIsToppingCategoriesLoading(true);
      const { data, error } = await supabase
        .from("topping_categories")
        .select("*")
        .eq("restaurant_id", id);

      if (error) {
        console.error("Error fetching topping categories:", error);
        toast({
          title: "Error",
          description: "Failed to load topping categories",
          variant: "destructive",
        });
      } else {
        setToppingCategories(data || []);
      }
    } catch (error) {
      console.error("Error fetching topping categories:", error);
      toast({
        title: "Error",
        description: "Failed to load topping categories",
        variant: "destructive",
      });
    } finally {
      setIsToppingCategoriesLoading(false);
    }
  };

  const fetchToppings = async () => {
    if (!id) {
      return;
    }

    try {
      setIsToppingsLoading(true);
      const { data, error } = await supabase
        .from("toppings")
        .select("*")
        .eq("restaurant_id", id);

      if (error) {
        console.error("Error fetching toppings:", error);
        toast({
          title: "Error",
          description: "Failed to load toppings",
          variant: "destructive",
        });
      } else {
        setToppings(data || []);
      }
    } catch (error) {
      console.error("Error fetching toppings:", error);
      toast({
        title: "Error",
        description: "Failed to load toppings",
        variant: "destructive",
      });
    } finally {
      setIsToppingsLoading(false);
    }
  };

  useEffect(() => {
    if (user && id) {
      fetchRestaurant();
      fetchToppingCategories();
      fetchToppings();
    } else {
      setLoading(false);
    }
  }, [user, id]);

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
          restaurant_id: restaurant?.id,
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
        setToppingCategories((prevCategories) => [
          ...prevCategories,
          newToppingCategory[0],
        ]);
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
        setToppingCategories((prevCategories) =>
          prevCategories.map((category) =>
            category.id === editingToppingCategory?.id
              ? { ...category, ...updatedToppingCategory[0] }
              : category
          )
        );
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
        setToppingCategories((prevCategories) =>
          prevCategories.filter((category) => category.id !== toppingToDelete.id)
        );
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
          restaurant_id: restaurant?.id,
          topping_category_id: values.topping_category_id,
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
        setToppings((prevToppings) => [...prevToppings, newTopping[0]]);
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
          topping_category_id: values.topping_category_id,
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
        setToppings((prevToppings) =>
          prevToppings.map((topping) =>
            topping.id === editingTopping?.id
              ? { ...topping, ...updatedTopping[0] }
              : topping
          )
        );
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

      if (!toppingToDeleteItem) {
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
        .eq("id", toppingToDeleteItem.id);

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
        setToppings((prevToppings) =>
          prevToppings.filter((topping) => topping.id !== toppingToDeleteItem.id)
        );
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
      setToppingToDeleteItem(null);
    }
  };

  if (!id) {
    return (
      <AdminLayout>
        <div className="text-center py-10">
          <h1 className="text-2xl font-bold">Restaurant ID is missing</h1>
          <p className="text-muted-foreground">
            Please provide a valid restaurant ID.
          </p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      {loading ? (
        <div className="flex justify-center items-center h-60">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : !restaurant ? (
        <div className="text-center py-10">
          <h1 className="text-2xl font-bold">Restaurant Not Found</h1>
          <p className="text-muted-foreground">
            The restaurant with the ID {id} could not be found.
          </p>
          <Button asChild>
            <Link to="/restaurants">Go Back to Restaurants</Link>
          </Button>
        </div>
      ) : (
        <>
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">{restaurant.name}</h1>
              <p className="text-muted-foreground">
                Manage your restaurant's menu, toppings, and more.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Topping Categories Section */}
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
            </div>

            {/* Toppings Section */}
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
                                onClick={() => setToppingToDeleteItem(topping)}
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
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>

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
                initialValues={editingToppingCategory}
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
                initialValues={editingTopping}
                toppingCategories={toppingCategories}
              />
            </DialogContent>
          </Dialog>

          {/* Delete Topping Dialog */}
          <Dialog open={!!toppingToDeleteItem} onOpenChange={() => setToppingToDeleteItem(null)}>
            <DialogContent className="sm:max-w-[400px]">
              <DialogHeader>
                <DialogTitle>Delete Topping</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete {toppingToDeleteItem?.name || "this topping"}?
                  This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="secondary" onClick={() => setToppingToDeleteItem(null)}>
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
        </>
      )}
    </AdminLayout>
  );
};

export default RestaurantManage;

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  price: z.coerce.number().min(0, "Price must be a positive number"),
  image_url: z.string().optional(),
  topping_category_id: z.string().uuid({ message: "Please select a topping category." }),
});

type FormValues = z.infer<typeof formSchema>;

interface AddToppingFormProps {
  onSubmit: (values: FormValues) => void;
  isLoading?: boolean;
  toppingCategories: ToppingCategory[];
}

const AddToppingForm = ({
  onSubmit,
  isLoading = false,
  toppingCategories,
}: AddToppingFormProps) => {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      price: 0,
      image_url: "",
      topping_category_id: "",
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="Pepperoni, Mushrooms, etc." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description (Optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Brief description of this topping..."
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="price"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Price</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="0.00"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="topping_category_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Topping Category</FormLabel>
              <FormControl>
                <select
                  {...field}
                  className="rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 w-full"
                >
                  <option value="" disabled>
                    Select a category
                  </option>
                  {toppingCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end pt-4">
          <Button type="submit" disabled={isLoading} className="bg-kiosk-primary">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
};

interface EditToppingFormProps extends AddToppingFormProps {
  initialValues?: Partial<FormValues>;
}

const EditToppingForm = ({
  onSubmit,
  isLoading = false,
  initialValues,
  toppingCategories,
}: EditToppingFormProps) => {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialValues?.name || "",
      description: initialValues?.description || "",
      price: initialValues?.price || 0,
      image_url: initialValues?.image_url || "",
      topping_category_id: initialValues?.topping_category_id || "",
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="Pepperoni, Mushrooms, etc." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description (Optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Brief description of this topping..."
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="price"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Price</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="0.00"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="topping_category_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Topping Category</FormLabel>
              <FormControl>
                <select
                  {...field}
                  className="rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 w-full"
                >
                  <option value="" disabled>
                    Select a category
                  </option>
                  {toppingCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end pt-4">
          <Button type="submit" disabled={isLoading} className="bg-kiosk-primary">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
};
