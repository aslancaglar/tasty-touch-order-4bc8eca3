
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Loader2, Check, Palette } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Restaurant } from "@/types/database-types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

// Default color palette
const DEFAULT_COLORS = {
  primary: "#9b87f5",
  secondary: "#6E59A5",
  accent: "#D6BCFA",
  background: "#FFFFFF",
  text: "#1A1F2C",
};

interface ColorPaletteTabProps {
  restaurant: Restaurant;
  onRestaurantUpdated?: (updatedRestaurant: Restaurant) => void;
}

const ColorPaletteTab = ({ restaurant, onRestaurantUpdated }: ColorPaletteTabProps) => {
  const [isSaving, setIsSaving] = useState(false);
  const [colors, setColors] = useState<Record<string, string>>({
    primary: "#9b87f5",
    secondary: "#6E59A5",
    accent: "#D6BCFA",
    background: "#FFFFFF",
    text: "#1A1F2C",
  });
  const { toast } = useToast();

  useEffect(() => {
    // Load colors from restaurant metadata if available
    const fetchColors = async () => {
      if (!restaurant?.id) return;

      try {
        const { data, error } = await supabase
          .from('restaurants')
          .select('color_palette')
          .eq('id', restaurant.id)
          .single();
          
        if (error) {
          console.error("Error fetching color palette:", error);
          return;
        }
        
        if (data && data.color_palette) {
          // Type assertion to access the color_palette properly
          const palette = data.color_palette as Record<string, string>;
          setColors({
            ...DEFAULT_COLORS,
            ...palette
          });
        }
      } catch (error) {
        console.error("Error in fetchColors:", error);
      }
    };
    
    fetchColors();
  }, [restaurant?.id]);

  const handleColorChange = (colorKey: string, value: string) => {
    setColors(prev => ({
      ...prev,
      [colorKey]: value
    }));
  };

  const handleSaveColors = async () => {
    if (!restaurant?.id) return;
    
    setIsSaving(true);
    
    try {
      const { data, error } = await supabase
        .from('restaurants')
        .update({ color_palette: colors })
        .eq('id', restaurant.id)
        .select();
      
      if (error) {
        throw error;
      }
      
      toast({
        title: "Colors saved",
        description: "The color palette has been updated successfully",
      });

      if (onRestaurantUpdated && data && data.length > 0) {
        const typedColorPalette = {
          primary: colors.primary,
          secondary: colors.secondary,
          accent: colors.accent,
          background: colors.background,
          text: colors.text
        };
        
        const updatedRestaurant = {
          ...restaurant,
          color_palette: typedColorPalette
        };
        
        onRestaurantUpdated(updatedRestaurant);
      }
    } catch (error) {
      console.error("Error saving color palette:", error);
      toast({
        title: "Error",
        description: "Failed to save color palette",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const resetToDefaults = () => {
    setColors(DEFAULT_COLORS);
  };

  const colorPreview = (color: string) => {
    return (
      <div 
        className="w-8 h-8 rounded border border-gray-300" 
        style={{ backgroundColor: color }}
      />
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Color Palette Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-sm text-muted-foreground">
            Configure the colors for your kiosk interface. These colors will be used throughout the application.
          </p>
          
          <div className="grid gap-4 sm:grid-cols-2">
            {Object.entries(colors).map(([colorKey, colorValue]) => (
              <div key={colorKey} className="space-y-2">
                <Label htmlFor={`color-${colorKey}`} className="capitalize flex items-center gap-2">
                  {colorKey} {colorPreview(colorValue)}
                </Label>
                <div className="flex gap-2">
                  <Input
                    id={`color-${colorKey}`}
                    type="color"
                    value={colorValue}
                    onChange={(e) => handleColorChange(colorKey, e.target.value)}
                    className="w-12 h-10 p-1"
                  />
                  <Input
                    type="text"
                    value={colorValue}
                    onChange={(e) => handleColorChange(colorKey, e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>
            ))}
          </div>
          
          <div className="preview-section border rounded-md p-4 mt-4">
            <h3 className="text-lg font-medium mb-2">Preview</h3>
            <div className="grid gap-4 mt-2">
              <div className="flex flex-wrap gap-3">
                <div className="p-4 rounded-md text-white" style={{ backgroundColor: colors.primary }}>
                  Primary
                </div>
                <div className="p-4 rounded-md text-white" style={{ backgroundColor: colors.secondary }}>
                  Secondary
                </div>
                <div className="p-4 rounded-md" style={{ backgroundColor: colors.accent, color: colors.text }}>
                  Accent
                </div>
                <div className="p-4 rounded-md border" style={{ backgroundColor: colors.background, color: colors.text }}>
                  Background / Text
                </div>
              </div>
              <div className="p-4 rounded-md" style={{ backgroundColor: colors.background, color: colors.text }}>
                <div className="mb-2 font-bold" style={{ color: colors.primary }}>Sample Header Text</div>
                <p>This is what your text will look like on the background color.</p>
                <button className="px-3 py-1 mt-2 rounded-md text-white" style={{ backgroundColor: colors.primary }}>
                  Primary Button
                </button>
                <button className="px-3 py-1 mt-2 ml-2 rounded-md text-white" style={{ backgroundColor: colors.secondary }}>
                  Secondary Button
                </button>
              </div>
            </div>
          </div>
          
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={resetToDefaults}
            >
              Reset to Defaults
            </Button>
            
            <Button
              onClick={handleSaveColors}
              disabled={isSaving}
              className="bg-green-600 hover:bg-green-700"
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Save Colors
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ColorPaletteTab;
