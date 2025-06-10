
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Plus } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import ImageUpload from "@/components/ImageUpload";
import { createRestaurant } from "@/services/kiosk-service";

interface AddRestaurantDialogProps {
  onRestaurantAdded: () => void;
  t: (key: string) => string;
}

const AddRestaurantDialog = ({ onRestaurantAdded, t }: AddRestaurantDialogProps) => {
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
        image_url: imageUrl,
        logo_url: null
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
          {t("restaurants.add")}
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

export default AddRestaurantDialog;
