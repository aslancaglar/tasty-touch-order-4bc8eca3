
import React, { useEffect, useState } from "react";
import { Loader2, CheckCircle, XCircle, ArrowRight } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PaymentRecord, PaymentStatus } from "@/types/database-types";
import { subscribeToPaymentUpdates, getPaymentRecord } from "@/services/payment-service";
import { useToast } from "@/hooks/use-toast";

interface PaymentProcessingProps {
  isOpen: boolean;
  onClose: () => void;
  paymentId?: string | null;
  onPaymentComplete?: () => void;
  uiLanguage?: "fr" | "en" | "tr";
}

const translations = {
  fr: {
    processing: "Traitement du paiement en cours",
    waitForTerminal: "Veuillez suivre les instructions sur le terminal de paiement.",
    completed: "Paiement réussi !",
    failed: "Paiement échoué",
    cancelled: "Paiement annulé",
    close: "Fermer",
    continue: "Continuer",
    tryAgain: "Réessayer",
    pleaseWait: "Veuillez patienter..."
  },
  en: {
    processing: "Processing Payment",
    waitForTerminal: "Please follow the instructions on the payment terminal.",
    completed: "Payment Successful!",
    failed: "Payment Failed",
    cancelled: "Payment Cancelled",
    close: "Close",
    continue: "Continue",
    tryAgain: "Try Again",
    pleaseWait: "Please wait..."
  },
  tr: {
    processing: "Ödeme İşleniyor",
    waitForTerminal: "Lütfen ödeme terminalindeki talimatları takip edin.",
    completed: "Ödeme Başarılı!",
    failed: "Ödeme Başarısız",
    cancelled: "Ödeme İptal Edildi",
    close: "Kapat",
    continue: "Devam Et",
    tryAgain: "Tekrar Dene",
    pleaseWait: "Lütfen bekleyin..."
  }
};

const PaymentProcessing: React.FC<PaymentProcessingProps> = ({
  isOpen,
  onClose,
  paymentId,
  onPaymentComplete,
  uiLanguage = "en"
}) => {
  const [status, setStatus] = useState<PaymentStatus>("pending");
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const t = (key: keyof typeof translations.en) => translations[uiLanguage][key];

  useEffect(() => {
    if (!isOpen || !paymentId) return;

    // Initial fetch of payment record
    const fetchPaymentRecord = async () => {
      setIsLoading(true);
      try {
        const record = await getPaymentRecord(paymentId);
        if (record) {
          setStatus(record.status);
        }
      } catch (error) {
        console.error("Error fetching payment record:", error);
        toast({
          title: "Error",
          description: "Failed to fetch payment status",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchPaymentRecord();

    // Subscribe to updates
    const subscription = subscribeToPaymentUpdates(paymentId, (payment) => {
      console.log("Payment update received:", payment);
      setStatus(payment.status);

      // Notification for status changes
      if (payment.status === "completed") {
        toast({
          title: t("completed"),
          description: "",
          variant: "default"
        });
      } else if (payment.status === "failed") {
        toast({
          title: t("failed"),
          description: "",
          variant: "destructive"
        });
      } else if (payment.status === "cancelled") {
        toast({
          title: t("cancelled"),
          description: "",
          variant: "default"
        });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [isOpen, paymentId, toast, uiLanguage]);

  const handleContinue = () => {
    if (status === "completed" && onPaymentComplete) {
      onPaymentComplete();
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md p-6">
        <div className="flex flex-col items-center justify-center text-center space-y-6">
          {isLoading ? (
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <h2 className="text-xl font-bold">{t("pleaseWait")}</h2>
            </div>
          ) : status === "pending" || status === "processing" ? (
            <>
              <Loader2 className="h-16 w-16 animate-spin text-primary" />
              <h2 className="text-2xl font-bold">{t("processing")}</h2>
              <p className="text-gray-600">{t("waitForTerminal")}</p>
            </>
          ) : status === "completed" ? (
            <>
              <CheckCircle className="h-16 w-16 text-green-500" />
              <h2 className="text-2xl font-bold text-green-600">{t("completed")}</h2>
              <Button 
                onClick={handleContinue} 
                className="mt-4"
              >
                {t("continue")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <XCircle className="h-16 w-16 text-red-500" />
              <h2 className="text-2xl font-bold text-red-600">
                {status === "cancelled" ? t("cancelled") : t("failed")}
              </h2>
              <Button 
                onClick={onClose} 
                className="mt-4"
              >
                {t("close")}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentProcessing;
