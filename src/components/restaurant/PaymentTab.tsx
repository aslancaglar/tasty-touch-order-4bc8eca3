
import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Loader2, Check, CreditCard, AlertTriangle, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Restaurant, RestaurantPaymentConfig } from "@/types/database-types";
import { supabase } from "@/integrations/supabase/client";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/contexts/AuthContext";

interface PaymentTabProps {
  restaurant: Restaurant;
}

const PaymentTab = ({ restaurant }: PaymentTabProps) => {
  const [stripeEnabled, setStripeEnabled] = useState(false);
  const [stripeApiKey, setStripeApiKey] = useState("");
  const [stripeTerminalEnabled, setStripeTerminalEnabled] = useState(false);
  const [stripeLocationId, setStripeLocationId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [testConnectionStatus, setTestConnectionStatus] = useState<"idle" | "success" | "error">("idle");
  const { toast } = useToast();
  const { user, session } = useAuth();
  const [hasConfiguredApiKey, setHasConfiguredApiKey] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPaymentConfig = async () => {
      try {
        const { data, error } = await supabase
          .from("restaurant_payment_config")
          .select("*")
          .eq("restaurant_id", restaurant.id)
          .single();

        if (error && error.code !== "PGRST116") {
          throw error;
        }

        if (data) {
          setStripeEnabled(data.stripe_enabled || false);
          // We don't set the API key here for security reasons
          // The API key is stored encrypted in the database and only used server-side
          setStripeTerminalEnabled(data.stripe_terminal_enabled || false);
          setStripeLocationId(data.stripe_terminal_location_id || "");
          // Check if stripe_api_key exists but don't show its value
          setHasConfiguredApiKey(!!data.stripe_api_key);
        }
      } catch (error) {
        console.error("Error fetching payment config:", error);
        toast({
          title: "Error",
          description: "Failed to load payment configuration",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchPaymentConfig();
  }, [restaurant.id, toast]);

  const handleSaveConfig = async () => {
    setSaving(true);
    setSaveError(null);
    
    try {
      // Validate inputs if Stripe is enabled
      if (stripeEnabled && (!stripeApiKey && !hasConfiguredApiKey)) {
        throw new Error("Stripe API key is required");
      }
      
      // Basic validation for Stripe API key format
      if (stripeApiKey && !stripeApiKey.startsWith('sk_')) {
        throw new Error("Invalid Stripe API key format. The key should start with 'sk_'");
      }
      
      // Delete any existing records first to avoid ON CONFLICT issues
      if (stripeApiKey || hasConfiguredApiKey) {
        const { error: deleteError } = await supabase
          .from("restaurant_payment_config")
          .delete()
          .eq("restaurant_id", restaurant.id);
        
        if (deleteError) {
          console.error("Error deleting existing config:", deleteError);
          throw new Error("Failed to update configuration. Please try again.");
        }
        
        // Now insert the new record
        const { data, error } = await supabase
          .from("restaurant_payment_config")
          .insert({
            restaurant_id: restaurant.id,
            stripe_enabled: stripeEnabled,
            stripe_api_key: stripeApiKey || undefined,
            stripe_terminal_enabled: stripeTerminalEnabled,
            stripe_terminal_location_id: stripeLocationId || null,
          })
          .select();
        
        if (error) {
          console.error("Insert error:", error);
          throw new Error(`Database error: ${error.message}. Please try again.`);
        }
        
        // Update the state to show that API key is configured
        if (stripeApiKey) {
          setHasConfiguredApiKey(true);
        }

        toast({
          title: "Settings saved",
          description: "Payment configuration has been updated",
        });

        // Clear the API key input after successful save for security
        setStripeApiKey("");
      } else {
        // If no API key provided or configured, use the RPC function
        const { data, error } = await supabase.rpc("update_restaurant_payment_config", {
          p_restaurant_id: restaurant.id,
          p_stripe_enabled: stripeEnabled,
          p_stripe_api_key: null,
          p_stripe_terminal_enabled: stripeTerminalEnabled,
          p_stripe_terminal_location_id: stripeLocationId || null,
        });
        
        if (error) {
          console.error("RPC error:", error);
          throw new Error(`Database error: ${error.message}. Please try again.`);
        }
        
        toast({
          title: "Settings saved",
          description: "Payment configuration has been updated",
        });
      }
    } catch (error) {
      console.error("Error saving payment config:", error);
      setSaveError(error.message);
      toast({
        title: "Error",
        description: error.message || "Failed to save payment configuration",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!session?.access_token) {
      toast({
        title: "Authentication error",
        description: "You must be logged in to test the connection",
        variant: "destructive",
      });
      return;
    }
    
    // Check if API key is configured
    if (!stripeEnabled || (!hasConfiguredApiKey && !stripeApiKey)) {
      toast({
        title: "Configuration required",
        description: "Please enter your Stripe API key and save settings first",
        variant: "destructive",
      });
      return;
    }
    
    // If we have a new API key entered but not saved yet
    if (stripeApiKey) {
      toast({
        title: "Save required",
        description: "Please save your settings before testing the connection",
        variant: "destructive",
      });
      return;
    }

    setTestingConnection(true);
    setTestConnectionStatus("idle");
    
    try {
      // Using import.meta.env instead of process.env
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://yifimiqeybttmbhuplaq.supabase.co";
      const response = await fetch(`${supabaseUrl}/functions/v1/stripe-terminal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          action: 'create_connection_token',
          restaurantId: restaurant.id,
        }),
      });
      
      const result = await response.json();

      if (!response.ok || result.error) {
        console.error("Connection test error:", response.status, result);
        throw new Error(result.error || `API error: ${response.status} ${response.statusText}`);
      }
      
      setTestConnectionStatus("success");
      toast({
        title: "Connection successful",
        description: "Successfully connected to Stripe Terminal API",
      });
    } catch (error) {
      console.error("Error testing Stripe connection:", error);
      setTestConnectionStatus("error");
      toast({
        title: "Connection failed",
        description: error.message || "Failed to connect to Stripe Terminal",
        variant: "destructive",
      });
    } finally {
      setTestingConnection(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Stripe Payment Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="stripe-enabled" className="text-base">Enable Stripe Payments</Label>
              <p className="text-sm text-muted-foreground">
                Allow customers to pay with credit cards via Stripe
              </p>
            </div>
            <Switch
              id="stripe-enabled"
              checked={stripeEnabled}
              onCheckedChange={setStripeEnabled}
            />
          </div>

          {stripeEnabled && (
            <>
              <Separator />
              
              <div className="space-y-2">
                <Label htmlFor="stripe-api-key">Stripe API Key (Secret Key)</Label>
                {hasConfiguredApiKey && (
                  <Alert className="mb-2">
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      API key is already configured. Leave blank unless you want to change it.
                    </AlertDescription>
                  </Alert>
                )}
                <Input
                  id="stripe-api-key"
                  type="password"
                  value={stripeApiKey}
                  onChange={(e) => setStripeApiKey(e.target.value)}
                  placeholder={hasConfiguredApiKey ? "••••••••" : "sk_test_..."}
                />
                <p className="text-xs text-muted-foreground">
                  Your Stripe secret key is stored securely and used only for server-side operations.
                  It should start with "sk_".
                </p>
              </div>

              <div className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="stripe-terminal-enabled" className="text-base">
                      Enable Stripe Terminal (In-Person Payments)
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Accept in-person card payments using Stripe Terminal
                    </p>
                  </div>
                  <Switch
                    id="stripe-terminal-enabled"
                    checked={stripeTerminalEnabled}
                    onCheckedChange={setStripeTerminalEnabled}
                    disabled={!stripeEnabled}
                  />
                </div>
              </div>

              {stripeTerminalEnabled && (
                <div className="space-y-2 pt-2">
                  <Label htmlFor="stripe-location-id">Stripe Terminal Location ID (Optional)</Label>
                  <Input
                    id="stripe-location-id"
                    value={stripeLocationId}
                    onChange={(e) => setStripeLocationId(e.target.value)}
                    placeholder="tml_..."
                  />
                  <p className="text-xs text-muted-foreground">
                    If you have multiple locations, enter your Stripe Terminal location ID here.
                  </p>
                </div>
              )}
              
              <Alert variant="destructive" className="mt-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <p className="mb-2">To use Stripe Terminal, you need to:</p>
                  <ol className="list-decimal pl-4">
                    <li>Save your Stripe API key in the settings</li>
                    <li>Make sure your Supabase Edge Function is deployed</li>
                  </ol>
                </AlertDescription>
              </Alert>
              
              {saveError && (
                <Alert variant="destructive" className="mt-2">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{saveError}</AlertDescription>
                </Alert>
              )}
              
              <div className="flex justify-between pt-4">
                <Button
                  variant="outline"
                  onClick={handleTestConnection}
                  disabled={testingConnection || !stripeEnabled || (!hasConfiguredApiKey && !stripeApiKey) || !!stripeApiKey}
                >
                  {testingConnection ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : testConnectionStatus === "success" ? (
                    <Check className="mr-2 h-4 w-4 text-green-500" />
                  ) : (
                    <CreditCard className="mr-2 h-4 w-4" />
                  )}
                  Test Connection
                </Button>
                
                <Button
                  onClick={handleSaveConfig}
                  disabled={saving || (!stripeEnabled)}
                >
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Settings"
                  )}
                </Button>
              </div>

              {testConnectionStatus === "error" && (
                <Alert variant="destructive" className="mt-4">
                  <AlertDescription>
                    Failed to connect to Stripe API. Please check your API key and ensure the Edge Function is deployed.
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}
        </CardContent>
      </Card>
      
      <div className="text-sm text-muted-foreground">
        <p>
          Stripe Terminal requires a Stripe account and compatible hardware.{" "}
          <a 
            href="https://stripe.com/terminal" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-primary underline"
          >
            Learn more about Stripe Terminal
          </a>
        </p>
      </div>
    </div>
  );
};

export default PaymentTab;
