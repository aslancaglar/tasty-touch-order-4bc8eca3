import { useState, useEffect } from "react";
import { Restaurant } from "@/types/database-types";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Calendar, ChartBar, ChartPie } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { format, startOfMonth, endOfMonth, startOfDay, endOfDay, parseISO, subDays, isValid } from "date-fns";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  TooltipProps,
} from "recharts";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";
import { useTranslation, SupportedLanguage, DEFAULT_LANGUAGE } from "@/utils/language-utils";

interface StatisticsTabProps {
  restaurant: Restaurant;
}

interface OrderStats {
  dailyCount: number;
  monthlyCount: number;
  dailySales: number;
  monthlySales: number;
  averageOrderValue: number;
}

interface ChartData {
  name: string;
  orders: number;
  sales: number;
  averageOrderValue: number;
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE', '#00C49F'];

const StatisticsTab = ({ restaurant }: StatisticsTabProps) => {
  const [loading, setLoading] = useState(true);
  const [orderStats, setOrderStats] = useState<OrderStats>({
    dailyCount: 0,
    monthlyCount: 0,
    dailySales: 0,
    monthlySales: 0,
    averageOrderValue: 0
  });
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 7),
    to: new Date(),
  });
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [customPeriodActive, setCustomPeriodActive] = useState(false);
  const [chartType, setChartType] = useState<"bar" | "line">("bar");
  const [language, setLanguage] = useState<SupportedLanguage>(
    (restaurant?.ui_language as SupportedLanguage) || DEFAULT_LANGUAGE
  );
  
  const { toast } = useToast();
  const { t } = useTranslation(language);

  useEffect(() => {
    if (restaurant) {
      // Update language when restaurant settings change
      if (restaurant.ui_language) {
        setLanguage(restaurant.ui_language as SupportedLanguage);
      }
      // Only fetch default statistics if custom period is not active
      if (!customPeriodActive) {
        fetchStatistics();
      }
    }
  }, [restaurant.id, restaurant.ui_language, customPeriodActive]);

  useEffect(() => {
    if (customPeriodActive && dateRange && dateRange.from) {
      fetchCustomPeriodData();
    } else if (!customPeriodActive) {
      // When custom period is turned off, fetch default statistics
      fetchStatistics();
    }
  }, [dateRange, customPeriodActive]);

  const fetchStatistics = async () => {
    try {
      setLoading(true);
      
      // Fetch daily order count and sales - EXCLUDE CANCELLED ORDERS
      const todayStart = startOfDay(new Date()).toISOString();
      const todayEnd = endOfDay(new Date()).toISOString();
      
      const { data: dailyOrders, error: dailyError } = await supabase
        .from('orders')
        .select('id, total')
        .eq('restaurant_id', restaurant.id)
        .neq('status', 'cancelled')  // Exclude cancelled orders
        .gte('created_at', todayStart)
        .lte('created_at', todayEnd);
      
      if (dailyError) throw dailyError;
      
      // Fetch monthly order count and sales - EXCLUDE CANCELLED ORDERS
      const monthStart = startOfMonth(new Date()).toISOString();
      const monthEnd = endOfMonth(new Date()).toISOString();
      
      const { data: monthlyOrders, error: monthlyError } = await supabase
        .from('orders')
        .select('id, total')
        .eq('restaurant_id', restaurant.id)
        .neq('status', 'cancelled')  // Exclude cancelled orders
        .gte('created_at', monthStart)
        .lte('created_at', monthEnd)
        .limit(10000);  // Increase limit for large datasets
      
      if (monthlyError) throw monthlyError;
      
      // Calculate statistics
      const dailySales = dailyOrders.reduce((sum, order) => sum + Number(order.total), 0);
      const monthlySales = monthlyOrders.reduce((sum, order) => sum + Number(order.total), 0);
      
      // Calculate average order value for the month
      const averageOrderValue = monthlyOrders.length > 0 
        ? monthlySales / monthlyOrders.length 
        : 0;
      
      setOrderStats({
        dailyCount: dailyOrders.length,
        monthlyCount: monthlyOrders.length,
        dailySales,
        monthlySales,
        averageOrderValue
      });
      
      // Fetch data for the last 7 days for the chart - EXCLUDE CANCELLED ORDERS
      const last7Days = subDays(new Date(), 6).toISOString();
      
      const { data: chartOrdersData, error: chartError } = await supabase
        .from('orders')
        .select('id, total, created_at')
        .eq('restaurant_id', restaurant.id)
        .neq('status', 'cancelled')  // Exclude cancelled orders
        .gte('created_at', last7Days)
        .order('created_at', { ascending: true })
        .limit(10000);  // Increase limit for large datasets
      
      if (chartError) throw chartError;
      
      // Process chart data
      const chartDataByDay: Record<string, ChartData> = {};
      
      chartOrdersData.forEach(order => {
        const date = format(parseISO(order.created_at), 'yyyy-MM-dd');
        const displayDate = format(parseISO(order.created_at), 'MMM dd');
        
        if (!chartDataByDay[date]) {
          chartDataByDay[date] = {
            name: displayDate,
            orders: 0,
            sales: 0,
            averageOrderValue: 0
          };
        }
        
        chartDataByDay[date].orders += 1;
        chartDataByDay[date].sales += Number(order.total);
      });
      
      // Calculate average order value for each day
      Object.keys(chartDataByDay).forEach(date => {
        chartDataByDay[date].averageOrderValue = chartDataByDay[date].orders > 0
          ? chartDataByDay[date].sales / chartDataByDay[date].orders
          : 0;
      });
      
      const formattedChartData = Object.values(chartDataByDay);
      setChartData(formattedChartData);
      
      setLoading(false);
    } catch (error) {
      console.error("Error fetching statistics:", error);
      toast({
        title: t("statistics.error") || "Error",
        description: t("statistics.loadError") || "Failed to load statistics data",
        variant: "destructive"
      });
      setLoading(false);
    }
  };

  const fetchCustomPeriodData = async () => {
    if (!dateRange || !dateRange.from || !dateRange.to) return;
    
    try {
      setLoading(true);
      
      const fromDate = startOfDay(dateRange.from).toISOString();
      const toDate = endOfDay(dateRange.to).toISOString();
      
      console.log('Custom period query:', {
        restaurantId: restaurant.id,
        fromDate,
        toDate,
        customPeriodActive
      });
      
      // EXCLUDE CANCELLED ORDERS from custom period data
      // First get the count to determine if we need pagination
      const { count: totalOrdersCount } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('restaurant_id', restaurant.id)
        .neq('status', 'cancelled')
        .gte('created_at', fromDate)
        .lte('created_at', toDate);

      console.log('Total orders count for period:', totalOrdersCount);

      // Fetch all orders using pagination if needed
      let periodOrders: any[] = [];
      const pageSize = 1000;
      let page = 0;
      let hasMore = true;

      while (hasMore && periodOrders.length < (totalOrdersCount || 0)) {
        const { data: pageData, error: pageError } = await supabase
          .from('orders')
          .select('id, total, created_at')
          .eq('restaurant_id', restaurant.id)
          .neq('status', 'cancelled')
          .gte('created_at', fromDate)
          .lte('created_at', toDate)
          .order('created_at', { ascending: true })
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (pageError) throw pageError;
        
        if (pageData && pageData.length > 0) {
          periodOrders = [...periodOrders, ...pageData];
          page++;
          hasMore = pageData.length === pageSize;
        } else {
          hasMore = false;
        }
      }
      
      console.log('Custom period orders found:', {
        count: periodOrders.length,
        queryDetails: { fromDate, toDate, restaurantId: restaurant.id },
        hasMore: periodOrders.length === 10000 ? 'MIGHT_HAVE_MORE' : 'COMPLETE',
        actualQueryUsed: `SELECT id, total, created_at FROM orders WHERE restaurant_id = '${restaurant.id}' AND status != 'cancelled' AND created_at >= '${fromDate}' AND created_at <= '${toDate}' ORDER BY created_at ASC LIMIT 10000`
      });
      
      // Process chart data
      const chartDataByDay: Record<string, ChartData> = {};
      let totalSales = 0;
      
      periodOrders.forEach(order => {
        const date = format(parseISO(order.created_at), 'yyyy-MM-dd');
        const displayDate = format(parseISO(order.created_at), 'MMM dd');
        
        if (!chartDataByDay[date]) {
          chartDataByDay[date] = {
            name: displayDate,
            orders: 0,
            sales: 0,
            averageOrderValue: 0
          };
        }
        
        chartDataByDay[date].orders += 1;
        chartDataByDay[date].sales += Number(order.total);
        totalSales += Number(order.total);
      });
      
      // Calculate average order value for each day
      Object.keys(chartDataByDay).forEach(date => {
        chartDataByDay[date].averageOrderValue = chartDataByDay[date].orders > 0
          ? chartDataByDay[date].sales / chartDataByDay[date].orders
          : 0;
      });
      
      const formattedChartData = Object.values(chartDataByDay);
      setChartData(formattedChartData);
      
      // Calculate average order value for the custom period
      const averageOrderValue = periodOrders.length > 0 
        ? totalSales / periodOrders.length 
        : 0;
      
      setOrderStats({
        dailyCount: periodOrders.length,
        monthlyCount: periodOrders.length,
        dailySales: totalSales,
        monthlySales: totalSales,
        averageOrderValue
      });
      
      setLoading(false);
    } catch (error) {
      console.error("Error fetching custom period data:", error);
      toast({
        title: t("statistics.error") || "Error",
        description: t("statistics.customPeriodError") || "Failed to load custom period data",
        variant: "destructive"
      });
      setLoading(false);
    }
  };

  // Format currency based on restaurant settings
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: restaurant.currency || 'EUR'
    }).format(amount);
  };

  const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded-md shadow-md">
          <p className="font-bold">{label}</p>
          <p className="text-sm">{`${t("statistics.orders")}: ${payload[0].value}`}</p>
          <p className="text-sm">{`${t("statistics.sales")}: ${formatCurrency(payload[1].value as number)}`}</p>
          <p className="text-sm">{`${t("statistics.avgOrderValue") || "Avg. Order Value"}: ${formatCurrency(payload[2].value as number)}`}</p>
        </div>
      );
    }
  
    return null;
  };

  // Safe date format function to handle undefined dates
  const formatDate = (date: Date | undefined): string => {
    return date && isValid(date) ? format(date, "LLL dd, yyyy") : "";
  };

  return (
    <div>
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-2xl font-semibold">{t("statistics.title") || "Restaurant Statistics"}</h2>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center space-x-2">
              <Switch 
                id="custom-period" 
                checked={customPeriodActive}
                onCheckedChange={setCustomPeriodActive}
              />
              <Label htmlFor="custom-period">{t("statistics.customDateRange") || "Custom Date Range"}</Label>
            </div>
            
            {customPeriodActive && (
              <div className="flex items-center space-x-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="date-range"
                      variant={"outline"}
                      className={cn(
                        "justify-start text-left font-normal w-[260px]",
                        !dateRange && "text-muted-foreground"
                      )}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {dateRange?.from && isValid(dateRange.from) ? (
                        dateRange.to && isValid(dateRange.to) ? (
                          <>
                            {formatDate(dateRange.from)} -{" "}
                            {formatDate(dateRange.to)}
                          </>
                        ) : (
                          formatDate(dateRange.from)
                        )
                      ) : (
                        <span>{t("statistics.pickDate") || "Pick a date"}</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <CalendarComponent
                      initialFocus
                      mode="range"
                      defaultMonth={dateRange?.from}
                      selected={dateRange}
                      onSelect={setDateRange}
                      numberOfMonths={2}
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}
            
            <div className="flex">
              <Button variant="outline" size="sm" onClick={() => setChartType("bar")}>
                <ChartBar className="h-4 w-4 mr-1" />
                {t("statistics.barChart") || "Bar"}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setChartType("line")}>
                <ChartPie className="h-4 w-4 mr-1" />
                {t("statistics.lineChart") || "Line"}
              </Button>
            </div>
          </div>
        </div>
        
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4 mb-6">
              {/* Daily Orders Card */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {customPeriodActive 
                      ? (t("statistics.selectedPeriodOrders") || "Selected Period Orders") 
                      : (t("statistics.todaysOrders") || "Today's Orders")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{orderStats.dailyCount}</div>
                  <Badge className="mt-1">{t("statistics.orders") || "Orders"}</Badge>
                </CardContent>
              </Card>
              
              {/* Monthly Orders Card */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {customPeriodActive 
                      ? (t("statistics.selectedPeriodItems") || "Selected Period Items") 
                      : (t("statistics.thisMonthsOrders") || "This Month's Orders")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{orderStats.monthlyCount}</div>
                  <Badge className="mt-1">{t("statistics.orders") || "Orders"}</Badge>
                </CardContent>
              </Card>
              
              {/* Daily Sales Card */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {customPeriodActive 
                      ? (t("statistics.selectedPeriodRevenue") || "Selected Period Revenue") 
                      : (t("statistics.todaysRevenue") || "Today's Revenue")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(orderStats.dailySales)}</div>
                  <Badge variant="secondary" className="mt-1">{t("statistics.sales") || "Sales"}</Badge>
                </CardContent>
              </Card>
              
              {/* Monthly Sales Card */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {customPeriodActive 
                      ? (t("statistics.selectedPeriodTotal") || "Selected Period Total") 
                      : (t("statistics.thisMonthsRevenue") || "This Month's Revenue")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(orderStats.monthlySales)}</div>
                  <Badge variant="secondary" className="mt-1">{t("statistics.sales") || "Sales"}</Badge>
                </CardContent>
              </Card>
              
              {/* Average Order Value Card - NEW */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {customPeriodActive 
                      ? (t("statistics.avgOrderValuePeriod") || "Avg. Order Value") 
                      : (t("statistics.avgOrderValue") || "Avg. Order Value")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(orderStats.averageOrderValue)}</div>
                  <Badge variant="outline" className="mt-1">{t("statistics.average") || "Average"}</Badge>
                </CardContent>
              </Card>
            </div>
            
            {chartData.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>
                    {customPeriodActive 
                      ? `${t("statistics.ordersAndSales") || "Orders and Sales"} (${dateRange?.from && isValid(dateRange.from) ? formatDate(dateRange.from) : ""} ${t("statistics.to") || "to"} ${dateRange?.to && isValid(dateRange.to) ? formatDate(dateRange.to) : t("statistics.now") || "now"})`
                      : `${t("statistics.ordersAndSales") || "Orders and Sales"} (${t("statistics.last7Days") || "Last 7 days"})`
                    }
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      {chartType === "bar" ? (
                        <BarChart
                          width={500}
                          height={300}
                          data={chartData}
                          margin={{
                            top: 20,
                            right: 30,
                            left: 20,
                            bottom: 5,
                          }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                          <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                          <Tooltip content={<CustomTooltip />} />
                          <Legend />
                          <Bar yAxisId="left" dataKey="orders" fill="#8884d8" name={t("statistics.orders") || "Orders"} />
                          <Bar yAxisId="right" dataKey="sales" fill="#82ca9d" name={t("statistics.sales") || "Sales"} />
                          <Bar yAxisId="right" dataKey="averageOrderValue" fill="#ffc658" name={t("statistics.avgOrderValue") || "Avg. Order Value"} />
                        </BarChart>
                      ) : (
                        <LineChart
                          width={500}
                          height={300}
                          data={chartData}
                          margin={{
                            top: 20,
                            right: 30,
                            left: 20,
                            bottom: 5,
                          }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                          <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                          <Tooltip content={<CustomTooltip />} />
                          <Legend />
                          <Line 
                            yAxisId="left"
                            type="monotone" 
                            dataKey="orders" 
                            stroke="#8884d8" 
                            name={t("statistics.orders") || "Orders"}
                            activeDot={{ r: 8 }}
                          />
                          <Line 
                            yAxisId="right"
                            type="monotone" 
                            dataKey="sales" 
                            stroke="#82ca9d" 
                            name={t("statistics.sales") || "Sales"}
                          />
                          <Line 
                            yAxisId="right"
                            type="monotone" 
                            dataKey="averageOrderValue" 
                            stroke="#ffc658" 
                            name={t("statistics.avgOrderValue") || "Avg. Order Value"}
                          />
                        </LineChart>
                      )}
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">{t("statistics.noData") || "No data available for the selected time period."}</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default StatisticsTab;
