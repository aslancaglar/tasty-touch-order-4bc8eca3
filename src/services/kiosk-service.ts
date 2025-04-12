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
  OrderStatus
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

export const getRestaurantById = async (id: string): Promise<Restaurant> => {
  const { data, error } = await supabase
    .from("restaurants")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error fetching restaurant by id:", error);
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
  const { data, error } = await supabase
    .from("menu_items")
    .select("*")
    .eq("category_id", categoryId);

  if (error) {
    console.error("Error fetching menu items:", error);
    throw error;
  }

  return data.map(item => ({
    ...item,
    tax_percentage: item.tax_percentage !== null ? item.tax_percentage : 10
  }));
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

  if (data) {
    return {
      ...data,
      tax_percentage: data.tax_percentage !== null ? data.tax_percentage : 10
    };
  }
  return null;
};

export const createMenuItem = async (menuItem: Omit<MenuItem, 'id' | 'created_at' | 'updated_at'>): Promise<MenuItem> => {
  console.log("Creating menu item with data:", menuItem);
  const { data, error } = await supabase
    .from("menu_items")
    .insert(menuItem)
    .select()
    .single();

  if (error) {
    console.error("Error creating menu item:", error);
    throw error;
  }

  return {
    ...data,
    tax_percentage: data.tax_percentage !== null ? data.tax_percentage : 10
  };
};

export const updateMenuItem = async (id: string, updates: Partial<Omit<MenuItem, 'id' | 'created_at' | 'updated_at'>>): Promise<MenuItem> => {
  console.log("Updating menu item:", id, "with data:", updates);
  const { data, error } = await supabase
    .from("menu_items")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating menu item:", error);
    throw error;
  }

  return {
    ...data,
    tax_percentage: data.tax_percentage !== null ? data.tax_percentage : 10
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

// Topping Categories
export const getToppingCategoriesByRestaurantId = async (restaurantId: string) => {
  const { data, error } = await supabase
    .from('topping_categories')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('name');
  
  if (error) {
    console.error('Error fetching topping categories:', error);
    throw error;
  }
  
  return data || [];
};

export const createToppingCategory = async (toppingCategory: {
  name: string;
  description: string | null;
  icon: string | null;
  restaurant_id: string;
  min_selections: number | null;
  max_selections: number | null;
}) => {
  const { data, error } = await supabase
    .from('topping_categories')
    .insert([toppingCategory])
    .select()
    .single();
  
  if (error) {
    console.error('Error creating topping category:', error);
    throw error;
  }
  
  return data;
};

export const updateToppingCategory = async (
  id: string,
  updates: {
    name?: string;
    description?: string | null;
    icon?: string | null;
    min_selections?: number | null;
    max_selections?: number | null;
  }
) => {
  const { data, error } = await supabase
    .from('topping_categories')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating topping category:', error);
    throw error;
  }
  
  return data;
};

export const deleteToppingCategory = async (id: string) => {
  const { error } = await supabase
    .from('topping_categories')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('Error deleting topping category:', error);
    throw error;
  }
  
  return true;
};

// Toppings
export const getToppingsByCategory = async (categoryId: string) => {
  const { data, error } = await supabase
    .from('toppings')
    .select('*')
    .eq('category_id', categoryId)
    .order('name');
  
  if (error) {
    console.error('Error fetching toppings:', error);
    throw error;
  }
  
  return data || [];
};

export const createTopping = async (topping: {
  name: string;
  price: number;
  category_id: string;
  tax_percentage?: number | null;
}) => {
  const { data, error } = await supabase
    .from('toppings')
    .insert([topping])
    .select()
    .single();
  
  if (error) {
    console.error('Error creating topping:', error);
    throw error;
  }
  
  return data;
};

export const updateTopping = async (
  id: string,
  updates: {
    name?: string;
    price?: number;
    category_id?: string;
    tax_percentage?: number | null;
  }
) => {
  const { data, error } = await supabase
    .from('toppings')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating topping:', error);
    throw error;
  }
  
  return data;
};

export const deleteTopping = async (id: string) => {
  const { error } = await supabase
    .from('toppings')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('Error deleting topping:', error);
    throw error;
  }
  
  return true;
};
