import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Printer, Check, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Restaurant } from "@/types/database-types";
import ImageUpload from "@/components/ImageUpload";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { printReceipt } from "@/utils/print-utils";
import PrintNodeIntegration from "@/components/restaurant/PrintNodeIntegration";
import { supabase } from "@/integrations/supabase/client";

interface SettingsTabProps {
  restaurant: Restaurant;
}

const SettingsTab = ({ restaurant }: SettingsTabProps) => {
  const [activeTab, setActiveTab] = useState("basic");
  const [name, setName] = useState(restaurant.name);
  const [location, setLocation] = useState(restaurant.location || "");
  const [image, setImage] = useState(restaurant.image_url || "");
  const [isSaving, setIsSaving] = useState(false);
  const [browserPrintEnabled, setBrowserPrintEnabled] = useState(true);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  
  const { toast } = useToast();

  useEffect(() => {
    const loadPrintSettings = async () => {
      try {
        setIsLoadingSettings(true);
        const { data, error } = await supabase
          .from('restaurant_print_config')
          .select('browser_printing_enabled')
          .eq('restaurant_id', restaurant.id)
          .maybeSingle();
        
        if (!error && data) {
          setBrowserPrintEnabled(data.browser_printing_enabled !== false);
        }
      } catch (error) {
        console.error("Error loading print settings:", error);
      } finally {
        setIsLoadingSettings(false);
      }
    };
    
    loadPrintSettings();
  }, [restaurant.id]);

  const handleSaveRestaurantInfo = () => {
    setIsSaving(true);
    
    setTimeout(() => {
      setIsSaving(false);
      toast({
        title: "Not Implemented",
        description: "This feature will be implemented in a future update",
      });
    }, 1000);
  };

  const handleBrowserPrintToggle = async (enabled: boolean) => {
    setBrowserPrintEnabled(enabled);
    
    try {
      const { error } = await supabase
        .from('restaurant_print_config')
        .upsert({
          restaurant_id: restaurant.id,
          browser_printing_enabled: enabled
        }, {
          onConflict: 'restaurant_id'
        });
      
      if (error) {
        throw error;
      }
      
      toast({
        title: enabled ? "Browser Printing Enabled" : "Browser Printing Disabled",
        description: enabled ? "Receipts will be printed via browser" : "Receipts will not be printed via browser",
      });
    } catch (error) {
      console.error("Error saving browser print setting:", error);
      toast({
        title: "Error",
        description: "Error saving browser printing setting",
        variant: "destructive"
      });
      setBrowserPrintEnabled(!enabled);
    }
  };

  const handleTestPrint = () => {
    if (browserPrintEnabled) {
      const testReceipt = document.getElementById("receipt-content");
      if (testReceipt) {
        testReceipt.style.display = "block";
        printReceipt("receipt-content");
        setTimeout(() => {
          testReceipt.style.display = "none";
        }, 500);
      }
      
      toast({
        title: "Test Receipt",
        description: "Printing test receipt via browser",
      });
    } else {
      toast({
        title: "Browser Printing Disabled",
        description: "Browser printing is currently disabled",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="basic">Informations</TabsTrigger>
          <TabsTrigger value="print">Impression</TabsTrigger>
        </TabsList>
        
        <TabsContent value="basic" className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Paramètres du Restaurant</h3>
          </div>
          
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="restaurantName">Nom du Restaurant</Label>
              <Input 
                id="restaurantName" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="restaurantLocation">Emplacement</Label>
              <Input 
                id="restaurantLocation" 
                value={location} 
                onChange={(e) => setLocation(e.target.value)} 
                className="mt-1"
              />
            </div>
            
            <div className="sm:col-span-2">
              <Label>Image du Restaurant</Label>
              <div className="mt-1">
                <ImageUpload 
                  value={image} 
                  onChange={(url) => setImage(url)} 
                  label="Télécharger une image..."
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
                  Sauvegarde...
                </>
              ) : (
                "Enregistrer"
              )}
            </Button>
          </div>
        </TabsContent>
        
        <TabsContent value="print" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Paramètres d'Impression</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="browser-print">Impression Navigateur</Label>
                  <p className="text-sm text-muted-foreground">
                    Activer l'impression via le navigateur
                  </p>
                </div>
                {isLoadingSettings ? (
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                ) : (
                  <Switch 
                    id="browser-print"
                    checked={browserPrintEnabled}
                    onCheckedChange={handleBrowserPrintToggle}
                  />
                )}
              </div>
              
              <div className="flex justify-end">
                <Button onClick={handleTestPrint} className="bg-kiosk-primary">
                  <Printer className="mr-2 h-4 w-4" />
                  Tester l'Impression Navigateur
                </Button>
              </div>
            </CardContent>
          </Card>
          
          <PrintNodeIntegration restaurantId={restaurant.id} />
          
          <div id="receipt-content" className="receipt" style={{ display: "none" }}>
            <div className="header">
              <div className="logo">{restaurant.name}</div>
              {restaurant.location && <div>{restaurant.location}</div>}
              <div>{new Date().toLocaleString()}</div>
              <div>Commande #TEST</div>
              <div>Table: TEST</div>
            </div>

            <div className="divider"></div>

            <div>
              <div style={{ marginBottom: "8px" }}>
                <div className="item">
                  <span>1x Article Test</span>
                  <span>10.00 €</span>
                </div>
                
                <div className="item-details">
                  <div className="item">
                    <span>+ Option Test</span>
                    <span></span>
                  </div>
                </div>
              </div>
            </div>

            <div className="divider"></div>

            <div className="total-section">
              <div className="total-line">
                <span>Sous-total</span>
                <span>10.00 €</span>
              </div>
              <div className="total-line">
                <span>TVA (10%)</span>
                <span>1.00 €</span>
              </div>
              <div className="divider"></div>
              <div className="total-line grand-total">
                <span>TOTAL</span>
                <span>11.00 €</span>
              </div>
            </div>

            <div className="footer">
              <p>TEST - IMPRESSION D'ESSAI</p>
              <p>Merci de votre visite!</p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SettingsTab;
