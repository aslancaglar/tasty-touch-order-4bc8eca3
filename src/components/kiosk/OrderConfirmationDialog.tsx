import React from 'react';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import OrderSummary from './OrderSummary';
import { CartItem, Restaurant, OrderType } from '@/types/database-types';
import { useTranslation, SupportedLanguage } from '@/utils/language-utils';

interface OrderConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  orderNumber: string;
  restaurant: Restaurant;
  orderType: OrderType;
  tableNumber: string | null;
  uiLanguage: SupportedLanguage;
  getFormattedOptions: (item: CartItem) => string;
  getFormattedToppings: (item: CartItem) => string;
  colorPalette?: Restaurant['color_palette'];
}

const OrderConfirmationDialog: React.FC<OrderConfirmationDialogProps> = ({
  isOpen,
  onClose,
  cart,
  orderNumber,
  restaurant,
  orderType,
  tableNumber,
  uiLanguage,
  getFormattedOptions,
  getFormattedToppings,
  colorPalette
}) => {
  const { t } = useTranslation(uiLanguage);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-white text-black rounded-lg p-6 flex flex-col items-center justify-center" style={{ backgroundColor: colorPalette?.background, color: colorPalette?.text }}>
        <Check className="h-12 w-12 text-green-500 mb-4" />
        <h2 className="text-2xl font-semibold mb-2">{t("orderConfirmation.orderPlaced")}!</h2>
        <p className="text-md text-gray-500 mb-4">{t("orderConfirmation.orderNumber")}: #{orderNumber}</p>
        
        <OrderSummary
          cart={cart}
          restaurant={restaurant}
          orderType={orderType}
          tableNumber={tableNumber}
          uiLanguage={uiLanguage}
          getFormattedOptions={getFormattedOptions}
          getFormattedToppings={getFormattedToppings}
          isConfirmation={true}
        />

        <Button onClick={onClose} className="mt-6 bg-green-600 hover:bg-green-700 text-white">
          {t("orderConfirmation.goToStart")}
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default OrderConfirmationDialog;
