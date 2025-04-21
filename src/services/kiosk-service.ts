import { Restaurant, MenuCategory, MenuItem, ToppingCategory } from "@/types/database-types";
import { supabase } from "../integrations/supabase/client";

export const getRestaurants = async (): Promise<Restaurant[]> => {
  try {
    const { data: restaurants, error } = await supabase
      .from('restaurants')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return restaurants || [];
  } catch (error) {
    console.error("Error fetching restaurants:", error);
    throw error;
  }
};

export const getCategoriesByRestaurantId = async (restaurantId: string): Promise<MenuCategory[]> => {
  try {
    const { data: categories, error } = await supabase
      .from('menu_categories')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('display_order', { ascending: true });

    if (error) {
      throw error;
    }

    return categories || [];
  } catch (error) {
    console.error("Error fetching categories:", error);
    throw error;
  }
};

export const getMenuItemsByCategory = async (categoryId: string): Promise<MenuItem[]> => {
  try {
    const { data: menuItems, error } = await supabase
      .from('menu_items')
      .select('*')
      .eq('category_id', categoryId)
      .order('display_order', { ascending: true });

    if (error) {
      throw error;
    }

    return menuItems || [];
  } catch (error) {
    console.error("Error fetching menu items:", error);
    throw error;
  }
};

export const createCategory = async (category: Omit<MenuCategory, 'id' | 'created_at'>): Promise<MenuCategory> => {
  try {
    const { data, error } = await supabase
      .from('menu_categories')
      .insert([category])
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data as MenuCategory;
  } catch (error) {
    console.error("Error creating category:", error);
    throw error;
  }
};

export const updateCategory = async (id: string, updates: Partial<Omit<MenuCategory, 'id' | 'created_at'>>): Promise<MenuCategory> => {
  try {
    const { data, error } = await supabase
      .from('menu_categories')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data as MenuCategory;
  } catch (error) {
    console.error("Error updating category:", error);
    throw error;
  }
};

export const deleteCategory = async (id: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('menu_categories')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }
  } catch (error) {
    console.error("Error deleting category:", error);
    throw error;
  }
};

export const createMenuItem = async (item: Omit<MenuItem, 'id' | 'created_at' | 'topping_categories'> & { topping_categories?: string[] }): Promise<MenuItem> => {
  try {
    // Omit topping_categories from the menu_items insert
    const { topping_categories, ...menuItemData } = item;

    const { data: menuItem, error: menuItemError } = await supabase
      .from('menu_items')
      .insert([menuItemData])
      .select()
      .single();

    if (menuItemError) {
      throw menuItemError;
    }

    // If topping_categories exist, insert them into the menu_item_topping_categories table
    if (topping_categories && topping_categories.length > 0) {
      // Map through topping_categories and create the insert array
      const toppingCategoryInserts = topping_categories.map((topping_category_id, index) => ({
        menu_item_id: menuItem.id,
        topping_category_id: topping_category_id,
        display_order: index // Set the display order based on the index
      }));

      const { error: toppingCategoryError } = await supabase
        .from('menu_item_topping_categories')
        .insert(toppingCategoryInserts);

      if (toppingCategoryError) {
        throw toppingCategoryError;
      }
    }

    return menuItem as MenuItem;
  } catch (error) {
    console.error("Error creating menu item:", error);
    throw error;
  }
};

export const updateMenuItem = async (id: string, updates: Partial<Omit<MenuItem, 'id' | 'created_at' | 'topping_categories'>> & { topping_categories?: string[] }): Promise<MenuItem> => {
  try {
    // Omit topping_categories from the menu_items update
    const { topping_categories, ...menuItemData } = updates;

    const { data: menuItem, error: menuItemError } = await supabase
      .from('menu_items')
      .update(menuItemData)
      .eq('id', id)
      .select()
      .single();

    if (menuItemError) {
      throw menuItemError;
    }

    // Delete existing topping categories for the menu item
    const { error: deleteError } = await supabase
      .from('menu_item_topping_categories')
      .delete()
      .eq('menu_item_id', id);

    if (deleteError) {
      throw deleteError;
    }

    // If topping_categories exist, insert them into the menu_item_topping_categories table
    if (topping_categories && topping_categories.length > 0) {
      // Map through topping_categories and create the insert array
      const toppingCategoryInserts = topping_categories.map((topping_category_id, index) => ({
        menu_item_id: id,
        topping_category_id: topping_category_id,
        display_order: index // Set the display order based on the index
      }));

      const { error: toppingCategoryError } = await supabase
        .from('menu_item_topping_categories')
        .insert(toppingCategoryInserts);

      if (toppingCategoryError) {
        throw toppingCategoryError;
      }
    }

    return menuItem as MenuItem;
  } catch (error) {
    console.error("Error updating menu item:", error);
    throw error;
  }
};

export const deleteMenuItem = async (id: string): Promise<void> => {
  try {
    // First, delete the menu item topping categories entries
    const { error: deleteToppingCategoriesError } = await supabase
      .from('menu_item_topping_categories')
      .delete()
      .eq('menu_item_id', id);

    if (deleteToppingCategoriesError) {
      throw deleteToppingCategoriesError;
    }

    // Then, delete the menu item
    const { error } = await supabase
      .from('menu_items')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }
  } catch (error) {
    console.error("Error deleting menu item:", error);
    throw error;
  }
};

export const getToppingCategoriesByRestaurantId = async (restaurantId: string): Promise<ToppingCategory[]> => {
  try {
    const { data: toppingCategories, error } = await supabase
      .from('topping_categories')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('display_order', { ascending: true });

    if (error) {
      throw error;
    }

    return toppingCategories || [];
  } catch (error) {
    console.error("Error fetching topping categories:", error);
    throw error;
  }
};

export const updateMenuItemToppingCategories = async (menuItemId: string, categories: string[]) => {
  const { data, error } = await supabase
    .from('menu_item_topping_categories')
    .upsert(
      categories.map((categoryId, index) => ({
        menu_item_id: menuItemId,
        topping_category_id: categoryId,
        display_order: index
      }))
    )
    .select();

  if (error) {
    throw error;
  }

  return data;
};

export const getMenuItemById = async (id: string) => {
  // First get the menu item
  let { data: menuItem, error: menuItemError } = await supabase
    .from('menu_items')
    .select('*')
    .eq('id', id)
    .single();

  if (menuItemError) throw menuItemError;

  // Then get the topping categories ordered by display_order
  const { data: toppingCategories, error: toppingCategoriesError } = await supabase
    .from('menu_item_topping_categories')
    .select('topping_category_id')
    .eq('menu_item_id', id)
    .order('display_order', { ascending: true });

  if (toppingCategoriesError) throw toppingCategoriesError;

  // Combine the data
  return {
    ...menuItem,
    topping_categories: toppingCategories.map(tc => tc.topping_category_id)
  };
};
