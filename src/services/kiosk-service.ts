import { supabase } from "@/integrations/supabase/client";
import { 
  Restaurant, 
  MenuCategory, 
  MenuItem, 
  MenuItemOption, 
  OptionChoice, 
  Order, 
  OrderItem, 
  OrderItemOption,
  OrderStatus,
  ToppingCategory,
  Topping
} from "@/types/database-types";

// Restaurant services
export const getRestaurants = async (): Promise<Restaurant[]> => {
  const { data, error } = await supabase
    .from("restaurants")
    .select("*");

  if (error) {
    console.error("Error fetching restaurants:", error);
    throw error;
  }

  return data;
};

export const createRestaurant = async (restaurant: Omit<Restaurant, 'id' | 'created_at' | 'updated_at'>): Promise<Restaurant> => {
  const { data, error } = await supabase
    .from("restaurants")
    .insert(restaurant)
    .select()
    .single();

  if (error) {
    console.error("Error creating restaurant:", error);
    throw error;
  }

  return data;
};

export const updateRestaurant = async (id: string, updates: Partial<Omit<Restaurant, 'id' | 'created_at' | 'updated_at'>>): Promise<Restaurant> => {
  const { data, error } = await supabase
    .from("restaurants")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating restaurant:", error);
    throw error;
  }

  return data;
};

export const getRestaurantBySlug = async (slug: string): Promise<Restaurant | null> => {
  const { data, error } = await supabase
    .from("restaurants")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    console.error("Error fetching restaurant by slug:", error);
    throw error;
  }

  return data;
};

// Menu Category services
export const getCategoriesByRestaurantId = async (restaurantId: string): Promise<MenuCategory[]> => {
  console.log("Fetching categories for restaurant:", restaurantId);
  const { data, error } = await supabase
    .from("menu_categories")
    .select("*")
    .eq("restaurant_id", restaurantId);

  if (error) {
    console.error("Error fetching menu categories:", error);
    throw error;
  }

  return data;
};

export const createCategory = async (category: Omit<MenuCategory, 'id' | 'created_at' | 'updated_at'>): Promise<MenuCategory> => {
  console.log("Creating category with data:", category);
  const { data, error } = await supabase
    .from("menu_categories")
    .insert(category)
    .select()
    .single();

  if (error) {
    console.error("Error creating category:", error);
    throw error;
  }

  return data;
};

export const updateCategory = async (id: string, updates: Partial<Omit<MenuCategory, 'id' | 'created_at' | 'updated_at'>>): Promise<MenuCategory> => {
  console.log("Updating category:", id, "with data:", updates);
  const { data, error } = await supabase
    .from("menu_categories")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating category:", error);
    throw error;
  }

  return data;
};

export const deleteCategory = async (id: string): Promise<void> => {
  console.log("Deleting category:", id);
  const { error } = await supabase
    .from("menu_categories")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting category:", error);
    throw error;
  }
};

// Menu Item services
export const getMenuItemsByCategory = async (categoryId: string): Promise<MenuItem[]> => {
  const { data: menuItems, error } = await supabase
    .from("menu_items")
    .select("*")
    .eq("category_id", categoryId);

  if (error) {
    console.error("Error fetching menu items:", error);
    throw error;
  }

  const menuItemsWithToppingCategories = await Promise.all(
    menuItems.map(async (item) => {
      const { data: toppingCategoryRelations, error: relationsError } = await supabase
        .from("menu_item_topping_categories")
        .select("topping_category_id")
        .eq("menu_item_id", item.id);

      if (relationsError) {
        console.error("Error fetching menu item topping category relations:", relationsError);
        return { ...item, topping_categories: [] };
      }

      return {
        ...item,
        topping_categories: toppingCategoryRelations.map(tc => tc.topping_category_id)
      };
    })
  );

  return menuItemsWithToppingCategories;
};

export const getMenuItemById = async (id: string): Promise<MenuItem | null> => {
  const { data, error } = await supabase
    .from("menu_items")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    console.error("Error fetching menu item by id:", error);
    throw error;
  }

  const { data: toppingCategoryRelations, error: relationsError } = await supabase
    .from("menu_item_topping_categories")
    .select("topping_category_id")
    .eq("menu_item_id", id);

  if (relationsError) {
    console.error("Error fetching menu item topping category relations:", relationsError);
    return {
      ...data,
      topping_categories: []
    };
  }

  return {
    ...data,
    topping_categories: toppingCategoryRelations.map(tc => tc.topping_category_id)
  };
};

export const createMenuItem = async (item: Omit<MenuItem, 'id' | 'created_at' | 'updated_at'>): Promise<MenuItem> => {
  console.log("Creating menu item with data:", item);
  
  const { topping_categories, ...menuItemData } = item as any;
  
  const { data, error } = await supabase
    .from("menu_items")
    .insert(menuItemData)
    .select()
    .single();

  if (error) {
    console.error("Error creating menu item:", error);
    throw error;
  }

  if (topping_categories && topping_categories.length > 0) {
    const toppingCategoryRelations = topping_categories.map((categoryId: string) => ({
      menu_item_id: data.id,
      topping_category_id: categoryId
    }));

    const { error: relationError } = await supabase
      .from("menu_item_topping_categories")
      .insert(toppingCategoryRelations);

    if (relationError) {
      console.error("Error creating topping category relations:", relationError);
    }
  }

  return {
    ...data,
    topping_categories: topping_categories || []
  };
};

export const updateMenuItem = async (id: string, updates: Partial<Omit<MenuItem, 'id' | 'created_at' | 'updated_at'>>): Promise<MenuItem> => {
  console.log("Updating menu item:", id, "with data:", updates);
  
  const { topping_categories, ...menuItemData } = updates as any;
  
  const { data, error } = await supabase
    .from("menu_items")
    .update(menuItemData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating menu item:", error);
    throw error;
  }

  if (topping_categories !== undefined) {
    const { error: deleteError } = await supabase
      .from("menu_item_topping_categories")
      .delete()
      .eq("menu_item_id", id);

    if (deleteError) {
      console.error("Error deleting existing topping category relations:", deleteError);
    }

    if (topping_categories && topping_categories.length > 0) {
      const toppingCategoryRelations = topping_categories.map((categoryId: string) => ({
        menu_item_id: id,
        topping_category_id: categoryId
      }));

      const { error: insertError } = await supabase
        .from("menu_item_topping_categories")
        .insert(toppingCategoryRelations);

      if (insertError) {
        console.error("Error creating new topping category relations:", insertError);
      }
    }
  }

  return {
    ...data,
    topping_categories: topping_categories || []
  };
};

export const deleteMenuItem = async (id: string): Promise<void> => {
  console.log("Deleting menu item:", id);
  const { error } = await supabase
    .from("menu_items")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting menu item:", error);
    throw error;
  }
};

// Menu Item Options services
export const getMenuItemOptions = async (menuItemId: string): Promise<MenuItemOption[]> => {
  const { data, error } = await supabase
    .from("menu_item_options")
    .select("*")
    .eq("menu_item_id", menuItemId);

  if (error) {
    console.error("Error fetching menu item options:", error);
    throw error;
  }

  return data;
};

// Option Choices services
export const getOptionChoices = async (optionId: string): Promise<OptionChoice[]> => {
  const { data, error } = await supabase
    .from("option_choices")
    .select("*")
    .eq("option_id", optionId);

  if (error) {
    console.error("Error fetching option choices:", error);
    throw error;
  }

  return data;
};

// Order services
export const createOrder = async (order: Omit<Order, 'id' | 'created_at' | 'updated_at'>): Promise<Order> => {
  const { data, error } = await supabase
    .from("orders")
    .insert(order)
    .select()
    .single();

  if (error) {
    console.error("Error creating order:", error);
    throw error;
  }

  return {
    ...data,
    status: data.status as OrderStatus
  };
};

export const getOrderById = async (id: string): Promise<Order | null> => {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    console.error("Error fetching order by id:", error);
    throw error;
  }

  return data ? {
    ...data,
    status: data.status as OrderStatus
  } : null;
};

// Order Item services
export const createOrderItems = async (items: Omit<OrderItem, 'id' | 'created_at' | 'updated_at'>[]): Promise<OrderItem[]> => {
  const { data, error } = await supabase
    .from("order_items")
    .insert(items)
    .select();

  if (error) {
    console.error("Error creating order items:", error);
    throw error;
  }

  return data;
};

// Order Item Options services
export const createOrderItemOptions = async (options: Omit<OrderItemOption, 'id' | 'created_at' | 'updated_at'>[]): Promise<OrderItemOption[]> => {
  const { data, error } = await supabase
    .from("order_item_options")
    .insert(options)
    .select();

  if (error) {
    console.error("Error creating order item options:", error);
    throw error;
  }

  return data;
};

// Helper function to get a complete menu item with its options and choices
export const getMenuItemWithOptions = async (menuItemId: string) => {
  const menuItem = await getMenuItemById(menuItemId);
  if (!menuItem) return null;

  const options = await getMenuItemOptions(menuItemId);
  
  const optionsWithChoices = await Promise.all(
    options.map(async (option) => {
      const choices = await getOptionChoices(option.id);
      return {
        ...option,
        choices
      };
    })
  );

  return {
    ...menuItem,
    options: optionsWithChoices
  };
};

// Helper function to get all menu items for a restaurant with their categories
export const getMenuForRestaurant = async (restaurantId: string) => {
  const categories = await getCategoriesByRestaurantId(restaurantId);
  
  const categoriesWithItems = await Promise.all(
    categories.map(async (category) => {
      const items = await getMenuItemsByCategory(category.id);
      return {
        ...category,
        items
      };
    })
  );

  return categoriesWithItems;
};

// Topping Category services
export const getToppingCategoriesByRestaurantId = async (restaurantId: string): Promise<ToppingCategory[]> => {
  console.log("Fetching topping categories for restaurant:", restaurantId);
  const { data, error } = await supabase
    .from("topping_categories")
    .select("*")
    .eq("restaurant_id", restaurantId);

  if (error) {
    console.error("Error fetching topping categories:", error);
    throw error;
  }

  return data;
};

export const createToppingCategory = async (category: Omit<ToppingCategory, 'id' | 'created_at' | 'updated_at'>): Promise<ToppingCategory> => {
  console.log("Creating topping category with data:", category);
  const { data, error } = await supabase
    .from("topping_categories")
    .insert(category)
    .select()
    .single();

  if (error) {
    console.error("Error creating topping category:", error);
    throw error;
  }

  return data;
};

export const updateToppingCategory = async (id: string, updates: Partial<Omit<ToppingCategory, 'id' | 'created_at' | 'updated_at'>>): Promise<ToppingCategory> => {
  console.log("Updating topping category:", id, "with data:", updates);
  const { data, error } = await supabase
    .from("topping_categories")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating topping category:", error);
    throw error;
  }

  return data;
};

export const deleteToppingCategory = async (id: string): Promise<void> => {
  console.log("Deleting topping category:", id);
  const { error } = await supabase
    .from("topping_categories")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting topping category:", error);
    throw error;
  }
};

// Topping services
export const getToppingsByCategory = async (categoryId: string): Promise<Topping[]> => {
  const { data, error } = await supabase
    .from("toppings")
    .select("*")
    .eq("category_id", categoryId);

  if (error) {
    console.error("Error fetching toppings:", error);
    throw error;
  }

  return data;
};

export const createTopping = async (topping: Omit<Topping, 'id' | 'created_at' | 'updated_at'>): Promise<Topping> => {
  console.log("Creating topping with data:", topping);
  const { data, error } = await supabase
    .from("toppings")
    .insert(topping)
    .select()
    .single();

  if (error) {
    console.error("Error creating topping:", error);
    throw error;
  }

  return data;
};

export const updateTopping = async (id: string, updates: Partial<Omit<Topping, 'id' | 'created_at' | 'updated_at'>>): Promise<Topping> => {
  console.log("Updating topping:", id, "with data:", updates);
  const { data, error } = await supabase
    .from("toppings")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating topping:", error);
    throw error;
  }

  return data;
};

export const deleteTopping = async (id: string): Promise<void> => {
  console.log("Deleting topping:", id);
  const { error } = await supabase
    .from("toppings")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting topping:", error);
    throw error;
  }
};

// Helper function to get all toppings for a restaurant with their categories
export const getToppingsForRestaurant = async (restaurantId: string) => {
  const categories = await getToppingCategoriesByRestaurantId(restaurantId);
  
  const categoriesWithToppings = await Promise.all(
    categories.map(async (category) => {
      const toppings = await getToppingsByCategory(category.id);
      return {
        ...category,
        toppings
      };
    })
  );

  return categoriesWithToppings;
};
