import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Language {
  id: string;
  code: string;
  name: string;
  flag_url?: string;
}

export interface RestaurantLanguage {
  id: string;
  restaurant_id: string;
  language_code: string;
  is_default: boolean;
  language?: Language;
}

export const useRestaurantLanguages = (restaurantId?: string) => {
  const [languages, setLanguages] = useState<Language[]>([]);
  const [restaurantLanguages, setRestaurantLanguages] = useState<RestaurantLanguage[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Fetch all available languages
  const fetchLanguages = async () => {
    try {
      const { data, error } = await supabase
        .from('languages')
        .select('*')
        .order('name');

      if (error) throw error;
      setLanguages(data || []);
    } catch (error) {
      console.error('Error fetching languages:', error);
      toast({
        title: "Error",
        description: "Failed to fetch available languages",
        variant: "destructive",
      });
    }
  };

  // Fetch restaurant's configured languages
  const fetchRestaurantLanguages = async () => {
    if (!restaurantId) return;

    try {
      const { data, error } = await supabase
        .from('restaurant_languages')
        .select(`
          *,
          language:languages(*)
        `)
        .eq('restaurant_id', restaurantId)
        .order('is_default', { ascending: false });

      if (error) throw error;
      setRestaurantLanguages(data || []);
    } catch (error) {
      console.error('Error fetching restaurant languages:', error);
      toast({
        title: "Error",
        description: "Failed to fetch restaurant languages",
        variant: "destructive",
      });
    }
  };

  // Add a language to restaurant
  const addRestaurantLanguage = async (languageCode: string, isDefault = false) => {
    if (!restaurantId) return false;

    try {
      // If setting as default, first remove default from all others
      if (isDefault) {
        await supabase
          .from('restaurant_languages')
          .update({ is_default: false })
          .eq('restaurant_id', restaurantId);
      }

      const { error } = await supabase
        .from('restaurant_languages')
        .insert({
          restaurant_id: restaurantId,
          language_code: languageCode,
          is_default: isDefault
        });

      if (error) throw error;

      await fetchRestaurantLanguages();
      toast({
        title: "Success",
        description: "Language added successfully",
      });
      return true;
    } catch (error) {
      console.error('Error adding restaurant language:', error);
      toast({
        title: "Error",
        description: "Failed to add language",
        variant: "destructive",
      });
      return false;
    }
  };

  // Remove a language from restaurant
  const removeRestaurantLanguage = async (languageCode: string) => {
    if (!restaurantId) return false;

    try {
      const { error } = await supabase
        .from('restaurant_languages')
        .delete()
        .eq('restaurant_id', restaurantId)
        .eq('language_code', languageCode);

      if (error) throw error;

      await fetchRestaurantLanguages();
      toast({
        title: "Success",
        description: "Language removed successfully",
      });
      return true;
    } catch (error) {
      console.error('Error removing restaurant language:', error);
      toast({
        title: "Error",
        description: "Failed to remove language",
        variant: "destructive",
      });
      return false;
    }
  };

  // Set default language
  const setDefaultLanguage = async (languageCode: string) => {
    if (!restaurantId) return false;

    try {
      // Remove default from all languages
      await supabase
        .from('restaurant_languages')
        .update({ is_default: false })
        .eq('restaurant_id', restaurantId);

      // Set new default
      const { error } = await supabase
        .from('restaurant_languages')
        .update({ is_default: true })
        .eq('restaurant_id', restaurantId)
        .eq('language_code', languageCode);

      if (error) throw error;

      await fetchRestaurantLanguages();
      toast({
        title: "Success",
        description: "Default language updated successfully",
      });
      return true;
    } catch (error) {
      console.error('Error setting default language:', error);
      toast({
        title: "Error",
        description: "Failed to set default language",
        variant: "destructive",
      });
      return false;
    }
  };

  // Update flag URL for a language
  const updateLanguageFlag = async (languageCode: string, flagUrl: string | null) => {
    try {
      const { error } = await supabase
        .from('languages')
        .update({ flag_url: flagUrl })
        .eq('code', languageCode);

      if (error) throw error;

      await fetchLanguages();
      await fetchRestaurantLanguages();
      return true;
    } catch (error) {
      console.error('Error updating language flag:', error);
      return false;
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchLanguages(),
        fetchRestaurantLanguages()
      ]);
      setLoading(false);
    };

    loadData();
  }, [restaurantId]);

  return {
    languages,
    restaurantLanguages,
    loading,
    addRestaurantLanguage,
    removeRestaurantLanguage,
    setDefaultLanguage,
    updateLanguageFlag,
    refetch: () => {
      fetchLanguages();
      fetchRestaurantLanguages();
    }
  };
};