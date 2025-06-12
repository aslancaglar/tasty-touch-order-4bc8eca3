
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Printer, Monitor, CheckCircle, XCircle, TestTube } from "lucide-react";
import { printHealthCheck, printReceipt } from "@/utils/print-utils";

interface BrowserPrintingSettingsProps {
  restaurantId: string;
}

export const BrowserPrintingSettings: React.FC<BrowserPrintingSettingsProps> = ({ restaurantId }) => {
  const { toast } = useToast();
  const [isEnabled, setIsEnabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const [testingPrint, setTestingPrint] = useState(false);
  const [printStatus, setPrintStatus] = useState<{ status: string; details: any } | null>(null);

  useEffect(() => {
    loadPrintingSettings();
    checkPrintStatus();
  }, [restaurantId]);

  const loadPrintingSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('restaurant_print_config')
        .select('browser_printing_enabled')
        .eq('restaurant_id', restaurantId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setIsEnabled(data.browser_printing_enabled ?? true);
      }
    } catch (error) {
      console.error('Error loading printing settings:', error);
      toast({
        title: "Error",
        description: "Failed to load browser printing settings",
        variant: "destructive"
      });
    }
  };

  const checkPrintStatus = () => {
    const status = printHealthCheck();
    setPrintStatus(status);
  };

  const updatePrintingSetting = async (enabled: boolean) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('restaurant_print_config')
        .upsert({
          restaurant_id: restaurantId,
          browser_printing_enabled: enabled,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'restaurant_id'
        });

      if (error) throw error;

      setIsEnabled(enabled);
      toast({
        title: "Settings Updated",
        description: `Browser printing ${enabled ? 'enabled' : 'disabled'}`,
      });
    } catch (error) {
      console.error('Error updating printing setting:', error);
      toast({
        title: "Error",
        description: "Failed to update browser printing settings",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const testPrint = async () => {
    if (!isEnabled) {
      toast({
        title: "Printing Disabled",
        description: "Enable browser printing first to test",
        variant: "destructive"
      });
      return;
    }

    setTestingPrint(true);
    try {
      // Create a test receipt element
      const testReceiptId = 'test-receipt-' + Date.now();
      const testElement = document.createElement('div');
      testElement.id = testReceiptId;
      testElement.innerHTML = `
        <div class="receipt">
          <div class="header">
            <div class="logo">PRINT TEST</div>
            <p>Browser Printing Test</p>
            <p>${new Date().toLocaleString()}</p>
          </div>
          <div class="divider"></div>
          <div class="item">
            <span>Test Item</span>
            <span>€5.00</span>
          </div>
          <div class="divider"></div>
          <div class="total-section">
            <div class="total-line grand-total">
              <span>TOTAL</span>
              <span>€5.00</span>
            </div>
          </div>
          <div class="footer">
            <p>This is a test print</p>
            <p>Thank you!</p>
          </div>
        </div>
      `;
      testElement.style.display = 'none';
      document.body.appendChild(testElement);

      await printReceipt(testReceiptId);

      // Clean up
      setTimeout(() => {
        if (testElement.parentNode) {
          document.body.removeChild(testElement);
        }
      }, 2000);

      toast({
        title: "Print Test Initiated",
        description: "Check if the test receipt printed successfully",
      });
    } catch (error) {
      console.error('Print test failed:', error);
      toast({
        title: "Print Test Failed",
        description: error.message || "Unable to test printing",
        variant: "destructive"
      });
    } finally {
      setTestingPrint(false);
    }
  };

  const getStatusBadge = () => {
    if (!printStatus) return null;

    const { status } = printStatus;
    const variants = {
      healthy: { variant: 'default' as const, icon: CheckCircle, text: 'Ready' },
      offline: { variant: 'destructive' as const, icon: XCircle, text: 'Offline' },
      unsupported: { variant: 'destructive' as const, icon: XCircle, text: 'Unsupported' },
      'mobile-limited': { variant: 'secondary' as const, icon: XCircle, text: 'Mobile Limited' }
    };

    const config = variants[status] || variants.healthy;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.text}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Monitor className="h-5 w-5" />
          Browser Printing
          {getStatusBadge()}
        </CardTitle>
        <CardDescription>
          Configure direct browser printing for receipts without external services
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="font-medium">Enable Browser Printing</p>
            <p className="text-sm text-muted-foreground">
              Allow printing receipts directly from the browser
            </p>
          </div>
          <Switch
            checked={isEnabled}
            onCheckedChange={updatePrintingSetting}
            disabled={loading}
          />
        </div>

        {isEnabled && (
          <div className="space-y-3 p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              <Printer className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">Browser printing is enabled</span>
            </div>
            
            <div className="text-xs text-muted-foreground space-y-1">
              <p>• Receipts will print using the browser's print dialog</p>
              <p>• Works with any printer connected to this device</p>
              <p>• Best for desktop environments</p>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={testPrint}
              disabled={testingPrint}
              className="w-full"
            >
              {testingPrint ? (
                <>
                  <TestTube className="h-4 w-4 mr-2 animate-pulse" />
                  Testing Print...
                </>
              ) : (
                <>
                  <TestTube className="h-4 w-4 mr-2" />
                  Test Print
                </>
              )}
            </Button>
          </div>
        )}

        {!isEnabled && (
          <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <div className="flex items-center gap-2 text-yellow-800">
              <XCircle className="h-4 w-4" />
              <span className="text-sm font-medium">Browser printing is disabled</span>
            </div>
            <p className="text-xs text-yellow-700 mt-1">
              Receipts will not print using the browser. Enable this or configure PrintNode for printing.
            </p>
          </div>
        )}

        {printStatus && (
          <div className="text-xs text-muted-foreground p-3 bg-gray-50 rounded">
            <p><strong>Print Status:</strong> {printStatus.status}</p>
            <p><strong>Online:</strong> {printStatus.details.online ? 'Yes' : 'No'}</p>
            <p><strong>Mobile Device:</strong> {printStatus.details.isMobile ? 'Yes' : 'No'}</p>
            <p><strong>Print Supported:</strong> {printStatus.details.printSupported ? 'Yes' : 'No'}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BrowserPrintingSettings;
