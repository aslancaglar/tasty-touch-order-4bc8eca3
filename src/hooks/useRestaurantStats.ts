
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

type RestaurantStats = {
  totalOrders: number;
  revenue: number;
};

const fetchRestaurantStats = async (restaurantIds: string[]): Promise<Record<string, RestaurantStats>> => {
  if (restaurantIds.length === 0) return {};

  let stats: Record<string, RestaurantStats> = {};
  const { data, error } = await supabase
    .from("orders")
    .select("restaurant_id,total,status")
    .in("restaurant_id", restaurantIds);

  if (error) {
    console.error("Error fetching order stats for restaurants:", error);
    throw error;
  }

  for (const id of restaurantIds) {
    stats[id] = { totalOrders: 0, revenue: 0 };
  }

  if (data) {
    for (const order of data) {
      if (order.status === "cancelled") continue;
      if (order.restaurant_id && stats[order.restaurant_id]) {
        stats[order.restaurant_id].totalOrders += 1;
        stats[order.restaurant_id].revenue += order.total ? parseFloat(String(order.total)) : 0;
      }
    }
  }
  return stats;
};

export const useRestaurantStats = (restaurantIds: string[]) => {
  const [stats, setStats] = useState<Record<string, RestaurantStats>>({});
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    const getStats = async () => {
      if (restaurantIds.length === 0) {
        setStats({});
        setLoadingStats(false);
        return;
      }
      setLoadingStats(true);
      try {
        const statData = await fetchRestaurantStats(restaurantIds);
        setStats(statData);
      } catch (err) {
        console.error("Failed to fetch restaurant stats", err);
      } finally {
        setLoadingStats(false);
      }
    };
    getStats();
  }, [restaurantIds]);

  return { stats, loadingStats };
};
