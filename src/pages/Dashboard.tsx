import AdminLayout from "@/components/layout/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowUpRight, BadgeDollarSign, ChefHat, Pizza, ShoppingBag, Store, Activity, BarChart3 } from "lucide-react";
import { PerformanceMetrics } from "@/components/performance/PerformanceMetrics";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { ReactNode, useEffect, useState } from "react";
import { useTranslation, SupportedLanguage } from "@/utils/language-utils";
import { useAuth } from "@/contexts/AuthContext";
import { setCachingEnabledForAdmin } from "@/services/cache-service";
import { getAdminQueryOptions } from "@/utils/admin-data-utils";

// Define proper types for our API responses
interface PopularItem {
  name: string;
  price: number;
  restaurant_name: string;
  order_count: number;
}
interface PopularRestaurant {
  name: string;
  total_orders: number;
}
interface StatCardProps {
  title: string;
  value: ReactNode; // Change to ReactNode to accept loading skeletons
  description: string;
  icon: React.ElementType;
  trend?: {
    value: string;
    positive: boolean;
    fromLastMonthText: string; // Added this property to the type
  };
}
const StatCard = ({
  title,
  value,
  description,
  icon: Icon,
  trend
}: StatCardProps) => <Card>
    <CardHeader className="flex flex-row items-center justify-between pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      <p className="text-xs text-muted-foreground">{description}</p>
      {trend && <div className="mt-2 flex items-center text-xs">
          <span className={trend.positive ? "text-green-500" : "text-red-500"}>
            {trend.positive ? "+" : ""}
            {trend.value}
          </span>
          <ArrowUpRight className={`ml-1 h-3 w-3 ${trend.positive ? "text-green-500" : "text-red-500"}`} style={{
        transform: trend.positive ? "none" : "rotate(135deg)"
      }} />
          <span className="ml-1 text-muted-foreground">
            {trend.fromLastMonthText}
          </span>
        </div>}
    </CardContent>
  </Card>;

// Fetch functions
const fetchStats = async () => {
  console.log("[Dashboard] Fetching fresh statistics data");

  // Total revenue - EXCLUDE CANCELLED ORDERS
  const {
    data: totalRevenueData,
    error: totalRevenueError
  } = await supabase.from("orders").select("total").neq("status", "cancelled"); // Exclude cancelled orders

  // Total restaurants
  const {
    count: restaurantCount,
    error: restaurantsError
  } = await supabase.from("restaurants").select("*", {
    count: "exact",
    head: true
  });

  // Monthly order count - Using updated function that excludes cancelled orders
  const {
    data: monthlyOrderData,
    error: monthlyError
  } = await supabase.rpc("get_monthly_order_count");

  // Fixed daily order count calculation to ensure accurate counting
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
  const {
    data: dailyOrdersData,
    error: dailyOrdersError
  } = await supabase.from("orders").select("id", {
    count: "exact"
  }).gte("created_at", startOfDay.toISOString()).lte("created_at", endOfDay.toISOString()).neq("status", "cancelled");
  const dailyOrderCount = dailyOrdersData?.length || 0;
  console.log("[Dashboard] Today's orders count:", dailyOrderCount);
  console.log("[Dashboard] Date range:", startOfDay.toISOString(), "to", endOfDay.toISOString());
  if (totalRevenueError || restaurantsError || monthlyError || dailyOrdersError) throw totalRevenueError || restaurantsError || monthlyError || dailyOrdersError;
  const revenue = totalRevenueData ? totalRevenueData.reduce((acc, cur) => acc + Number(cur.total), 0) : 0;
  return {
    revenue,
    restaurants: restaurantCount ?? 0,
    monthlyOrders: monthlyOrderData ?? 0,
    dailyOrders: dailyOrderCount
  };
};

// Using updated functions that exclude cancelled orders
const fetchPopularItems = async () => {
  console.log("[Dashboard] Fetching fresh popular items data");

  // Top 5 items by sales (uses updated db function)
  const {
    data,
    error
  } = await supabase.rpc("get_popular_items", {
    limit_count: 5
  });
  if (error) throw error;

  // Handle the case when data might be null or not an array
  if (!data) return [];

  // Properly cast the JSON data to our type
  const typedData = typeof data === 'string' ? JSON.parse(data) : data;
  return Array.isArray(typedData) ? typedData : [];
};
const fetchPopularRestaurants = async () => {
  console.log("[Dashboard] Fetching fresh popular restaurants data");

  // Top 5 restaurants by order count (uses updated db function)
  const {
    data,
    error
  } = await supabase.rpc("get_popular_restaurants", {
    limit_count: 5
  });
  if (error) throw error;

  // Handle the case when data might be null or not an array
  if (!data) return [];

  // Properly cast the JSON data to our type
  const typedData = typeof data === 'string' ? JSON.parse(data) : data;
  return Array.isArray(typedData) ? typedData : [];
};
interface PopularItemsProps {
  items: PopularItem[] | undefined;
  isLoading: boolean;
  title: string;
  description: string;
}
const PopularItems = ({
  items,
  isLoading,
  title,
  description
}: PopularItemsProps) => <Card className="col-span-2">
    <CardHeader>
      <CardTitle>{title}</CardTitle>
      <CardDescription>{description}</CardDescription>
    </CardHeader>
    <CardContent>
      <div className="space-y-4">
        {isLoading ? Array.from({
        length: 5
      }).map((_, i) => <div key={i} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                <div className="flex items-center space-x-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div>
                    <Skeleton className="h-4 w-32 mb-1" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
                <div className="text-right">
                  <Skeleton className="h-3 w-14" />
                </div>
              </div>) : (items ?? []).map((item, index) => <div key={index} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                <div className="flex items-center space-x-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Pizza className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-muted-foreground">{item.restaurant_name}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">{item.order_count} orders</p>
                </div>
              </div>)}
      </div>
    </CardContent>
  </Card>;
interface PopularRestaurantsProps {
  data: PopularRestaurant[] | undefined;
  isLoading: boolean;
  title: string;
  description: string;
}
const PopularRestaurants = ({
  data,
  isLoading,
  title,
  description
}: PopularRestaurantsProps) => <Card>
    <CardHeader>
      <CardTitle>{title}</CardTitle>
      <CardDescription>{description}</CardDescription>
    </CardHeader>
    <CardContent>
      <div className="space-y-4">
        {isLoading ? Array.from({
        length: 5
      }).map((_, i) => <div key={i} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <Skeleton className="h-4 w-16" />
              </div>) : (data ?? []).map((item, index) => <div key={index} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-xs font-bold text-primary">
                      {item.name.split(" ").map(w => w[0]).slice(0, 2).join("")}
                    </span>
                  </div>
                  <p className="font-medium">{item.name}</p>
                </div>
                <p className="font-medium text-sm text-muted-foreground">
                  {item.total_orders} orders
                </p>
              </div>)}
      </div>
    </CardContent>
  </Card>;
const Dashboard = () => {
  const {
    user
  } = useAuth();
  // Always use English for admin dashboard
  const language: SupportedLanguage = 'en';
  const {
    t
  } = useTranslation(language);
  const [orderCount, setOrderCount] = useState<number>(0);

  // Ensure admin caching is disabled when admin dashboard loads
  useEffect(() => {
    setCachingEnabledForAdmin(false);
    console.log("[AdminDashboard] Disabled caching for admin dashboard");
  }, []);

  // Use our admin query options for all admin dashboard queries
  const {
    data: stats,
    isLoading: isStatsLoading,
    error: statsError
  } = useQuery(getAdminQueryOptions(["dashboard-stats"], fetchStats));
  const {
    data: popularItems,
    isLoading: isItemsLoading,
    error: itemsError
  } = useQuery(getAdminQueryOptions(["dashboard-popular-items"], fetchPopularItems));
  const {
    data: popularRestaurants,
    isLoading: isRestaurantsLoading,
    error: restaurantsError
  } = useQuery(getAdminQueryOptions(["dashboard-popular-restaurants"], fetchPopularRestaurants));
  return <AdminLayout useDefaultLanguage={true}>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">{t("dashboard.title")}</h1>
        
      </div>

      {statsError && <div className="mb-4 text-red-500 font-medium">Failed to load stats.</div>}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title={t("dashboard.totalRevenue")} value={isStatsLoading ? <Skeleton className="h-8 w-32" /> : `$${stats?.revenue?.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })}`} description={t("dashboard.revenueDesc")} icon={BadgeDollarSign} trend={{
        value: "12.5%",
        positive: true,
        fromLastMonthText: t("dashboard.fromLastMonth")
      }} />
        <StatCard title={t("dashboard.restaurants")} value={isStatsLoading ? <Skeleton className="h-8 w-12" /> : stats?.restaurants ?? 0} description={t("dashboard.restaurantsDesc")} icon={ChefHat} trend={{
        value: "2",
        positive: true,
        fromLastMonthText: t("dashboard.fromLastMonth")
      }} />
        <StatCard title={t("dashboard.totalOrders")} value={isStatsLoading ? <Skeleton className="h-8 w-20" /> : stats?.monthlyOrders ?? 0} description={t("dashboard.totalOrdersDesc")} icon={ShoppingBag} trend={{
        value: "5.2%",
        positive: true,
        fromLastMonthText: t("dashboard.fromLastMonth")
      }} />
        <StatCard title={t("dashboard.dailyOrders")} value={isStatsLoading ? <Skeleton className="h-8 w-20" /> : stats?.dailyOrders ?? 0} description={t("dashboard.dailyOrdersDesc")} icon={Store} trend={{
        value: "15.3%",
        positive: true,
        fromLastMonthText: t("dashboard.fromLastMonth")
      }} />
      </div>

      <Tabs defaultValue="overview" className="mt-6 space-y-4">
        <TabsList>
          <TabsTrigger value="overview" className="flex items-center space-x-2">
            <BarChart3 className="h-4 w-4" />
            <span>Overview</span>
          </TabsTrigger>
          <TabsTrigger value="performance" className="flex items-center space-x-2">
            <Activity className="h-4 w-4" />
            <span>Performance Monitor</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <PopularItems items={popularItems} isLoading={isItemsLoading} title={t("dashboard.popularItems")} description={t("dashboard.popularItemsDesc")} />
            <PopularRestaurants data={popularRestaurants} isLoading={isRestaurantsLoading} title={t("dashboard.popularRestaurants")} description={t("dashboard.popularRestaurantsDesc")} />
          </div>
        </TabsContent>

        <TabsContent value="performance">
          <div className="space-y-6">
            <div className="flex items-center space-x-2">
              <Activity className="h-6 w-6 text-primary" />
              <div>
                <h2 className="text-xl font-semibold">Performance Dashboard</h2>
                <p className="text-muted-foreground">
                  Monitor system performance and cache efficiency
                </p>
              </div>
            </div>
            <PerformanceMetrics />
          </div>
        </TabsContent>
      </Tabs>
    </AdminLayout>;
};
export default Dashboard;
