
import { useState, useEffect } from "react";
import { Restaurant, OrderStatus } from "@/types/database-types";
import { supabase } from "@/integrations/supabase/client";
import { Clock, ChefHat, CheckCircle, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

type OrderItem = {
  name: string;
  quantity: number;
  price: number;
  options?: string[];
  specialInstructions?: string;
};

type Order = {
  id: string;
  restaurantId: string;
  status: OrderStatus;
  items: OrderItem[];
  total: number;
  date: Date;
  customerName?: string;
};

const statusColors = {
  pending: "bg-yellow-100 text-yellow-800",
  preparing: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800"
};

const statusIcons = {
  pending: <Clock className="h-4 w-4" />,
  preparing: <ChefHat className="h-4 w-4" />,
  completed: <CheckCircle className="h-4 w-4" />,
  cancelled: <XCircle className="h-4 w-4" />
};

interface OrdersTabProps {
  restaurant: Restaurant;
}

const OrdersTab = ({ restaurant }: OrdersTabProps) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const { data: ordersData, error: ordersError } = await supabase
          .from("orders")
          .select("*")
          .eq("restaurant_id", restaurant.id)
          .order("created_at", { ascending: false });

        if (ordersError) {
          throw ordersError;
        }

        const transformedOrders = await Promise.all(
          ordersData.map(async (order) => {
            // Fetch order items
            const { data: orderItems, error: itemsError } = await supabase
              .from("order_items")
              .select(`
                id,
                quantity,
                price,
                special_instructions,
                menu_items (
                  id,
                  name,
                  description
                )
              `)
              .eq("order_id", order.id);

            if (itemsError) {
              console.error("Error fetching order items:", itemsError);
              return null;
            }

            // Transform to expected format
            const items = orderItems.map(item => ({
              name: item.menu_items?.name || "Unknown Item",
              quantity: item.quantity,
              price: item.price,
              specialInstructions: item.special_instructions || undefined
            }));

            return {
              id: order.id,
              restaurantId: order.restaurant_id,
              status: order.status as OrderStatus,
              items,
              total: order.total,
              date: new Date(order.created_at),
              customerName: order.customer_name || undefined
            };
          })
        );

        // Filter out any null values (failed to fetch)
        setOrders(transformedOrders.filter(Boolean) as Order[]);
      } catch (error) {
        console.error("Error fetching orders:", error);
        toast({
          title: "Error",
          description: "Failed to load orders",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    if (restaurant?.id) {
      fetchOrders();
    }
  }, [restaurant.id, toast]);

  const handleUpdateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: newStatus })
        .eq("id", orderId);

      if (error) {
        throw error;
      }

      // Update local state
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId ? { ...order, status: newStatus } : order
        )
      );

      toast({
        title: "Status Updated",
        description: `Order ${orderId} status changed to ${newStatus}`,
      });
    } catch (error) {
      console.error("Error updating order status:", error);
      toast({
        title: "Error",
        description: "Failed to update order status",
        variant: "destructive"
      });
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Orders</h3>
      </div>
      
      <div className="rounded-md border">
        {loading ? (
          <div className="py-6 px-4 text-center">
            <p className="text-muted-foreground">Loading orders...</p>
          </div>
        ) : orders.length > 0 ? (
          <div className="space-y-4 p-4">
            {orders.map((order) => (
              <Card key={order.id} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex flex-col md:flex-row justify-between p-4 border-b bg-gray-50">
                    <div className="flex items-center space-x-4">
                      <div>
                        <p className="font-bold">{order.id}</p>
                        <p className="text-sm text-muted-foreground">
                          {order.customerName || "Guest Customer"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4 mt-4 md:mt-0">
                      <Badge 
                        className={`flex items-center space-x-1 ${statusColors[order.status]}`}
                        variant="outline"
                      >
                        {statusIcons[order.status]}
                        <span className="capitalize ml-1">{order.status}</span>
                      </Badge>
                      <p className="text-sm font-medium">{formatTime(order.date)}</p>
                      <p className="text-sm font-bold">${order.total.toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="p-4">
                    <p className="text-sm font-medium mb-2">Order Items:</p>
                    <div className="space-y-2">
                      {order.items.map((item, index) => (
                        <div key={index} className="flex justify-between text-sm">
                          <div>
                            <span className="font-medium">{item.quantity}x </span>
                            {item.name}
                            {item.specialInstructions && (
                              <span className="text-xs text-muted-foreground ml-2">
                                ({item.specialInstructions})
                              </span>
                            )}
                          </div>
                          <span>${(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 flex justify-end space-x-2">
                      {order.status === "pending" && (
                        <>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-blue-600"
                            onClick={() => handleUpdateOrderStatus(order.id, "preparing")}
                          >
                            <ChefHat className="mr-2 h-4 w-4" />
                            Start Preparing
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-red-600"
                            onClick={() => handleUpdateOrderStatus(order.id, "cancelled")}
                          >
                            <XCircle className="mr-2 h-4 w-4" />
                            Cancel Order
                          </Button>
                        </>
                      )}
                      {order.status === "preparing" && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="text-green-600"
                          onClick={() => handleUpdateOrderStatus(order.id, "completed")}
                        >
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Mark Completed
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="py-6 px-4 text-center">
            <p className="text-muted-foreground">No orders found.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrdersTab;
