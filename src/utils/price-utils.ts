
import { OrderType } from "@/types/database-types";

// Calculate cart totals
export const calculateCartTotals = (cart: any[], orderType: OrderType) => {
  const subtotal = cart.reduce((total, item) => total + item.itemPrice, 0);
  const tax = cart.reduce((total, item) => {
    const taxPercentage = item.menuItem.tax_percentage || 10;
    return total + (item.itemPrice * taxPercentage) / 100;
  }, 0);
  const deliveryFee = orderType === "delivery" ? 2.99 : 0; // Example delivery fee
  const total = subtotal + tax + deliveryFee;

  return {
    subtotal,
    tax,
    deliveryFee,
    total,
  };
};

// Format currency based on locale and currency code
export const formatCurrency = (amount: number, currencyCode: string = 'USD', locale: string = 'en-US'): string => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currencyCode
  }).format(amount);
};
