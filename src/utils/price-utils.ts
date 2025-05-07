
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
  // If the first argument is already a string, just return it (backward compatibility)
  if (typeof amount !== 'number') return amount as unknown as string;

  // Handle currency symbol as first parameter (backward compatibility)
  if (currencyCode.length <= 1) {
    return `${currencyCode}${amount.toFixed(2)}`;
  }

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode
    }).format(amount);
  } catch (error) {
    // Fallback if the currency code is invalid
    console.error(`Invalid currency code: ${currencyCode}. Falling back to USD.`);
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }
};

// Calculate tax amount from a total price (assuming the total includes tax)
// This assumes a standard 10% tax rate if not specified
export const calculateTaxAmount = (totalPrice: number, taxRate: number = 10): number => {
  // Formula: tax = total - (total / (1 + taxRate/100))
  const taxAmount = totalPrice - (totalPrice / (1 + taxRate / 100));
  return taxAmount;
};

// Calculate price without tax from a total price (assuming the total includes tax)
// This assumes a standard 10% tax rate if not specified
export const calculatePriceWithoutTax = (totalPrice: number, taxRate: number = 10): number => {
  // Formula: priceWithoutTax = total / (1 + taxRate/100)
  const priceWithoutTax = totalPrice / (1 + taxRate / 100);
  return priceWithoutTax;
};
