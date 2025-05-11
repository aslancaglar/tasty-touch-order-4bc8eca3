
import React, { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Check, CreditCard, Utensils } from "lucide-react";
import { Restaurant } from "@/types/database-types";
import { useTranslation } from "@/utils/language-utils";
import { useResponsiveText } from "@/hooks/use-responsive-text";

const COUNTDOWN_SECONDS = 10;

interface OrderConfirmationDialogProps {
  isOpen: boolean;
  orderNumber: string;
  total: number;
  restaurant?: Restaurant | null;
  uiLanguage: "fr" | "en" | "tr";
  currency?: string;
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

const OrderConfirmationDialog: React.FC<OrderConfirmationDialogProps> = ({
  isOpen,
  orderNumber,
  total,
  restaurant,
  uiLanguage,
  currency = "EUR"
}) => {
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const { t } = useTranslation(uiLanguage);
  const { getResponsiveSize } = useResponsiveText();
  const currencySymbol = CURRENCY_SYMBOLS[currency.toUpperCase()] || currency;
  
  useEffect(() => {
    if (!isOpen) return;
    
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [isOpen]);
  
  const progressPercentage = ((COUNTDOWN_SECONDS - countdown) / COUNTDOWN_SECONDS) * 100;
  
  if (!isOpen) return null;
  
  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md md:max-w-lg lg:max-w-xl p-0 overflow-hidden">
        <div className="bg-green-50 p-6 flex items-center justify-center border-b border-green-200">
          <div className="bg-green-100 rounded-full p-4">
            <Check className="h-10 w-10 text-green-700" />
          </div>
        </div>
        
        <div className="p-8 text-center space-y-7">
          <h2 className="text-3xl md:text-4xl font-bold text-green-700" style={{ fontSize: getResponsiveSize('3xl') }}>
            {t("order.confirmation.title")}
          </h2>
          
          <div className="space-y-3">
            <div className="flex items-center justify-center mb-2">
              <div className="bg-purple-100 rounded-full p-3 mr-3">
                <Utensils className="h-6 w-6 text-purple-700" />
              </div>
              <p className="text-xl text-gray-700" style={{ fontSize: getResponsiveSize('xl') }}>
                {t("order.confirmation.receiptPrinted")}
              </p>
            </div>
            <p className="text-xl text-gray-700" style={{ fontSize: getResponsiveSize('xl') }}>
              {t("order.confirmation.preparingMeal")}
            </p>
          </div>
          
          <div className="bg-violet-50 rounded-lg p-6 border border-violet-200">
            <div className="flex items-center justify-center mb-4">
              <div className="bg-blue-100 rounded-full p-3 mr-3">
                <CreditCard className="h-6 w-6 text-blue-700" />
              </div>
              <h3 className="text-2xl font-semibold text-blue-800" style={{ fontSize: getResponsiveSize('2xl') }}>
                {t("order.confirmation.payNow")}
              </h3>
            </div>
            
            <p className="text-lg text-gray-600 mb-5" style={{ fontSize: getResponsiveSize('lg') }}>
              {t("order.confirmation.paymentInstructions")}
            </p>
            
            <div className="grid grid-cols-2 gap-3 text-left">
              <div className="flex justify-between col-span-2 border-b border-dashed border-gray-300 pb-3 mb-3">
                <span className="font-medium text-xl" style={{ fontSize: getResponsiveSize('xl') }}>
                  {t("order.confirmation.total")}:
                </span>
                <span className="font-bold text-2xl" style={{ fontSize: getResponsiveSize('2xl') }}>
                  {total.toFixed(2)} {currencySymbol}
                </span>
              </div>
              <div className="flex justify-between col-span-2 mb-3">
                <span className="font-medium text-xl" style={{ fontSize: getResponsiveSize('xl') }}>
                  {t("order.confirmation.orderNumber")}:
                </span>
                <span className="font-bold text-2xl" style={{ fontSize: getResponsiveSize('2xl') }}>
                  #{orderNumber}
                </span>
              </div>
            </div>
            
            <p className="text-amber-700 mt-4 text-lg" style={{ fontSize: getResponsiveSize('lg') }}>
              ⚠️ {t("order.confirmation.preparationWarning")}
            </p>
          </div>
          
          <p className="font-medium text-xl text-gray-800" style={{ fontSize: getResponsiveSize('xl') }}>
            {t("order.confirmation.thankYou")}
          </p>
          
          <div className="mt-7">
            <p className="text-lg text-gray-500 mb-3" style={{ fontSize: getResponsiveSize('lg') }}>
              {t("order.confirmation.redirecting")} {countdown}s...
            </p>
            <Progress value={progressPercentage} className="h-3" />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OrderConfirmationDialog;
