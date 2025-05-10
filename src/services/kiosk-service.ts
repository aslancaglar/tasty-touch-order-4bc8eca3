import { supabase } from "@/integrations/supabase/client";
import { Restaurant, MenuCategory, MenuItem, ToppingCategory, Topping, Order, OrderStatus, PaymentStatus } from "@/types/database-types";
import { TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

// Function to get all restaurants
export const getRestaurants = async (): Promise<Restaurant[]> => {
  try {
    const { data: restaurants, error } = await supabase
      .from('restaurants')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching restaurants:', error);
      throw error;
    }

    return restaurants || [];
  } catch (error) {
    console.error('Error in getRestaurants:', error);
    return [];
  }
};

// Function to get a restaurant by slug
export const getRestaurantBySlug = async (slug: string): Promise<Restaurant | null> => {
  try {
    const { data: restaurant, error } = await supabase
      .from('restaurants')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error) {
      console.error('Error fetching restaurant by slug:', error);
      return null;
    }

    return restaurant || null;
  } catch (error) {
    console.error('Error in getRestaurantBySlug:', error);
    return null;
  }
};

// Function to get a restaurant by ID
export const getRestaurantById = async (id: string): Promise<Restaurant | null> => {
  try {
    const { data: restaurant, error } = await supabase
      .from('restaurants')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching restaurant by ID:', error);
      return null;
    }

    return restaurant || null;
  } catch (error) {
    console.error('Error in getRestaurantById:', error);
    return null;
  }
};

// Function to create a new restaurant
export const createRestaurant = async (data: TablesInsert<'restaurants'>): Promise<Restaurant | null> => {
  try {
    const { data: restaurant, error } = await supabase
      .from('restaurants')
      .insert(data)
      .select()
      .single();

    if (error) {
      console.error('Error creating restaurant:', error);
      throw error;
    }

    return restaurant;
  } catch (error) {
    console.error('Error in createRestaurant:', error);
    return null;
  }
};

// Function to update a restaurant
export const updateRestaurant = async (id: string, data: {
  name?: string;
  location?: string | null;
  image_url?: string | null;
  slug?: string;
  ui_language?: string;
  currency?: string;
  card_payment_enabled?: boolean;
  cash_payment_enabled?: boolean;
}): Promise<Restaurant | null> => {
  try {
    const { data: restaurant, error } = await supabase
      .from('restaurants')
      .update({
        name: data.name,
        location: data.location,
        image_url: data.image_url,
        slug: data.slug,
        ui_language: data.ui_language,
        currency: data.currency,
        card_payment_enabled: data.card_payment_enabled,
        cash_payment_enabled: data.cash_payment_enabled
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating restaurant:', error);
      throw error;
    }

    return restaurant;
  } catch (error) {
    console.error('Error in updateRestaurant:', error);
    return null;
  }
};

// Function to delete a restaurant by ID
export const deleteRestaurant = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('restaurants')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting restaurant:', error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Error in deleteRestaurant:', error);
    return false;
  }
};

// Function to duplicate a restaurant
export const duplicateRestaurant = async (sourceRestaurantId: string): Promise<{ id: string }> => {
  try {
    const { data, error } = await supabase.rpc('duplicate_restaurant', {
      source_restaurant_id: sourceRestaurantId,
    });

    if (error) {
      console.error('Error duplicating restaurant:', error);
      throw error;
    }

    if (!data) {
      throw new Error('No restaurant ID returned after duplication.');
    }

    return { id: data };
  } catch (error) {
    console.error('Error in duplicateRestaurant:', error);
    throw error;
  }
};

// Function to get categories by restaurant ID
export const getCategoriesByRestaurantId = async (restaurantId: string): Promise<MenuCategory[]> => {
  try {
    const { data, error } = await supabase
      .from('menu_categories')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Error fetching categories:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error in getCategoriesByRestaurantId:', error);
    return [];
  }
};

// Function to create a new menu category
export const createCategory = async (data: TablesInsert<'menu_categories'>): Promise<MenuCategory> => {
  try {
    const { data: category, error } = await supabase
      .from('menu_categories')
      .insert(data)
      .select()
      .single();

    if (error) {
      console.error('Error creating category:', error);
      throw error;
    }

    return category;
  } catch (error) {
    console.error('Error in createCategory:', error);
    throw error;
  }
};

// Function to update a menu category
export const updateCategory = async (id: string, data: Partial<MenuCategory>): Promise<MenuCategory> => {
  try {
    const { data: updatedCategory, error } = await supabase
      .from('menu_categories')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating category:', error);
      throw error;
    }

    return updatedCategory;
  } catch (error) {
    console.error('Error in updateCategory:', error);
    throw error;
  }
};

// Function to delete a menu category
export const deleteCategory = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('menu_categories')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting category:', error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Error in deleteCategory:', error);
    throw error;
  }
};

// Function to get menu items by category
export const getMenuItemsByCategory = async (categoryId: string): Promise<MenuItem[]> => {
  try {
    const { data, error } = await supabase
      .from('menu_items')
      .select('*')
      .eq('category_id', categoryId)
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Error fetching menu items:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error in getMenuItemsByCategory:', error);
    return [];
  }
};

// Function to get complete menu for a restaurant
export const getMenuForRestaurant = async (restaurantId: string): Promise<{ categories: MenuCategory[], menuItems: Record<string, MenuItem[]> }> => {
  try {
    const categories = await getCategoriesByRestaurantId(restaurantId);
    const menuItems: Record<string, MenuItem[]> = {};

    for (const category of categories) {
      const items = await getMenuItemsByCategory(category.id);
      menuItems[category.id] = items;
    }

    return { categories, menuItems };
  } catch (error) {
    console.error('Error in getMenuForRestaurant:', error);
    return { categories: [], menuItems: {} };
  }
};

// Function to create a new menu item
export const createMenuItem = async (data: TablesInsert<'menu_items'> & { topping_categories?: string[] }): Promise<MenuItem> => {
  try {
    // First, create the menu item
    const { data: menuItem, error } = await supabase
      .from('menu_items')
      .insert({
        name: data.name,
        description: data.description,
        price: data.price,
        promotion_price: data.promotion_price,
        image: data.image,
        category_id: data.category_id,
        tax_percentage: data.tax_percentage,
        in_stock: data.in_stock !== undefined ? data.in_stock : true,
        display_order: data.display_order
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating menu item:', error);
      throw error;
    }

    // If topping categories are provided, create the associations
    if (data.topping_categories && data.topping_categories.length > 0) {
      const toppingCategoryAssociations = data.topping_categories.map((categoryId, index) => ({
        menu_item_id: menuItem.id,
        topping_category_id: categoryId,
        display_order: index
      }));

      const { error: toppingCategoryError } = await supabase
        .from('menu_item_topping_categories')
        .insert(toppingCategoryAssociations);

      if (toppingCategoryError) {
        console.error('Error associating topping categories:', toppingCategoryError);
      }

      // Add topping categories to the returned menu item
      (menuItem as any).topping_categories = data.topping_categories;
    }

    return menuItem;
  } catch (error) {
    console.error('Error in createMenuItem:', error);
    throw error;
  }
};

// Function to update a menu item
export const updateMenuItem = async (id: string, data: Partial<MenuItem> & { topping_categories?: string[] }): Promise<MenuItem> => {
  try {
    // First, update the menu item
    const { data: updatedMenuItem, error } = await supabase
      .from('menu_items')
      .update({
        name: data.name,
        description: data.description,
        price: data.price,
        promotion_price: data.promotion_price,
        image: data.image,
        tax_percentage: data.tax_percentage,
        in_stock: data.in_stock,
        display_order: data.display_order
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating menu item:', error);
      throw error;
    }

    // If topping categories are provided, update the associations
    if (data.topping_categories !== undefined) {
      // First, remove all existing associations
      const { error: deleteError } = await supabase
        .from('menu_item_topping_categories')
        .delete()
        .eq('menu_item_id', id);

      if (deleteError) {
        console.error('Error removing existing topping categories:', deleteError);
      }

      // Then, create new associations
      if (data.topping_categories.length > 0) {
        const toppingCategoryAssociations = data.topping_categories.map((categoryId, index) => ({
          menu_item_id: id,
          topping_category_id: categoryId,
          display_order: index
        }));

        const { error: insertError } = await supabase
          .from('menu_item_topping_categories')
          .insert(toppingCategoryAssociations);

        if (insertError) {
          console.error('Error associating topping categories:', insertError);
        }
      }

      // Add topping categories to the returned menu item
      (updatedMenuItem as any).topping_categories = data.topping_categories;
    }

    return updatedMenuItem;
  } catch (error) {
    console.error('Error in updateMenuItem:', error);
    throw error;
  }
};

// Function to delete a menu item
export const deleteMenuItem = async (id: string): Promise<boolean> => {
  try {
    // First delete related topping category associations
    await supabase
      .from('menu_item_topping_categories')
      .delete()
      .eq('menu_item_id', id);

    // Then delete the menu item
    const { error } = await supabase
      .from('menu_items')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting menu item:', error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Error in deleteMenuItem:', error);
    throw error;
  }
};

// Function to get a menu item with its options
export const getMenuItemWithOptions = async (id: string): Promise<any> => {
  try {
    // Get the menu item
    const { data: menuItem, error: menuItemError } = await supabase
      .from('menu_items')
      .select('*')
      .eq('id', id)
      .single();

    if (menuItemError) {
      console.error('Error fetching menu item:', menuItemError);
      throw menuItemError;
    }

    // Get topping categories for the menu item
    const { data: menuItemToppingCategories, error: toppingCatError } = await supabase
      .from('menu_item_topping_categories')
      .select('topping_category_id')
      .eq('menu_item_id', id)
      .order('display_order', { ascending: true });

    if (toppingCatError) {
      console.error('Error fetching topping categories for menu item:', toppingCatError);
    }

    const toppingCategoryIds = menuItemToppingCategories?.map(item => item.topping_category_id) || [];
    
    // Add the topping_categories field to the menu item
    const enrichedMenuItem = {
      ...menuItem,
      topping_categories: toppingCategoryIds
    };

    return enrichedMenuItem;
  } catch (error) {
    console.error('Error in getMenuItemWithOptions:', error);
    throw error;
  }
};

// Function to get topping categories by restaurant ID
export const getToppingCategoriesByRestaurantId = async (restaurantId: string): Promise<ToppingCategory[]> => {
  try {
    const { data, error } = await supabase
      .from('topping_categories')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Error fetching topping categories:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error in getToppingCategoriesByRestaurantId:', error);
    return [];
  }
};

// Function to get toppings by category
export const getToppingsByCategory = async (categoryId: string): Promise<Topping[]> => {
  try {
    const { data, error } = await supabase
      .from('toppings')
      .select('*')
      .eq('category_id', categoryId)
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Error fetching toppings:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error in getToppingsByCategory:', error);
    return [];
  }
};

// Function to update a topping
export const updateTopping = async (id: string, data: Partial<Topping>): Promise<Topping> => {
  try {
    const { data: updatedTopping, error } = await supabase
      .from('toppings')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating topping:', error);
      throw error;
    }

    return updatedTopping;
  } catch (error) {
    console.error('Error in updateTopping:', error);
    throw error;
  }
};

// Function to create an order
export const createOrder = async (data: {
  restaurant_id: string;
  customer_name?: string;
  total: number;
  status: OrderStatus;
  order_type?: string;
  table_number?: string;
}): Promise<Order> => {
  try {
    const { data: order, error } = await supabase
      .from('orders')
      .insert({
        restaurant_id: data.restaurant_id,
        customer_name: data.customer_name || null,
        total: data.total,
        status: data.status,
        order_type: data.order_type || null,
        table_number: data.table_number || null,
        payment_status: 'pending'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating order:', error);
      throw error;
    }

    // Make sure the returned data conforms to Order type
    return order as Order;
  } catch (error) {
    console.error('Error in createOrder:', error);
    throw error;
  }
};

// Function to update an order status
export const updateOrderStatus = async (id: string, status: OrderStatus): Promise<Order> => {
  try {
    const { data: updatedOrder, error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating order status:', error);
      throw error;
    }

    // Make sure the returned data conforms to Order type
    return updatedOrder as Order;
  } catch (error) {
    console.error('Error in updateOrderStatus:', error);
    throw error;
  }
};

// Function to update an order's payment status
export const updateOrderPaymentStatus = async (id: string, paymentStatus: PaymentStatus, paymentId?: string): Promise<Order> => {
  try {
    const updateData: { payment_status: PaymentStatus; payment_id?: string } = { payment_status: paymentStatus };
    if (paymentId) {
      updateData.payment_id = paymentId;
    }
    
    const { data: updatedOrder, error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating order payment status:', error);
      throw error;
    }

    // Make sure the returned data conforms to Order type
    return updatedOrder as Order;
  } catch (error) {
    console.error('Error in updateOrderPaymentStatus:', error);
    throw error;
  }
};

// Function to create order items
export const createOrderItems = async (data: {
  order_id: string;
  items: {
    menu_item_id: string;
    quantity: number;
    price: number;
    special_instructions?: string;
  }[];
}): Promise<any[]> => {
  try {
    const orderItems = data.items.map(item => ({
      order_id: data.order_id,
      menu_item_id: item.menu_item_id,
      quantity: item.quantity,
      price: item.price,
      special_instructions: item.special_instructions || null
    }));

    const { data: createdItems, error } = await supabase
      .from('order_items')
      .insert(orderItems)
      .select();

    if (error) {
      console.error('Error creating order items:', error);
      throw error;
    }

    return createdItems || [];
  } catch (error) {
    console.error('Error in createOrderItems:', error);
    throw error;
  }
};

// Function to create order item options
export const createOrderItemOptions = async (data: {
  options: {
    order_item_id: string;
    option_id: string;
    choice_id: string;
  }[];
}): Promise<any[]> => {
  if (!data.options || data.options.length === 0) {
    return [];
  }

  try {
    const { data: createdOptions, error } = await supabase
      .from('order_item_options')
      .insert(data.options)
      .select();

    if (error) {
      console.error('Error creating order item options:', error);
      throw error;
    }

    return createdOptions || [];
  } catch (error) {
    console.error('Error in createOrderItemOptions:', error);
    throw error;
  }
};

// Function to create order item toppings
export const createOrderItemToppings = async (data: {
  toppings: {
    order_item_id: string;
    topping_id: string;
  }[];
}): Promise<any[]> => {
  if (!data.toppings || data.toppings.length === 0) {
    return [];
  }

  try {
    const { data: createdToppings, error } = await supabase
      .from('order_item_toppings')
      .insert(data.toppings)
      .select();

    if (error) {
      console.error('Error creating order item toppings:', error);
      throw error;
    }

    return createdToppings || [];
  } catch (error) {
    console.error('Error in createOrderItemToppings:', error);
    throw error;
  }
};
