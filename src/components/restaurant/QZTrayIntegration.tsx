
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, Printer, RefreshCw, Settings, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getQZPrinters, testQZPrinter, isQZTrayAvailable } from "@/utils/qz-tray-utils";

interface QZTrayIntegrationProps {
  restaurantId: string;
}

interface PrinterConfig {
  id: string;
  name: string;
  type: 'qz-tray' | 'printnode';
  isActive: boolean;
}

const QZTrayIntegration: React.FC<QZTrayIntegrationProps> = ({ restaurantId }) => {
  const [isQZAvailable, setIsQZAvailable] = useState(false);
  const [availablePrinters, setAvailablePrinters] = useState<any[]>([]);
  const [configuredPrinters, setConfiguredPrinters] = useState<PrinterConfig[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState<string | null>(null);
  const { toast } = useToast();

  // Load configuration
  useEffect(() => {
    checkQZAvailability();
    loadPrintConfig();
  }, [restaurantId]);

  const checkQZAvailability = () => {
    const available = isQZTrayAvailable();
    setIsQZAvailable(available);
    
    if (!available) {
      toast({
        title: "QZ Tray non détecté",
        description: "Assurez-vous que QZ Tray est installé et en cours d'exécution.",
        variant: "destructive"
      });
    }
  };

  const loadPrintConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('restaurant_print_config')
        .select('configured_printers')
        .eq('restaurant_id', restaurantId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading print config:', error);
        return;
      }

      if (data?.configured_printers) {
        const qzPrinters = data.configured_printers.filter((p: any) => p.type === 'qz-tray');
        setConfiguredPrinters(qzPrinters || []);
      }
    } catch (error) {
      console.error('Error loading print config:', error);
    }
  };

  const discoverPrinters = async () => {
    if (!isQZAvailable) {
      toast({
        title: "QZ Tray non disponible",
        description: "Veuillez installer et démarrer QZ Tray.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const printers = await getQZPrinters();
      setAvailablePrinters(printers);
      
      toast({
        title: "Imprimantes découvertes",
        description: `${printers.length} imprimante(s) trouvée(s).`
      });
    } catch (error) {
      console.error('Error discovering printers:', error);
      toast({
        title: "Erreur de découverte",
        description: "Impossible de découvrir les imprimantes.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testPrinter = async (printerName: string) => {
    setIsTesting(printerName);
    try {
      const success = await testQZPrinter(printerName);
      
      toast({
        title: success ? "Test réussi" : "Test échoué",
        description: success 
          ? `L'imprimante ${printerName} fonctionne correctement.`
          : `Impossible d'imprimer sur ${printerName}.`,
        variant: success ? "default" : "destructive"
      });
    } catch (error) {
      console.error('Printer test error:', error);
      toast({
        title: "Test échoué",
        description: "Erreur lors du test de l'imprimante.",
        variant: "destructive"
      });
    } finally {
      setIsTesting(null);
    }
  };

  const addPrinter = async (printerName: string) => {
    try {
      const newPrinter: PrinterConfig = {
        id: `qz-${Date.now()}`,
        name: printerName,
        type: 'qz-tray',
        isActive: true
      };

      const updatedPrinters = [...configuredPrinters, newPrinter];

      // Update database
      const { error } = await supabase
        .from('restaurant_print_config')
        .upsert({
          restaurant_id: restaurantId,
          configured_printers: updatedPrinters
        });

      if (error) throw error;

      setConfiguredPrinters(updatedPrinters);
      
      toast({
        title: "Imprimante ajoutée",
        description: `${printerName} a été ajoutée à la configuration.`
      });
    } catch (error) {
      console.error('Error adding printer:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter l'imprimante.",
        variant: "destructive"
      });
    }
  };

  const removePrinter = async (printerId: string) => {
    try {
      const updatedPrinters = configuredPrinters.filter(p => p.id !== printerId);

      const { error } = await supabase
        .from('restaurant_print_config')
        .upsert({
          restaurant_id: restaurantId,
          configured_printers: updatedPrinters
        });

      if (error) throw error;

      setConfiguredPrinters(updatedPrinters);
      
      toast({
        title: "Imprimante supprimée",
        description: "L'imprimante a été supprimée de la configuration."
      });
    } catch (error) {
      console.error('Error removing printer:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer l'imprimante.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* QZ Tray Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            QZ Tray Integration
          </CardTitle>
          <CardDescription>
            Connectez des imprimantes thermiques directement via QZ Tray
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isQZAvailable ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-500" />
              )}
              <span>
                {isQZAvailable ? "QZ Tray détecté" : "QZ Tray non détecté"}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={checkQZAvailability}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Vérifier
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Printer Discovery */}
      {isQZAvailable && (
        <Card>
          <CardHeader>
            <CardTitle>Découverte d'imprimantes</CardTitle>
            <CardDescription>
              Recherchez les imprimantes connectées à QZ Tray
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={discoverPrinters}
              disabled={isLoading}
              className="w-full"
            >
              <Printer className="h-4 w-4 mr-2" />
              {isLoading ? "Recherche..." : "Découvrir les imprimantes"}
            </Button>

            {availablePrinters.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium">Imprimantes disponibles :</h4>
                {availablePrinters.map((printer, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{printer.name}</p>
                      <p className="text-sm text-gray-500">{printer.connection}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => testPrinter(printer.name)}
                        disabled={isTesting === printer.name}
                      >
                        {isTesting === printer.name ? "Test..." : "Tester"}
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => addPrinter(printer.name)}
                        disabled={configuredPrinters.some(p => p.name === printer.name)}
                      >
                        {configuredPrinters.some(p => p.name === printer.name) ? "Ajoutée" : "Ajouter"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Configured Printers */}
      {configuredPrinters.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Imprimantes configurées</CardTitle>
            <CardDescription>
              Gérez vos imprimantes QZ Tray configurées
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {configuredPrinters.map((printer) => (
                <div
                  key={printer.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Printer className="h-4 w-4" />
                    <div>
                      <p className="font-medium">{printer.name}</p>
                      <Badge variant={printer.isActive ? "default" : "secondary"}>
                        {printer.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => testPrinter(printer.name)}
                      disabled={isTesting === printer.name}
                    >
                      {isTesting === printer.name ? "Test..." : "Tester"}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => removePrinter(printer.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default QZTrayIntegration;
