
import { useState, useEffect } from "react";
import { Restaurant, OrderStatus } from "@/types/database-types";
import { supabase } from "@/integrations/supabase/client";
import { Clock, ChefHat, CheckCircle, XCircle, Trash2, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { updateOrderStatus } from "@/services/kiosk-service";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

type OrderItem = {
  name: string;
  quantity: number;
  price: number;
  options?: string[];
  specialInstructions?: string;
  toppings?: Array<{name: string, price: number}>;
};

type Order = {
  id: string;
  orderNumber: number;
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
  const [currentPage, setCurrentPage] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
  const ordersPerPage = 10;
  const { toast } = useToast();

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        
        const { count, error: countError } = await supabase
          .from("orders")
          .select("*", { count: 'exact', head: true })
          .eq("restaurant_id", restaurant.id);

        if (countError) {
          throw countError;
        }

        setTotalOrders(count || 0);

        const { data: ordersData, error: ordersError } = await supabase
          .from("orders")
          .select("*")
          .eq("restaurant_id", restaurant.id)
          .order("created_at", { ascending: false })
          .range((currentPage - 1) * ordersPerPage, currentPage * ordersPerPage - 1);

        if (ordersError) {
          throw ordersError;
        }

        const transformedOrders = await Promise.all(
          ordersData.map(async (order, index) => {
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

            const processedItems = await Promise.all(orderItems.map(async (item) => {
              let toppings: Array<{name: string, price: number}> = [];
              
              try {
                const { data: toppingLinks, error: toppingLinksError } = await supabase
                  .from("order_item_toppings")
                  .select("topping_id")
                  .eq("order_item_id", item.id);
                
                if (toppingLinksError) {
                  console.error("Error fetching topping links:", toppingLinksError);
                  throw toppingLinksError;
                }
                
                if (toppingLinks && toppingLinks.length > 0) {
                  const toppingIds = toppingLinks.map(link => link.topping_id);
                  
                  const { data: toppingDetails, error: toppingDetailsError } = await supabase
                    .from("toppings")
                    .select("name, price")
                    .in("id", toppingIds);
                  
                  if (toppingDetailsError) {
                    console.error("Error fetching topping details:", toppingDetailsError);
                    throw toppingDetailsError;
                  }
                  
                  if (toppingDetails) {
                    toppings = toppingDetails;
                  }
                }
              } catch (error) {
                console.error("Error processing toppings:", error);
              }
              
              return {
                name: item.menu_items?.name || "Unknown Item",
                quantity: item.quantity,
                price: item.price,
                specialInstructions: item.special_instructions || undefined,
                toppings: toppings.length > 0 ? toppings : undefined
              };
            }));

            const startOrderNumber = ((currentPage - 1) * ordersPerPage);
            return {
              id: order.id,
              orderNumber: totalOrders - (startOrderNumber + index),
              restaurantId: order.restaurant_id,
              status: order.status as OrderStatus,
              items: processedItems,
              total: order.total,
              date: new Date(order.created_at),
              customerName: order.customer_name || undefined
            };
          })
        );

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
  }, [restaurant.id, currentPage, toast, totalOrders]);

  const handleUpdateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      await updateOrderStatus(orderId, newStatus);

      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId ? { ...order, status: newStatus } : order
        )
      );

      toast({
        title: "Status Updated",
        description: `Order status changed to ${newStatus}`,
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

  const handleDeleteOrder = async () => {
    if (!orderToDelete) return;
    
    try {
      // First, delete related order_items
      const { data: orderItems, error: itemsError } = await supabase
        .from("order_items")
        .select("id")
        .eq("order_id", orderToDelete);
        
      if (itemsError) {
        throw itemsError;
      }
      
      // Delete order_item_toppings and order_item_options for each item
      if (orderItems && orderItems.length > 0) {
        const itemIds = orderItems.map(item => item.id);
        
        // Delete order_item_toppings
        await supabase
          .from("order_item_toppings")
          .delete()
          .in("order_item_id", itemIds);
          
        // Delete order_item_options
        await supabase
          .from("order_item_options")
          .delete()
          .in("order_item_id", itemIds);
      }
      
      // Delete order_items
      await supabase
        .from("order_items")
        .delete()
        .eq("order_id", orderToDelete);
      
      // Finally delete the order
      const { error } = await supabase
        .from("orders")
        .delete()
        .eq("id", orderToDelete);
        
      if (error) throw error;
      
      // Remove the deleted order from the state
      setOrders(prevOrders => prevOrders.filter(order => order.id !== orderToDelete));
      
      // Decrement total orders count
      setTotalOrders(prev => prev - 1);
      
      toast({
        title: "Order Deleted",
        description: "The order has been deleted successfully",
      });
      
    } catch (error) {
      console.error("Error deleting order:", error);
      toast({
        title: "Error",
        description: "Failed to delete order",
        variant: "destructive"
      });
    } finally {
      setOrderToDelete(null);
      setIsDeleteDialogOpen(false);
    }
  };

  const openDeleteDialog = (orderId: string) => {
    setOrderToDelete(orderId);
    setIsDeleteDialogOpen(true);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  const formatDate = (date: Date) => {
    return date.toLocaleDateString([], { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // Function to get visible page numbers based on current page
  const getVisiblePageNumbers = () => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    
    if (currentPage <= 3) {
      return [1, 2, 3, 4, 5];
    }
    
    if (currentPage >= totalPages - 2) {
      return [
        totalPages - 4,
        totalPages - 3,
        totalPages - 2,
        totalPages - 1,
        totalPages
      ];
    }
    
    return [
      currentPage - 2,
      currentPage - 1,
      currentPage,
      currentPage + 1,
      currentPage + 2
    ];
  };

  const totalPages = Math.ceil(totalOrders / ordersPerPage);

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
                        <p className="font-bold">Order #{order.orderNumber}</p>
                        <p className="text-xs text-gray-500">{order.id}</p>
                        <p className="text-sm text-muted-foreground">
                          {order.customerName || "Guest Customer"}
                        </p>
                        <div className="flex items-center space-x-1 mt-1 text-xs text-gray-500">
                          <Calendar className="h-3 w-3" />
                          <span>{formatDate(order.date)}</span>
                        </div>
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
                      <p className="text-sm font-bold">{order.total.toFixed(2)} €</p>
                    </div>
                  </div>
                  <div className="p-4">
                    <p className="text-sm font-medium mb-2">Order Items:</p>
                    <div className="space-y-3">
                      {order.items.map((item, index) => (
                        <div key={index} className="border-b pb-2 last:border-0 last:pb-0">
                          <div className="flex justify-between text-sm">
                            <div>
                              <span className="font-medium">{item.quantity}x </span>
                              {item.name}
                            </div>
                            <span>{(item.price * item.quantity).toFixed(2)} €</span>
                          </div>
                          
                          {item.toppings && item.toppings.length > 0 && (
                            <div className="mt-1 ml-5 text-xs text-gray-600">
                              <p className="font-medium">Toppings:</p>
                              <ul className="pl-2 space-y-1">
                                {item.toppings.map((topping, idx) => (
                                  <li key={idx} className="flex justify-between">
                                    <span>{topping.name}</span>
                                    <span>{topping.price.toFixed(2)} €</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          
                          {item.specialInstructions && (
                            <div className="mt-1 ml-5 text-xs text-gray-500 italic">
                              Note: {item.specialInstructions}
                            </div>
                          )}
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
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-red-600"
                        onClick={() => openDeleteDialog(order.id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </Button>
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
        
        {totalPages > 1 && (
          <div className="px-4 py-4 border-t">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  />
                </PaginationItem>
                
                {getVisiblePageNumbers().map((pageNumber) => (
                  <PaginationItem key={pageNumber} className="hidden xs:block">
                    <PaginationLink
                      onClick={() => setCurrentPage(pageNumber)}
                      isActive={currentPage === pageNumber}
                    >
                      {pageNumber}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                
                {/* Only show current page indicator on very small screens */}
                <PaginationItem className="xs:hidden text-sm">
                  <span className="px-2">
                    {currentPage} / {totalPages}
                  </span>
                </PaginationItem>
                
                <PaginationItem>
                  <PaginationNext
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </div>
      
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Order</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this order? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteOrder} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default OrdersTab;
