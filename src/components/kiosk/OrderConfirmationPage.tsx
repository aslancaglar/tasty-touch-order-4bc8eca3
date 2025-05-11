
import React, { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";
import { ChefHat, CreditCard, DollarSign, CircleCheck } from "lucide-react";
import { useTranslation, SupportedLanguage } from "@/utils/language-utils";
import { motion } from "framer-motion";

interface OrderConfirmationPageProps {
  orderNumber: string;
  total: number;
  onTimerComplete: () => void;
  uiLanguage?: SupportedLanguage;
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

function getCurrencySymbol(currency: string) {
  return CURRENCY_SYMBOLS[(currency || "EUR").toUpperCase()] || (currency || "EUR").toUpperCase();
}

const OrderConfirmationPage: React.FC<OrderConfirmationPageProps> = ({
  orderNumber,
  total,
  onTimerComplete,
  uiLanguage = "fr",
  currency = "EUR"
}) => {
  const [progress, setProgress] = useState(0);
  const { t } = useTranslation(uiLanguage);
  const timerDuration = 10; // seconds
  const currencySymbol = getCurrencySymbol(currency);

  useEffect(() => {
    const startTime = Date.now();
    const endTime = startTime + timerDuration * 1000;
    
    const timer = setInterval(() => {
      const now = Date.now();
      const timeElapsed = now - startTime;
      const newProgress = Math.min((timeElapsed / (timerDuration * 1000)) * 100, 100);
      
      setProgress(newProgress);
      
      if (now >= endTime) {
        clearInterval(timer);
        onTimerComplete();
      }
    }, 100);
    
    return () => clearInterval(timer);
  }, [onTimerComplete, timerDuration]);
  
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-white z-50 p-6">
      <div className="max-w-2xl w-full text-center space-y-8">
        {/* Success Animation */}
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5, type: "spring" }}
          className="mx-auto"
        >
          <div className="mx-auto bg-green-100 rounded-full p-6 w-32 h-32 flex items-center justify-center mb-4">
            <CircleCheck className="h-20 w-20 text-green-600" />
          </div>
        </motion.div>
        
        {/* Order Confirmation Title */}
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-3xl md:text-4xl font-bold text-green-700"
        >
          {t("orderConfirmation.title")}
        </motion.h1>
        
        {/* Order Processing Info */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="space-y-2 text-gray-600 text-lg"
        >
          <p>{t("orderConfirmation.ticketPrinted")}</p>
          <div className="flex items-center justify-center space-x-2">
            <ChefHat className="h-5 w-5 text-gray-600" />
            <p>{t("orderConfirmation.preparingMeal")}</p>
          </div>
        </motion.div>
        
        {/* Payment Instructions */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="bg-blue-50 p-6 rounded-xl"
        >
          <h2 className="text-2xl font-bold text-blue-800 mb-2 flex items-center justify-center">
            <div className="flex space-x-2">
              <CreditCard className="h-6 w-6 mr-1" />
              <DollarSign className="h-6 w-6" />
            </div>
            <span className="ml-2">{t("orderConfirmation.paymentInstructions")}</span>
          </h2>
          <p className="text-blue-700 mb-4">{t("orderConfirmation.paymentDetails")}</p>
          
          {/* Order Total & Order Number */}
          <div className="flex flex-col space-y-2 mb-4">
            <div className="flex justify-between bg-white rounded-lg p-3 shadow-sm">
              <span className="font-medium">{t("orderConfirmation.totalAmount")}:</span>
              <span className="font-bold text-xl">{total.toFixed(2)} {currencySymbol}</span>
            </div>
            <div className="flex justify-between bg-white rounded-lg p-3 shadow-sm">
              <span className="font-medium">{t("orderConfirmation.orderNumber")}:</span>
              <span className="font-bold">#{orderNumber}</span>
            </div>
          </div>
          
          <div className="text-red-600 font-medium border-t border-blue-200 pt-3">
            ⚠️ {t("orderConfirmation.paymentWarning")}
          </div>
        </motion.div>
        
        {/* Thank You Message */}
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="text-gray-700 italic text-lg"
        >
          {t("orderConfirmation.thankYou")}
        </motion.p>
        
        {/* Progress Bar */}
        <div className="pt-4">
          <Progress value={progress} className="h-2" />
        </div>
      </div>
    </div>
  );
};

export default OrderConfirmationPage;
