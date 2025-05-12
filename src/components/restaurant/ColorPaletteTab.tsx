
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Check, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Restaurant } from "@/types/database-types";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ColorPaletteTabProps {
  restaurant: Restaurant;
  onRestaurantUpdated?: (updatedRestaurant: Restaurant) => void;
}

type ColorPalette = {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
};

// Predefined themes
const colorThemes = [
  {
    name: "Purple",
    colors: { primary: "#9b87f5", secondary: "#6E59A5", accent: "#D6BCFA", background: "#FFFFFF", text: "#1A1F2C" }
  },
  {
    name: "Blue",
    colors: { primary: "#3B82F6", secondary: "#1D4ED8", accent: "#BFDBFE", background: "#FFFFFF", text: "#1E3A8A" }
  },
  {
    name: "Green",
    colors: { primary: "#10B981", secondary: "#047857", accent: "#A7F3D0", background: "#FFFFFF", text: "#064E3B" }
  },
  {
    name: "Red",
    colors: { primary: "#EF4444", secondary: "#B91C1C", accent: "#FECACA", background: "#FFFFFF", text: "#7F1D1D" }
  },
  {
    name: "Dark",
    colors: { primary: "#6B7280", secondary: "#4B5563", accent: "#E5E7EB", background: "#111827", text: "#F9FAFB" }
  }
];

const ColorPaletteTab: React.FC<ColorPaletteTabProps> = ({ restaurant, onRestaurantUpdated }) => {
  // Default color palette if none exists
  const defaultPalette: ColorPalette = {
    primary: "#9b87f5",
    secondary: "#6E59A5",
    accent: "#D6BCFA",
    background: "#FFFFFF",
    text: "#1A1F2C"
  };

  const [colorPalette, setColorPalette] = useState<ColorPalette>(
    restaurant.color_palette as ColorPalette || defaultPalette
  );
  const [isSaving, setIsSaving] = useState(false);
  const [activeTheme, setActiveTheme] = useState<string | null>(null);
  const { toast } = useToast();

  // Effect to check if current palette matches any predefined theme
  useEffect(() => {
    const matchingTheme = colorThemes.find(theme => 
      theme.colors.primary === colorPalette.primary &&
      theme.colors.secondary === colorPalette.secondary &&
      theme.colors.accent === colorPalette.accent &&
      theme.colors.background === colorPalette.background &&
      theme.colors.text === colorPalette.text
    );
    
    setActiveTheme(matchingTheme?.name || null);
  }, [colorPalette]);

  // Apply a predefined theme
  const applyTheme = (theme: typeof colorThemes[0]) => {
    setColorPalette(theme.colors);
    setActiveTheme(theme.name);
  };

  // Handle individual color change
  const handleColorChange = (colorKey: keyof ColorPalette, value: string) => {
    setColorPalette(prev => ({
      ...prev,
      [colorKey]: value
    }));
    setActiveTheme(null); // Reset active theme when manually changing colors
  };

  // Save color palette to the database
  const handleSaveColorPalette = async () => {
    setIsSaving(true);
    
    try {
      const { data, error } = await supabase
        .from("restaurants")
        .update({ color_palette: colorPalette })
        .eq("id", restaurant.id)
        .select();
      
      if (error) throw error;
      
      toast({
        title: "Colors saved",
        description: "The kiosk color palette has been updated.",
      });

      if (onRestaurantUpdated && data && data.length > 0) {
        const updatedRestaurant = {
          ...restaurant,
          color_palette: colorPalette
        };
        onRestaurantUpdated(updatedRestaurant);
      }
    } catch (error) {
      console.error("Error updating color palette:", error);
      toast({
        title: "Error",
        description: "Failed to update color palette.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Reset to default palette
  const handleResetPalette = () => {
    setColorPalette(defaultPalette);
    toast({
      title: "Colors Reset",
      description: "The color palette has been reset to default."
    });
  };

  // Preview component to show color sample
  const ColorPreview = () => (
    <div className="mt-6 border rounded-lg p-4 space-y-4" style={{ backgroundColor: colorPalette.background, color: colorPalette.text }}>
      <h3 className="font-medium text-lg" style={{ color: colorPalette.text }}>Color Preview</h3>
      
      <div className="flex flex-wrap gap-2">
        <Button
          style={{ backgroundColor: colorPalette.primary, color: "#fff" }}
          className="shadow-sm"
        >
          Primary Button
        </Button>
        
        <Button
          variant="outline"
          style={{ borderColor: colorPalette.secondary, color: colorPalette.secondary }}
          className="shadow-sm"
        >
          Secondary Button
        </Button>
        
        <div 
          className="px-3 py-1 rounded-full text-sm" 
          style={{ backgroundColor: colorPalette.accent, color: colorPalette.text }}
        >
          Accent Badge
        </div>
      </div>

      <div className="mt-4 p-3 rounded-md" style={{ backgroundColor: colorPalette.secondary, color: "#fff" }}>
        Menu Item Example
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Kiosk Color Palette</h3>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Theme Selection</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue={activeTheme || "custom"} onValueChange={(value) => {
            if (value !== "custom") {
              const theme = colorThemes.find(t => t.name === value);
              if (theme) applyTheme(theme);
            }
          }}>
            <TabsList className="mb-4 flex flex-wrap">
              {colorThemes.map(theme => (
                <TabsTrigger 
                  key={theme.name} 
                  value={theme.name}
                  className="flex-grow"
                >
                  {theme.name}
                </TabsTrigger>
              ))}
              <TabsTrigger value="custom">Custom</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Color inputs */}
            <div>
              <Label htmlFor="primary-color">Primary Color</Label>
              <div className="flex items-center mt-1">
                <input
                  type="color"
                  id="primary-color"
                  value={colorPalette.primary}
                  onChange={(e) => handleColorChange('primary', e.target.value)}
                  className="h-10 w-10 rounded border cursor-pointer"
                />
                <input 
                  type="text"
                  value={colorPalette.primary}
                  onChange={(e) => handleColorChange('primary', e.target.value)}
                  className="ml-2 flex-1 px-3 py-2 border rounded-md"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="secondary-color">Secondary Color</Label>
              <div className="flex items-center mt-1">
                <input
                  type="color"
                  id="secondary-color"
                  value={colorPalette.secondary}
                  onChange={(e) => handleColorChange('secondary', e.target.value)}
                  className="h-10 w-10 rounded border cursor-pointer"
                />
                <input 
                  type="text"
                  value={colorPalette.secondary}
                  onChange={(e) => handleColorChange('secondary', e.target.value)}
                  className="ml-2 flex-1 px-3 py-2 border rounded-md"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="accent-color">Accent Color</Label>
              <div className="flex items-center mt-1">
                <input
                  type="color"
                  id="accent-color"
                  value={colorPalette.accent}
                  onChange={(e) => handleColorChange('accent', e.target.value)}
                  className="h-10 w-10 rounded border cursor-pointer"
                />
                <input 
                  type="text"
                  value={colorPalette.accent}
                  onChange={(e) => handleColorChange('accent', e.target.value)}
                  className="ml-2 flex-1 px-3 py-2 border rounded-md"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="background-color">Background Color</Label>
              <div className="flex items-center mt-1">
                <input
                  type="color"
                  id="background-color"
                  value={colorPalette.background}
                  onChange={(e) => handleColorChange('background', e.target.value)}
                  className="h-10 w-10 rounded border cursor-pointer"
                />
                <input 
                  type="text"
                  value={colorPalette.background}
                  onChange={(e) => handleColorChange('background', e.target.value)}
                  className="ml-2 flex-1 px-3 py-2 border rounded-md"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="text-color">Text Color</Label>
              <div className="flex items-center mt-1">
                <input
                  type="color"
                  id="text-color"
                  value={colorPalette.text}
                  onChange={(e) => handleColorChange('text', e.target.value)}
                  className="h-10 w-10 rounded border cursor-pointer"
                />
                <input 
                  type="text"
                  value={colorPalette.text}
                  onChange={(e) => handleColorChange('text', e.target.value)}
                  className="ml-2 flex-1 px-3 py-2 border rounded-md"
                />
              </div>
            </div>
          </div>
          
          <ColorPreview />

          <div className="flex justify-between mt-6">
            <Button
              variant="outline"
              onClick={handleResetPalette}
              className="flex items-center"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Reset to Default
            </Button>
            
            <Button
              onClick={handleSaveColorPalette}
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
