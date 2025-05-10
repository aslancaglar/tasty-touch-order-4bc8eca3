
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

interface StatisticsTabProps {
  restaurant: Restaurant;
}

interface OrderStats {
  dailyCount: number;
  monthlyCount: number;
  dailySales: number;
  monthlySales: number;
}

interface ChartData {
  name: string;
  orders: number;
  sales: number;
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE', '#00C49F'];

const StatisticsTab = ({ restaurant }: StatisticsTabProps) => {
  const [loading, setLoading] = useState(true);
  const [orderStats, setOrderStats] = useState<OrderStats>({
    dailyCount: 0,
    monthlyCount: 0,
    dailySales: 0,
    monthlySales: 0
  });
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subDays(new Date(), 7),
    to: new Date(),
  });
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [customPeriodActive, setCustomPeriodActive] = useState(false);
  const [chartType, setChartType] = useState<"bar" | "line">("bar");
  
  const { toast } = useToast();

  useEffect(() => {
    if (restaurant) {
      fetchStatistics();
    }
  }, [restaurant.id]);

  useEffect(() => {
    if (customPeriodActive && dateRange && dateRange.from) {
      fetchCustomPeriodData();
    }
  }, [dateRange, customPeriodActive]);

  const fetchStatistics = async () => {
    try {
      setLoading(true);
      
      // Fetch daily order count and sales
      const todayStart = startOfDay(new Date()).toISOString();
      const todayEnd = endOfDay(new Date()).toISOString();
      
      const { data: dailyOrders, error: dailyError } = await supabase
        .from('orders')
        .select('id, total')
        .eq('restaurant_id', restaurant.id)
        .gte('created_at', todayStart)
        .lte('created_at', todayEnd);
      
      if (dailyError) throw dailyError;
      
      // Fetch monthly order count and sales
      const monthStart = startOfMonth(new Date()).toISOString();
      const monthEnd = endOfMonth(new Date()).toISOString();
      
      const { data: monthlyOrders, error: monthlyError } = await supabase
        .from('orders')
        .select('id, total')
        .eq('restaurant_id', restaurant.id)
        .gte('created_at', monthStart)
        .lte('created_at', monthEnd);
      
      if (monthlyError) throw monthlyError;
      
      // Calculate statistics
      const dailySales = dailyOrders.reduce((sum, order) => sum + Number(order.total), 0);
      const monthlySales = monthlyOrders.reduce((sum, order) => sum + Number(order.total), 0);
      
      setOrderStats({
        dailyCount: dailyOrders.length,
        monthlyCount: monthlyOrders.length,
        dailySales,
        monthlySales
      });
      
      // Fetch data for the last 7 days for the chart
      const last7Days = subDays(new Date(), 6).toISOString();
      
      const { data: chartOrdersData, error: chartError } = await supabase
        .from('orders')
        .select('id, total, created_at')
        .eq('restaurant_id', restaurant.id)
        .gte('created_at', last7Days)
        .order('created_at', { ascending: true });
      
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
            sales: 0
          };
        }
        
        chartDataByDay[date].orders += 1;
        chartDataByDay[date].sales += Number(order.total);
      });
      
      const formattedChartData = Object.values(chartDataByDay);
      setChartData(formattedChartData);
      
      setLoading(false);
    } catch (error) {
      console.error("Error fetching statistics:", error);
      toast({
        title: "Error",
        description: "Failed to load statistics data",
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
      
      const { data: periodOrders, error: periodError } = await supabase
        .from('orders')
        .select('id, total, created_at')
        .eq('restaurant_id', restaurant.id)
        .gte('created_at', fromDate)
        .lte('created_at', toDate)
        .order('created_at', { ascending: true });
      
      if (periodError) throw periodError;
      
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
            sales: 0
          };
        }
        
        chartDataByDay[date].orders += 1;
        chartDataByDay[date].sales += Number(order.total);
        totalSales += Number(order.total);
      });
      
      const formattedChartData = Object.values(chartDataByDay);
      setChartData(formattedChartData);
      
      setOrderStats({
        ...orderStats,
        dailyCount: periodOrders.length,
        monthlyCount: periodOrders.length,
        dailySales: totalSales,
        monthlySales: totalSales
      });
      
      setLoading(false);
    } catch (error) {
      console.error("Error fetching custom period data:", error);
      toast({
        title: "Error",
        description: "Failed to load custom period data",
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
          <p className="text-sm">{`Orders: ${payload[0].value}`}</p>
          <p className="text-sm">{`Sales: ${formatCurrency(payload[1].value as number)}`}</p>
        </div>
      );
    }
  
    return null;
  };

  // Safe date format function to handle undefined dates
  const formatDate = (date: Date | undefined): string => {
    return date ? format(date, "LLL dd, yyyy") : "";
  };

  return (
    <div>
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-2xl font-semibold">Restaurant Statistics</h2>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center space-x-2">
              <Switch 
                id="custom-period" 
                checked={customPeriodActive}
                onCheckedChange={setCustomPeriodActive}
              />
              <Label htmlFor="custom-period">Custom Date Range</Label>
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
                      {dateRange?.from ? (
                        dateRange.to ? (
                          <>
                            {formatDate(dateRange.from)} -{" "}
                            {formatDate(dateRange.to)}
                          </>
                        ) : (
                          formatDate(dateRange.from)
                        )
                      ) : (
                        <span>Pick a date</span>
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
                Bar
              </Button>
              <Button variant="outline" size="sm" onClick={() => setChartType("line")}>
                <ChartPie className="h-4 w-4 mr-1" />
                Line
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
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
              {/* Daily Orders Card */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {customPeriodActive ? "Selected Period Orders" : "Today's Orders"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{orderStats.dailyCount}</div>
                  <Badge className="mt-1">Orders</Badge>
                </CardContent>
              </Card>
              
              {/* Monthly Orders Card */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {customPeriodActive ? "Selected Period Items" : "This Month's Orders"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{orderStats.monthlyCount}</div>
                  <Badge className="mt-1">Orders</Badge>
                </CardContent>
              </Card>
              
              {/* Daily Sales Card */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {customPeriodActive ? "Selected Period Revenue" : "Today's Revenue"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(orderStats.dailySales)}</div>
                  <Badge variant="secondary" className="mt-1">Sales</Badge>
                </CardContent>
              </Card>
              
              {/* Monthly Sales Card */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {customPeriodActive ? "Selected Period Total" : "This Month's Revenue"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(orderStats.monthlySales)}</div>
                  <Badge variant="secondary" className="mt-1">Sales</Badge>
                </CardContent>
              </Card>
            </div>
            
            {chartData.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>
                    {customPeriodActive 
                      ? `Orders and Sales (${dateRange?.from ? formatDate(dateRange.from) : ""} to ${dateRange?.to ? formatDate(dateRange.to) : "now"})`
                      : "Orders and Sales (Last 7 days)"
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
                          <Bar yAxisId="left" dataKey="orders" fill="#8884d8" name="Orders" />
                          <Bar yAxisId="right" dataKey="sales" fill="#82ca9d" name="Sales" />
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
                            name="Orders"
                            activeDot={{ r: 8 }}
                          />
                          <Line 
                            yAxisId="right"
                            type="monotone" 
                            dataKey="sales" 
                            stroke="#82ca9d" 
                            name="Sales"
                          />
                        </LineChart>
                      )}
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No data available for the selected time period.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default StatisticsTab;
