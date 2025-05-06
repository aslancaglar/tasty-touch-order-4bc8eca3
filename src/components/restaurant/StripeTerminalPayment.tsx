
import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CreditCard, CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface StripeTerminalPaymentProps {
  isOpen: boolean;
  onClose: () => void;
  onPaymentComplete: () => void;
  amount: number;
  currency: string;
  restaurantId: string;
}

enum PaymentStatus {
  INITIALIZING = "initializing",
  CONNECTING = "connecting",
  READY = "ready",
  PROCESSING = "processing",
  SUCCESS = "success",
  ERROR = "error",
}

const StripeTerminalPayment: React.FC<StripeTerminalPaymentProps> = ({
  isOpen,
  onClose,
  onPaymentComplete,
  amount,
  currency,
  restaurantId,
}) => {
  const [status, setStatus] = useState<PaymentStatus>(PaymentStatus.INITIALIZING);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const { toast } = useToast();
  const { user, session } = useAuth();

  useEffect(() => {
    if (!isOpen) return;

    // Reset state when dialog opens
    setStatus(PaymentStatus.INITIALIZING);
    setErrorMessage(null);
    setPaymentIntentId(null);

    const initializePayment = async () => {
      if (!session?.access_token) {
        setStatus(PaymentStatus.ERROR);
        setErrorMessage("Authentication error: You must be logged in to process payments");
        return;
      }

      try {
        // Simulate API call to initialize payment
        setStatus(PaymentStatus.CONNECTING);
        
        // Create a payment intent on the server
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://yifimiqeybttmbhuplaq.supabase.co";
        const response = await fetch(`${supabaseUrl}/functions/v1/stripe-terminal`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            action: 'create_payment_intent',
            restaurantId,
            amount,
            currency,
            description: `Restaurant order payment`,
          }),
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          console.error("Payment intent creation error:", response.status, errorData);
          
          // Provide a more specific error message if we can determine the cause
          if (errorData?.error?.includes("API key")) {
            throw new Error("Stripe API key not configured. Please set up payment settings first.");
          } else {
            throw new Error(`API error: ${response.status} ${errorData?.error || response.statusText}`);
          }
        }
        
        const result = await response.json();
        
        if (result.error) {
          console.error("Payment intent result error:", result.error);
          throw new Error(result.error || 'Failed to create payment intent');
        }
        
        setPaymentIntentId(result.paymentIntent.id);
        setStatus(PaymentStatus.READY);
      } catch (error) {
        console.error("Error initializing payment:", error);
        setStatus(PaymentStatus.ERROR);
        setErrorMessage(error.message || "Failed to initialize payment");
        toast({
          title: "Payment Error",
          description: error.message || "Failed to initialize payment",
          variant: "destructive",
        });
      }
    };

    initializePayment();
  }, [isOpen, amount, currency, restaurantId, toast, session]);

  const handleProcessPayment = async () => {
    try {
      setStatus(PaymentStatus.PROCESSING);
      
      // In a real implementation, you would:
      // 1. Use Stripe Terminal SDK to process the payment
      // 2. Confirm the payment intent on your server
      
      // For this demo, we'll simulate the payment process
      await new Promise((resolve) => setTimeout(resolve, 3000));
      
      // Simulate successful payment
      setStatus(PaymentStatus.SUCCESS);
      
      toast({
        title: "Payment Successful",
        description: "The card payment has been processed successfully.",
      });
      
      // Wait a moment before closing the dialog
      setTimeout(() => {
        onPaymentComplete();
      }, 1500);
    } catch (error) {
      console.error("Error processing payment:", error);
      setStatus(PaymentStatus.ERROR);
      setErrorMessage(error.message || "Failed to process payment");
      toast({
        title: "Payment Error",
        description: error.message || "Failed to process payment",
        variant: "destructive",
      });
    }
  };

  const handleRetry = () => {
    setStatus(PaymentStatus.INITIALIZING);
    setErrorMessage(null);
    setPaymentIntentId(null);
  };

  const renderContent = () => {
    switch (status) {
      case PaymentStatus.INITIALIZING:
      case PaymentStatus.CONNECTING:
        return (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-16 w-16 animate-spin text-primary mb-4" />
            <p className="text-lg font-medium">
              {status === PaymentStatus.INITIALIZING ? "Initializing payment..." : "Connecting to terminal..."}
            </p>
          </div>
        );
      
      case PaymentStatus.READY:
        return (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="bg-slate-100 rounded-lg p-6 mb-6 w-full max-w-md">
              <div className="flex justify-between mb-2">
                <span className="font-medium">Total Amount:</span>
                <span className="font-bold">{amount.toFixed(2)} {currency.toUpperCase()}</span>
              </div>
              <div className="text-sm text-muted-foreground">
                Payment ID: {paymentIntentId?.substring(0, 8)}...
              </div>
            </div>
            
            <p className="text-center mb-6">
              Press the button below to proceed with the card payment on the terminal.
            </p>
            
            <Button 
              size="lg" 
              className="w-full max-w-xs py-6 text-lg"
              onClick={handleProcessPayment}
            >
              <CreditCard className="mr-2 h-6 w-6" />
              Process Card Payment
            </Button>
          </div>
        );
      
      case PaymentStatus.PROCESSING:
        return (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-16 w-16 animate-spin text-primary mb-4" />
            <p className="text-lg font-medium mb-2">Processing payment...</p>
            <p className="text-center text-muted-foreground">
              Please complete the payment on the terminal.
            </p>
          </div>
        );
      
      case PaymentStatus.SUCCESS:
        return (
          <div className="flex flex-col items-center justify-center py-12">
            <CheckCircle2 className="h-16 w-16 text-green-500 mb-4" />
            <p className="text-lg font-medium mb-2">Payment successful!</p>
            <p className="text-center text-muted-foreground">
              The payment has been processed successfully.
            </p>
          </div>
        );
      
      case PaymentStatus.ERROR:
        return (
          <div className="flex flex-col items-center justify-center py-8">
            <XCircle className="h-16 w-16 text-red-500 mb-4" />
            <p className="text-lg font-medium mb-2">Payment failed</p>
            <p className="text-center text-muted-foreground mb-6">
              {errorMessage || "An error occurred while processing the payment."}
            </p>
            <Button 
              variant="outline" 
              className="flex items-center"
              onClick={handleRetry}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </div>
        );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Card Payment</DialogTitle>
          <DialogDescription>
            Process payment using Stripe Terminal
          </DialogDescription>
        </DialogHeader>
        
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
};

export default StripeTerminalPayment;
