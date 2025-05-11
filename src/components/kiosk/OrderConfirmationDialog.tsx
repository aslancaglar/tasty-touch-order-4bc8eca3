
import React, { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Cash, Check, Receipt, Timer } from "lucide-react";
import { printReceipt } from "@/utils/print-utils";
import { CartItem } from "@/types/database-types";
import OrderReceipt from "./OrderReceipt";
import { SupportedLanguage } from "@/utils/language-utils";

interface OrderConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  orderNumber: string;
  total: number;
  restaurant: {
    id?: string;
    name: string;
    location?: string;
    currency?: string;
  } | null;
  cart: CartItem[];
  orderType: "dine-in" | "takeaway" | null;
  tableNumber?: string | null;
  getFormattedOptions: (item: CartItem) => string;
  getFormattedToppings: (item: CartItem) => string;
  uiLanguage: SupportedLanguage;
  t: (key: string) => string;
}

const OrderConfirmationDialog: React.FC<OrderConfirmationDialogProps> = ({
  isOpen,
  onClose,
  orderNumber,
  total,
  restaurant,
  cart,
  orderType,
  tableNumber,
  getFormattedOptions,
  getFormattedToppings,
  uiLanguage,
  t,
}) => {
  const [countdown, setCountdown] = useState(10);
  const [isPrinted, setPrinted] = useState(false);
  const currencySymbol = restaurant?.currency === "TRY" ? "₺" : "€";

  // Countdown timer
  useEffect(() => {
    if (!isOpen) return;
    
    // Reset the countdown when dialog opens
    setCountdown(10);
    
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, onClose]);

  // Handle receipt printing
  useEffect(() => {
    if (isOpen && !isPrinted) {
      // Small delay to ensure DOM is ready
      const printTimer = setTimeout(() => {
        printReceipt("receipt-content");
        setPrinted(true);
      }, 500);
      
      return () => clearInterval(printTimer);
    }
  }, [isOpen, isPrinted]);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={() => onClose()}>
        <DialogContent className="sm:max-w-md md:max-w-lg lg:max-w-xl">
          <div className="flex flex-col items-center text-center p-4">
            {/* Success icon and title */}
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold mb-2">{t("orderConfirmation.successTitle")}</h2>
            
            {/* Printed receipt and kitchen notification */}
            <div className="flex items-center mt-2 mb-4 text-gray-600">
              <Receipt className="mr-2 h-5 w-5" />
              <p>{t("orderConfirmation.receiptPrinted")}</p>
            </div>
            <div className="flex items-center mb-6 text-gray-600">
              <div className="animate-pulse mr-2">👨‍🍳</div>
              <p>{t("orderConfirmation.preparingMeal")}</p>
            </div>
            
            {/* Payment section */}
            <div className="w-full bg-gray-50 p-4 rounded-lg mb-6">
              <div className="flex items-center justify-center mb-2">
                <Cash className="mr-2 h-5 w-5 text-primary" />
                <h3 className="font-semibold text-lg">{t("orderConfirmation.pleasePayNow")}</h3>
              </div>
              <p className="text-sm text-gray-600 mb-4">{t("orderConfirmation.paymentInstructions")}</p>
              
              {/* Order details */}
              <div className="flex justify-between items-center font-semibold mb-2">
                <span>{t("orderConfirmation.total")}</span>
                <span>{total.toFixed(2)} {currencySymbol}</span>
              </div>
              <div className="flex justify-between items-center font-semibold">
                <span>{t("orderConfirmation.orderNumber")}</span>
                <span>#{orderNumber}</span>
              </div>
            </div>
            
            {/* Warning about payment */}
            <div className="text-amber-600 flex items-center mb-4">
              <span className="mr-2">⚠️</span>
              <p>{t("orderConfirmation.paymentWarning")}</p>
            </div>
            
            {/* Thank you message */}
            <p className="text-gray-700 mb-4">{t("orderConfirmation.thankYou")}</p>
            
            {/* Countdown */}
            <div className="flex items-center justify-center">
              <Timer className="mr-2 h-4 w-4" />
              <span className="text-sm text-gray-500">{t("orderConfirmation.closing").replace("{seconds}", countdown.toString())}</span>
            </div>
            
            {/* Continue button */}
            <Button onClick={onClose} className="mt-4">
              {t("orderConfirmation.continue")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Hidden receipt content for printing */}
      <OrderReceipt
        restaurant={restaurant || { name: "" }}
        cart={cart}
        orderNumber={orderNumber}
        tableNumber={tableNumber}
        orderType={orderType}
        getFormattedOptions={getFormattedOptions}
        getFormattedToppings={getFormattedToppings}
        uiLanguage={uiLanguage}
      />
    </>
  );
};

export default OrderConfirmationDialog;
