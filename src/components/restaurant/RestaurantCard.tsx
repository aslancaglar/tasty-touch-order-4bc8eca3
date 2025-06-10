
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings } from "lucide-react";
import { Link } from "react-router-dom";
import { Restaurant } from "@/types/database-types";
import { Skeleton } from "@/components/ui/skeleton";

type RestaurantStats = {
  totalOrders: number;
  revenue: number;
};

const CURRENCY_SYMBOLS: Record<string, string> = {
  EUR: "€",
  USD: "$",
  GBP: "£",
  TRY: "₺",
  JPY: "¥",
  CAD: "$",
  AUD: "$",
  CHF: "Fr.",
  CNY: "¥",
  RUB: "₽"
};

function getCurrencySymbol(currency: string) {
  const code = currency?.toUpperCase() || "EUR";
  return CURRENCY_SYMBOLS[code] || code;
}

interface RestaurantCardProps {
  restaurant: Restaurant;
  stats: RestaurantStats | undefined;
  loadingStats: boolean;
  t: (key: string) => string;
}

const RestaurantCard = ({
  restaurant,
  stats,
  loadingStats,
  t
}: RestaurantCardProps) => {
  const currencySymbol = getCurrencySymbol(restaurant.currency || "EUR");
  
  return (
    <Card className="overflow-hidden">
      <div className="h-40 w-full overflow-hidden">
        <img
          src={restaurant.image_url || "https://via.placeholder.com/400x200?text=No+Image"}
          alt={restaurant.name}
          className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
        />
      </div>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">{restaurant.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-muted-foreground mb-4">{restaurant.location}</div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">{t("restaurants.orders")}</p>
            {loadingStats ? (
              <Skeleton className="h-6 w-16" />
            ) : (
              <p className="font-medium">{stats?.totalOrders ?? 0}</p>
            )}
          </div>
          <div>
            <p className="text-muted-foreground">{t("restaurants.revenue")}</p>
            {loadingStats ? (
              <Skeleton className="h-6 w-20" />
            ) : (
              <p className="font-medium">
                {currencySymbol}{stats?.revenue?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? "0.00"}
              </p>
            )}
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button variant="outline" asChild>
            <Link to={`/r/${restaurant.slug}`}>
              {t("restaurants.viewKiosk")}
            </Link>
          </Button>
          <Button variant="default" className="bg-kiosk-primary" asChild>
            <Link to={`/restaurant/${restaurant.id}`}>
              <Settings className="mr-2 h-4 w-4" />
              {t("restaurants.manage")}
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default RestaurantCard;
