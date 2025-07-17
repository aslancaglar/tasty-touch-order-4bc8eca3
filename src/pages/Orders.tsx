
import { useState, useEffect } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Clock,
  CheckCircle,
  XCircle,
  ChefHat,
  Download,
  Search,
  Calendar,
  Trash2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
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

type OrderStatus = "pending" | "preparing" | "completed" | "cancelled";

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
  restaurantName: string;
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

const Orders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRestaurant, setSelectedRestaurant] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
  const ordersPerPage = 10;
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch restaurants first
        const { data: restaurantsData, error: restaurantsError } = await supabase
          .from("restaurants")
          .select("id, name");

        if (restaurantsError) {
          throw restaurantsError;
        }

        setRestaurants(restaurantsData || []);

        // Get count of all orders (excluding cancelled for non-admin users)
        const { count, error: countError } = await supabase
          .from("orders")
          .select("*", { count: 'exact', head: true });

        if (countError) {
          throw countError;
        }

        setTotalOrders(count || 0);

        // Fetch orders with pagination
        const { data: ordersData, error: ordersError } = await supabase
          .from("orders")
          .select(`
            *,
            restaurants (
              id,
              name
            )
          `)
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
              restaurantName: order.restaurants?.name || "Unknown Restaurant",
              status: order.status as OrderStatus,
              items: processedItems,
              total: order.total,
              date: new Date(order.created_at),
              customerName: order.customer_name || undefined
            };
          })
        );

        const validOrders = transformedOrders.filter(Boolean) as Order[];
        setAllOrders(validOrders);
        setOrders(validOrders);
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

    fetchData();
  }, [currentPage, toast, totalOrders]);

  // Filter orders based on search and restaurant selection
  useEffect(() => {
    let filteredOrders = allOrders;

    if (searchTerm) {
      filteredOrders = filteredOrders.filter(order =>
        order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.restaurantName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedRestaurant !== "all") {
      filteredOrders = filteredOrders.filter(order => order.restaurantId === selectedRestaurant);
    }

    setOrders(filteredOrders);
  }, [searchTerm, selectedRestaurant, allOrders]);

  const handleUpdateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      await updateOrderStatus(orderId, newStatus);

      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId ? { ...order, status: newStatus } : order
        )
      );

      setAllOrders(prevOrders => 
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
      setAllOrders(prevOrders => prevOrders.filter(order => order.id !== orderToDelete));
      
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

  const getFilteredOrders = (status?: string) => {
    if (!status) return orders;
    return orders.filter(order => order.status === status);
  };

  const renderOrderCard = (order: Order) => (
    <Card key={order.id} className="overflow-hidden">
      <CardContent className="p-0">
        <div className="flex flex-col md:flex-row justify-between p-4 border-b bg-gray-50">
          <div className="flex items-center space-x-4">
            <div>
              <p className="font-bold">Order #{order.orderNumber}</p>
              <p className="text-xs text-gray-500">{order.id}</p>
              <p className="text-sm text-muted-foreground">{order.restaurantName}</p>
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
  );

  const totalPages = Math.ceil(totalOrders / ordersPerPage);

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Orders</h1>
        <p className="text-muted-foreground">Manage and track all your customer orders</p>
      </div>

      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search orders..." 
            className="pl-10" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={selectedRestaurant} onValueChange={setSelectedRestaurant}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Restaurants" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Restaurants</SelectItem>
            {restaurants.map((restaurant) => (
              <SelectItem key={restaurant.id} value={restaurant.id}>
                {restaurant.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" className="sm:w-auto">
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Order Management</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all">
            <TabsList className="mb-4">
              <TabsTrigger value="all">All Orders ({orders.length})</TabsTrigger>
              <TabsTrigger value="pending">
                <Clock className="mr-2 h-4 w-4" />
                Pending ({getFilteredOrders("pending").length})
              </TabsTrigger>
              <TabsTrigger value="preparing">
                <ChefHat className="mr-2 h-4 w-4" />
                Preparing ({getFilteredOrders("preparing").length})
              </TabsTrigger>
              <TabsTrigger value="completed">
                <CheckCircle className="mr-2 h-4 w-4" />
                Completed ({getFilteredOrders("completed").length})
              </TabsTrigger>
              <TabsTrigger value="cancelled">
                <XCircle className="mr-2 h-4 w-4" />
                Cancelled ({getFilteredOrders("cancelled").length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-4">
              {loading ? (
                <div className="py-6 px-4 text-center">
                  <p className="text-muted-foreground">Loading orders...</p>
                </div>
              ) : orders.length > 0 ? (
                orders.map(renderOrderCard)
              ) : (
                <div className="py-6 px-4 text-center">
                  <p className="text-muted-foreground">No orders found.</p>
                </div>
              )}
            </TabsContent>

            {["pending", "preparing", "completed", "cancelled"].map((status) => (
              <TabsContent key={status} value={status} className="space-y-4">
                {loading ? (
                  <div className="py-6 px-4 text-center">
                    <p className="text-muted-foreground">Loading orders...</p>
                  </div>
                ) : getFilteredOrders(status).length > 0 ? (
                  getFilteredOrders(status).map(renderOrderCard)
                ) : (
                  <div className="py-6 px-4 text-center">
                    <p className="text-muted-foreground">No {status} orders found.</p>
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>

          {totalPages > 1 && (
            <div className="mt-6 flex justify-center">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                  
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNumber = i + 1;
                    return (
                      <PaginationItem key={pageNumber}>
                        <PaginationLink
                          onClick={() => setCurrentPage(pageNumber)}
                          isActive={currentPage === pageNumber}
                          className="cursor-pointer"
                        >
                          {pageNumber}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  })}
                  
                  <PaginationItem>
                    <PaginationNext
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the order
              and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteOrder}>
              Delete Order
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
};

export default Orders;
