
import React, { useState, useEffect } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { useParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { Restaurant, ToppingCategory, Topping } from "@/types/database-types";
import { getRestaurantById } from "@/services/kiosk-service";
import RestaurantHeader from "@/components/restaurant/RestaurantHeader";
import ToppingCategoryList from "@/components/restaurant/ToppingCategoryList";
import ToppingsList from "@/components/restaurant/ToppingsList";

interface RestaurantManageParams {
  id: string;
}

const RestaurantManage = () => {
  const { id } = useParams<keyof RestaurantManageParams>();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();
  const [toppingCategories, setToppingCategories] = useState<ToppingCategory[]>([]);
  const [isToppingCategoriesLoading, setIsToppingCategoriesLoading] = useState(false);
  const [toppings, setToppings] = useState<Topping[]>([]);
  const [isToppingsLoading, setIsToppingsLoading] = useState(false);

  const fetchRestaurant = async () => {
    if (!id) {
      toast({
        title: "Error",
        description: "Restaurant ID is missing",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      const data = await getRestaurantById(id);
      setRestaurant(data);
    } catch (error) {
      console.error("Error fetching restaurant:", error);
      toast({
        title: "Error",
        description: "Failed to load restaurant",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchToppingCategories = async () => {
    if (!id) {
      return;
    }

    try {
      setIsToppingCategoriesLoading(true);
      const { data, error } = await supabase
        .from("topping_categories")
        .select("*")
        .eq("restaurant_id", id);

      if (error) {
        console.error("Error fetching topping categories:", error);
        toast({
          title: "Error",
          description: "Failed to load topping categories",
          variant: "destructive",
        });
      } else {
        setToppingCategories(data || []);
      }
    } catch (error) {
      console.error("Error fetching topping categories:", error);
      toast({
        title: "Error",
        description: "Failed to load topping categories",
        variant: "destructive",
      });
    } finally {
      setIsToppingCategoriesLoading(false);
    }
  };

  const fetchToppings = async () => {
    if (!id) {
      return;
    }

    try {
      setIsToppingsLoading(true);
      const { data, error } = await supabase
        .from("toppings")
        .select("*")
        .eq("restaurant_id", id);

      if (error) {
        console.error("Error fetching toppings:", error);
        toast({
          title: "Error",
          description: "Failed to load toppings",
          variant: "destructive",
        });
      } else {
        setToppings(data || []);
      }
    } catch (error) {
      console.error("Error fetching toppings:", error);
      toast({
        title: "Error",
        description: "Failed to load toppings",
        variant: "destructive",
      });
    } finally {
      setIsToppingsLoading(false);
    }
  };

  useEffect(() => {
    if (user && id) {
      fetchRestaurant();
      fetchToppingCategories();
      fetchToppings();
    } else {
      setLoading(false);
    }
  }, [user, id]);

  // Handlers for topping categories
  const handleCategoryAdded = (category: ToppingCategory) => {
    setToppingCategories((prevCategories) => [...prevCategories, category]);
  };

  const handleCategoryUpdated = (category: ToppingCategory) => {
    setToppingCategories((prevCategories) =>
      prevCategories.map((c) => (c.id === category.id ? category : c))
    );
  };

  const handleCategoryDeleted = (categoryId: string) => {
    setToppingCategories((prevCategories) =>
      prevCategories.filter((c) => c.id !== categoryId)
    );
  };

  // Handlers for toppings
  const handleToppingAdded = (topping: Topping) => {
    setToppings((prevToppings) => [...prevToppings, topping]);
  };

  const handleToppingUpdated = (topping: Topping) => {
    setToppings((prevToppings) =>
      prevToppings.map((t) => (t.id === topping.id ? topping : t))
    );
  };

  const handleToppingDeleted = (toppingId: string) => {
    setToppings((prevToppings) => 
      prevToppings.filter((t) => t.id !== toppingId)
    );
  };

  if (!id) {
    return (
      <AdminLayout>
        <div className="text-center py-10">
          <h1 className="text-2xl font-bold">Restaurant ID is missing</h1>
          <p className="text-muted-foreground">
            Please provide a valid restaurant ID.
          </p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <RestaurantHeader restaurant={restaurant} loading={loading} />
      
      {!loading && restaurant && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ToppingCategoryList
            restaurantId={id}
            toppingCategories={toppingCategories}
            isToppingCategoriesLoading={isToppingCategoriesLoading}
            onCategoryAdded={handleCategoryAdded}
            onCategoryUpdated={handleCategoryUpdated}
            onCategoryDeleted={handleCategoryDeleted}
          />
          
          <ToppingsList
            restaurantId={id}
            toppings={toppings}
            toppingCategories={toppingCategories}
            isToppingsLoading={isToppingsLoading}
            onToppingAdded={handleToppingAdded}
            onToppingUpdated={handleToppingUpdated}
            onToppingDeleted={handleToppingDeleted}
          />
        </div>
      )}
    </AdminLayout>
  );
};

export default RestaurantManage;
