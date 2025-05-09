import { supabase } from "@/integrations/supabase/client";
import { Restaurant } from "@/types/database-types";
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

// Find the updateRestaurant function and ensure it supports card_payment_enabled and cash_payment_enabled fields
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
