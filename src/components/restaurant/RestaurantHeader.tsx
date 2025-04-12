
import React from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { Restaurant } from "@/types/database-types";
import { Link } from "react-router-dom";

interface RestaurantHeaderProps {
  restaurant: Restaurant | null;
  loading: boolean;
}

const RestaurantHeader = ({ restaurant, loading }: RestaurantHeaderProps) => {
  if (loading) {
    return (
      <div className="flex justify-center items-center h-60">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="text-center py-10">
        <h1 className="text-2xl font-bold">Restaurant Not Found</h1>
        <p className="text-muted-foreground">
          The restaurant could not be found.
        </p>
        <Button asChild>
          <Link to="/restaurants">Go Back to Restaurants</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mb-8 flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold">{restaurant.name}</h1>
        <p className="text-muted-foreground">
          Manage your restaurant's menu, toppings, and more.
        </p>
      </div>
    </div>
  );
};

export default RestaurantHeader;
