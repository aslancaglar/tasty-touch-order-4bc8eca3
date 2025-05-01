
import React, { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import ImageUpload from "@/components/ImageUpload";
import { Loader2, GripVertical, ChevronUp, ChevronDown } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getToppingCategoriesByRestaurantId } from "@/services/kiosk-service";
import { ToppingCategory } from "@/types/database-types";

// Define the form schema with Zod for validation
const formSchema = z.object({
  name: z.string().min(1, "Menu item name is required"),
  description: z.string().optional(),
  price: z.string().min(1, "Price is required").refine(
    (value) => !isNaN(Number(value)) && Number(value) >= 0,
    { message: "Price must be a non-negative number" }
  ),
  promotion_price: z.string().refine(
    (value) => value === "" || (!isNaN(Number(value)) && Number(value) >= 0),
    { message: "Promotion price must be a non-negative number" }
  ).optional(),
  image: z.string().optional(),
  tax_percentage: z.string().refine(
    (value) => value === "" || (!isNaN(Number(value)) && Number(value) >= 0 && Number(value) <= 100),
    { message: "Tax percentage must be between 0 and 100" }
  ).optional(),
  topping_categories: z.array(z.string()).optional(),
  display_order: z.string().refine(
    (val) => !isNaN(Number(val)),
    { message: "Display order must be a number" }
  ),
});

interface MenuItemFormProps {
  onSubmit: (values: z.infer<typeof formSchema>) => void;
  initialValues?: Partial<z.infer<typeof formSchema>>;
  isLoading?: boolean;
  restaurantId: string;
}

// Custom type to track topping categories with their order
interface OrderedToppingCategory extends ToppingCategory {
  orderIndex: number;
}

const MenuItemForm = ({ onSubmit, initialValues, isLoading, restaurantId }: MenuItemFormProps) => {
  const [imageUrl, setImageUrl] = useState<string | undefined>(initialValues?.image || undefined);
  const [toppingCategories, setToppingCategories] = useState<ToppingCategory[]>([]);
  const [selectedToppingCategories, setSelectedToppingCategories] = useState<string[]>(
    initialValues?.topping_categories || []
  );
  const [orderedCategories, setOrderedCategories] = useState<OrderedToppingCategory[]>([]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialValues?.name || "",
      description: initialValues?.description || "",
      price: initialValues?.price || "",
      promotion_price: initialValues?.promotion_price || "",
      image: initialValues?.image || "",
      tax_percentage: initialValues?.tax_percentage || "10",
      topping_categories: initialValues?.topping_categories || [],
      display_order: initialValues?.display_order || "0",
    },
  });

  useEffect(() => {
    const fetchToppingCategories = async () => {
      if (!restaurantId) return;
      
      try {
        const data = await getToppingCategoriesByRestaurantId(restaurantId);
        setToppingCategories(data);
        
        // If there are initially selected categories, order them
        if (initialValues?.topping_categories?.length) {
          const initialSelectedCategories = data.filter(
            category => initialValues.topping_categories?.includes(category.id)
          );
          
          // Check if we already have ordering info from existing menu item
          const { data: existingOrders } = await supabase
            .from("menu_item_topping_categories")
            .select("*")
            .eq("menu_item_id", initialValues.id || '')
            .order("display_order", { ascending: true });
          
          let ordered: OrderedToppingCategory[] = [];
          
          if (existingOrders && existingOrders.length > 0) {
            // Use existing order information
            ordered = initialSelectedCategories.map(category => {
              const orderInfo = existingOrders.find(o => o.topping_category_id === category.id);
              return {
                ...category,
                orderIndex: orderInfo ? orderInfo.display_order : 1000
              };
            }).sort((a, b) => a.orderIndex - b.orderIndex);
          } else {
            // Create new ordering
            ordered = initialSelectedCategories.map((category, index) => ({
              ...category,
              orderIndex: index
            }));
          }
          
          setOrderedCategories(ordered);
        }
      } catch (error) {
        console.error("Error fetching topping categories:", error);
      }
    };

    fetchToppingCategories();
  }, [restaurantId, initialValues]);

  const handleImageUpload = (url: string) => {
    setImageUrl(url);
    form.setValue("image", url);
  };

  const handleToppingCategoryToggle = (categoryId: string) => {
    setSelectedToppingCategories(prev => {
      if (prev.includes(categoryId)) {
        // Remove from selected categories
        const updated = prev.filter(id => id !== categoryId);
        form.setValue("topping_categories", updated);
        
        // Also remove from ordered categories
        setOrderedCategories(prev => prev.filter(cat => cat.id !== categoryId));
        
        return updated;
      } else {
        // Add to selected categories
        const updated = [...prev, categoryId];
        form.setValue("topping_categories", updated);
        
        // Also add to ordered categories
        const categoryToAdd = toppingCategories.find(cat => cat.id === categoryId);
        if (categoryToAdd) {
          setOrderedCategories(prev => [
            ...prev, 
            { ...categoryToAdd, orderIndex: prev.length }
          ]);
        }
        
        return updated;
      }
    });
  };

  const moveCategory = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) || 
      (direction === 'down' && index === orderedCategories.length - 1)
    ) {
      return; // Can't move further in this direction
    }

    const newCategories = [...orderedCategories];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    // Swap items
    [newCategories[index], newCategories[targetIndex]] = 
      [newCategories[targetIndex], newCategories[index]];
    
    // Update order indices
    const reordered = newCategories.map((cat, idx) => ({
      ...cat,
      orderIndex: idx
    }));
    
    setOrderedCategories(reordered);
    
    // Also update the topping_categories array in the form
    // Maintaining the order is important for when we save
    const orderedIds = reordered.map(cat => cat.id);
    form.setValue("topping_categories", orderedIds);
  };

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    // Create ordered topping categories data
    const orderedToppingCategories = orderedCategories.map((cat, index) => ({
      id: cat.id,
      display_order: index
    }));
    
    onSubmit({
      ...values,
      image: imageUrl,
      topping_categories: orderedToppingCategories.map(cat => cat.id),
      // Pass the order information
      _toppingCategoriesOrder: orderedToppingCategories,
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="Menu item name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea placeholder="Menu item description" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Price</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" placeholder="0.00" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="promotion_price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Promotion Price (optional)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" placeholder="0.00" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="display_order"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Display Order</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Display order (e.g. 1, 2, 3)" 
                  type="number" 
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="tax_percentage"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tax Percentage</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  step="0.01" 
                  placeholder="10" 
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="image"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Image</FormLabel>
              <FormControl>
                <ImageUpload
                  value={imageUrl}
                  onChange={handleImageUpload}
                  clearable={true}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {toppingCategories.length > 0 && (
          <FormItem>
            <FormLabel className="text-lg font-medium">Topping Categories</FormLabel>
            <div className="mt-2 space-y-2 border rounded-md p-4">
              <div className="grid grid-cols-[1fr_auto] gap-2 font-medium pb-2 border-b">
                <span>Available Categories</span>
                <span>Select</span>
              </div>
              
              {toppingCategories.map((category) => (
                <div key={category.id} className="grid grid-cols-[1fr_auto] gap-2 items-center">
                  <span>{category.name}</span>
                  <Checkbox
                    id={`topping-${category.id}`}
                    checked={selectedToppingCategories.includes(category.id)}
                    onCheckedChange={() => handleToppingCategoryToggle(category.id)}
                  />
                </div>
              ))}
            </div>
            
            {orderedCategories.length > 0 && (
              <div className="mt-4">
                <FormLabel className="text-lg font-medium">Category Order</FormLabel>
                <div className="mt-2 border rounded-md p-4">
                  <p className="text-sm text-gray-500 mb-2">
                    Drag or use arrows to reorder how topping categories will appear in the customization dialog
                  </p>
                  
                  <div className="space-y-2">
                    {orderedCategories.map((category, index) => (
                      <div 
                        key={category.id} 
                        className="flex items-center justify-between bg-gray-50 p-2 rounded-md border"
                      >
                        <div className="flex items-center gap-2">
                          <GripVertical className="text-gray-400 cursor-grab" />
                          <span>{category.name}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={index === 0}
                            onClick={() => moveCategory(index, 'up')}
                          >
                            <ChevronUp className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={index === orderedCategories.length - 1}
                            onClick={() => moveCategory(index, 'down')}
                          >
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </FormItem>
        )}

        <Button 
          type="submit" 
          className="w-full" 
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>Save</>
          )}
        </Button>
      </form>
    </Form>
  );
};

export default MenuItemForm;
