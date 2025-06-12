import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Check, Trash, Minus, Plus } from "lucide-react";
import { CartItem } from "@/types/database-types";
import OrderReceipt from "@/components/kiosk/OrderReceipt";
import { printReceipt } from "@/utils/print-utils";
import { supabase } from "@/integrations/supabase/client";
import { calculateCartTotals } from "@/utils/price-utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { generatePlainTextReceipt, getGroupedToppings, ToppingWithQuantity } from "@/utils/receipt-templates";
import { secureApiKeyService } from "@/services/secure-api-keys";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCartManager } from "@/hooks/useCartManager";

const translations = {
  fr: {
    orderSummary: "RÉSUMÉ DE COMMANDE",
    orderedItems: "ARTICLES COMMANDÉS",
    totalHT: "Total HT:",
    vat: "TVA:",
    vatWithRate: "TVA (10%):",
    totalTTC: "Total TTC:",
    confirm: "CONFIRMER LA COMMANDE",
    back: "Retour",
  },
  en: {
    orderSummary: "ORDER SUMMARY",
    orderedItems: "ORDERED ITEMS",
    totalHT: "Subtotal:",
    vat: "Tax:",
    vatWithRate: "Tax (10%):",
    totalTTC: "TOTAL:",
    confirm: "CONFIRM ORDER",
    back: "Back",
  },
  tr: {
    orderSummary: "SİPARİŞ ÖZETİ",
    orderedItems: "SİPARİŞ EDİLEN ÜRÜNLER",
    totalHT: "Ara Toplam:",
    vat: "KDV:",
    vatWithRate: "KDV (10%):",
    totalTTC: "TOPLAM:",
    confirm: "SİPARİŞİ ONAYLA",
    back: "Geri",
  }
};

interface OrderSummaryProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  onCartUpdate: (newCart: CartItem[]) => void;
  onPlaceOrder: () => void;
  placingOrder: boolean;
  calculateSubtotal: () => number;
  calculateTax: () => number;
  getFormattedOptions: (item: CartItem) => string;
  getFormattedToppings: (item: CartItem) => string;
  restaurant?: {
    id?: string;
    name: string;
    location?: string;
  } | null;
  orderType?: "dine-in" | "takeaway" | null;
  tableNumber?: string | null;
  uiLanguage?: "fr" | "en" | "tr";
}

const OrderSummary: React.FC<OrderSummaryProps> = ({
  isOpen,
  onClose,
  cart,
  onCartUpdate,
  onPlaceOrder,
  placingOrder,
  calculateSubtotal,
  calculateTax,
  getFormattedOptions,
  getFormattedToppings,
  restaurant = { name: "Restaurant" },
  orderType = null,
  tableNumber = null,
  uiLanguage = "fr",
}) => {
  const [orderNumber, setOrderNumber] = useState<string>("0");
  const isMobile = useIsMobile();
  const { toast } = useToast();
  
  const { total, subtotal, tax } = calculateCartTotals(cart);
  
  // Use the cart manager hook
  const cartManager = useCartManager(cart, onCartUpdate);

  // Helper function to translate text
  const t = (key: keyof typeof translations["en"]) =>
    translations[uiLanguage]?.[key] ?? translations.fr[key];

  useEffect(() => {
    console.log("OrderSummary mounted, isMobile:", isMobile, "userAgent:", navigator.userAgent);
    const fetchOrderCount = async () => {
      if (restaurant?.id) {
        const { count } = await supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('restaurant_id', restaurant.id);
        setOrderNumber(((count || 0) + 1).toString());
      }
    };
    fetchOrderCount();
  }, [restaurant?.id, isMobile]);

  // Helper to get topping name whether it's a string or ToppingWithQuantity
  const getToppingDisplayName = (topping: string | ToppingWithQuantity): string => {
    if (typeof topping === 'object') {
      return topping.name;
    }
    return topping;
  };

  // Helper to get topping quantity
  const getToppingQuantity = (topping: string | ToppingWithQuantity): number => {
    if (typeof topping === 'object') {
      return topping.quantity;
    }
    return 1;
  };
  
  const handleConfirmOrder = async () => {
    onPlaceOrder();
    if (restaurant?.id) {
      try {
        console.log("Device info - Width:", window.innerWidth, "isMobile:", isMobile, "userAgent:", navigator.userAgent);
        
        // Fetch print configuration (no longer includes api_key)
        const { data: printConfig, error } = await supabase
          .from('restaurant_print_config')
          .select('configured_printers, browser_printing_enabled')
          .eq('restaurant_id', restaurant.id)
          .single();
        if (error) {
          console.error("Error fetching print configuration:", error);
          return;
        }
        
        const shouldUseBrowserPrinting = 
          !isMobile && 
          (printConfig === null || printConfig.browser_printing_enabled !== false);
        if (shouldUseBrowserPrinting) {
          console.log("Using browser printing for receipt");
          toast({
            title: "Impression",
            description: "Préparation de l'impression du reçu..."
          });
          setTimeout(() => {
            try {
              printReceipt('receipt-content');
              console.log("Print receipt triggered successfully");
            } catch (printError) {
              console.error("Error during browser printing:", printError);
              toast({
                title: "Erreur d'impression",
                description: "Impossible d'imprimer le reçu. Vérifiez les paramètres de votre navigateur.",
                variant: "destructive"
              });
            }
          }, 500);
        } else {
          console.log("Browser printing disabled for this device or restaurant");
          if (isMobile) {
            console.log("Browser printing disabled because this is a mobile or tablet device");
          } else if (printConfig?.browser_printing_enabled === false) {
            console.log("Browser printing disabled in restaurant settings");
          }
        }
        
        // Handle PrintNode printing using secure API key service
        if (printConfig?.configured_printers) {
          const printerArray = Array.isArray(printConfig.configured_printers) 
            ? printConfig.configured_printers 
            : [];
          const printerIds = printerArray.map(id => String(id));
          if (printerIds.length > 0) {
            // Get API key securely
            const apiKey = await secureApiKeyService.retrieveApiKey(restaurant.id, 'printnode');
            if (apiKey) {
              await sendReceiptToPrintNode(
                apiKey,
                printerIds,
                {
                  restaurant,
                  cart,
                  orderNumber,
                  tableNumber,
                  orderType,
                  subtotal,
                  tax,
                  total,
                  getFormattedOptions,
                  getFormattedToppings
                }
              );
            }
          }
        }
      } catch (error) {
        console.error("Error during receipt printing:", error);
        toast({
          title: "Erreur",
          description: "Une erreur est survenue lors de l'impression",
          variant: "destructive"
        });
      }
    }
  };
  
  const sendReceiptToPrintNode = async (
    apiKey: string,
    printerIds: string[],
    orderData: {
      restaurant: typeof restaurant;
      cart: CartItem[];
      orderNumber: string;
      tableNumber?: string | null;
      orderType: "dine-in" | "takeaway" | null;
      subtotal: number;
      tax: number;
      total: number;
      getFormattedOptions: (item: CartItem) => string;
      getFormattedToppings: (item: CartItem) => string;
    }
  ) => {
    try {
      const receiptContent = generatePrintNodeReceipt(orderData);
      
      // Fix: Properly encode special characters for UTF-8
      const textEncoder = new TextEncoder();
      const encodedBytes = textEncoder.encode(receiptContent);
      const encodedContent = btoa(
        Array.from(encodedBytes)
          .map(byte => String.fromCharCode(byte))
          .join('')
      );
      
      console.log("Sending receipt to PrintNode printers:", printerIds);
      for (const printerId of printerIds) {
        console.log(`Sending to printer ID: ${printerId}`);
        const response = await fetch('https://api.printnode.com/printjobs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${btoa(apiKey + ':')}`
          },
          body: JSON.stringify({
            printer: parseInt(printerId, 10) || printerId,
            title: `Order #${orderData.orderNumber}`,
            contentType: "raw_base64",
            content: encodedContent,
            source: "Restaurant Kiosk"
          })
        });
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`PrintNode API error: ${response.status}`, errorText);
          throw new Error(`Error sending print job: ${response.status} - ${errorText}`);
        } else {
          console.log(`PrintNode receipt sent successfully to printer ${printerId}`);
        }
      }
    } catch (error) {
      console.error("Error sending receipt to PrintNode:", error);
    }
  };
  
  const generatePrintNodeReceipt = (orderData: {
    restaurant: typeof restaurant;
    cart: CartItem[];
    orderNumber: string;
    tableNumber?: string | null;
    orderType: "dine-in" | "takeaway" | null;
    subtotal: number;
    tax: number;
    total: number;
    getFormattedOptions: (item: CartItem) => string;
    getFormattedToppings: (item: CartItem) => string;
  }): string => {
    // Use the plain text receipt generator
    return generatePlainTextReceipt(
      orderData.cart,
      orderData.restaurant,
      orderData.orderType,
      orderData.tableNumber,
      orderData.orderNumber,
      "EUR", // Currency symbol
      orderData.total,
      orderData.subtotal,
      orderData.tax,
      10, // Tax rate
      (key) => {
        // Simple translation function for the receipt
        const translations: Record<string, string> = {
          'receipt.orderNumber': uiLanguage === 'fr' ? 'Commande No' : uiLanguage === 'tr' ? 'Sipariş No' : 'Order No',
          'receipt.orderType': uiLanguage === 'fr' ? 'Type de commande' : uiLanguage === 'tr' ? 'Sipariş Tipi' : 'Order Type',
          'receipt.dineIn': uiLanguage === 'fr' ? 'Sur place' : uiLanguage === 'tr' ? 'Masa Servisi' : 'Dine In',
          'receipt.takeaway': uiLanguage === 'fr' ? 'À emporter' : uiLanguage === 'tr' ? 'Paket Servisi' : 'Takeaway',
          'receipt.tableNumber': uiLanguage === 'fr' ? 'Table No' : uiLanguage === 'tr' ? 'Masa No' : 'Table No',
          'receipt.subtotal': uiLanguage === 'fr' ? 'Sous-total' : uiLanguage === 'tr' ? 'Ara Toplam' : 'Subtotal',
          'receipt.vat': uiLanguage === 'fr' ? 'TVA' : uiLanguage === 'tr' ? 'KDV' : 'VAT',
          'receipt.total': uiLanguage === 'fr' ? 'Total' : uiLanguage === 'tr' ? 'Toplam' : 'Total',
          'receipt.thankYou': uiLanguage === 'fr' ? 'Merci pour votre visite!' : uiLanguage === 'tr' ? 'Ziyaretiniz için teşekkürler!' : 'Thank you for your visit!',
          'receipt.specialInstructions': uiLanguage === 'fr' ? 'Instructions spéciales' : uiLanguage === 'tr' ? 'Özel Talimatlar' : 'Special Instructions'
        };
        return translations[key] || key;
      }
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md md:max-w-lg p-0 flex flex-col max-h-[85vh]">
        {/* Fixed Header */}
        <DialogHeader className="p-4 border-b flex-shrink-0">
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <DialogTitle className="text-xl font-bold">{t("orderSummary")}</DialogTitle>
          </div>
        </DialogHeader>
        
        {/* Scrollable Content Area */}
        <ScrollArea className="flex-grow overflow-auto p-6">
          <h3 className="font-bold text-lg mb-4">{t("orderedItems")}</h3>
          
          <div className="space-y-6 mb-6">
            {cart.map((item) => (
              <div key={item.id} className="space-y-2 border rounded-lg p-4 relative">
                {/* Item remove button - always visible */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => cartManager.removeItem(item.id)}
                  className="absolute top-2 right-2 h-6 w-6 text-red-500 hover:text-red-700"
                >
                  <Trash className="h-4 w-4" />
                </Button>

                <div className="flex justify-between items-start pr-8">
                  <div className="flex-1">
                    <span className="font-medium">{item.menuItem.name}</span>
                  </div>
                  <div className="flex items-center space-x-4">
                    {/* Quantity controls moved to right side */}
                    <div className="flex items-center space-x-1">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => cartManager.updateQuantity(item.id, item.quantity - 1)}
                        className="h-6 w-6"
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center font-medium">{item.quantity}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => cartManager.updateQuantity(item.id, item.quantity + 1)}
                        className="h-6 w-6"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <span className="font-medium">{parseFloat(item.itemPrice.toString()).toFixed(2)} €</span>
                  </div>
                </div>
                
                {(getFormattedOptions(item) || (item.selectedToppings?.length > 0)) && (
                  <div className="pl-6 space-y-1 text-sm text-gray-600">
                    {/* Options */}
                    {getFormattedOptions(item).split(', ').filter(Boolean).map((option, idx) => (
                      <div key={`${item.id}-option-${idx}`} className="flex justify-between">
                        <span>+ {option}</span>
                        <span>0.00 €</span>
                      </div>
                    ))}
                    
                    {/* Grouped toppings by category with individual removal */}
                    {getGroupedToppings(item).map((group, groupIdx) => (
                      <div key={`${item.id}-cat-summary-${groupIdx}`}>
                        <div style={{ fontWeight: 500, paddingLeft: 0 }}>{group.category}:</div>
                        {group.toppings.map((toppingObj, topIdx) => {
                          const category = item.menuItem.toppingCategories?.find(cat => cat.name === group.category);
                          
                          const displayName = getToppingDisplayName(toppingObj);
                          const quantity = getToppingQuantity(toppingObj);
                          
                          const toppingRef = category?.toppings.find(t => t.name === displayName);
                          const price = toppingRef ? parseFloat(toppingRef.price?.toString() ?? "0") : 0;
                          const totalPrice = price * quantity;
                          
                          return (
                            <div key={`${item.id}-cat-summary-${groupIdx}-topping-${topIdx}`} className="flex justify-between items-center">
                              <div className="flex items-center space-x-3">
                                <span style={{ paddingLeft: 6 }}>
                                  + {displayName}
                                </span>
                                {/* Topping quantity controls - only show if category allows multiple same topping */}
                                {category?.allow_multiple_same_topping && (
                                  <div className="flex items-center space-x-1">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => cartManager.updateToppingQuantity(item.id, category?.id || '', toppingRef?.id || '', quantity - 1)}
                                      className="h-6 w-6 p-0"
                                    >
                                      <Minus className="h-4 w-4" />
                                    </Button>
                                    <span className="w-6 text-center font-medium text-xs">{quantity}</span>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => cartManager.updateToppingQuantity(item.id, category?.id || '', toppingRef?.id || '', quantity + 1)}
                                      className="h-6 w-6 p-0"
                                    >
                                      <Plus className="h-4 w-4" />
                                    </Button>
                                  </div>
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => cartManager.removeToppingFromItem(item.id, category?.id || '', toppingRef?.id || '')}
                                  className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                                >
                                  <Trash className="h-4 w-4" />
                                </Button>
                              </div>
                              <span>{totalPrice > 0 ? totalPrice.toFixed(2) + " €" : ""}</span>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          
          <Separator className="my-4" />
          
          <div className="space-y-2">
            <div className="flex justify-between text-gray-600">
              <span>{t("totalHT")}</span>
              <span>{subtotal.toFixed(2)} €</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>{uiLanguage === "fr" ? t("vatWithRate") : t("vat")}</span>
              <span>{tax.toFixed(2)} €</span>
            </div>
            <Separator className="my-2" />
            <div className="flex justify-between font-bold text-lg">
              <span>{t("totalTTC")}</span>
              <span>{total.toFixed(2)} €</span>
            </div>
          </div>
        </ScrollArea>
        
        {/* Fixed Footer */}
        <div className="p-4 bg-gray-50 border-t flex-shrink-0">
          <Button 
            className="w-full bg-green-800 hover:bg-green-900 text-white py-6"
            onClick={handleConfirmOrder}
            disabled={placingOrder || cart.length === 0}
          >
            <Check className="mr-2 h-5 w-5" />
            {t("confirm")}
          </Button>
        </div>
      </DialogContent>

      <OrderReceipt
        restaurant={restaurant}
        cart={cart}
        orderNumber={orderNumber}
        tableNumber={tableNumber}
        orderType={orderType}
        getFormattedOptions={getFormattedOptions}
        getFormattedToppings={getFormattedToppings}
        uiLanguage={uiLanguage}
      />
    </Dialog>
  );
};

export default OrderSummary;
