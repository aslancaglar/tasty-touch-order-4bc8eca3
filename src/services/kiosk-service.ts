
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
  const { data, error } = await supabase
    .from("menu_categories")
    .select("*")
    .eq("restaurant_id", restaurantId);

  if (error) {
    console.error("Error fetching menu categories:", error);
    throw error;
  }

  return data.map(category => {
    // Create a base result with required fields
    const result: MenuCategory = {
      id: category.id,
      name: category.name,
      restaurant_id: category.restaurant_id,
      description: null,
      icon: category.icon || null,
      image_url: null,
      created_at: category.created_at,
      updated_at: category.updated_at
    };
    
    // Conditionally add optional fields if they exist in the response
    if ('description' in category && category.description !== null && category.description !== undefined) {
      result.description = String(category.description);
    }
    
    if ('image_url' in category && category.image_url !== null && category.image_url !== undefined) {
      result.image_url = String(category.image_url);
    }
    
    return result;
  });
};

export const createCategory = async (category: Omit<MenuCategory, 'id' | 'created_at' | 'updated_at'>): Promise<MenuCategory> => {
  // Ensure we're sending valid data to Supabase
  const categoryData = {
    name: category.name,
    restaurant_id: category.restaurant_id,
    icon: category.icon || null,
    description: category.description || null,
    image_url: category.image_url || null
  };

  const { data, error } = await supabase
    .from("menu_categories")
    .insert(categoryData)
    .select()
    .single();

  if (error) {
    console.error("Error creating category:", error);
    throw error;
  }

  // Ensure the returned data matches our MenuCategory type
  return {
    id: data.id,
    name: data.name,
    restaurant_id: data.restaurant_id,
    description: 'description' in data && data.description !== null ? String(data.description) : null,
    icon: data.icon || null,
    image_url: 'image_url' in data && data.image_url !== null ? String(data.image_url) : null,
    created_at: data.created_at,
    updated_at: data.updated_at
  };
};

export const updateCategory = async (id: string, updates: Partial<Omit<MenuCategory, 'id' | 'created_at' | 'updated_at'>>): Promise<MenuCategory> => {
  // Check if id is a temporary id (starts with "temp-")
  if (id.startsWith("temp-")) {
    throw new Error("Cannot update a temporary category. Please create it first.");
  }

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

  // Ensure the returned data matches our MenuCategory type
  return {
    id: data.id,
    name: data.name,
    restaurant_id: data.restaurant_id,
    description: 'description' in data && data.description !== null ? String(data.description) : null,
    icon: data.icon || null,
    image_url: 'image_url' in data && data.image_url !== null ? String(data.image_url) : null,
    created_at: data.created_at,
    updated_at: data.updated_at
  };
};

export const deleteCategory = async (id: string): Promise<void> => {
  // Check if id is a temporary id (starts with "temp-")
  if (id.startsWith("temp-")) {
    throw new Error("Cannot delete a temporary category. It exists only in the UI.");
  }

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
  // Check if categoryId is a temporary id (starts with "temp-")
  if (categoryId.startsWith("temp-")) {
    // Return empty array for temporary categories
    return [];
  }

  const { data, error } = await supabase
    .from("menu_items")
    .select("*")
    .eq("category_id", categoryId);

  if (error) {
    console.error("Error fetching menu items:", error);
    throw error;
  }

  // Transform the data to ensure it matches our MenuItem type
  return data.map(item => ({
    id: item.id,
    name: item.name,
    description: item.description || null,
    price: item.price,
    promotion_price: 'promotion_price' in item && item.promotion_price !== undefined ? item.promotion_price : null,
    image: item.image || null,
    category_id: item.category_id,
    created_at: item.created_at,
    updated_at: item.updated_at
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

  // Transform to ensure it matches our MenuItem type
  return {
    id: data.id,
    name: data.name,
    description: data.description || null,
    price: data.price,
    promotion_price: 'promotion_price' in data && data.promotion_price !== undefined ? data.promotion_price : null,
    image: data.image || null,
    category_id: data.category_id,
    created_at: data.created_at,
    updated_at: data.updated_at
  };
};

export const createMenuItem = async (item: Omit<MenuItem, 'id' | 'created_at' | 'updated_at'>): Promise<MenuItem> => {
  const { data, error } = await supabase
    .from("menu_items")
    .insert({
      name: item.name,
      description: item.description || null,
      price: item.price,
      promotion_price: item.promotion_price || null,
      image: item.image || null,
      category_id: item.category_id
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating menu item:", error);
    throw error;
  }

  // Transform to ensure it matches our MenuItem type
  return {
    id: data.id,
    name: data.name,
    description: data.description || null,
    price: data.price,
    promotion_price: 'promotion_price' in data && data.promotion_price !== undefined ? data.promotion_price : null,
    image: data.image || null,
    category_id: data.category_id,
    created_at: data.created_at,
    updated_at: data.updated_at
  };
};

export const updateMenuItem = async (id: string, updates: Partial<Omit<MenuItem, 'id' | 'created_at' | 'updated_at'>>): Promise<MenuItem> => {
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

  // Transform to ensure it matches our MenuItem type
  return {
    id: data.id,
    name: data.name,
    description: data.description || null,
    price: data.price,
    promotion_price: 'promotion_price' in data && data.promotion_price !== undefined ? data.promotion_price : null,
    image: data.image || null,
    category_id: data.category_id,
    created_at: data.created_at,
    updated_at: data.updated_at
  };
};

export const deleteMenuItem = async (id: string): Promise<void> => {
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
