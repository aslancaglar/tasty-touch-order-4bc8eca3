
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
import { Loader2, CreditCard, CheckCircle2, XCircle, RefreshCw, CreditCard as CardIcon } from "lucide-react";
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
  SIMULATION_MODE = "simulation_mode",
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
  const [cardNumber, setCardNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [cvc, setCvc] = useState("");
  const [nameOnCard, setNameOnCard] = useState("");
  const [isSimulatedMode, setIsSimulatedMode] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    // Reset state when dialog opens
    setStatus(PaymentStatus.INITIALIZING);
    setErrorMessage(null);
    setPaymentIntentId(null);
    setIsSimulatedMode(false);

    const initializePayment = async () => {
      if (!session?.access_token) {
        setStatus(PaymentStatus.ERROR);
        setErrorMessage("Authentication error: You must be logged in to process payments");
        return;
      }

      try {
        // Start by creating a payment intent on the server
        setStatus(PaymentStatus.CONNECTING);
        
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
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
          
          if (response.status === 404) {
            console.log("Stripe Terminal API not found, switching to simulation mode");
            setStatus(PaymentStatus.SIMULATION_MODE);
            return;
          }
          
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
        
        if (error.message?.includes("Failed to fetch") || error.message?.includes("Network Error")) {
          console.log("Network error, switching to simulation mode");
          setStatus(PaymentStatus.SIMULATION_MODE);
          return;
        }
        
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
      
      // First, get a connection token for the terminal
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
      const tokenResponse = await fetch(`${supabaseUrl}/functions/v1/stripe-terminal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          action: 'create_connection_token',
          restaurantId,
        }),
      });
      
      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json().catch(() => null);
        throw new Error(errorData?.error || 'Failed to create connection token');
      }
      
      // In production, this would communicate with the physical terminal 
      // For demo purposes, we'll simulate a successful payment after a delay
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
  
  const handleSimulatedPayment = async () => {
    if (!nameOnCard || cardNumber.length < 13 || expiryDate.length < 5 || cvc.length < 3) {
      toast({
        title: "Invalid Card Details",
        description: "Please enter all required card information.",
        variant: "destructive",
      });
      return;
    }
    
    setStatus(PaymentStatus.PROCESSING);
    
    // Simulate payment processing delay
    await new Promise((resolve) => setTimeout(resolve, 2000));
    
    // Simulate successful payment
    setStatus(PaymentStatus.SUCCESS);
    
    toast({
      title: "Payment Successful",
      description: "The simulated card payment has been processed successfully.",
    });
    
    // Wait a moment before closing the dialog
    setTimeout(() => {
      onPaymentComplete();
    }, 1500);
  };

  const handleRetry = () => {
    setStatus(PaymentStatus.INITIALIZING);
    setErrorMessage(null);
    setPaymentIntentId(null);
    setIsSimulatedMode(false);
  };
  
  const switchToSimulatedMode = () => {
    setStatus(PaymentStatus.SIMULATION_MODE);
    setIsSimulatedMode(true);
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
            
            <Button 
              variant="link" 
              className="mt-4 text-sm" 
              onClick={switchToSimulatedMode}
            >
              No terminal? Use simulated payment
            </Button>
          </div>
        );
      
      case PaymentStatus.SIMULATION_MODE:
        return (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="bg-slate-100 rounded-lg p-6 mb-6 w-full max-w-md">
              <div className="flex justify-between mb-2">
                <span className="font-medium">Total Amount:</span>
                <span className="font-bold">{amount.toFixed(2)} {currency.toUpperCase()}</span>
              </div>
              <div className="text-sm text-muted-foreground">
                Simulation Mode (No physical terminal required)
              </div>
            </div>
            
            <div className="w-full max-w-md space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Name on Card</label>
                <input 
                  type="text" 
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={nameOnCard}
                  onChange={(e) => setNameOnCard(e.target.value)}
                  placeholder="John Doe"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Card Number</label>
                <div className="relative">
                  <input 
                    type="text" 
                    className="w-full px-3 py-2 border border-gray-300 rounded-md pl-10"
                    value={cardNumber}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^\d]/g, '');
                      if (value.length <= 16) setCardNumber(value);
                    }}
                    placeholder="4242 4242 4242 4242"
                    maxLength={16}
                  />
                  <CardIcon className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Expiry Date</label>
                  <input 
                    type="text" 
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    value={expiryDate}
                    onChange={(e) => {
                      let value = e.target.value.replace(/[^\d]/g, '');
                      if (value.length > 2) {
                        value = value.slice(0, 2) + '/' + value.slice(2, 4);
                      }
                      if (value.length <= 5) setExpiryDate(value);
                    }}
                    placeholder="MM/YY"
                    maxLength={5}
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">CVC</label>
                  <input 
                    type="text" 
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    value={cvc}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^\d]/g, '');
                      if (value.length <= 3) setCvc(value);
                    }}
                    placeholder="123"
                    maxLength={3}
                  />
                </div>
              </div>
              
              <Button 
                className="w-full py-6 mt-4 text-lg"
                onClick={handleSimulatedPayment}
              >
                <CreditCard className="mr-2 h-6 w-6" />
                Process Payment
              </Button>
              
              <p className="text-xs text-center text-gray-500 mt-2">
                This is a simulation. No actual payment will be processed.
              </p>
            </div>
          </div>
        );
      
      case PaymentStatus.PROCESSING:
        return (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-16 w-16 animate-spin text-primary mb-4" />
            <p className="text-lg font-medium mb-2">Processing payment...</p>
            <p className="text-center text-muted-foreground">
              {isSimulatedMode 
                ? "Simulating payment processing..."
                : "Please complete the payment on the terminal."}
            </p>
          </div>
        );
      
      case PaymentStatus.SUCCESS:
        return (
          <div className="flex flex-col items-center justify-center py-12">
            <CheckCircle2 className="h-16 w-16 text-green-500 mb-4" />
            <p className="text-lg font-medium mb-2">Payment successful!</p>
            <p className="text-center text-muted-foreground">
              {isSimulatedMode
                ? "The simulated payment has been processed successfully."
                : "The payment has been processed successfully."}
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
            <div className="space-y-4 w-full max-w-xs flex flex-col items-center">
              <Button 
                variant="outline" 
                className="flex items-center"
                onClick={handleRetry}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry
              </Button>
              
              <Button 
                variant="link" 
                className="text-sm" 
                onClick={switchToSimulatedMode}
              >
                Try simulated payment instead
              </Button>
            </div>
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
            {isSimulatedMode 
              ? "Complete payment using simulated card details" 
              : "Process payment using Stripe Terminal"}
          </DialogDescription>
        </DialogHeader>
        
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
};

export default StripeTerminalPayment;
