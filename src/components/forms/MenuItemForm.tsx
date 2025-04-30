
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
import { Loader2 } from "lucide-react";
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

const MenuItemForm = ({ onSubmit, initialValues, isLoading, restaurantId }: MenuItemFormProps) => {
  const [imageUrl, setImageUrl] = useState<string | undefined>(initialValues?.image || undefined);
  const [toppingCategories, setToppingCategories] = useState<ToppingCategory[]>([]);
  const [selectedToppingCategories, setSelectedToppingCategories] = useState<string[]>(
    initialValues?.topping_categories || []
  );

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
      } catch (error) {
        console.error("Error fetching topping categories:", error);
      }
    };

    fetchToppingCategories();
  }, [restaurantId]);

  const handleImageUpload = (url: string) => {
    setImageUrl(url);
    form.setValue("image", url);
  };

  const handleToppingCategoryToggle = (categoryId: string) => {
    setSelectedToppingCategories(prev => {
      if (prev.includes(categoryId)) {
        const updated = prev.filter(id => id !== categoryId);
        form.setValue("topping_categories", updated);
        return updated;
      } else {
        const updated = [...prev, categoryId];
        form.setValue("topping_categories", updated);
        return updated;
      }
    });
  };

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    onSubmit({
      ...values,
      image: imageUrl,
      topping_categories: selectedToppingCategories,
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
                  onImageUploaded={handleImageUpload}
                  existingImageUrl={imageUrl}
                  clearable
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {toppingCategories.length > 0 && (
          <FormItem>
            <FormLabel>Topping Categories</FormLabel>
            <div className="space-y-2 mt-2">
              {toppingCategories.map((category) => (
                <div key={category.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`topping-${category.id}`}
                    checked={selectedToppingCategories.includes(category.id)}
                    onCheckedChange={() => handleToppingCategoryToggle(category.id)}
                  />
                  <Label htmlFor={`topping-${category.id}`}>{category.name}</Label>
                </div>
              ))}
            </div>
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
