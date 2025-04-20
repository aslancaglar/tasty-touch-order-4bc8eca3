
export const calculatePriceWithoutTax = (totalPrice: number, percentage: number = 10): number => {
  if (percentage === null || percentage === undefined) percentage = 10;
  return totalPrice / (1 + percentage / 100);
};

export const calculateTaxAmount = (totalPrice: number, percentage: number = 10): number => {
  const priceWithoutTax = calculatePriceWithoutTax(totalPrice, percentage);
  return totalPrice - priceWithoutTax;
};

// New utility function to calculate cart totals with dynamic VAT
export const calculateCartTotals = (cart: CartItem[]) => {
  let total = 0;
  let totalTax = 0;

  cart.forEach(item => {
    const itemTotal = item.itemPrice * item.quantity;
    const vatPercentage = item.menuItem.tax_percentage ?? 10;
    
    total += itemTotal;
    totalTax += calculateTaxAmount(itemTotal, vatPercentage);
  });

  const subtotal = total - totalTax;

  return {
    total,
    subtotal,
    tax: totalTax
  };
};
