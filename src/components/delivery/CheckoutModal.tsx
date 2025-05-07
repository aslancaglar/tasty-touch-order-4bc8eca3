
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CartItem, Restaurant, UserAddress } from "@/types/database-types";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { createOrder, createOrderItems, createOrderItemToppings, createOrderItemOptions } from "@/services/kiosk-service";
import { Loader2, PlusCircle } from "lucide-react";
import AddressForm from "./AddressForm";
import { format, addMinutes, addHours, isAfter, parseISO } from "date-fns";

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  cart: CartItem[];
  restaurant: Restaurant | null;
  userAddresses: UserAddress[];
  user: User | null;
  setPlacingOrder: (placing: boolean) => void;
  calculateSubtotal: () => number;
  calculateTax: () => number;
  currencySymbol: string;
}

type TimeSlot = {
  label: string;
  value: string;
};

export default function CheckoutModal({
  isOpen,
  onClose,
  onSuccess,
  cart,
  restaurant,
  userAddresses,
  user,
  setPlacingOrder,
  calculateSubtotal,
  calculateTax,
  currencySymbol
}: CheckoutModalProps) {
  const [orderType, setOrderType] = useState<"delivery" | "takeaway">("takeaway");
  const [selectedAddressId, setSelectedAddressId] = useState<string>("");
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>("");
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);
  
  const { toast } = useToast();

  // Find default address from user addresses
  useEffect(() => {
    if (userAddresses.length > 0) {
      const defaultAddress = userAddresses.find(addr => addr.is_default);
      setSelectedAddressId(defaultAddress ? defaultAddress.id : userAddresses[0].id);
    }
  }, [userAddresses]);
  
  // Generate available time slots
  useEffect(() => {
    const slots: TimeSlot[] = [];
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    // Restaurant opens from 10 AM to 10 PM (example)
    const openingHour = 10;
    const closingHour = 22;
    
    // Minimum preparation time: 30 minutes
    const minPreparationMinutes = 30;
    
    // Calculate earliest pickup time (now + minimum preparation time)
    const earliestTime = addMinutes(now, minPreparationMinutes);
    
    // Generate slots in 15-minute increments
    for (let hour = openingHour; hour < closingHour; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const slotTime = new Date();
        slotTime.setHours(hour, minute, 0, 0);
        
        // Only include slots that are after the earliest possible time
        if (isAfter(slotTime, earliestTime)) {
          const timeString = format(slotTime, "HH:mm");
          const label = format(slotTime, "h:mm a");
          slots.push({
            label,
            value: timeString
          });
        }
      }
    }
    
    setTimeSlots(slots);
    
    // Set default time slot to the first available slot
    if (slots.length > 0 && !selectedTimeSlot) {
      setSelectedTimeSlot(slots[0].value);
    }
  }, []);

  const handleAddressSuccess = (address: UserAddress) => {
    setSelectedAddressId(address.id);
    setShowAddressForm(false);
  };

  const handleSubmit = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to place an order",
        variant: "destructive",
      });
      return;
    }

    if (!restaurant) {
      toast({
        title: "Error",
        description: "Restaurant information is missing",
        variant: "destructive",
      });
      return;
    }

    if (orderType === "delivery" && !selectedAddressId) {
      toast({
        title: "Delivery address required",
        description: "Please select a delivery address",
        variant: "destructive",
      });
      return;
    }

    if (!selectedTimeSlot) {
      toast({
        title: "Time slot required",
        description: "Please select a pickup or delivery time",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setPlacingOrder(true);

    try {
      // Get user profile info
      const { data: userData, error: userError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (userError) throw userError;

      // Calculate order total
      const subtotal = calculateSubtotal();
      const tax = calculateTax();
      const total = subtotal + tax;

      // Create order
      const orderData = {
        restaurant_id: restaurant.id,
        customer_id: user.id,
        customer_name: `${userData.first_name} ${userData.last_name}`,
        customer_phone: userData.phone,
        status: 'pending',
        total,
        order_type: orderType,
        delivery_address: orderType === 'delivery' ? selectedAddressId : null,
        scheduled_time: new Date().toISOString(), // Would need proper parsing from selectedTimeSlot
        delivery_notes: deliveryNotes
      };

      const order = await createOrder(orderData);

      // Create order items
      const orderItems = await Promise.all(
        cart.map(async (item) => {
          const orderItem = {
            order_id: order.id,
            menu_item_id: item.menuItem.id,
            quantity: item.quantity,
            price: item.itemPrice,
            special_instructions: item.specialInstructions || null
          };
          
          const createdItems = await createOrderItems([orderItem]);
          const createdItem = createdItems[0];
          
          // Add options for this item
          if (item.selectedOptions && item.selectedOptions.length > 0) {
            const orderItemOptions = [];
            
            for (const option of item.selectedOptions) {
              for (const choiceId of option.choiceIds) {
                orderItemOptions.push({
                  order_item_id: createdItem.id,
                  option_id: option.optionId,
                  choice_id: choiceId
                });
              }
            }
            
            if (orderItemOptions.length > 0) {
              await createOrderItemOptions(orderItemOptions);
            }
          }
          
          // Add toppings for this item
          if (item.selectedToppings && item.selectedToppings.length > 0) {
            const orderItemToppings = [];
            
            for (const topping of item.selectedToppings) {
              for (const toppingId of topping.toppingIds) {
                orderItemToppings.push({
                  order_item_id: createdItem.id,
                  topping_id: toppingId
                });
              }
            }
            
            if (orderItemToppings.length > 0) {
              await createOrderItemToppings(orderItemToppings);
            }
          }
          
          return createdItem;
        })
      );

      // Order placed successfully
      setPlacingOrder(false);
      onSuccess();
      
    } catch (error) {
      console.error("Error placing order:", error);
      setPlacingOrder(false);
      setLoading(false);
      
      toast({
        title: "Order failed",
        description: "There was a problem placing your order. Please try again.",
        variant: "destructive",
      });
    }
  };

  const subtotal = calculateSubtotal();
  const tax = calculateTax();
  const total = subtotal + tax;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Checkout</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Order type selection */}
          <div className="space-y-2">
            <Label>Order Type</Label>
            <RadioGroup 
              defaultValue="takeaway" 
              value={orderType}
              onValueChange={(value) => setOrderType(value as "delivery" | "takeaway")}
              className="flex space-x-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="takeaway" id="takeaway" />
                <Label htmlFor="takeaway">Pickup / Takeaway</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="delivery" id="delivery" />
                <Label htmlFor="delivery">Delivery</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Delivery address section */}
          {orderType === "delivery" && (
            <div className="space-y-4">
              <Label>Delivery Address</Label>
              {!showAddressForm && (
                <>
                  {userAddresses.length > 0 ? (
                    <Select value={selectedAddressId} onValueChange={setSelectedAddressId}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select an address" />
                      </SelectTrigger>
                      <SelectContent>
                        {userAddresses.map((address) => (
                          <SelectItem key={address.id} value={address.id}>
                            {address.street}, {address.city}, {address.postal_code}
                            {address.is_default && " (Default)"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-sm text-muted-foreground">No saved addresses</p>
                  )}
                  <Button 
                    type="button"
                    variant="outline"
                    onClick={() => setShowAddressForm(true)}
                    className="w-full"
                  >
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Add New Address
                  </Button>
                </>
              )}

              {showAddressForm && user && (
                <div className="border p-4 rounded-md">
                  <h3 className="text-lg font-medium mb-4">
                    {selectedAddressId && userAddresses.some(a => a.id === selectedAddressId) 
                      ? "Edit Address" 
                      : "Add New Address"
                    }
                  </h3>
                  <AddressForm 
                    userId={user.id} 
                    existingAddress={userAddresses.find(a => a.id === selectedAddressId)} 
                    onSuccess={handleAddressSuccess} 
                  />
                  <Button 
                    type="button" 
                    variant="ghost" 
                    onClick={() => setShowAddressForm(false)}
                    className="mt-2"
                  >
                    Cancel
                  </Button>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="deliveryNotes">Delivery Instructions (Optional)</Label>
                <Textarea 
                  id="deliveryNotes"
                  placeholder="Any special instructions for delivery"
                  value={deliveryNotes}
                  onChange={(e) => setDeliveryNotes(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Time selection */}
          <div className="space-y-2">
            <Label htmlFor="timeSlot">
              {orderType === "delivery" ? "Delivery Time" : "Pickup Time"}
            </Label>
            <Select value={selectedTimeSlot} onValueChange={setSelectedTimeSlot}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select time" />
              </SelectTrigger>
              <SelectContent>
                {timeSlots.map((slot) => (
                  <SelectItem key={slot.value} value={slot.value}>
                    {slot.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Order summary */}
          <div>
            <h3 className="text-lg font-medium mb-2">Order Summary</h3>
            <div className="bg-gray-50 p-4 rounded-md space-y-2">
              {cart.map((item) => (
                <div key={item.id} className="flex justify-between">
                  <div>
                    <p>{item.quantity} × {item.menuItem.name}</p>
                  </div>
                  <p>{item.itemPrice.toFixed(2)} {currencySymbol}</p>
                </div>
              ))}
              <Separator className="my-2" />
              <div className="flex justify-between">
                <p>Subtotal</p>
                <p>{subtotal.toFixed(2)} {currencySymbol}</p>
              </div>
              <div className="flex justify-between">
                <p>Tax</p>
                <p>{tax.toFixed(2)} {currencySymbol}</p>
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between font-bold">
                <p>Total</p>
                <p>{total.toFixed(2)} {currencySymbol}</p>
              </div>
            </div>
          </div>

          <Button 
            onClick={handleSubmit}
            disabled={loading}
            className="w-full"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Place Order
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
