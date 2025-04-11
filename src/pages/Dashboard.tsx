import AdminLayout from "@/components/layout/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpRight, BadgeDollarSign, ChefHat, Pizza, ShoppingBag, Users } from "lucide-react";

const StatCard = ({ 
  title, 
  value, 
  description, 
  icon: Icon, 
  trend 
}: { 
  title: string; 
  value: string | number; 
  description: string; 
  icon: React.ElementType; 
  trend?: { value: string; positive: boolean } 
}) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      <p className="text-xs text-muted-foreground">{description}</p>
      {trend && (
        <div className="mt-2 flex items-center text-xs">
          <span className={trend.positive ? "text-green-500" : "text-red-500"}>
            {trend.positive ? "+" : ""}{trend.value}
          </span>
          <ArrowUpRight 
            className={`ml-1 h-3 w-3 ${trend.positive ? "text-green-500" : "text-red-500"}`} 
            style={{ transform: trend.positive ? 'none' : 'rotate(135deg)' }}
          />
          <span className="ml-1 text-muted-foreground">from last month</span>
        </div>
      )}
    </CardContent>
  </Card>
);

const RecentOrders = () => (
  <Card className="col-span-2">
    <CardHeader>
      <CardTitle>Recent Orders</CardTitle>
      <CardDescription>Latest orders across all restaurants</CardDescription>
    </CardHeader>
    <CardContent>
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((item) => (
          <div key={item} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                <ShoppingBag className="h-5 w-5 text-gray-500" />
              </div>
              <div>
                <p className="font-medium">Order #{10000 + item}</p>
                <p className="text-sm text-muted-foreground">Burger House</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-medium">${(Math.random() * 50 + 10).toFixed(2)}</p>
              <p className="text-sm text-muted-foreground">
                {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);

const PopularItems = () => (
  <Card>
    <CardHeader>
      <CardTitle>Popular Items</CardTitle>
      <CardDescription>Most ordered menu items</CardDescription>
    </CardHeader>
    <CardContent>
      <div className="space-y-4">
        {[
          { name: "Classic Cheeseburger", restaurant: "Burger House", price: "$12.99", orders: 234 },
          { name: "Pepperoni Pizza", restaurant: "Pizza Palace", price: "$15.50", orders: 189 },
          { name: "California Roll", restaurant: "Sushi Squad", price: "$8.75", orders: 156 },
          { name: "Beef Tacos", restaurant: "Taco Time", price: "$9.25", orders: 142 },
          { name: "Fettuccine Alfredo", restaurant: "Pasta Place", price: "$13.50", orders: 128 }
        ].map((item, index) => (
          <div key={index} className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Pizza className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-medium">{item.name}</p>
                <p className="text-sm text-muted-foreground">{item.restaurant}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-medium">{item.price}</p>
              <p className="text-sm text-muted-foreground">{item.orders} orders</p>
            </div>
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);

const Dashboard = () => {
  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Welcome to your TastyTouch Admin Dashboard</p>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="Total Revenue" 
          value="$15,231.89" 
          description="All-time revenue across all restaurants"
          icon={BadgeDollarSign}
          trend={{ value: "12.5%", positive: true }}
        />
        <StatCard 
          title="Restaurants" 
          value="12" 
          description="Active restaurants on the platform"
          icon={ChefHat}
          trend={{ value: "2", positive: true }}
        />
        <StatCard 
          title="Total Orders" 
          value="1,234" 
          description="Orders processed this month"
          icon={ShoppingBag}
          trend={{ value: "5.2%", positive: true }}
        />
        <StatCard 
          title="Active Users" 
          value="423" 
          description="Daily active users"
          icon={Users}
          trend={{ value: "1.5%", positive: false }}
        />
      </div>
      
      <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <RecentOrders />
        
        <Card>
          <CardHeader>
            <CardTitle>Popular Restaurants</CardTitle>
            <CardDescription>Top performing restaurants</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {["Burger House", "Pizza Palace", "Sushi Squad", "Taco Time", "Pasta Place"].map((name, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-xs font-bold text-primary">{name.charAt(0)}{name.split(' ')[1]?.charAt(0)}</span>
                    </div>
                    <p className="font-medium">{name}</p>
                  </div>
                  <p className="font-medium">${(Math.random() * 1000 + 500).toFixed(2)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        
        <PopularItems />
      </div>
    </AdminLayout>
  );
};

export default Dashboard;
