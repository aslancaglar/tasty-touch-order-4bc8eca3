
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import PrintNodeIntegration from "./PrintNodeIntegration";
import QZTrayIntegration from "./QZTrayIntegration";
import QZTrayDiagnostics from "./QZTrayDiagnostics";

interface SettingsTabProps {
  restaurant: {
    id: string;
    name: string;
    location?: string;
    ui_language?: string;
    currency?: string;
    card_payment_enabled?: boolean;
    cash_payment_enabled?: boolean;
  };
}

const SettingsTab: React.FC<SettingsTabProps> = ({ restaurant }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isUpdating, setIsUpdating] = useState(false);
  
  const [formData, setFormData] = useState({
    name: restaurant.name || "",
    location: restaurant.location || "",
    ui_language: restaurant.ui_language || "fr",
    currency: restaurant.currency || "EUR",
    card_payment_enabled: restaurant.card_payment_enabled || false,
    cash_payment_enabled: restaurant.cash_payment_enabled || false,
  });

  // Fetch print settings
  const { data: printSettings } = useQuery({
    queryKey: ['print-settings', restaurant.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('restaurant_print_config')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      
      return data;
    }
  });

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveSettings = async () => {
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('restaurants')
        .update(formData)
        .eq('id', restaurant.id);

      if (error) throw error;

      // Invalidate and refetch restaurant data
      queryClient.invalidateQueries({ queryKey: ['restaurant'] });
      
      toast({
        title: "Settings Updated",
        description: "Restaurant settings have been updated successfully.",
      });
    } catch (error) {
      console.error('Error updating restaurant settings:', error);
      toast({
        title: "Error",
        description: "Failed to update restaurant settings.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="printing">Printing</TabsTrigger>
          <TabsTrigger value="diagnostics">QZ Diagnostics</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Restaurant Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => handleInputChange('location', e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="language">UI Language</Label>
                  <select
                    id="language"
                    className="w-full p-2 border rounded-md"
                    value={formData.ui_language}
                    onChange={(e) => handleInputChange('ui_language', e.target.value)}
                  >
                    <option value="fr">Français</option>
                    <option value="en">English</option>
                    <option value="tr">Türkçe</option>
                  </select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <select
                    id="currency"
                    className="w-full p-2 border rounded-md"
                    value={formData.currency}
                    onChange={(e) => handleInputChange('currency', e.target.value)}
                  >
                    <option value="EUR">EUR (€)</option>
                    <option value="USD">USD ($)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="TRY">TRY (₺)</option>
                  </select>
                </div>
              </div>
              
              <Button onClick={handleSaveSettings} disabled={isUpdating}>
                {isUpdating ? "Updating..." : "Save Settings"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payment Methods</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Card Payment</Label>
                  <div className="text-sm text-muted-foreground">
                    Enable card payment processing
                  </div>
                </div>
                <Switch
                  checked={formData.card_payment_enabled}
                  onCheckedChange={(checked) => handleInputChange('card_payment_enabled', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Cash Payment</Label>
                  <div className="text-sm text-muted-foreground">
                    Enable cash payment option
                  </div>
                </div>
                <Switch
                  checked={formData.cash_payment_enabled}
                  onCheckedChange={(checked) => handleInputChange('cash_payment_enabled', checked)}
                />
              </div>
              
              <Button onClick={handleSaveSettings} disabled={isUpdating}>
                {isUpdating ? "Updating..." : "Save Payment Settings"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="printing" className="space-y-4">
          <PrintNodeIntegration restaurantId={restaurant.id} />
          <QZTrayIntegration restaurantId={restaurant.id} />
        </TabsContent>

        <TabsContent value="diagnostics" className="space-y-4">
          <QZTrayDiagnostics restaurantId={restaurant.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SettingsTab;
