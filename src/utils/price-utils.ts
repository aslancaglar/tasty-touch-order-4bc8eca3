
export const calculatePriceWithoutTax = (totalPrice: number): number => {
  return totalPrice / 1.1;
};

export const calculateTaxAmount = (totalPrice: number): number => {
  const priceWithoutTax = calculatePriceWithoutTax(totalPrice);
  return totalPrice - priceWithoutTax;
};
