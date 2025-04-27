
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PlusCircle, Edit, Trash2, ExternalLink, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Restaurant } from "@/types/database-types";
import { useAuth } from "@/contexts/AuthContext";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";

const formSchema = z.object({
  name: z.string().min(2, {
    message: "Restaurant name must be at least 2 characters.",
  }),
  location: z.string().optional(),
  image_url: z.string().optional(),
});

const RestaurantsPage = () => {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [restaurantToDelete, setRestaurantToDelete] = useState<Restaurant | null>(null);
  const [restaurantToEdit, setRestaurantToEdit] = useState<Restaurant | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      location: "",
      image_url: "",
    },
  });

  useEffect(() => {
    const fetchRestaurants = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('restaurants')
          .select('*');
        
        if (error) throw error;
        setRestaurants(data);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching restaurants:", error);
        toast({
          title: "Error",
          description: "Failed to fetch restaurants. Please try again.",
          variant: "destructive"
        });
        setLoading(false);
      }
    };

    fetchRestaurants();
  }, [toast]);

  const handleCreateRestaurant = async (values: z.infer<typeof formSchema>) => {
    try {
      setIsCreating(true);
      
      const slug = values.name
        .toLowerCase()
        .replace(/[^a-z0-9 ]/g, "")
        .replace(/\s+/g, "-");
      
      const { data: newRestaurant, error } = await supabase
        .from('restaurants')
        .insert({
          name: values.name,
          slug: slug,
          location: values.location || "",
          image_url: values.image_url || "",
          currency: "EUR", 
          ui_language: "fr",
          display_order: 0
        })
        .select()
        .single();
      
      if (error) throw error;
      
      setRestaurants([...restaurants, newRestaurant]);
      
      toast({
        title: "Success",
        description: `${values.name} has been added to your restaurants.`,
      });
      
      setShowCreateDialog(false);
    } catch (error) {
      console.error("Error creating restaurant:", error);
      toast({
        title: "Error",
        description: "Failed to create the restaurant. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateRestaurant = async (id: string, values: z.infer<typeof formSchema>) => {
    try {
      setIsUpdating(true);
      
      const slug = values.name
        .toLowerCase()
        .replace(/[^a-z0-9 ]/g, "")
        .replace(/\s+/g, "-");
      
      const { data: updatedRestaurant, error } = await supabase
        .from('restaurants')
        .update({
          name: values.name,
          slug: slug,
          location: values.location || "",
          image_url: values.image_url || ""
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      
      setRestaurants(restaurants.map(restaurant =>
        restaurant.id === id ? updatedRestaurant : restaurant
      ));
      
      toast({
        title: "Success",
        description: `${values.name} has been updated.`,
      });
      
      setShowEditDialog(false);
    } catch (error) {
      console.error("Error updating restaurant:", error);
      toast({
        title: "Error",
        description: "Failed to update the restaurant. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteRestaurant = async () => {
    if (!restaurantToDelete) return;

    try {
      setIsDeleting(true);
      
      const { error } = await supabase
        .from('restaurants')
        .delete()
        .eq('id', restaurantToDelete.id);
      
      if (error) throw error;
      
      setRestaurants(restaurants.filter(restaurant => restaurant.id !== restaurantToDelete.id));
      
      toast({
        title: "Success",
        description: `${restaurantToDelete.name} has been deleted.`,
      });
      
      setShowDeleteDialog(false);
    } catch (error) {
      console.error("Error deleting restaurant:", error);
      toast({
        title: "Error",
        description: "Failed to delete the restaurant. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditRestaurant = (restaurant: Restaurant) => {
    setRestaurantToEdit(restaurant);
    setShowEditDialog(true);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex justify-center items-center h-[80vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">My Restaurants</h1>
        <Button onClick={() => setShowCreateDialog(true)}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add Restaurant
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {restaurants.map(restaurant => (
          <Card key={restaurant.id} className="flex flex-col">
            <CardHeader>
              <CardTitle>{restaurant.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500 mb-2">{restaurant.location || "No location specified"}</p>
              <p className="text-sm">
                Kiosk URL: <a href={`${window.location.origin}/kiosk/${restaurant.slug}`} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                  {`${window.location.origin}/kiosk/${restaurant.slug}`}
                </a>
              </p>
            </CardContent>
            <CardFooter className="mt-auto border-t pt-4">
              <div className="flex space-x-2">
                <Button variant="outline" onClick={() => handleEditRestaurant(restaurant)}>
                  <Edit className="mr-2 h-4 w-4" /> Edit
                </Button>
                <Button variant="outline" onClick={() => navigate(`/restaurant/${restaurant.id}`)}>
                  <ExternalLink className="mr-2 h-4 w-4" /> Manage
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={() => {
                    setRestaurantToDelete(restaurant);
                    setShowDeleteDialog(true);
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </Button>
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create Restaurant</DialogTitle>
            <DialogDescription>
              Add a new restaurant to your platform.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleCreateRestaurant)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Restaurant Name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Input placeholder="Restaurant Location" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="image_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Image URL</FormLabel>
                    <FormControl>
                      <Input placeholder="Image URL" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isCreating} className="w-full bg-kiosk-primary">
                {isCreating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create"
                )}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Restaurant</DialogTitle>
            <DialogDescription>
              Edit the details of your restaurant.
            </DialogDescription>
          </DialogHeader>
          {restaurantToEdit && (
            <Form {...form}>
              <form onSubmit={form.handleSubmit((values) => handleUpdateRestaurant(restaurantToEdit.id, values))} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Restaurant Name" {...field} defaultValue={restaurantToEdit.name} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <FormControl>
                        <Input placeholder="Restaurant Location" {...field} defaultValue={restaurantToEdit.location || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="image_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Image URL</FormLabel>
                      <FormControl>
                        <Input placeholder="Image URL" {...field} defaultValue={restaurantToEdit.image_url || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={isUpdating} className="w-full bg-kiosk-primary">
                  {isUpdating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    "Update"
                  )}
                </Button>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the restaurant
              and remove all its data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={isDeleting} onClick={handleDeleteRestaurant}>
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default RestaurantsPage;
