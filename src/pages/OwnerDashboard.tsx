
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Loader2, Store, LogOut } from "lucide-react";
import { Restaurant } from "@/types/database-types";
import { useToast } from "@/hooks/use-toast";

const OwnerDashboard = () => {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, signOut } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const fetchOwnerRestaurants = async () => {
      try {
        if (!user) return;
        
        setLoading(true);
        
        const { data, error } = await supabase
          .rpc('get_owned_restaurants')
        
        if (error) {
          console.error("Error fetching restaurants:", error);
          toast({
            title: "Error",
            description: "Could not load your restaurants. Please try again.",
            variant: "destructive",
          });
          return;
        }

        console.log("Owner restaurants:", data);
        setRestaurants(data || []);
      } catch (error) {
        console.error("Exception when fetching restaurants:", error);
        toast({
          title: "Error",
          description: "An unexpected error occurred. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchOwnerRestaurants();
  }, [user, toast]);

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: "Logged out successfully",
        description: "You have been logged out of your account",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "There was a problem signing out",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Restaurant Owner Dashboard</h1>
        <Button 
          variant="outline" 
          onClick={handleSignOut}
          className="flex items-center gap-2"
        >
          <LogOut size={18} />
          Sign Out
        </Button>
      </div>
      
      {restaurants.length === 0 ? (
        <div className="text-center py-10">
          <Store className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-2xl font-semibold">No restaurants found</h2>
          <p className="text-muted-foreground mt-2">
            You don't have any restaurants assigned to you.
          </p>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Your Restaurants</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {restaurants.map((restaurant) => (
                  <TableRow key={restaurant.id}>
                    <TableCell className="font-medium">{restaurant.name}</TableCell>
                    <TableCell>{restaurant.location || "No location"}</TableCell>
                    <TableCell className="text-right">
                      <Button asChild>
                        <Link to={`/owner/restaurant/${restaurant.id}`}>
                          Manage Restaurant
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default OwnerDashboard;
