
export const calculatePriceWithoutTax = (totalPrice: number, percentage: number = 10): number => {
  if (!percentage) percentage = 10;
  return totalPrice / (1 + percentage / 100);
};

export const calculateTaxAmount = (totalPrice: number, percentage: number = 10): number => {
  const priceWithoutTax = calculatePriceWithoutTax(totalPrice, percentage);
  return totalPrice - priceWithoutTax;
};
