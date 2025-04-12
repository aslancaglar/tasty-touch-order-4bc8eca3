
import { Restaurant, OrderStatus } from "@/types/database-types";

type OrderItem = {
  name: string;
  quantity: number;
  price: number;
  options?: string[];
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

const mockOrders: Order[] = [
  {
    id: "ORD-1001",
    restaurantId: "1",
    status: "pending",
    items: [
      { name: "Classic Burger", quantity: 2, price: 8.99 },
      { name: "Fries", quantity: 1, price: 3.99 },
    ],
    total: 21.97,
    date: new Date(Date.now() - 1000 * 60 * 5) // 5 minutes ago
  },
];

const statusColors = {
  pending: "bg-yellow-100 text-yellow-800",
  preparing: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800"
};

interface OrdersTabProps {
  restaurant: Restaurant;
}

const OrdersTab = ({ restaurant }: OrdersTabProps) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Orders</h3>
      </div>
      
      <div className="rounded-md border">
        <div className="py-6 px-4 text-center">
          <p className="text-muted-foreground">Order management will be implemented in a future update.</p>
        </div>
      </div>
    </div>
  );
};

export default OrdersTab;
