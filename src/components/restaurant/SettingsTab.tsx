import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Printer, Check, XCircle, Trash2 } from "lucide-react";
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
import { calculatePriceWithoutTax, calculateTaxAmount } from "@/utils/price-utils";
import { updateRestaurant, deleteRestaurant } from "@/services/kiosk-service";
import { useNavigate } from "react-router-dom";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger 
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface SettingsTabProps {
  restaurant: Restaurant;
  onRestaurantUpdated?: (updatedRestaurant: Restaurant) => void;
}

const SettingsTab = ({ restaurant, onRestaurantUpdated }: SettingsTabProps) => {
  const [activeTab, setActiveTab] = useState("basic");
  const [name, setName] = useState(restaurant.name);
  const [location, setLocation] = useState(restaurant.location || "");
  const [image, setImage] = useState(restaurant.image_url || "");
  const [isSaving, setIsSaving] = useState(false);
  const [browserPrintEnabled, setBrowserPrintEnabled] = useState(true);
  const [isSavingPrintSettings, setIsSavingPrintSettings] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [requireTableSelection, setRequireTableSelection] = useState(true);
  
  const { toast } = useToast();
  const navigate = useNavigate();

  const testTotal = 10.00;
  const testSubtotal = calculatePriceWithoutTax(testTotal);
  const testTax = calculateTaxAmount(testTotal);

  useEffect(() => {
    const fetchPrintSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('restaurant_print_config')
          .select('browser_printing_enabled, require_table_selection')
          .eq('restaurant_id', restaurant.id)
          .single();
          
        if (error) {
          console.error("Error fetching print settings:", error);
          return;
        }
        
        if (data) {
          setBrowserPrintEnabled(data.browser_printing_enabled !== false);
          setRequireTableSelection(data.require_table_selection !== false);
        }
      } catch (error) {
        console.error("Error in fetchPrintSettings:", error);
      }
    };
    
    fetchPrintSettings();
  }, [restaurant.id]);

  useEffect(() => {
    setName(restaurant.name);
    setLocation(restaurant.location || "");
    setImage(restaurant.image_url || "");
  }, [restaurant]);

  const handleSaveRestaurantInfo = async () => {
    if (!name.trim()) {
      toast({
        title: "Error",
        description: "Restaurant name is required",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    
    try {
      const updatedRestaurant = await updateRestaurant(restaurant.id, {
        name,
        location,
        image_url: image,
      });
      
      toast({
        title: "Success",
        description: "Restaurant information updated successfully",
      });

      if (onRestaurantUpdated && updatedRestaurant) {
        onRestaurantUpdated(updatedRestaurant);
      }
    } catch (error) {
      console.error("Error updating restaurant:", error);
      toast({
        title: "Error",
        description: "Failed to update restaurant information",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRestaurant = async () => {
    setIsDeleting(true);
    
    try {
      await deleteRestaurant(restaurant.id);
      
      toast({
        title: "Success",
        description: "Restaurant deleted successfully",
      });
      
      navigate("/restaurants");
    } catch (error) {
      console.error("Error deleting restaurant:", error);
      toast({
        title: "Error",
        description: "Failed to delete restaurant",
        variant: "destructive"
      });
      setIsDeleting(false);
    }
  };

  const handleSavePrintSettings = async () => {
    setIsSavingPrintSettings(true);
    
    try {
      const { data: existingConfig, error: checkError } = await supabase
        .from('restaurant_print_config')
        .select('id')
        .eq('restaurant_id', restaurant.id)
        .single();
      
      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }
      
      let result;
      
      if (existingConfig) {
        result = await supabase
          .from('restaurant_print_config')
          .update({ 
            browser_printing_enabled: browserPrintEnabled,
            require_table_selection: requireTableSelection,
          })
          .eq('restaurant_id', restaurant.id);
      } else {
        result = await supabase
          .from('restaurant_print_config')
          .insert({ 
            restaurant_id: restaurant.id,
            browser_printing_enabled: browserPrintEnabled,
            require_table_selection: requireTableSelection,
          });
      }
      
      if (result.error) {
        throw result.error;
      }
      
      toast({
        title: "Paramètres sauvegardés",
        description: "Les paramètres d'impression ont été mis à jour"
      });
    } catch (error) {
      console.error("Error saving print settings:", error);
      toast({
        title: "Erreur",
        description: "Erreur lors de la sauvegarde des paramètres d'impression",
        variant: "destructive"
      });
    } finally {
      setIsSavingPrintSettings(false);
    }
  };

  const handleTestPrint = () => {
    if (browserPrintEnabled) {
      const testReceipt = document.getElementById("receipt-content");
      if (testReceipt) {
        console.log("Testing browser printing");
        testReceipt.style.display = "block";
        
        try {
          printReceipt("receipt-content");
          
          toast({
            title: "Test d'Impression",
            description: "Impression du reçu de test via le navigateur"
          });
        } catch (error) {
          console.error("Error in test print:", error);
          toast({
            title: "Erreur d'Impression",
            description: "Impossible d'imprimer le reçu de test",
            variant: "destructive"
          });
        }
        
        setTimeout(() => {
          testReceipt.style.display = "none";
        }, 500);
      } else {
        console.error("Test receipt element not found");
        toast({
          title: "Erreur",
          description: "Élément de reçu de test introuvable",
          variant: "destructive"
        });
      }
    } else {
      toast({
        title: "Impression Navigateur Désactivée",
        description: "L'impression via le navigateur est actuellement désactivée",
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
          
          <div className="flex flex-col space-y-4">
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
            
            <Alert variant="destructive" className="mt-6">
              <AlertTitle className="text-red-600">Zone de danger</AlertTitle>
              <AlertDescription className="text-red-600">
                Supprimer ce restaurant effacera définitivement toutes les informations associées - menus, suppléments, commandes, etc.
              </AlertDescription>
              
              <div className="mt-4">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" disabled={isDeleting}>
                      {isDeleting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Suppression...
                        </>
                      ) : (
                        <>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Supprimer ce restaurant
                        </>
                      )}
                    </Button>
                  </AlertDialogTrigger>
                  
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Êtes-vous absolument sûr?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Cette action supprimera définitivement le restaurant <strong>{restaurant.name}</strong> et toutes ses données associées. Cette action ne peut pas être annulée.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={handleDeleteRestaurant}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Supprimer définitivement
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </Alert>
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
                <Switch 
                  id="browser-print"
                  checked={browserPrintEnabled}
                  onCheckedChange={setBrowserPrintEnabled}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="require-table-selection">Sélection de table obligatoire pour "Sur place"</Label>
                  <p className="text-sm text-muted-foreground">
                    Si désactivé, la sélection de table ne sera pas proposée à la commande.
                  </p>
                </div>
                <Switch
                  id="require-table-selection"
                  checked={requireTableSelection}
                  onCheckedChange={setRequireTableSelection}
                />
              </div>
              <div className="flex justify-between">
                <Button onClick={handleTestPrint} className="bg-kiosk-primary">
                  <Printer className="mr-2 h-4 w-4" />
                  Tester l'Impression Navigateur
                </Button>
                <Button 
                  onClick={handleSavePrintSettings} 
                  className="bg-green-600 hover:bg-green-700"
                  disabled={isSavingPrintSettings}
                >
                  {isSavingPrintSettings ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="mr-2 h-4 w-4" />
                  )}
                  Enregistrer les paramètres
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
                <span>{testSubtotal.toFixed(2)} €</span>
              </div>
              <div className="total-line">
                <span>TVA (10%)</span>
                <span>{testTax.toFixed(2)} €</span>
              </div>
              <div className="divider"></div>
              <div className="total-line grand-total">
                <span>TOTAL</span>
                <span>{testTotal.toFixed(2)} €</span>
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
