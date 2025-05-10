import React, { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Check, X, CreditCard, Banknote, Loader2 } from "lucide-react";
import { CartItem } from "@/types/database-types";
import OrderReceipt from "./OrderReceipt";
import { printReceipt } from "@/utils/print-utils";
import { supabase } from "@/integrations/supabase/client";
import { calculateCartTotals } from "@/utils/price-utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { generateStandardReceipt, getGroupedToppings } from "@/utils/receipt-templates";
import { useToast } from "@/hooks/use-toast";
import { useTranslation, SupportedLanguage } from "@/utils/language-utils";

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

const translations = {
  fr: {
    orderSummary: "Résumé de la commande",
    orderedItems: "Articles commandés",
    totalHT: "Total HT",
    vatWithRate: "TVA",
    vat: "TVA",
    totalTTC: "TOTAL TTC",
    confirm: "CONFIRMER LA COMMANDE",
    printing: "Impression",
    printingPreparation: "Préparation de l'impression...",
    printError: "Erreur d'impression",
    printErrorDesc: "Impossible d'imprimer le reçu. Veuillez réessayer.",
    error: "Erreur",
    errorPrinting: "Une erreur s'est produite lors de l'impression du reçu.",
    paymentError: "Erreur de paiement",
    paymentErrorDesc: "Un problème est survenu lors du paiement. Veuillez réessayer ou choisir un autre mode de paiement.",
    payWithCard: "PAYER PAR CARTE",
    payWithCash: "PAYER EN ESPÈCES",
    processingPayment: "TRAITEMENT DU PAIEMENT...",
    waitingForTerminal: "En attente du terminal de paiement..."
  },
  en: {
    orderSummary: "Order Summary",
    orderedItems: "Ordered Items",
    totalHT: "Subtotal",
    vatWithRate: "VAT",
    vat: "VAT",
    totalTTC: "TOTAL",
    confirm: "CONFIRM ORDER",
    printing: "Printing",
    printingPreparation: "Preparing to print...",
    printError: "Print Error",
    printErrorDesc: "Unable to print receipt. Please try again.",
    error: "Error",
    errorPrinting: "An error occurred while printing the receipt.",
    paymentError: "Payment Error",
    paymentErrorDesc: "There was a problem initiating the payment. Please try again or choose another payment method.",
    payWithCard: "PAY WITH CARD",
    payWithCash: "PAY WITH CASH",
    processingPayment: "PROCESSING PAYMENT...",
    waitingForTerminal: "Waiting for payment terminal..."
  },
  tr: {
    orderSummary: "Sipariş Özeti",
    orderedItems: "Sipariş Edilen Ürünler",
    totalHT: "Ara Toplam",
    vatWithRate: "KDV",
    vat: "KDV",
    totalTTC: "TOPLAM",
    confirm: "SİPARİŞİ ONAYLA",
    printing: "Yazdırılıyor",
    printingPreparation: "Yazdırma hazırlanıyor...",
    printError: "Yazdırma Hatası",
    printErrorDesc: "Fiş yazdırılamadı. Lütfen tekrar deneyin.",
    error: "Hata",
    errorPrinting: "Fiş yazdırılırken bir hata oluştu.",
    paymentError: "Ödeme Hatası",
    paymentErrorDesc: "Ödeme başlatılırken bir sorun oluştu. Lütfen tekrar deneyin veya başka bir ödeme yöntemi seçin.",
    payWithCard: "KART İLE ÖDE",
    payWithCash: "NAKİT İLE ÖDE",
    processingPayment: "ÖDEME İŞLENİYOR...",
    waitingForTerminal: "Ödeme terminali bekleniyor..."
  }
};

interface OrderSummaryProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
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
    currency?: string;
    card_payment_enabled?: boolean;
    cash_payment_enabled?: boolean;
  } | null;
  orderType?: "dine-in" | "takeaway" | null;
  tableNumber?: string | null;
  uiLanguage?: SupportedLanguage;
}

const OrderSummary: React.FC<OrderSummaryProps> = ({
  isOpen,
  onClose,
  cart,
  onPlaceOrder,
  placingOrder,
  calculateSubtotal,
  calculateTax,
  getFormattedOptions,
  getFormattedToppings,
  restaurant = {
    name: "Restaurant"
  },
  orderType = null,
  tableNumber = null,
  uiLanguage = "fr"
}) => {
  const [orderNumber, setOrderNumber] = useState<string>("0");
  const [paymentMethod, setPaymentMethod] = useState<"card" | "cash" | null>(null);
  const [processingCardPayment, setProcessingCardPayment] = useState<boolean>(false);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const { t } = useTranslation(uiLanguage);
  
  const { total, subtotal, tax } = calculateCartTotals(cart);
  
  const showPaymentOptions = restaurant?.card_payment_enabled || restaurant?.cash_payment_enabled;

  useEffect(() => {
    console.log("OrderSummary mounted, isMobile:", isMobile, "userAgent:", navigator.userAgent);
    const fetchOrderCount = async () => {
      if (restaurant?.id) {
        try {
          const { count, error } = await supabase.from('orders').select('*', {
            count: 'exact',
            head: true
          }).eq('restaurant_id', restaurant.id);
          
          if (error) {
            console.error("Error fetching order count:", error);
            return;
          }
          
          setOrderNumber(((count || 0) + 1).toString());
        } catch (err) {
          console.error("Exception when fetching order count:", err);
        }
      }
    };
    fetchOrderCount();
  }, [restaurant?.id, isMobile]);

  // Check payment status periodically if card payment is in progress
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    
    if (processingCardPayment && paymentId) {
      interval = setInterval(async () => {
        try {
          console.log("Checking payment status for paymentId:", paymentId);
          const { data: payment, error } = await supabase
            .from('payments')
            .select('status, pos_response')
            .eq('id', paymentId)
            .single();
          
          if (error) {
            console.error("Error checking payment status:", error);
            return;
          }
          
          console.log("Payment status check result:", payment);
          
          if (payment && payment.status === 'approved') {
            clearInterval(interval);
            setProcessingCardPayment(false);
            
            // Complete the order
            handleConfirmOrder("card");
            
            toast({
              title: "Payment Approved",
              description: "Your card payment has been processed successfully.",
              variant: "default"
            });
          } else if (payment && payment.status === 'declined') {
            clearInterval(interval);
            setProcessingCardPayment(false);
            
            toast({
              title: "Payment Declined",
              description: payment.pos_response || "Your card payment was declined.",
              variant: "destructive"
            });
          }
          // Continue polling if status is still 'pending'
        } catch (error) {
          console.error("Error in payment status check:", error);
        }
      }, 2000); // Check every 2 seconds
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [processingCardPayment, paymentId]);

  const handleCardPayment = async () => {
    // Prevent multiple clicks
    if (processingCardPayment) {
      console.log("Payment already processing, ignoring click");
      return;
    }
    
    try {
      console.log("Starting card payment process...");
      setProcessingCardPayment(true);
      
      // Create a payment record in the database
      const { data: payment, error } = await supabase
        .from('payments')
        .insert({
          amount: total,
          status: 'pending'
        })
        .select()
        .single();
      
      if (error) {
        console.error("Error creating payment record:", error);
        toast({
          title: translations[uiLanguage]?.paymentError || "Payment Error",
          description: translations[uiLanguage]?.paymentErrorDesc || "There was a problem initiating the payment.",
          variant: "destructive"
        });
        setProcessingCardPayment(false);
        return;
      }
      
      if (!payment) {
        console.error("No payment data returned after insert");
        toast({
          title: translations[uiLanguage]?.paymentError || "Payment Error",
          description: translations[uiLanguage]?.paymentErrorDesc || "There was a problem initiating the payment.",
          variant: "destructive"
        });
        setProcessingCardPayment(false);
        return;
      }
      
      console.log("Payment record created:", payment);
      setPaymentId(payment.id);
      
      // In a real environment, this would trigger a POS terminal
      // For demo/development, we'll simulate payment approval after a delay
      setTimeout(async () => {
        try {
          console.log("Simulating payment approval...");
          const { error: updateError } = await supabase
            .from('payments')
            .update({ status: 'approved' })
            .eq('id', payment.id);
            
          if (updateError) {
            console.error("Error updating payment status:", updateError);
            // The useEffect polling will handle this case
          }
        } catch (simError) {
          console.error("Error simulating payment approval:", simError);
        }
      }, 5000); // Simulate a 5-second payment process
      
      toast({
        title: translations[uiLanguage]?.waitingForTerminal || "Waiting for payment terminal",
        description: "Please complete the payment on the terminal.",
        duration: 5000
      });
      
      // Payment status will be checked by the useEffect above
      
    } catch (error) {
      console.error("Error processing card payment:", error);
      setProcessingCardPayment(false);
      toast({
        title: translations[uiLanguage]?.paymentError || "Payment Error",
        description: translations[uiLanguage]?.paymentErrorDesc || "There was a problem with your payment.",
        variant: "destructive"
      });
    }
  };

  const handleConfirmOrder = async (selectedPaymentMethod?: "card" | "cash") => {
    if (selectedPaymentMethod) {
      setPaymentMethod(selectedPaymentMethod);
    }
    
    onPlaceOrder();
    
    if (restaurant?.id) {
      try {
        console.log("Device info - Width:", window.innerWidth, "isMobile:", isMobile, "userAgent:", navigator.userAgent);
        const { data: printConfig, error } = await supabase.from('restaurant_print_config').select('api_key, configured_printers, browser_printing_enabled').eq('restaurant_id', restaurant.id).single();
        if (error) {
          console.error("Error fetching print configuration:", error);
          return;
        }
        const shouldUseBrowserPrinting = !isMobile && (printConfig === null || printConfig.browser_printing_enabled !== false);
        if (shouldUseBrowserPrinting) {
          console.log("Using browser printing for receipt");
          toast({
            title: t("order.printing"),
            description: t("order.printingPreparation")
          });
          setTimeout(() => {
            try {
              printReceipt('receipt-content');
              console.log("Print receipt triggered successfully");
            } catch (printError) {
              console.error("Error during browser printing:", printError);
              toast({
                title: t("order.printError"),
                description: t("order.printErrorDesc"),
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
        if (printConfig?.api_key && printConfig?.configured_printers) {
          const printerArray = Array.isArray(printConfig.configured_printers) ? printConfig.configured_printers : [];
          const printerIds = printerArray.map(id => String(id));
          if (printerIds.length > 0) {
            await sendReceiptToPrintNode(printConfig.api_key, printerIds, {
              restaurant,
              cart,
              orderNumber,
              tableNumber,
              orderType,
              paymentMethod: selectedPaymentMethod || paymentMethod,
              subtotal,
              tax,
              total,
              getFormattedOptions,
              getFormattedToppings
            });
          }
        }
      } catch (error) {
        console.error("Error during receipt printing:", error);
        toast({
          title: t("order.error"),
          description: t("order.errorPrinting"),
          variant: "destructive"
        });
      }
    }
  };

  const sendReceiptToPrintNode = async (apiKey: string, printerIds: string[], orderData: {
    restaurant: typeof restaurant;
    cart: CartItem[];
    orderNumber: string;
    tableNumber?: string | null;
    orderType: "dine-in" | "takeaway" | null;
    paymentMethod?: "card" | "cash" | null;
    subtotal: number;
    tax: number;
    total: number;
    getFormattedOptions: (item: CartItem) => string;
    getFormattedToppings: (item: CartItem) => string;
  }) => {
    try {
      const receiptContent = generatePrintNodeReceipt(orderData);
      const textEncoder = new TextEncoder();
      const encodedBytes = textEncoder.encode(receiptContent);
      const encodedContent = btoa(Array.from(encodedBytes).map(byte => String.fromCharCode(byte)).join(''));
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
    paymentMethod?: "card" | "cash" | null;
    subtotal: number;
    tax: number;
    total: number;
    getFormattedOptions: (item: CartItem) => string;
    getFormattedToppings: (item: CartItem) => string;
  }): string => {
    return generateStandardReceipt({
      restaurant: orderData.restaurant,
      cart: orderData.cart,
      orderNumber: orderData.orderNumber,
      tableNumber: orderData.tableNumber,
      orderType: orderData.orderType,
      paymentMethod: orderData.paymentMethod,
      subtotal: orderData.subtotal,
      tax: orderData.tax,
      total: orderData.total,
      getFormattedOptions: orderData.getFormattedOptions,
      getFormattedToppings: orderData.getFormattedToppings,
      uiLanguage,
      useCurrencyCode: true
    });
  };

  const currencySymbol = getCurrencySymbol(restaurant?.currency || "EUR");
  
  return <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="sm:max-w-xl md:max-w-2xl lg:max-w-3xl p-0 w-[95vw] max-w-[95vw] flex flex-col max-h-[90vh] overflow-hidden">
        {/* Fixed Header */}
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white z-10">
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-xl font-bold">{t("order.summary")}</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full h-10 w-10 bg-red-100 hover:bg-red-200">
            <X className="h-5 w-5 text-red-600" />
          </Button>
        </div>
        
        {/* Scrollable Content */}
        <div className="overflow-y-auto p-6 pb-[180px]">
          <h3 className="font-bold text-xl mb-6">{t("order.items")}</h3>
          
          <div className="space-y-6 mb-6">
            {cart.map(item => <div key={item.id} className="space-y-2 border-b pb-4">
                <div className="flex justify-between">
                  <div className="flex items-center">
                    <span className="font-medium mr-2">{item.quantity}x</span>
                    <span className="font-medium">{item.menuItem.name}</span>
                  </div>
                  <span className="font-medium">{parseFloat(item.itemPrice.toString()).toFixed(2)} {currencySymbol}</span>
                </div>
                
                {(getFormattedOptions(item) || item.selectedToppings?.length > 0) && <div className="pl-6 space-y-1 text-sm text-gray-600">
                    {getFormattedOptions(item).split(', ').filter(Boolean).map((option, idx) => <div key={`${item.id}-option-${idx}`} className="flex justify-between">
                        <span>+ {option}</span>
                        <span>0.00 {currencySymbol}</span>
                      </div>)}
                    
                    {getGroupedToppings(item).map((group, groupIdx) => <div key={`${item.id}-cat-summary-${groupIdx}`}>
                        <div style={{
                  fontWeight: 500,
                  paddingLeft: 0
                }}>{group.category}:</div>
                        {group.toppings.map((toppingObj, topIdx) => {
                  const category = item.menuItem.toppingCategories?.find(cat => cat.name === group.category);
                  const toppingRef = category?.toppings.find(t => t.name === toppingObj);
                  const price = toppingRef ? parseFloat(toppingRef.price?.toString() ?? "0") : 0;
                  const toppingTaxRate = toppingRef?.tax_percentage ?? item.menuItem.tax_percentage ?? 10;
                  return <div key={`${item.id}-cat-summary-${groupIdx}-topping-${topIdx}`} className="flex justify-between">
                              <span style={{
                      paddingLeft: 6
                    }}>
                                + {toppingObj}
                                {toppingTaxRate !== (item.menuItem.tax_percentage ?? 10) && <span className="text-xs text-gray-500 ml-1">(TVA {toppingTaxRate}%)</span>}
                              </span>
                              <span>{price > 0 ? price.toFixed(2) + " " + currencySymbol : ""}</span>
                            </div>;
                })}
                      </div>)}
                  </div>}
              </div>)}
          </div>
        </div>
        
        {/* Fixed Footer */}
        <div className="border-t fixed bottom-0 left-0 right-0 bg-white z-10 w-full sm:max-w-xl md:max-w-2xl lg:max-w-3xl mx-auto">
          <div className="p-4 space-y-2">
            <div className="flex justify-between text-gray-700">
              <span>{t("order.subtotal")}</span>
              <span>{subtotal.toFixed(2)} {currencySymbol}</span>
            </div>
            <div className="flex justify-between text-gray-700">
              <span>{uiLanguage === "fr" ? t("order.vatWithRate") : t("order.vat")}</span>
              <span>{tax.toFixed(2)} {currencySymbol}</span>
            </div>
            <Separator className="my-2" />
            <div className="flex justify-between font-bold text-lg">
              <span>{t("order.totalTTC")}</span>
              <span>{total.toFixed(2)} {currencySymbol}</span>
            </div>

            {showPaymentOptions ? (
              <div className="grid grid-cols-2 gap-4 mt-4">
                {restaurant?.card_payment_enabled && (
                  <Button 
                    onClick={processingCardPayment ? undefined : handleCardPayment} 
                    disabled={placingOrder || processingCardPayment} 
                    className="bg-blue-600 hover:bg-blue-700 text-white uppercase font-medium text-2xl py-6"
                  >
                    {processingCardPayment ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        {translations[uiLanguage]?.processingPayment || "PROCESSING PAYMENT..."}
                      </>
                    ) : (
                      <>
                        <CreditCard className="mr-2 h-5 w-5" />
                        {translations[uiLanguage]?.payWithCard || "PAY WITH CARD"}
                      </>
                    )}
                  </Button>
                )}
                
                {restaurant?.cash_payment_enabled && (
                  <Button 
                    onClick={() => handleConfirmOrder("cash")} 
                    disabled={placingOrder || processingCardPayment} 
                    className="bg-green-700 hover:bg-green-800 text-white uppercase font-medium text-2xl py-6"
                  >
                    <Banknote className="mr-2 h-5 w-5" />
                    {translations[uiLanguage]?.payWithCash || "PAY WITH CASH"}
                  </Button>
                )}
              </div>
            ) : (
              <Button onClick={() => handleConfirmOrder()} disabled={placingOrder} className="w-full bg-green-800 hover:bg-green-700 text-white uppercase mt-4 font-medium text-4xl py-8">
                <Check className="mr-2 h-5 w-5" />
                {t("order.confirm")}
              </Button>
            )}
          </div>
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
        paymentMethod={paymentMethod} 
      />
    </Dialog>;
};

export default OrderSummary;
