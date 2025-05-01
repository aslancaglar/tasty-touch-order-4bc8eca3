import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import ImageUpload from "@/components/ImageUpload";
import { Restaurant } from "@/types/database-types";

interface SettingsTabProps {
  restaurant: Restaurant;
  onUpdate: () => void;
  onRestaurantUpdated?: (updatedRestaurant: Restaurant) => void; // Add this prop to make it compatible
}

const SettingsTab: React.FC<SettingsTabProps> = ({ restaurant, onUpdate, onRestaurantUpdated }) => {
  const [restaurantName, setRestaurantName] = React.useState(restaurant?.name || "");
  const [restaurantSlug, setRestaurantSlug] = React.useState(restaurant?.slug || "");
  const [restaurantLocation, setRestaurantLocation] = React.useState(restaurant?.location || "");
  const [restaurantCurrency, setRestaurantCurrency] = React.useState(restaurant?.currency || "EUR");
  const [restaurantUiLanguage, setRestaurantUiLanguage] = React.useState(restaurant?.ui_language || "fr");
  const [imageUrl, setImageUrl] = React.useState(restaurant?.image_url || "");
  const [pwaIcon, setPwaIcon] = React.useState(restaurant?.pwa_icon || "");
  const [updating, setUpdating] = React.useState(false);
  const { toast } = useToast();

  const handleUpdateRestaurant = async () => {
    if (!restaurantName || !restaurantSlug) {
      toast({
        title: "Error",
        description: "Restaurant name and slug are required",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setUpdating(true);
      
      const updatedRestaurant = {
        name: restaurantName,
        slug: restaurantSlug,
        location: restaurantLocation,
        image_url: imageUrl,
        currency: restaurantCurrency,
        ui_language: restaurantUiLanguage,
        pwa_icon: pwaIcon,
        updated_at: new Date().toISOString()
      };
      
      const { error, data } = await supabase
        .from('restaurants')
        .update(updatedRestaurant)
        .eq('id', restaurant.id)
        .select();
      
      if (error) throw error;
      
      toast({
        title: "Restaurant Updated",
        description: "Restaurant settings have been updated successfully",
      });
      
      // Call both callbacks for compatibility
      onUpdate();
      if (onRestaurantUpdated && data && data[0]) {
        onRestaurantUpdated(data[0] as Restaurant);
      }
    } catch (error: any) {
      console.error("Error updating restaurant:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update restaurant",
        variant: "destructive"
      });
    } finally {
      setUpdating(false);
    }
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Restaurant Information</CardTitle>
          <CardDescription>Update your restaurant's basic information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          
          <div className="space-y-2">
            <Label htmlFor="name">Restaurant Name</Label>
            <Input 
              id="name" 
              value={restaurantName} 
              onChange={(e) => setRestaurantName(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="slug">Restaurant URL Slug</Label>
            <Input 
              id="slug" 
              value={restaurantSlug} 
              onChange={(e) => setRestaurantSlug(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              This will be used in the URL: /r/{restaurantSlug}
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input 
              id="location" 
              value={restaurantLocation} 
              onChange={(e) => setRestaurantLocation(e.target.value)}
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Select value={restaurantCurrency} onValueChange={setRestaurantCurrency}>
                <SelectTrigger id="currency">
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EUR">Euro (€)</SelectItem>
                  <SelectItem value="USD">US Dollar ($)</SelectItem>
                  <SelectItem value="GBP">British Pound (£)</SelectItem>
                  <SelectItem value="TRY">Turkish Lira (₺)</SelectItem>
                  <SelectItem value="JPY">Japanese Yen (¥)</SelectItem>
                  <SelectItem value="CAD">Canadian Dollar ($)</SelectItem>
                  <SelectItem value="AUD">Australian Dollar ($)</SelectItem>
                  <SelectItem value="CHF">Swiss Franc (Fr.)</SelectItem>
                  <SelectItem value="CNY">Chinese Yuan (¥)</SelectItem>
                  <SelectItem value="RUB">Russian Ruble (₽)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="language">Interface Language</Label>
              <Select value={restaurantUiLanguage} onValueChange={setRestaurantUiLanguage}>
                <SelectTrigger id="language">
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fr">French</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="tr">Turkish</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="space-y-2">
            <ImageUpload
              label="Restaurant Cover Image"
              value={imageUrl}
              onChange={setImageUrl}
              uploadFolder="restaurant-covers"
              clearable
            />
          </div>
          
          {/* PWA icon upload field */}
          <div className="space-y-2">
            <ImageUpload
              label="PWA App Icon (required for app installation)"
              value={pwaIcon}
              onChange={setPwaIcon}
              uploadFolder="restaurant-pwa-icons"
              clearable
            />
            <p className="text-xs text-muted-foreground">
              This icon will be used when customers install your restaurant kiosk as an app.
              For best results, use a square image (512x512px recommended).
            </p>
          </div>
          
          <Button onClick={handleUpdateRestaurant} disabled={updating}>
            {updating ? "Updating..." : "Save Changes"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsTab;
