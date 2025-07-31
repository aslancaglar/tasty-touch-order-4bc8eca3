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
  OrderType,
  ToppingCategory,
  Topping,
  MenuItemWithOptions
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
  console.log("Updating restaurant:", id, "with data:", updates);
  
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

  console.log("Restaurant updated successfully:", data);
  return data;
};

export const deleteRestaurant = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from("restaurants")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting restaurant:", error);
    throw error;
  }
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
    .eq("restaurant_id", restaurantId)
    .order('display_order', { ascending: true });  // Order by display_order

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
        .eq("menu_item_id", item.id)
        .order("display_order", { ascending: true }); // Order by display_order

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
    .eq("menu_item_id", id)
    .order("display_order", { ascending: true }); // Order by display_order

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

  const { topping_categories, tax_percentage, ...menuItemData } = item as any;

  const taxValue = (typeof tax_percentage === 'string' || typeof tax_percentage === 'number')
    ? (Number(tax_percentage) || 10)
    : 10;

  const { data, error } = await supabase
    .from("menu_items")
    .insert({ ...menuItemData, tax_percentage: taxValue })
    .select()
    .single();

  if (error) {
    console.error("Error creating menu item:", error);
    throw error;
  }

  if (topping_categories && topping_categories.length > 0) {
    const toppingCategoryRelations = topping_categories.map((categoryId: string, index: number) => ({
      menu_item_id: data.id,
      topping_category_id: categoryId,
      display_order: index // Save the order based on array index
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

  const { topping_categories, tax_percentage, ...menuItemData } = updates as any;
  
  const taxValue = (typeof tax_percentage === 'string' || typeof tax_percentage === 'number')
    ? (Number(tax_percentage) || 10)
    : 10;

  const { data, error } = await supabase
    .from("menu_items")
    .update({ ...menuItemData, tax_percentage: taxValue })
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
      const toppingCategoryRelations = topping_categories.map((categoryId: string, index: number) => ({
        menu_item_id: id,
        topping_category_id: categoryId,
        display_order: index // Add display_order based on the array index
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
interface CreateOrderParams {
  restaurant_id: string;
  customer_name: string | null;
  status: string;
  total: number;
  order_type?: string;
  table_number?: string;
}

export const createOrder = async (params: CreateOrderParams): Promise<any> => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .insert({
        restaurant_id: params.restaurant_id,
        customer_name: params.customer_name,
        status: params.status,
        total: params.total,
        order_type: params.order_type,
        table_number: params.table_number
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating order:', error);
    throw error;
  }
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
    status: data.status as OrderStatus,
    order_type: data.order_type as OrderType
  } : null;
};

export const getOrdersByRestaurantId = async (restaurantId: string): Promise<Order[]> => {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching orders by restaurant id:", error);
    throw error;
  }

  return data.map(order => ({
    ...order,
    status: order.status as OrderStatus,
    order_type: order.order_type as OrderType
  }));
};

export const updateOrderStatus = async (id: string, status: OrderStatus): Promise<Order> => {
  const { data, error } = await supabase
    .from("orders")
    .update({ status })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating order status:", error);
    throw error;
  }

  return {
    ...data,
    status: data.status as OrderStatus,
    order_type: data.order_type as OrderType
  };
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

// Order Item Toppings services
export const createOrderItemToppings = async (toppings: Array<{order_item_id: string, topping_id: string}>): Promise<any> => {
  const { data, error } = await supabase
    .from("order_item_toppings")
    .insert(toppings)
    .select();

  if (error) {
    console.error("Error creating order item toppings:", error);
    throw error;
  }

  return data;
};

// Helper function to get a complete menu item with its options and choices
export const getMenuItemWithOptions = async (menuItemId: string) => {
  try {
    const menuItem = await getMenuItemById(menuItemId);
    if (!menuItem) {
      return null;
    }

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

  // Fetch topping categories linked to this menu item
  const { data: toppingCategoryRelations, error: relError } = await supabase
    .from("menu_item_topping_categories")
    .select("topping_category_id, display_order")
    .eq("menu_item_id", menuItemId)
    .order("display_order", { ascending: true });

  if (relError) {
    console.error("Error fetching menu item topping category relations:", relError);
    return {
      ...menuItem,
      options: optionsWithChoices,
      toppingCategories: []
    };
  }

  // Get the ids of the topping categories
  const toppingCategoryIds = toppingCategoryRelations.map(rel => rel.topping_category_id);
  
  // Create a map of id to display_order for sorting later
  const displayOrderMap = toppingCategoryRelations.reduce((map, rel) => {
    map[rel.topping_category_id] = rel.display_order ?? 1000; // Default to high number if null
    return map;
  }, {} as Record<string, number>);

  if (toppingCategoryIds.length === 0) {
    return {
      ...menuItem,
      options: optionsWithChoices,
      toppingCategories: []
    };
  }

  // Fetch the actual topping categories with explicit multilingual fields
  const { data: toppingCategories, error: tcError } = await supabase
    .from("topping_categories")
    .select("*, name_fr, name_en, name_tr, description_fr, description_en, description_tr")
    .in("id", toppingCategoryIds);

  if (tcError) {
    console.error("Error fetching topping categories:", tcError);
    return {
      ...menuItem,
      options: optionsWithChoices,
      toppingCategories: []
    };
  }

  // Now fetch toppings for each category and create the full structure
  const toppingCategoriesWithToppings = await Promise.all(
    toppingCategories.map(async (category) => {
      const toppings = await getToppingsByCategory(category.id);
      
      // Use the display_order from the relation table
      const relationDisplayOrder = displayOrderMap[category.id];
      
      return {
        ...category,
        display_order: relationDisplayOrder,  // Use relation display_order for category sorting
        required: category.min_selections ? category.min_selections > 0 : false, // Add required property
        toppings
      };
    })
  );

  // Sort the topping categories based on display_order from the relation table
  const sortedCategories = toppingCategoriesWithToppings.sort((a, b) => {
    const orderA = a.display_order ?? 1000;
    const orderB = b.display_order ?? 1000;
    return orderA - orderB;
  });

    return {
      ...menuItem,
      options: optionsWithChoices,
      toppingCategories: sortedCategories
    };
  } catch (error) {
    console.error('Error in getMenuItemWithOptions:', error);
    throw error;
  }
};

// Optimized batch menu service for fetching multiple items with details
export const getMenuItemsWithOptionsBatch = async (itemIds: string[]): Promise<{ [itemId: string]: MenuItemWithOptions }> => {
  console.log(`Batch fetching menu items with options for ${itemIds.length} items`);

  if (itemIds.length === 0) {
    return {};
  }

  try {
    // Fetch all items, options, and topping categories in parallel
    const [menuItemsResult, optionsResult, toppingCategoriesResult] = await Promise.all([
      // Get menu items
      supabase
        .from("menu_items")
        .select("*")
        .in("id", itemIds),
      
      // Get all options and choices for these items
      supabase
        .from("menu_item_options")
        .select(`
          id,
          menu_item_id,
          name,
          required,
          multiple,
          option_choices!inner (
            id,
            name,
            price
          )
        `)
        .in("menu_item_id", itemIds),
      
      // Get all topping categories for these items
      supabase
        .from("menu_item_topping_categories")
        .select(`
          menu_item_id,
          topping_category_id,
          display_order,
          topping_categories!inner (
            id,
            name,
            min_selections,
            max_selections,
            display_order,
            show_if_selection_type,
            show_if_selection_id,
            allow_multiple_same_topping,
            name_fr,
            name_en,
            name_tr,
            name_de,
            name_es,
            name_it,
            name_nl,
            name_pt,
            name_ru,
            name_ar,
            name_zh,
            toppings!inner (
              id,
              name,
              price,
              tax_percentage,
              display_order,
              name_fr,
              name_en,
              name_tr,
              name_de,
              name_es,
              name_it,
              name_nl,
              name_pt,
              name_ru,
              name_ar,
              name_zh
            )
          )
        `)
        .in("menu_item_id", itemIds)
        .order("display_order", { ascending: true })
    ]);

    if (menuItemsResult.error) throw menuItemsResult.error;
    if (optionsResult.error) throw optionsResult.error;
    if (toppingCategoriesResult.error) throw toppingCategoriesResult.error;

    // Create lookup maps
    const optionsByItemId = new Map<string, any[]>();
    const toppingCategoriesByItemId = new Map<string, any[]>();

    // Process options
    optionsResult.data.forEach(option => {
      const existing = optionsByItemId.get(option.menu_item_id) || [];
      existing.push({
        id: option.id,
        name: option.name,
        required: option.required,
        multiple: option.multiple,
        choices: (option.option_choices || []).map((choice: any) => ({
          id: choice.id,
          name: choice.name,
          price: choice.price || 0
        }))
      });
      optionsByItemId.set(option.menu_item_id, existing);
    });

    // Process topping categories
    toppingCategoriesResult.data.forEach(relation => {
      const category = relation.topping_categories;
      if (!category) return;
      
      const sortedToppings = [...(category.toppings || [])].sort((a: any, b: any) => {
        const orderA = a.display_order ?? 1000;
        const orderB = b.display_order ?? 1000;
        return orderA - orderB;
      });
      
      const existing = toppingCategoriesByItemId.get(relation.menu_item_id) || [];
      existing.push({
        id: category.id,
        name: category.name,
        min_selections: category.min_selections || 0,
        max_selections: category.max_selections || 0,
        required: (category.min_selections && category.min_selections > 0) || false,
        display_order: relation.display_order || category.display_order,
        show_if_selection_type: category.show_if_selection_type,
        show_if_selection_id: category.show_if_selection_id,
        allow_multiple_same_topping: category.allow_multiple_same_topping || false,
        name_fr: category.name_fr,
        name_en: category.name_en,
        name_tr: category.name_tr,
        name_de: category.name_de,
        name_es: category.name_es,
        name_it: category.name_it,
        name_nl: category.name_nl,
        name_pt: category.name_pt,
        name_ru: category.name_ru,
        name_ar: category.name_ar,
        name_zh: category.name_zh,
        toppings: sortedToppings.map((topping: any) => ({
          id: topping.id,
          name: topping.name,
          price: topping.price || 0,
          tax_percentage: topping.tax_percentage || 10,
          display_order: topping.display_order,
          name_fr: topping.name_fr,
          name_en: topping.name_en,
          name_tr: topping.name_tr,
          name_de: topping.name_de,
          name_es: topping.name_es,
          name_it: topping.name_it,
          name_nl: topping.name_nl,
          name_pt: topping.name_pt,
          name_ru: topping.name_ru,
          name_ar: topping.name_ar,
          name_zh: topping.name_zh
        }))
      });
      toppingCategoriesByItemId.set(relation.menu_item_id, existing);
    });

    // Build result map
    const result: { [itemId: string]: MenuItemWithOptions } = {};
    
    menuItemsResult.data.forEach(menuItem => {
      const options = optionsByItemId.get(menuItem.id) || [];
      const toppingCategories = (toppingCategoriesByItemId.get(menuItem.id) || [])
        .sort((a: any, b: any) => {
          const orderA = a.display_order ?? 1000;
          const orderB = b.display_order ?? 1000;
          return orderA - orderB;
        });

      result[menuItem.id] = {
        ...menuItem,
        options,
        toppingCategories
      };
    });

    console.log(`Successfully batch fetched ${Object.keys(result).length} menu items with details`);
    return result;

  } catch (error) {
    console.error("Error in getMenuItemsWithOptionsBatch:", error);
    throw error;
  }
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

// Helper function to get order items for a specific order
export const getOrderItemsByOrderId = async (orderId: string) => {
  const { data, error } = await supabase
    .from("order_items")
    .select(`
      id,
      quantity,
      price,
      special_instructions,
      menu_items (
        id,
        name,
        description
      )
    `)
    .eq("order_id", orderId);

  if (error) {
    console.error("Error fetching order items:", error);
    throw error;
  }

  return data;
};

// Topping Category services
export const getToppingCategoriesByRestaurantId = async (restaurantId: string): Promise<ToppingCategory[]> => {
  console.log("Fetching topping categories for restaurant:", restaurantId);
  const { data, error } = await supabase
    .from("topping_categories")
    .select("*, name_fr, name_en, name_tr, description_fr, description_en, description_tr")
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
    .select("*, name_fr, name_en, name_tr")
    .eq("category_id", categoryId)
    .order('display_order', { ascending: true }); // Order by display_order

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

export const duplicateRestaurant = async (restaurantId: string): Promise<Restaurant> => {
  console.log("Duplicating restaurant:", restaurantId);
  
  const { data, error } = await supabase
    .rpc('duplicate_restaurant', {
      source_restaurant_id: restaurantId
    })
    .single();

  if (error) {
    console.error("Error duplicating restaurant:", error);
    throw error;
  }

  // Fetch the newly created restaurant
  const { data: newRestaurant, error: fetchError } = await supabase
    .from("restaurants")
    .select("*")
    .eq("id", data)
    .single();

  if (fetchError) {
    console.error("Error fetching new restaurant:", fetchError);
    throw fetchError;
  }

  return newRestaurant;
};
