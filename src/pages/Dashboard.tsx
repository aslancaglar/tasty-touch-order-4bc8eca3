import AdminLayout from "@/components/layout/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  Store, 
  TrendingUp, 
  DollarSign,
  Plus,
  ArrowRight
} from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type DashboardStats = {
  totalRestaurants: number;
  totalOrders: number;
  totalRevenue: number;
  activeUsers: number;
};

const Dashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalRestaurants: 0,
    totalOrders: 0,
    totalRevenue: 0,
    activeUsers: 0
  });
  const [loading, setLoading] = useState(true);
  const { user, isAdmin } = useAuth();

  console.log("Dashboard component render:", { 
    user: !!user, 
    userEmail: user?.email,
    isAdmin,
    timestamp: new Date().toISOString()
  });

  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        console.log("Dashboard: Fetching dashboard stats");
        
        // Fetch restaurants count
        const { count: restaurantCount, error: restaurantError } = await supabase
          .from('restaurants')
          .select('*', { count: 'exact', head: true });

        if (restaurantError) {
          console.error('Error fetching restaurants:', restaurantError);
        }

        // Fetch orders data
        const { data: orders, error: ordersError } = await supabase
          .from('orders')
          .select('total, status')
          .neq('status', 'cancelled');

        if (ordersError) {
          console.error('Error fetching orders:', ordersError);
        }

        // Calculate revenue
        const revenue = orders?.reduce((sum, order) => {
          return sum + (parseFloat(String(order.total || 0)));
        }, 0) || 0;

        // Fetch active users (profiles with recent activity)
        const { count: userCount, error: userError } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });

        if (userError) {
          console.error('Error fetching users:', userError);
        }

        setStats({
          totalRestaurants: restaurantCount || 0,
          totalOrders: orders?.length || 0,
          totalRevenue: revenue,
          activeUsers: userCount || 0
        });

        console.log("Dashboard: Stats fetched successfully", {
          totalRestaurants: restaurantCount || 0,
          totalOrders: orders?.length || 0,
          totalRevenue: revenue,
          activeUsers: userCount || 0
        });

      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user && isAdmin) {
      fetchDashboardStats();
    } else {
      console.log("Dashboard: User not authenticated or not admin, skipping stats fetch");
      setLoading(false);
    }
  }, [user, isAdmin]);

  // Don't show anything if user is not admin (let Index handle routing)
  if (!user || isAdmin !== true) {
    console.log("Dashboard: User not authenticated or not admin, returning null");
    return null;
  }

  console.log("Dashboard: Rendering admin dashboard");

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Here's what's happening with your restaurants.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Restaurants</CardTitle>
              <Store className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? "..." : stats.totalRestaurants}
              </div>
              <p className="text-xs text-muted-foreground">
                Active restaurant locations
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? "..." : stats.totalOrders.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                Orders processed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? "..." : `€${stats.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              </div>
              <p className="text-xs text-muted-foreground">
                Revenue generated
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? "..." : stats.activeUsers}
              </div>
              <p className="text-xs text-muted-foreground">
                Registered users
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Get started with common tasks
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button asChild className="w-full justify-start">
                <Link to="/restaurants">
                  <Plus className="mr-2 h-4 w-4" />
                  Add New Restaurant
                </Link>
              </Button>
              <Button variant="outline" asChild className="w-full justify-start">
                <Link to="/restaurants">
                  <Store className="mr-2 h-4 w-4" />
                  View All Restaurants
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>
                Latest updates from your restaurants
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                  <div className="text-sm">
                    <p className="font-medium">System Status</p>
                    <p className="text-muted-foreground">All systems operational</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" asChild className="w-full justify-between p-0">
                  <Link to="/restaurants">
                    View All Activity
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
};

export default Dashboard;
