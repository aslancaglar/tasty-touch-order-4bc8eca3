import AdminLayout from "@/components/layout/AdminLayout";
import { GeneralSettings } from "@/components/security/GeneralSettings";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";

export default function GeneralSettingsPage() {
  const [restaurants, setRestaurants] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState<string>("");

  useEffect(() => {
    fetchRestaurants();
  }, []);

  const fetchRestaurants = async () => {
    try {
      const { data, error } = await supabase
        .from('restaurants')
        .select('id, name')
        .order('name');

      if (error) throw error;
      if (data && data.length > 0) {
        setRestaurants(data);
        setSelectedRestaurant(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching restaurants:', error);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center space-x-2">
          <Settings className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold text-foreground">General Settings</h1>
            <p className="text-muted-foreground">
              Manage language flags and other general settings for your restaurants
            </p>
          </div>
        </div>
        
        <div className="space-y-6">
          <div className="flex items-center space-x-4">
            <Label htmlFor="restaurant-select" className="text-sm font-medium">
              Select Restaurant:
            </Label>
            <Select value={selectedRestaurant} onValueChange={setSelectedRestaurant}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select a restaurant" />
              </SelectTrigger>
              <SelectContent>
                {restaurants.map((restaurant) => (
                  <SelectItem key={restaurant.id} value={restaurant.id}>
                    {restaurant.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {selectedRestaurant && (
            <GeneralSettings restaurantId={selectedRestaurant} />
          )}
        </div>
      </div>
    </AdminLayout>
  );
}