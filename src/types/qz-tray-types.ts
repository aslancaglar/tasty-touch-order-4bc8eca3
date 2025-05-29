
export interface QZPrinter {
  name: string;
  driver?: string;
}

export interface OrderData {
  restaurant: {
    id?: string;
    name: string;
    location?: string;
    currency?: string;
  } | null;
  cart: any[];
  orderNumber: string;
  tableNumber?: string | null;
  orderType: "dine-in" | "takeaway" | null;
  subtotal: number;
  tax: number;
  total: number;
  getFormattedOptions: (item: any) => string;
  getFormattedToppings: (item: any) => string;
  uiLanguage?: string;
}

declare global {
  interface Window {
    qz: any;
  }
}
