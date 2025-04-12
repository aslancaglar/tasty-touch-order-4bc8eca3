
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Restaurant } from "@/types/database-types";
import ImageUpload from "@/components/ImageUpload";

interface SettingsTabProps {
  restaurant: Restaurant;
}

const SettingsTab = ({ restaurant }: SettingsTabProps) => {
  const [name, setName] = useState(restaurant.name);
  const [location, setLocation] = useState(restaurant.location || "");
  const [image, setImage] = useState(restaurant.image_url || "");
  const [isSaving, setIsSaving] = useState(false);
  
  const { toast } = useToast();

  const handleSaveRestaurantInfo = () => {
    setIsSaving(true);
    
    // Simulate saving
    setTimeout(() => {
      setIsSaving(false);
      toast({
        title: "Not Implemented",
        description: "This feature will be implemented in a future update",
      });
    }, 1000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Restaurant Settings</h3>
      </div>
      
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="restaurantName">Restaurant Name</Label>
          <Input 
            id="restaurantName" 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            className="mt-1"
          />
        </div>
        
        <div>
          <Label htmlFor="restaurantLocation">Location</Label>
          <Input 
            id="restaurantLocation" 
            value={location} 
            onChange={(e) => setLocation(e.target.value)} 
            className="mt-1"
          />
        </div>
        
        <div className="sm:col-span-2">
          <Label>Restaurant Image</Label>
          <div className="mt-1">
            <ImageUpload 
              value={image} 
              onChange={(url) => setImage(url)} 
              placeholder="Upload restaurant image..."
            />
          </div>
        </div>
      </div>
      
      <div className="flex justify-end">
        <Button
          onClick={handleSaveRestaurantInfo}
          disabled={isSaving}
          className="bg-kiosk-primary"
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Changes"
          )}
        </Button>
      </div>
    </div>
  );
};

export default SettingsTab;
