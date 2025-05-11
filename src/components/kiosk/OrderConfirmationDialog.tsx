
import React, { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Loader2, CreditCard, Check, AlertTriangle, Receipt, ChefHat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation, SupportedLanguage } from "@/utils/language-utils";
import { printReceipt } from "@/utils/print-utils";
import { CartItem } from "@/types/database-types";
import { cn } from "@/lib/utils";

interface OrderConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  orderTotal: number;
  orderNumber: string;
  restaurant: {
    id?: string;
    name: string;
    location?: string;
    currency?: string;
  } | null;
  cart: CartItem[];
  orderType: "dine-in" | "takeaway" | null;
  tableNumber?: string | null;
  uiLanguage?: SupportedLanguage;
  onPrintReceipt: () => void;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  EUR: "€",
  USD: "$",
  GBP: "£",
  TRY: "₺",
  JPY: "¥",
  CAD: "$",
  AUD: "$",
  CHF: "Fr.",
  CNY: "¥",
  RUB: "₽"
};

const getCurrencySymbol = (currencyCode: string): string => {
  const code = (currencyCode || "EUR").toUpperCase();
  return CURRENCY_SYMBOLS[code] || code;
};

const OrderConfirmationDialog: React.FC<OrderConfirmationDialogProps> = ({
  isOpen,
  onClose,
  orderTotal,
  orderNumber,
  restaurant,
  cart,
  orderType,
  tableNumber,
  uiLanguage = "fr",
  onPrintReceipt
}) => {
  const [countdown, setCountdown] = useState(10);
  const [printStatus, setPrintStatus] = useState<"pending" | "printing" | "complete" | "error">("pending");
  const { t } = useTranslation(uiLanguage);
  const currencySymbol = getCurrencySymbol(restaurant?.currency || "EUR");

  useEffect(() => {
    if (isOpen) {
      // Start countdown for auto-close
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

      // Handle printing
      if (printStatus === "pending") {
        setPrintStatus("printing");
        try {
          // Call the print function passed from KioskView
          onPrintReceipt();
          setPrintStatus("complete");
        } catch (error) {
          console.error("Error during printing:", error);
          setPrintStatus("error");
        }
      }

      return () => {
        clearInterval(timer);
      };
    }
  }, [isOpen, onClose, onPrintReceipt, printStatus]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md md:max-w-lg lg:max-w-xl p-0 overflow-hidden">
        <div className="flex flex-col">
          {/* Success banner */}
          <div className="bg-green-600 text-white p-6 text-center">
            <div className="flex justify-center items-center mb-2">
              <div className="bg-white rounded-full p-2 inline-flex">
                <Check className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <h2 className="text-2xl font-bold">{t("orderConfirmation.success")}</h2>
          </div>

          {/* Content area */}
          <div className="p-6 space-y-6">
            {/* Receipt and kitchen notification */}
            <div className="flex flex-col md:flex-row items-center gap-4 p-4 bg-green-50 rounded-lg">
              <div className="flex-shrink-0">
                <Receipt className="h-10 w-10 text-green-600" />
              </div>
              <div>
                <p className="font-medium">{t("orderConfirmation.receiptPrinted")}</p>
                <p className="text-gray-600">{t("orderConfirmation.sentToKitchen")}</p>
              </div>
            </div>
            
            {/* Chef preparing notification */}
            <div className="flex flex-col md:flex-row items-center gap-4 p-4 bg-amber-50 rounded-lg">
              <div className="flex-shrink-0 relative">
                <ChefHat className="h-10 w-10 text-amber-600" />
                <div className="absolute -top-1 -right-1 h-3 w-3 bg-amber-600 rounded-full animate-ping"></div>
              </div>
              <div>
                <p className="font-medium">{t("orderConfirmation.preparingMeal")}</p>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div className="bg-amber-600 h-2 rounded-full animate-pulse" style={{ width: "20%" }}></div>
                </div>
              </div>
            </div>

            {/* Payment info */}
            <div className="p-5 border-2 border-blue-600 rounded-lg bg-blue-50">
              <div className="flex items-center gap-3 mb-3">
                <CreditCard className="h-6 w-6 text-blue-600" />
                <h3 className="text-xl font-bold text-blue-800">{t("orderConfirmation.payNow")}</h3>
              </div>
              <p className="mb-4 text-gray-700">{t("orderConfirmation.payDescription")}</p>
              
              {/* Order details */}
              <div className="bg-white p-4 rounded-md shadow-sm mb-4">
                <div className="flex justify-between text-lg mb-2">
                  <span className="font-semibold">{t("orderConfirmation.total")}</span>
                  <span className="font-bold">{orderTotal.toFixed(2)} {currencySymbol}</span>
                </div>
                <div className="flex justify-between text-lg">
                  <span className="font-semibold">{t("orderConfirmation.orderNumber")}</span>
                  <span className="font-bold">#{orderNumber}</span>
                </div>
              </div>
              
              {/* Warning */}
              <div className="flex items-start gap-3 p-3 bg-amber-100 rounded-md">
                <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-amber-800 text-sm">{t("orderConfirmation.warning")}</p>
              </div>
            </div>

            {/* Thank you message */}
            <div className="text-center">
              <p className="text-lg font-medium text-gray-800">{t("orderConfirmation.thanks")}</p>
              <p className="text-gray-600">{t("orderConfirmation.enjoyMeal")}</p>
            </div>
          </div>

          {/* Footer with countdown */}
          <div className="bg-gray-100 p-4 flex items-center justify-center border-t">
            <div className="flex items-center gap-2">
              <Loader2 className={cn("h-4 w-4", countdown > 0 ? "animate-spin" : "")} />
              <span className="text-sm text-gray-600">
                {countdown > 0 
                  ? t("orderConfirmation.redirectingIn").replace("{seconds}", countdown.toString())
                  : t("orderConfirmation.redirectingNow")}
              </span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OrderConfirmationDialog;
