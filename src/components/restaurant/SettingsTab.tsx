import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Printer, Check, XCircle, Trash2, Copy } from "lucide-react";
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
import currencyCodes from "currency-codes";
import { duplicateRestaurant } from "@/services/kiosk-service";
import { clearMenuCache } from "@/services/cache-service";

interface SettingsTabProps {
  restaurant: Restaurant;
  onRestaurantUpdated?: (updatedRestaurant: Restaurant) => void;
}

// Fix: properly access currency codes and add error handling
const currencyOptions = (() => {
  try {
    // Get all currency codes and ensure data exists
    const codes = currencyCodes.codes();
    if (!codes || !Array.isArray(codes)) {
      console.error("Currency codes not available or in unexpected format");
      return [{ value: "EUR", label: "EUR (Euro)", symbol: "EUR" }];
    }
    
    return codes
      .map(code => {
        try {
          const currencyInfo = currencyCodes.code(code);
          if (!currencyInfo) return null;
          
          const currencyCode = code || "";
          const currencyName = currencyInfo.currency || "";
          
          return {
            value: currencyCode,
            label: `${currencyCode} (${currencyName})`,
            symbol: currencyCode
          };
        } catch (err) {
          console.error(`Error processing currency code ${code}:`, err);
          return null;
        }
      })
      .filter(item => item !== null)
      .sort((a, b) => {
        const prefer = ["EUR", "USD", "TRY", "GBP"];
        const aPref = prefer.indexOf(a.value);
        const bPref = prefer.indexOf(b.value);
        if (aPref !== -1 && bPref !== -1) return aPref - bPref;
        if (aPref !== -1) return -1;
        if (bPref !== -1) return 1;
        return a.label.localeCompare(b.label);
      });
  } catch (err) {
    console.error("Failed to load currency codes:", err);
    return [{ value: "EUR", label: "EUR (Euro)", symbol: "EUR" }];
  }
})();

const SettingsTab = ({ restaurant, onRestaurantUpdated }: SettingsTabProps) => {
  const [activeTab, setActiveTab] = useState("basic");
  const [name, setName] = useState(restaurant.name);
  const [location, setLocation] = useState(restaurant.location || "");
  const [image, setImage] = useState(restaurant.image_url || "");
  const [logo, setLogo] = useState(restaurant.logo_url || "");
  const [slug, setSlug] = useState(restaurant.slug || "");
  const [isSaving, setIsSaving] = useState(false);
  const [browserPrintEnabled, setBrowserPrintEnabled] = useState(true);
  const [isSavingPrintSettings, setIsSavingPrintSettings] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [uiLanguage, setUiLanguage] = useState(restaurant.ui_language || "fr");
  const [isSavingLanguage, setIsSavingLanguage] = useState(false);
  const [currency, setCurrency] = useState(restaurant.currency || "EUR");
  const [isSavingCurrency, setIsSavingCurrency] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const testTotal = 10.00;
  const testSubtotal = calculatePriceWithoutTax(testTotal);
  const testTax = calculateTaxAmount(testTotal);

  useEffect(() => {
    setName(restaurant.name);
    setLocation(restaurant.location || "");
    setImage(restaurant.image_url || "");
    setLogo(restaurant.logo_url || "");
    setSlug(restaurant.slug || "");
    setUiLanguage(restaurant.ui_language || "fr");
    setCurrency(restaurant.currency || "EUR");
  }, [restaurant]);

  useEffect(() => {
    const fetchPrintSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('restaurant_print_config')
          .select('browser_printing_enabled')
          .eq('restaurant_id', restaurant.id)
          .single();
          
        if (error) {
          console.error("Error fetching print settings:", error);
          return;
        }
        
        if (data) {
          setBrowserPrintEnabled(data.browser_printing_enabled !== false);
          console.log("Browser printing enabled:", data.browser_printing_enabled !== false);
        }
      } catch (error) {
        console.error("Error in fetchPrintSettings:", error);
      }
    };
    
    fetchPrintSettings();
  }, [restaurant.id]);

  const handleSaveRestaurantInfo = async () => {
    if (!name.trim()) {
      toast({
        title: "Error",
        description: "Restaurant name is required",
        variant: "destructive"
      });
      return;
    }

    if (!slug.trim()) {
      toast({
        title: "Error",
        description: "Restaurant slug is required",
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
        logo_url: logo,
        ui_language: uiLanguage,
        currency,
        slug: slug.toLowerCase().trim(),
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

  const handleSaveCurrency = async () => {
    setIsSavingCurrency(true);
    
    try {
      const { data, error } = await supabase
        .from("restaurants")
        .update({ currency })
        .eq("id", restaurant.id)
        .select();
      
      if (error) throw error;
      
      toast({
        title: "Devise enregistrée",
        description: "La devise du restaurant a été mise à jour.",
      });

      if (onRestaurantUpdated && data && data.length > 0) {
        const updatedRestaurant = {
          ...restaurant,
          currency,
        };
        onRestaurantUpdated(updatedRestaurant);
      }
    } catch (error) {
      console.error("Error updating currency:", error);
      toast({
        title: "Erreur",
        description: "Impossible de changer la devise.",
        variant: "destructive"
      });
    } finally {
      setIsSavingCurrency(false);
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
    console.log("Saving print settings for restaurant:", restaurant.id);
    console.log("Browser print enabled:", browserPrintEnabled);
    
    try {
      const { data: existingConfig, error: checkError } = await supabase
        .from('restaurant_print_config')
        .select('id')
        .eq('restaurant_id', restaurant.id)
        .single();
      
      if (checkError && checkError.code !== 'PGRST116') {
        console.error("Error checking existing print config:", checkError);
        throw checkError;
      }
      
      let result;
      
      if (existingConfig) {
        console.log("Updating existing print config:", existingConfig.id);
        result = await supabase
          .from('restaurant_print_config')
          .update({ browser_printing_enabled: browserPrintEnabled })
          .eq('restaurant_id', restaurant.id);
          
        console.log("Update response:", result);
      } else {
        console.log("Creating new print config for restaurant:", restaurant.id);
        result = await supabase
          .from('restaurant_print_config')
          .insert({ 
            restaurant_id: restaurant.id,
            browser_printing_enabled: browserPrintEnabled 
          });
          
        console.log("Insert response:", result);
      }
      
      if (result.error) {
        console.error("Error saving print settings:", result.error);
        throw result.error;
      }
      
      toast({
        title: "Paramètres sauvegardés",
        description: "Les paramètres d'impression ont été mis à jour"
      });
      
      // Clear any cached data that might depend on print settings
      if (restaurant.id) {
        clearMenuCache(restaurant.id);
      }
      
    } catch (error) {
      console.error("Error saving print settings:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      toast({
        title: "Erreur",
        description: `Erreur lors de la sauvegarde des paramètres d'impression: ${errorMessage}`,
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

  const handleSaveLanguage = async () => {
    setIsSavingLanguage(true);
    try {
      console.log("Saving UI language:", uiLanguage);
      
      const updatedData = {
        ui_language: uiLanguage
      };
      
      const { data, error } = await supabase
        .from("restaurants")
        .update(updatedData)
        .eq("id", restaurant.id)
        .select();
      
      if (error) {
        throw error;
      }
      
      console.log("Language update response:", data);

      toast({
        title: "Langue enregistrée",
        description: "La langue de l'interface a été mise à jour.",
      });

      if (onRestaurantUpdated && data && data.length > 0) {
        const updatedRestaurant = {
          ...restaurant,
          ui_language: uiLanguage
        };
        onRestaurantUpdated(updatedRestaurant);
        console.log("Updated restaurant with new language:", updatedRestaurant);
      }
    } catch (error) {
      console.error("Error updating language:", error);
      toast({
        title: "Erreur",
        description: "Impossible de changer la langue de l'interface.",
        variant: "destructive",
      });
    } finally {
      setIsSavingLanguage(false);
    }
  };

  const handleDuplicateRestaurant = async () => {
    setIsDuplicating(true);
    try {
      const newRestaurant = await duplicateRestaurant(restaurant.id);
      
      toast({
        title: "Restaurant dupliqué",
        description: "Une copie du restaurant a été créée avec succès.",
      });
      
      navigate(`/restaurant/${newRestaurant.id}`);
    } catch (error) {
      console.error("Error duplicating restaurant:", error);
      toast({
        title: "Erreur",
        description: "Impossible de dupliquer le restaurant",
        variant: "destructive"
      });
      setIsDuplicating(false);
    }
  };

  const selectedCurrencyOption = currencyOptions.find(opt => opt.value === currency);
  const currencySymbol = selectedCurrencyOption?.symbol || currency;

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
              <Label htmlFor="restaurantSlug">URL du Kiosk</Label>
              <Input 
                id="restaurantSlug" 
                value={slug} 
                onChange={(e) => setSlug(e.target.value.toLowerCase().trim())} 
                className="mt-1"
                placeholder="mon-restaurant"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Cette URL sera utilisée pour accéder au kiosk: /r/mon-restaurant
              </p>
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
              <Label>Image d'arrière-plan</Label>
              <div className="mt-1">
                <ImageUpload 
                  value={image} 
                  onChange={(url) => setImage(url)}
                  label="Image d'arrière-plan"
                  uploadFolder="restaurant-covers"
                  clearable={true}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Cette image sera utilisée comme fond d'écran sur la page d'accueil et l'en-tête du menu
                </p>
              </div>
            </div>

            <div className="sm:col-span-2">
              <Label>Logo du Restaurant</Label>
              <div className="mt-1">
                <ImageUpload 
                  value={logo} 
                  onChange={(url) => setLogo(url)} 
                  label="Logo du restaurant"
                  uploadFolder="restaurant-logos"
                  clearable={true}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Ce logo sera utilisé sur l'en-tête du menu et les reçus
                </p>
              </div>
            </div>
            
            <div>
              <Label htmlFor="uiLanguage">Langue de l'interface Kiosk</Label>
              <div className="mt-2">
                <select
                  id="uiLanguage"
                  value={uiLanguage}
                  onChange={e => {
                    console.log("Language selected:", e.target.value);
                    setUiLanguage(e.target.value);
                  }}
                  className="w-full px-3 py-2 border rounded-md bg-white"
                >
                  {languageOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <div className="mt-2">
                  <Button
                    onClick={handleSaveLanguage}
                    disabled={isSavingLanguage}
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {isSavingLanguage ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sauvegarde...
                      </>
                    ) : (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        Enregistrer la langue
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
            
            <div>
              <Label htmlFor="currency">Devise du Restaurant</Label>
              <div className="mt-2">
                <select
                  id="currency"
                  value={currency}
                  onChange={e => setCurrency(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md bg-white"
                >
                  {currencyOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <div className="mt-2">
                  <Button
                    onClick={handleSaveCurrency}
                    disabled={isSavingCurrency}
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {isSavingCurrency ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sauvegarde...
                      </>
                    ) : (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        Enregistrer la devise
                      </>
                    )}
                  </Button>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  La devise sera affichée sur tous les reçus et dans l'interface Kiosk.
                </div>
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
              
              <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:gap-6">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" disabled={isDuplicating} onClick={handleDuplicateRestaurant}>
                      {isDuplicating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Duplication...
                        </>
                      ) : (
                        <>
                          <Copy className="mr-2 h-4 w-4" />
                          Dupliquer ce restaurant
                        </>
                      )}
                    </Button>
                  </AlertDialogTrigger>
                </AlertDialog>

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
                  <span>10.00 {currencySymbol}</span>
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
                <span>{testSubtotal.toFixed(2)} {currencySymbol}</span>
              </div>
              <div className="total-line">
                <span>TVA (10%)</span>
                <span>{testTax.toFixed(2)} {currencySymbol}</span>
              </div>
              <div className="divider"></div>
              <div className="total-line grand-total">
                <span>TOTAL</span>
                <span>{testTotal.toFixed(2)} {currencySymbol}</span>
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
