import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash, WifiOff, RefreshCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import ToppingForm, { ToppingFormValues } from "@/components/forms/ToppingForm";
import ToppingCategoryForm from "@/components/forms/ToppingCategoryForm";
import { Topping, ToppingCategory } from "@/types/database-types";
import { getCacheItem, setCacheItem } from "@/services/cache-service";
import { handleCacheError } from "@/utils/cache-config";
import { isOnline, retryNetworkRequest } from "@/utils/service-worker";

interface ToppingCategoryWithToppings extends ToppingCategory {
  toppings?: Topping[];
}

interface ToppingsTabProps {
  restaurant: {
    id: string;
    name: string;
    currency?: string;
  };
}

const getCurrencySymbol = (currency: string): string => {
  switch (currency) {
    case 'EUR':
      return '€';
    case 'USD':
      return '$';
    case 'GBP':
      return '£';
    default:
      return currency;
  }
};

const ToppingsTab = ({
  restaurant
}: ToppingsTabProps) => {
  const [categories, setCategories] = useState<ToppingCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<ToppingCategoryWithToppings | null>(null);
  const [showCreateCategoryDialog, setShowCreateCategoryDialog] = useState(false);
  const [showUpdateCategoryDialog, setShowUpdateCategoryDialog] = useState(false);
  const [showDeleteCategoryDialog, setShowDeleteCategoryDialog] = useState(false);
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [isUpdatingCategory, setIsUpdatingCategory] = useState(false);
  const [isDeletingCategory, setIsDeletingCategory] = useState(false);
  const [selectedCategoryToDelete, setSelectedCategoryToDelete] = useState<ToppingCategory | null>(null);
  const [toppings, setToppings] = useState<Topping[]>([]);
  const [selectedTopping, setSelectedTopping] = useState<Topping | null>(null);
  const [showCreateToppingDialog, setShowCreateToppingDialog] = useState(false);
  const [showUpdateToppingDialog, setShowUpdateToppingDialog] = useState(false);
  const [showDeleteToppingDialog, setShowDeleteToppingDialog] = useState(false);
  const [isCreatingTopping, setIsCreatingTopping] = useState(false);
  const [isUpdatingTopping, setIsUpdatingTopping] = useState(false);
  const [isDeletingTopping, setIsDeletingTopping] = useState(false);
  const currencySymbol = getCurrencySymbol(restaurant.currency || 'EUR');

  // Added new states for better loading and error handling
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingToppings, setLoadingToppings] = useState(false);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [toppingError, setToppingError] = useState<string | null>(null);
  const [isRefreshingData, setIsRefreshingData] = useState(false);
  const [isOffline, setIsOffline] = useState(!isOnline());

  // Check online status
  useEffect(() => {
    const handleOnlineStatusChange = () => {
      const online = isOnline();
      setIsOffline(!online);
      
      // If we're back online and had errors, clear them
      if (online) {
        if (categoryError) setCategoryError(null);
        if (toppingError) setToppingError(null);
      }
    };
    
    // Setup online/offline event listeners
    window.addEventListener('online', handleOnlineStatusChange);
    window.addEventListener('offline', handleOnlineStatusChange);
    
    // Initial check
    handleOnlineStatusChange();
    
    return () => {
      window.removeEventListener('online', handleOnlineStatusChange);
      window.removeEventListener('offline', handleOnlineStatusChange);
    };
  }, [categoryError, toppingError]);

  useEffect(() => {
    fetchCategories();
  }, [restaurant.id]);

  useEffect(() => {
    if (selectedCategory?.id) {
      fetchToppings();
    }
  }, [selectedCategory?.id]);

  // Improved fetch categories with better caching and error handling
  const fetchCategories = async () => {
    if (isOffline) {
      setCategoryError("You are offline. Using cached data if available.");
      // Try to use cached data even when offline
      const cachedCategories = getCacheItem<ToppingCategory[]>('topping_categories', restaurant.id, true);
      if (cachedCategories) {
        console.log("Using cached topping categories while offline");
        setCategories(cachedCategories);
        setLoadingCategories(false);
        return;
      } else {
        setCategoryError("No cached data available while offline");
        setLoadingCategories(false);
        return;
      }
    }

    try {
      setLoadingCategories(true);
      setCategoryError(null);
      console.log("Fetching topping categories for restaurant:", restaurant.id);

      // Try to get from cache first without clearing (more efficient)
      const cachedCategories = getCacheItem<ToppingCategory[]>('topping_categories', restaurant.id, true);
      
      // If we're refreshing data or there's no cache, fetch from database
      if (isRefreshingData || !cachedCategories) {
        console.log("Fetching fresh topping categories data");
        
        // Fix: Properly await the supabase query and handle its result
        const result = await retryNetworkRequest(async () => {
          const response = await supabase.from('topping_categories')
                           .select('*')
                           .eq('restaurant_id', restaurant.id)
                           .order('created_at', { ascending: true });
          return response;
        }, 2);
        
        if (result.error) throw result.error;

        console.log("Fetched topping categories:", result.data);
        setCacheItem('topping_categories', result.data, restaurant.id, true);
        setCategories(result.data || []);
      } else {
        console.log("Using cached topping categories");
        setCategories(cachedCategories);
      }
    } catch (error) {
      console.error('Error fetching topping categories:', error);
      // Use handleCacheError to create a user-friendly error message
      const errorMessage = handleCacheError('load topping categories', error);
      setCategoryError(errorMessage);
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
      
      // Try to use cached data as fallback after error
      const cachedCategories = getCacheItem<ToppingCategory[]>('topping_categories', restaurant.id, true);
      if (cachedCategories) {
        setCategories(cachedCategories);
      }
    } finally {
      setLoadingCategories(false);
      setIsRefreshingData(false);
    }
  };

  // Improved fetch toppings with better caching and error handling
  const fetchToppings = async () => {
    if (!selectedCategory?.id) return;
    
    if (isOffline) {
      setToppingError("You are offline. Using cached data if available.");
      // Try to use cached data even when offline
      const cacheKey = `toppings_${selectedCategory.id}`;
      const cachedToppings = getCacheItem<Topping[]>(cacheKey, restaurant.id, true);
      if (cachedToppings) {
        console.log("Using cached toppings while offline for category:", selectedCategory.id);
        setToppings(cachedToppings);
        setSelectedCategory(prev => prev ? {
          ...prev,
          toppings: cachedToppings
        } : prev);
        setLoadingToppings(false);
        return;
      } else {
        setToppingError("No cached data available while offline");
        setLoadingToppings(false);
        return;
      }
    }
    
    try {
      setLoadingToppings(true);
      setToppingError(null);
      
      const cacheKey = `toppings_${selectedCategory.id}`;
      const cachedToppings = getCacheItem<Topping[]>(cacheKey, restaurant.id, true);
      
      // If we're refreshing data or there's no cache, fetch from database
      if (isRefreshingData || !cachedToppings) {
        console.log("Fetching fresh toppings for category:", selectedCategory.id);
        
        // Fix: Properly await the supabase query and handle its result
        const result = await retryNetworkRequest(async () => {
          const response = await supabase.from('toppings')
                           .select('*')
                           .eq('category_id', selectedCategory.id)
                           .order('display_order', { ascending: true });
          return response;
        }, 2);
        
        if (result.error) throw result.error;
        
        if (result.data) {
          const updatedToppings = result.data.map(topping => ({
            ...topping,
            tax_percentage: typeof topping.tax_percentage === 'string' ? parseFloat(topping.tax_percentage) : topping.tax_percentage
          }));
          
          setToppings(updatedToppings);
          setSelectedCategory(prev => prev ? {
            ...prev,
            toppings: updatedToppings
          } : prev);
          
          setCacheItem(cacheKey, updatedToppings, restaurant.id, true);
        } else {
          setToppings([]);
          setSelectedCategory(prev => prev ? {
            ...prev,
            toppings: []
          } : prev);
        }
      } else {
        console.log("Using cached toppings for category:", selectedCategory.id);
        setToppings(cachedToppings);
        setSelectedCategory(prev => prev ? {
          ...prev,
          toppings: cachedToppings
        } : prev);
      }
    } catch (error) {
      console.error('Error fetching toppings:', error);
      // Use handleCacheError to create a user-friendly error message
      const errorMessage = handleCacheError('load toppings', error);
      setToppingError(errorMessage);
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
      
      // Try to use cached data as fallback after error
      const cacheKey = `toppings_${selectedCategory.id}`;
      const cachedToppings = getCacheItem<Topping[]>(cacheKey, restaurant.id, true);
      if (cachedToppings) {
        setToppings(cachedToppings);
        setSelectedCategory(prev => prev ? {
          ...prev,
          toppings: cachedToppings
        } : prev);
      }
    } finally {
      setLoadingToppings(false);
    }
  };

  // New function to refresh data manually
  const handleRefreshData = async () => {
    if (isOffline) {
      toast({
        title: "You're offline",
        description: "Cannot refresh data without an internet connection",
        variant: "destructive"
      });
      return;
    }
    
    setIsRefreshingData(true);
    await fetchCategories();
    if (selectedCategory) {
      await fetchToppings();
    }
    
    toast({
      title: "Data refreshed",
      description: "The latest data has been loaded"
    });
  };

  // The rest of the component's methods are kept the same but with improved error handling
  const handleDeleteCategory = async () => {
    // ... keep existing code for handleDeleteCategory but add proper error handling

    if (!selectedCategoryToDelete?.id) return;
    try {
      if (isOffline) {
        toast({
          title: "You're offline",
          description: "Cannot delete category without an internet connection",
          variant: "destructive"
        });
        return;
      }
      
      setIsDeletingCategory(true);
      const {
        error
      } = await supabase.from('topping_categories').delete().eq('id', selectedCategoryToDelete.id);
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Category deleted successfully"
      });

      // Set isRefreshingData to true to ensure we get fresh data after deletion
      setIsRefreshingData(true);
      await fetchCategories();
      
      // If the deleted category was selected, clear selection
      if (selectedCategory?.id === selectedCategoryToDelete.id) {
        setSelectedCategory(null);
        setToppings([]);
      }
      
      setShowDeleteCategoryDialog(false);
    } catch (error) {
      console.error('Error deleting topping category:', error);
      const errorMessage = handleCacheError('delete category', error);
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsDeletingCategory(false);
    }
  };

  const handleCreateTopping = async (formData: ToppingFormValues) => {
    try {
      if (isOffline) {
        toast({
          title: "You're offline",
          description: "Cannot create topping without an internet connection",
          variant: "destructive"
        });
        return;
      }
      
      setIsCreatingTopping(true);
      const {
        data: newTopping,
        error
      } = await supabase.from('toppings').insert([{
        name: formData.name,
        price: parseFloat(formData.price),
        tax_percentage: parseFloat(formData.tax_percentage || "10"),
        display_order: parseInt(formData.display_order || "0"),
        category_id: selectedCategory?.id
      }]).select().single();
      if (error) throw error;
      
      // Set isRefreshingData to true to ensure we get fresh data
      setIsRefreshingData(true);
      if (selectedCategory) {
        await fetchToppings();
      }
      
      toast({
        title: "Success",
        description: "Topping created successfully"
      });
      setShowCreateToppingDialog(false);
    } catch (error) {
      console.error('Error creating topping:', error);
      const errorMessage = handleCacheError('create topping', error);
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsCreatingTopping(false);
    }
  };

  const handleUpdateTopping = async (toppingId: string, formData: ToppingFormValues) => {
    try {
      if (isOffline) {
        toast({
          title: "You're offline",
          description: "Cannot update topping without an internet connection",
          variant: "destructive"
        });
        return;
      }
      
      setIsUpdatingTopping(true);
      const {
        error
      } = await supabase.from('toppings').update({
        name: formData.name,
        price: parseFloat(formData.price),
        tax_percentage: parseFloat(formData.tax_percentage || "10"),
        display_order: parseInt(formData.display_order || "0")
      }).eq('id', toppingId);
      if (error) throw error;
      
      // Set isRefreshingData to true to ensure we get fresh data
      setIsRefreshingData(true);
      if (selectedCategory) {
        await fetchToppings();
      }
      
      toast({
        title: "Success",
        description: "Topping updated successfully"
      });
      setShowUpdateToppingDialog(false);
    } catch (error) {
      console.error('Error updating topping:', error);
      const errorMessage = handleCacheError('update topping', error);
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsUpdatingTopping(false);
    }
  };

  const handleDeleteTopping = async () => {
    if (!selectedTopping?.id) return;
    try {
      if (isOffline) {
        toast({
          title: "You're offline",
          description: "Cannot delete topping without an internet connection",
          variant: "destructive"
        });
        return;
      }
      
      setIsDeletingTopping(true);
      const {
        error
      } = await supabase.from('toppings').delete().eq('id', selectedTopping.id);
      if (error) throw error;
      
      // Set isRefreshingData to true to ensure we get fresh data
      setIsRefreshingData(true);
      if (selectedCategory) {
        await fetchToppings();
      }
      
      toast({
        title: "Success",
        description: "Topping deleted successfully"
      });
      setShowDeleteToppingDialog(false);
    } catch (error) {
      console.error('Error deleting topping:', error);
      const errorMessage = handleCacheError('delete topping', error);
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsDeletingTopping(false);
    }
  };

  const handleCreateCategory = async (values: any) => {
    if (isOffline) {
      toast({
        title: "You're offline",
        description: "Cannot create category without an internet connection",
        variant: "destructive"
      });
      return;
    }
    
    setIsCreatingCategory(true);
    try {
      const {
        name,
        description,
        min_selections,
        max_selections,
        conditionToppingIds,
        allow_multiple_same_topping
      } = values;
      console.log("Creating category with values:", values);
      const {
        data,
        error
      } = await supabase.from('topping_categories').insert([{
        name,
        description,
        restaurant_id: restaurant.id,
        min_selections,
        max_selections,
        show_if_selection_id: conditionToppingIds && conditionToppingIds.length > 0 ? conditionToppingIds : null,
        allow_multiple_same_topping
      }]).select().single();
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Category created successfully"
      });

      // Set isRefreshingData to true to ensure we get fresh data
      setIsRefreshingData(true);
      await fetchCategories();
      setShowCreateCategoryDialog(false);
    } catch (error) {
      console.error('Error creating topping category:', error);
      const errorMessage = handleCacheError('create category', error);
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsCreatingCategory(false);
    }
  };

  const handleUpdateCategory = async (values: any) => {
    if (!selectedCategory) return;
    if (isOffline) {
      toast({
        title: "You're offline",
        description: "Cannot update category without an internet connection",
        variant: "destructive"
      });
      return;
    }
    
    setIsUpdatingCategory(true);
    try {
      const {
        name,
        description,
        min_selections,
        max_selections,
        conditionToppingIds,
        allow_multiple_same_topping
      } = values;
      console.log("Updating category with values:", values);
      console.log("allow_multiple_same_topping value:", allow_multiple_same_topping);
      const {
        error
      } = await supabase.from('topping_categories').update({
        name,
        description,
        min_selections,
        max_selections,
        show_if_selection_id: conditionToppingIds.length > 0 ? conditionToppingIds : null,
        allow_multiple_same_topping
      }).eq('id', selectedCategory.id);
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Category updated successfully"
      });

      // Set isRefreshingData to true to ensure we get fresh data
      setIsRefreshingData(true);
      await fetchCategories();
      setShowUpdateCategoryDialog(false);
    } catch (error) {
      console.error('Error updating topping category:', error);
      const errorMessage = handleCacheError('update category', error);
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsUpdatingCategory(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Toppings Categories</h2>
          <p className="text-muted-foreground">Manage toppings categories available in your restaurant.</p>
        </div>
        
        {/* Add refresh button */}
        <Button 
          variant="outline" 
          onClick={handleRefreshData} 
          disabled={isRefreshingData || isOffline}
          className="flex items-center gap-2"
        >
          <RefreshCcw className={`h-4 w-4 ${isRefreshingData ? "animate-spin" : ""}`} />
          {isRefreshingData ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      {/* Show offline warning if needed */}
      {isOffline && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-4 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <WifiOff className="h-5 w-5 text-amber-500" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-amber-700">
                You are currently offline. Some features may be limited.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Show category error if exists */}
      {categoryError && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{categoryError}</p>
              {!isOffline && (
                <button 
                  onClick={handleRefreshData}
                  className="mt-2 text-sm text-red-700 underline"
                >
                  Try again
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <Button 
        onClick={() => setShowCreateCategoryDialog(true)} 
        className="text-white bg-purple-700 hover:bg-purple-600"
        disabled={isOffline}
      >
        <Plus className="mr-2 h-4 w-4" />
        Add Category
      </Button>

      {loadingCategories ? (
        <div className="flex justify-center items-center p-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-700"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.length > 0 ? categories.map(category => (
            <div 
              key={category.id} 
              className={`border rounded-lg p-4 cursor-pointer transition-all ${
                selectedCategory?.id === category.id ? 'ring-2 ring-[#9b87f5] bg-[#9b87f5]/5' : 'hover:border-[#9b87f5]'
              }`} 
              onClick={() => setSelectedCategory(category)}
            >
              <div className="flex items-center space-x-3">
                <div className="flex-1">
                  <h3 className="font-medium">{category.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {category.description || "No description"}
                  </p>
                </div>
                <div className="flex space-x-1">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    disabled={isOffline}
                    onClick={e => {
                      e.stopPropagation();
                      setSelectedCategory(category);
                      setShowUpdateCategoryDialog(true);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    disabled={isOffline}
                    onClick={e => {
                      e.stopPropagation();
                      setSelectedCategoryToDelete(category);
                      setShowDeleteCategoryDialog(true);
                    }}
                  >
                    <Trash className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </div>
          )) : (
            <div className="col-span-full text-center py-10 border rounded-lg bg-muted/20">
              <p className="text-muted-foreground mb-2">No categories found</p>
              {categoryError ? (
                <Button variant="outline" onClick={handleRefreshData} disabled={isOffline || isRefreshingData}>
                  <RefreshCcw className={`mr-2 h-4 w-4 ${isRefreshingData ? "animate-spin" : ""}`} />
                  Try again
                </Button>
              ) : (
                <Button onClick={() => setShowCreateCategoryDialog(true)} disabled={isOffline}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add first category
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      <Separator />

      {selectedCategory && (
        <div>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Menu Items - {selectedCategory.name}</h2>
              <p className="text-muted-foreground">
                Manage menu items available in the selected category.
              </p>
            </div>
            <Button 
              onClick={() => setShowCreateToppingDialog(true)} 
              className="bg-kiosk-primary"
              disabled={isOffline}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Item
            </Button>
          </div>

          {/* Show topping error if exists */}
          {toppingError && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mt-4 rounded-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{toppingError}</p>
                  {!isOffline && (
                    <button 
                      onClick={() => {
                        setIsRefreshingData(true);
                        fetchToppings();
                      }}
                      className="mt-2 text-sm text-red-700 underline"
                    >
                      Try again
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Display loading spinner when fetching toppings */}
          {loadingToppings ? (
            <div className="flex justify-center items-center p-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-700"></div>
            </div>
          ) : (
            <div className="mt-4 space-y-2">
              {selectedCategory.toppings && selectedCategory.toppings.length > 0 ? (
                selectedCategory.toppings.map(topping => (
                  <div key={topping.id} className="flex items-center justify-between py-2 border-b last:border-b-0">
                    <div>
                      <p className="font-medium">{topping.name}</p>
                      <div className="text-sm font-medium text-muted-foreground">
                        <span>{currencySymbol}{parseFloat(topping.price.toString()).toFixed(2)}</span>
                        <span className="ml-2">TVA: {topping.tax_percentage || 10}%</span>
                        <span className="ml-2">Ordre: {topping.display_order || 0}</span>
                      </div>
                    </div>
                    <div className="space-x-2">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        disabled={isOffline}
                        onClick={() => {
                          setSelectedTopping(topping);
                          setShowUpdateToppingDialog(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        disabled={isOffline}
                        onClick={() => {
                          setSelectedTopping(topping);
                          setShowDeleteToppingDialog(true);
                        }}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-10 border rounded-lg bg-muted/20">
                  <p className="text-muted-foreground mb-2">No items found in this category</p>
                  {toppingError ? (
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setIsRefreshingData(true);
                        fetchToppings();
                      }} 
                      disabled={isOffline || isRefreshingData}
                    >
                      <RefreshCcw className={`mr-2 h-4 w-4 ${isRefreshingData ? "animate-spin" : ""}`} />
                      Try again
                    </Button>
                  ) : (
                    <Button onClick={() => setShowCreateToppingDialog(true)} disabled={isOffline}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add first item
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Dialogs remain the same, but with improved error handling in their callbacks */}
      <Dialog open={showCreateCategoryDialog} onOpenChange={setShowCreateCategoryDialog}>
        <DialogContent className="max-h-[90vh] py-5 px-[px]">
          <ScrollArea className="max-h-[80vh] pr-4">
            <DialogHeader>
              <DialogTitle>Create Category</DialogTitle>
              <DialogDescription>Create a new topping category</DialogDescription>
            </DialogHeader>
            <ToppingCategoryForm restaurantId={restaurant.id} onSubmit={handleCreateCategory} isLoading={isCreatingCategory} />
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <Dialog open={showUpdateCategoryDialog} onOpenChange={setShowUpdateCategoryDialog}>
        <DialogContent className="max-h-[90vh]">
          <ScrollArea className="max-h-[80vh] pr-4">
            <DialogHeader>
              <DialogTitle>Edit Category</DialogTitle>
              <DialogDescription>Modify this category's details</DialogDescription>
            </DialogHeader>
            {selectedCategory && <ToppingCategoryForm 
              restaurantId={restaurant.id} 
              initialValues={{
                name: selectedCategory.name,
                description: selectedCategory.description || "",
                min_selections: selectedCategory.min_selections || 0,
                max_selections: selectedCategory.max_selections || 0,
                show_if_selection_id: selectedCategory.show_if_selection_id || [],
                allow_multiple_same_topping: selectedCategory.allow_multiple_same_topping || false
              }} 
              onSubmit={handleUpdateCategory} 
              isLoading={isUpdatingCategory} 
            />}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteCategoryDialog} onOpenChange={setShowDeleteCategoryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Category</DialogTitle>
            <DialogDescription>Are you sure you want to delete this category?</DialogDescription>
          </DialogHeader>
          <p>Are you sure you want to delete category "{selectedCategoryToDelete?.name}"?</p>
          <div className="flex justify-end space-x-2 mt-4">
            <Button variant="outline" onClick={() => setShowDeleteCategoryDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleDeleteCategory} variant="destructive" disabled={isDeletingCategory}>
              {isDeletingCategory ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showCreateToppingDialog} onOpenChange={setShowCreateToppingDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Topping</DialogTitle>
          </DialogHeader>
          <ToppingForm onSubmit={handleCreateTopping} isLoading={isCreatingTopping} currency={restaurant.currency} />
        </DialogContent>
      </Dialog>

      <Dialog open={showUpdateToppingDialog} onOpenChange={setShowUpdateToppingDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Topping</DialogTitle>
          </DialogHeader>
          {selectedTopping && <ToppingForm onSubmit={values => handleUpdateTopping(selectedTopping.id, values)} initialValues={{
          name: selectedTopping.name,
          price: selectedTopping.price?.toString() || "0",
          tax_percentage: selectedTopping.tax_percentage?.toString() || "10",
          display_order: selectedTopping.display_order?.toString() || "0"
        }} isLoading={isUpdatingTopping} currency={restaurant.currency} />}
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteToppingDialog} onOpenChange={setShowDeleteToppingDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Topping</DialogTitle>
          </DialogHeader>
          <p>Are you sure you want to delete topping "{selectedTopping?.name}"?</p>
          <div className="flex justify-end space-x-2 mt-4">
            <Button variant="outline" onClick={() => setShowDeleteToppingDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleDeleteTopping} variant="destructive" disabled={isDeletingTopping}>
              {isDeletingTopping ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ToppingsTab;
