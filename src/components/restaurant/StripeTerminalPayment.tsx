
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Check, Terminal } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface StripeTerminalPaymentProps {
  isOpen: boolean;
  onClose: () => void;
  onPaymentComplete: () => void;
  amount: number;
  restaurantId: string;
  orderNumber: string;
  currency?: string;
}

const StripeTerminalPayment: React.FC<StripeTerminalPaymentProps> = ({
  isOpen,
  onClose,
  onPaymentComplete,
  amount,
  restaurantId,
  orderNumber,
  currency = "EUR"
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      // Reset state when dialog opens
      setPaymentStatus('idle');
      setErrorMessage(null);
    }
  }, [isOpen]);

  const processPayment = async () => {
    setIsProcessing(true);
    setPaymentStatus('processing');
    
    try {
      // Fetch the Stripe API key for this restaurant
      const { data: paymentConfig, error: configError } = await supabase
        .from('restaurant_payment_config')
        .select('stripe_api_key')
        .eq('restaurant_id', restaurantId)
        .single();

      if (configError || !paymentConfig?.stripe_api_key) {
        throw new Error('Configuration de paiement non trouvée pour ce restaurant');
      }

      // IMPORTANT: This is a simulation of payment processing
      // In a real implementation, you would need:
      // 1. A physical Stripe Terminal device
      // 2. Connection to the Terminal SDK
      // 3. Processing through the Stripe API
      
      // Simulate payment processing time
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // For demonstration, we'll simulate success
      setPaymentStatus('success');
      
      // Wait 1 second before triggering success callback
      setTimeout(() => {
        onPaymentComplete();
      }, 1000);
      
    } catch (error) {
      console.error("Payment processing error:", error);
      setPaymentStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Une erreur est survenue lors du traitement du paiement');
      
      toast({
        title: "Erreur de paiement",
        description: error instanceof Error ? error.message : 'Erreur de traitement',
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRetry = () => {
    setPaymentStatus('idle');
    setErrorMessage(null);
  };

  const formattedAmount = new Intl.NumberFormat('fr-FR', { 
    style: 'currency', 
    currency: currency.toUpperCase() 
  }).format(amount);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md md:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center">
            <Terminal className="w-5 h-5 mr-2" />
            Paiement par Terminal (Simulation)
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[70vh] overflow-auto pr-4">
          <div className="space-y-6 py-4">
            <div className="text-center pb-4 border-b">
              <div className="text-2xl font-bold">{formattedAmount}</div>
              <div className="text-sm text-muted-foreground">Commande #{orderNumber}</div>
            </div>

            {paymentStatus === 'idle' && (
              <div className="flex flex-col items-center space-y-4">
                <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-md text-yellow-800 text-sm mb-2">
                  <p className="font-medium">Mode démonstration</p>
                  <p>Ceci est une simulation. Dans un environnement réel, vous auriez besoin d'un terminal physique Stripe connecté.</p>
                </div>
                <p>Prêt à traiter le paiement par carte via le terminal.</p>
                <Button
                  onClick={processPayment}
                  className="bg-green-600 hover:bg-green-700 w-full py-6 text-lg"
                >
                  <Terminal className="mr-2 h-5 w-5" />
                  Démarrer le paiement par terminal
                </Button>
              </div>
            )}

            {paymentStatus === 'processing' && (
              <div className="flex flex-col items-center space-y-4">
                <Loader2 className="h-16 w-16 animate-spin text-green-600" />
                <p className="text-lg font-medium">Traitement du paiement en cours...</p>
                <p className="text-sm text-muted-foreground">
                  Suivez les instructions sur le terminal de paiement.
                </p>
              </div>
            )}

            {paymentStatus === 'success' && (
              <div className="flex flex-col items-center space-y-4">
                <div className="h-16 w-16 bg-green-600 rounded-full flex items-center justify-center">
                  <Check className="h-10 w-10 text-white" />
                </div>
                <p className="text-lg font-medium">Paiement réussi!</p>
              </div>
            )}

            {paymentStatus === 'error' && (
              <div className="flex flex-col items-center space-y-4">
                <div className="h-16 w-16 bg-red-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                  !
                </div>
                <p className="text-lg font-medium">Échec du paiement</p>
                <p className="text-sm text-red-600">{errorMessage}</p>
                <Button onClick={handleRetry} variant="outline">
                  Réessayer
                </Button>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default StripeTerminalPayment;
