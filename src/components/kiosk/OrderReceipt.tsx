
import React from "react";
import { CartItem } from "@/types/database-types";
import { format } from "date-fns";
import { calculateCartTotals } from "@/utils/price-utils";
import { getGroupedToppings, generateStandardReceipt } from "@/utils/receipt-templates";
import currencyCodes from "currency-codes";

interface OrderReceiptProps {
  restaurant: {
    id?: string;
    name: string;
    location?: string;
    currency?: string;
  };
  cart: CartItem[];
  orderNumber: string;
  tableNumber?: string | null;
  orderType: "dine-in" | "takeaway" | null;
  getFormattedOptions: (item: CartItem) => string;
  getFormattedToppings: (item: CartItem) => string;
  uiLanguage?: "fr" | "en" | "tr";
}

const OrderReceipt: React.FC<OrderReceiptProps> = ({
  restaurant,
  cart,
  orderNumber,
  tableNumber,
  orderType,
  getFormattedOptions,
  getFormattedToppings,
  uiLanguage = "fr",
}) => {
  const { total, subtotal, tax } = calculateCartTotals(cart);

  // Generate the HTML receipt content using the same template
  const generateReceiptHTML = () => {
    // Get the ESC/POS commands from the template
    let receiptContent = generateStandardReceipt({
      restaurant,
      cart,
      orderNumber,
      tableNumber,
      orderType,
      subtotal,
      tax,
      total,
      getFormattedOptions,
      getFormattedToppings,
      uiLanguage,
      useCurrencyCode: false // Use currency symbols for browser printing
    });

    // Convert ESC/POS commands to HTML classes
    const htmlMap: Record<string, string> = {
      '\x1B\x61\x01': '<div class="text-center">',  // Center align
      '\x1B\x61\x00': '</div><div class="text-left">',  // Left align
      '\x1B\x61\x02': '</div><div class="text-right">',  // Right align
      '\x1B\x21\x00': '<span class="text-normal">',  // Normal text
      '\x1B\x21\x08': '<span class="text-bold">',  // Bold text
      '\x1D\x21\x11': '<span class="text-large">',  // Large text
      '\x1B\x21\x30': '<span class="text-large-bold">',  // Large bold text
      '\x1B\x21\x01': '<span class="text-small">',  // Small text
      '\x1D\x21\x01': '<span class="text-half-bigger">',  // 0.5x bigger text
      '\x0A': '<br />',  // Line feed
      '\x1D\x56\x00': ''  // Cut paper (ignored in HTML)
    };

    // Replace ESC/POS commands with HTML
    Object.keys(htmlMap).forEach(cmd => {
      const regex = new RegExp(cmd.replace(/[\x00-\x1F]/g, c => 
        '\\x' + ('0' + c.charCodeAt(0).toString(16)).slice(-2)), 'g');
      receiptContent = receiptContent.replace(regex, htmlMap[cmd]);
    });

    // Close any open spans and divs
    receiptContent = receiptContent.replace(/(<span[^>]*>)([^<]*)/g, '$1$2</span>');
    receiptContent += '</div>';

    // Replace dashes with proper HTML line
    receiptContent = receiptContent.replace(/(-{10,})/g, '<hr class="border-t border-dashed my-2" />');

    return receiptContent;
  };

  return (
    <div 
      id="receipt-content"
      className="receipt hidden"
      dangerouslySetInnerHTML={{ __html: generateReceiptHTML() }}
    />
  );
};

export default OrderReceipt;
