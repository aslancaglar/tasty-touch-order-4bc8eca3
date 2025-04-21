import AdminLayout from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Edit, MoreHorizontal, Plus, Trash2, Settings, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Restaurant } from "@/types/database-types";
import { getRestaurants, createRestaurant } from "@/services/kiosk-service";
import { useAuth } from "@/contexts/AuthContext";
import ImageUpload from "@/components/ImageUpload";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";

const AddRestaurantDialog = ({ onRestaurantAdded }: { onRestaurantAdded: () => void }) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [location, setLocation] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !slug) {
      toast({
        title: "Validation Error",
        description: "Name and slug are required",
        variant: "destructive"
      });
      return;
    }

    if (!user) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to create a restaurant",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsSubmitting(true);
      await createRestaurant({
        name,
        slug,
        location,
        image_url: imageUrl
      });
      
      toast({
        title: "Success",
        description: "Restaurant created successfully",
      });
      
      setName("");
      setSlug("");
      setLocation("");
      setImageUrl("");
      
      setOpen(false);
      
      onRestaurantAdded();
    } catch (error) {
      console.error("Error creating restaurant:", error);
      toast({
        title: "Error",
        description: "Failed to create restaurant. Please ensure you're logged in and try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNameChange = (value: string) => {
    setName(value);
    setSlug(value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-kiosk-primary">
          <Plus className="mr-2 h-4 w-4" />
          Add Restaurant
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add New Restaurant</DialogTitle>
            <DialogDescription>
              Enter the details for the new restaurant.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                placeholder="Burger House"
                className="col-span-3"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="slug" className="text-right">
                Slug
              </Label>
              <Input
                id="slug"
                placeholder="burger-house"
                className="col-span-3"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="location" className="text-right">
                Location
              </Label>
              <Input
                id="location"
                placeholder="New York, NY"
                className="col-span-3"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
            <div className="col-span-4">
              <ImageUpload
                value={imageUrl}
                onChange={setImageUrl}
                label="Cover Photo"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" className="bg-kiosk-primary" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Restaurant'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

type RestaurantStats = {
  totalOrders: number;
  revenue: number;
};

const RestaurantCard = ({
  restaurant,
  stats,
  loadingStats,
}: {
  restaurant: Restaurant;
  stats: RestaurantStats | undefined;
  loadingStats: boolean;
}) => {
  return (
    <Card className="overflow-hidden">
      <div className="h-40 w-full overflow-hidden">
        <img
          src={restaurant.image_url || "https://via.placeholder.com/400x200?text=No+Image"}
          alt={restaurant.name}
          className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
        />
      </div>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">{restaurant.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-muted-foreground mb-4">{restaurant.location}</div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Orders</p>
            {loadingStats ? (
              <Skeleton className="h-6 w-16" />
            ) : (
              <p className="font-medium">{stats?.totalOrders ?? 0}</p>
            )}
          </div>
          <div>
            <p className="text-muted-foreground">Revenue</p>
            {loadingStats ? (
              <Skeleton className="h-6 w-20" />
            ) : (
              <p className="font-medium">
                €{stats?.revenue?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? "0.00"}
              </p>
            )}
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button variant="outline" asChild>
            <Link to={`/r/${restaurant.slug}`}>
              View Kiosk
            </Link>
          </Button>
          <Button variant="default" className="bg-kiosk-primary" asChild>
            <Link to={`/restaurant/${restaurant.id}`}>
              <Settings className="mr-2 h-4 w-4" />
              Manage
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

const fetchRestaurantStats = async (restaurantIds: string[]): Promise<Record<string, RestaurantStats>> => {
  if (restaurantIds.length === 0) return {};

  let stats: Record<string, RestaurantStats> = {};
  const { data, error } = await supabase
    .from("orders")
    .select("restaurant_id,total,status")
    .in("restaurant_id", restaurantIds);

  if (error) {
    console.error("Error fetching order stats for restaurants:", error);
    throw error;
  }

  for (const id of restaurantIds) {
    stats[id] = { totalOrders: 0, revenue: 0 };
  }

  if (data) {
    for (const order of data) {
      if (order.status === "cancelled") continue;
      if (order.restaurant_id && stats[order.restaurant_id]) {
        stats[order.restaurant_id].totalOrders += 1;
        stats[order.restaurant_id].revenue += order.total ? parseFloat(String(order.total)) : 0;
      }
    }
  }
  return stats;
};

const Restaurants = () => {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [stats, setStats] = useState<Record<string, RestaurantStats>>({});
  const [loading, setLoading] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchRestaurants = async () => {
    try {
      setLoading(true);
      const data = await getRestaurants();
      setRestaurants(data);
    } catch (error) {
      console.error("Error fetching restaurants:", error);
      toast({
        title: "Error",
        description: "Failed to load restaurants",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchRestaurants();
    } else {
      setLoading(false);
    }
    setStats({});
    setLoadingStats(true);
  }, [user]);

  useEffect(() => {
    const getStats = async () => {
      if (restaurants.length === 0) {
        setStats({});
        setLoadingStats(false);
        return;
      }
      setLoadingStats(true);
      try {
        const ids = restaurants.map((r) => r.id);
        const statData = await fetchRestaurantStats(ids);
        setStats(statData);
      } catch (err) {
        console.error("Failed to fetch restaurant stats", err);
      } finally {
        setLoadingStats(false);
      }
    };
    getStats();
  }, [restaurants]);

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Restaurants</h1>
          <p className="text-muted-foreground">
            Manage all the restaurants on your platform
          </p>
        </div>
        <AddRestaurantDialog onRestaurantAdded={fetchRestaurants} />
      </div>

      {!user ? (
        <div className="text-center py-10">
          <p className="text-lg mb-3">You need to be logged in to view and manage restaurants</p>
          <Button asChild>
            <Link to="/auth">Sign In</Link>
          </Button>
        </div>
      ) : loading ? (
        <div className="flex justify-center items-center h-60">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : restaurants.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {restaurants.map((restaurant) => (
            <RestaurantCard
              key={restaurant.id}
              restaurant={restaurant}
              stats={stats[restaurant.id]}
              loadingStats={loadingStats}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
          <p className="text-lg text-muted-foreground mb-4">No restaurants found</p>
          <p className="text-muted-foreground mb-6">Start by adding your first restaurant</p>
        </div>
      )}
    </AdminLayout>
  );
};

export default Restaurants;
