
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
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type OrderStatus = "pending" | "preparing" | "completed" | "cancelled";

type OrderItem = {
  name: string;
  quantity: number;
  price: number;
  options?: string[];
};

type Order = {
  id: string;
  restaurantId: string;
  restaurantName: string;
  status: OrderStatus;
  items: OrderItem[];
  total: number;
  date: Date;
  customerName?: string;
};

const mockOrders: Order[] = [
  {
    id: "ORD-1001",
    restaurantId: "1",
    restaurantName: "Burger House",
    status: "pending",
    items: [
      { name: "Classic Burger", quantity: 2, price: 8.99 },
      { name: "Fries", quantity: 1, price: 3.99 },
      { name: "Soda", quantity: 2, price: 1.99, options: ["Large", "No Ice"] }
    ],
    total: 25.95,
    date: new Date(Date.now() - 1000 * 60 * 5) // 5 minutes ago
  },
  {
    id: "ORD-1002",
    restaurantId: "2",
    restaurantName: "Pizza Palace",
    status: "preparing",
    items: [
      { name: "Pepperoni Pizza", quantity: 1, price: 14.99 },
      { name: "Garlic Bread", quantity: 1, price: 4.99 }
    ],
    total: 19.98,
    date: new Date(Date.now() - 1000 * 60 * 15) // 15 minutes ago
  },
  {
    id: "ORD-1003",
    restaurantId: "1",
    restaurantName: "Burger House",
    status: "completed",
    items: [
      { name: "Cheese Burger", quantity: 1, price: 9.99 },
      { name: "Onion Rings", quantity: 1, price: 4.99 },
      { name: "Chocolate Shake", quantity: 1, price: 4.99 }
    ],
    total: 19.97,
    date: new Date(Date.now() - 1000 * 60 * 40) // 40 minutes ago
  },
  {
    id: "ORD-1004",
    restaurantId: "3",
    restaurantName: "Sushi Squad",
    status: "cancelled",
    items: [
      { name: "California Roll", quantity: 2, price: 8.99 },
      { name: "Miso Soup", quantity: 1, price: 2.99 }
    ],
    total: 20.97,
    date: new Date(Date.now() - 1000 * 60 * 60) // 1 hour ago
  },
  {
    id: "ORD-1005",
    restaurantId: "1",
    restaurantName: "Burger House",
    status: "completed",
    items: [
      { name: "Double Cheeseburger", quantity: 1, price: 11.99 },
      { name: "Sweet Potato Fries", quantity: 1, price: 4.99 },
      { name: "Lemonade", quantity: 1, price: 2.99 }
    ],
    total: 19.97,
    date: new Date(Date.now() - 1000 * 60 * 90) // 1.5 hours ago
  },
];

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
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Orders</h1>
        <p className="text-muted-foreground">Manage and track all your customer orders</p>
      </div>

      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search orders..." className="pl-10" />
        </div>
        <Select>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Restaurants" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Restaurants</SelectItem>
            <SelectItem value="1">Burger House</SelectItem>
            <SelectItem value="2">Pizza Palace</SelectItem>
            <SelectItem value="3">Sushi Squad</SelectItem>
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
              <TabsTrigger value="all">All Orders</TabsTrigger>
              <TabsTrigger value="pending">
                <Clock className="mr-2 h-4 w-4" />
                Pending
              </TabsTrigger>
              <TabsTrigger value="preparing">
                <ChefHat className="mr-2 h-4 w-4" />
                Preparing
              </TabsTrigger>
              <TabsTrigger value="completed">
                <CheckCircle className="mr-2 h-4 w-4" />
                Completed
              </TabsTrigger>
              <TabsTrigger value="cancelled">
                <XCircle className="mr-2 h-4 w-4" />
                Cancelled
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-4">
              {mockOrders.map((order) => (
                <div 
                  key={order.id}
                  className="border rounded-lg overflow-hidden"
                >
                  <div className="flex flex-col md:flex-row justify-between p-4 border-b bg-gray-50">
                    <div className="flex items-center space-x-4">
                      <div>
                        <p className="font-bold">{order.id}</p>
                        <p className="text-sm text-muted-foreground">{order.restaurantName}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4 mt-4 md:mt-0">
                      <Badge 
                        className={`flex items-center space-x-1 ${statusColors[order.status]}`}
                        variant="outline"
                      >
                        {statusIcons[order.status]}
                        <span className="capitalize">{order.status}</span>
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
                            {item.options && item.options.length > 0 && (
                              <span className="text-xs text-muted-foreground ml-2">
                                ({item.options.join(", ")})
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
                          <Button variant="outline" size="sm" className="text-blue-600">
                            <ChefHat className="mr-2 h-4 w-4" />
                            Start Preparing
                          </Button>
                          <Button variant="outline" size="sm" className="text-red-600">
                            <XCircle className="mr-2 h-4 w-4" />
                            Cancel Order
                          </Button>
                        </>
                      )}
                      {order.status === "preparing" && (
                        <Button variant="outline" size="sm" className="text-green-600">
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Mark Completed
                        </Button>
                      )}
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </TabsContent>

            {["pending", "preparing", "completed", "cancelled"].map((status) => (
              <TabsContent key={status} value={status} className="space-y-4">
                {mockOrders
                  .filter((order) => order.status === status)
                  .map((order) => (
                    <div 
                      key={order.id}
                      className="border rounded-lg overflow-hidden"
                    >
                      <div className="flex flex-col md:flex-row justify-between p-4 border-b bg-gray-50">
                        <div className="flex items-center space-x-4">
                          <div>
                            <p className="font-bold">{order.id}</p>
                            <p className="text-sm text-muted-foreground">{order.restaurantName}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4 mt-4 md:mt-0">
                          <Badge 
                            className={`flex items-center space-x-1 ${statusColors[order.status]}`}
                            variant="outline"
                          >
                            {statusIcons[order.status as OrderStatus]}
                            <span className="capitalize">{order.status}</span>
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
                                {item.options && item.options.length > 0 && (
                                  <span className="text-xs text-muted-foreground ml-2">
                                    ({item.options.join(", ")})
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
                              <Button variant="outline" size="sm" className="text-blue-600">
                                <ChefHat className="mr-2 h-4 w-4" />
                                Start Preparing
                              </Button>
                              <Button variant="outline" size="sm" className="text-red-600">
                                <XCircle className="mr-2 h-4 w-4" />
                                Cancel Order
                              </Button>
                            </>
                          )}
                          {order.status === "preparing" && (
                            <Button variant="outline" size="sm" className="text-green-600">
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Mark Completed
                            </Button>
                          )}
                          <Button variant="outline" size="sm">
                            View Details
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </AdminLayout>
  );
};

export default Orders;
