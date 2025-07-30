
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import ImageUpload from "@/components/ImageUpload";
import { Loader2, ArrowUp, ArrowDown, Clock, Infinity } from "lucide-react";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { MultiLanguageInput } from "@/components/forms/MultiLanguageInput";
import { SupportedLanguage } from "@/utils/language-utils";
import { useRestaurantLanguages } from "@/hooks/useRestaurantLanguages";

// Define the form schema with Zod for validation
const formSchema = z.object({
  name: z.string().min(1, "Menu item name is required"),
  name_fr: z.string().optional(),
  name_en: z.string().optional(),
  name_tr: z.string().optional(),
  name_de: z.string().optional(),
  name_es: z.string().optional(),
  name_it: z.string().optional(),
  name_nl: z.string().optional(),
  name_pt: z.string().optional(),
  name_ru: z.string().optional(),
  name_ar: z.string().optional(),
  name_zh: z.string().optional(),
  description: z.string().optional(),
  description_fr: z.string().optional(),
  description_en: z.string().optional(),
  description_tr: z.string().optional(),
  description_de: z.string().optional(),
  description_es: z.string().optional(),
  description_it: z.string().optional(),
  description_nl: z.string().optional(),
  description_pt: z.string().optional(),
  description_ru: z.string().optional(),
  description_ar: z.string().optional(),
  description_zh: z.string().optional(),
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
  available_from: z.string().optional(),
  available_until: z.string().optional(),
  availability_type: z.enum(["always", "time_restricted"]),
});

interface MenuItemFormProps {
  onSubmit: (values: z.infer<typeof formSchema>) => void;
  initialValues?: Partial<z.infer<typeof formSchema>>;
  isLoading?: boolean;
  restaurantId: string;
}

// Define a type for the ordered topping category
interface OrderedToppingCategory extends ToppingCategory {
  order: number;
}

const MenuItemForm = ({ onSubmit, initialValues, isLoading, restaurantId }: MenuItemFormProps) => {
  const [imageUrl, setImageUrl] = useState<string | undefined>(initialValues?.image || undefined);
  const [toppingCategories, setToppingCategories] = useState<ToppingCategory[]>([]);
  const [selectedToppingCategories, setSelectedToppingCategories] = useState<string[]>(
    initialValues?.topping_categories || []
  );
  // Track the order of selected categories
  const [toppingCategoryOrder, setToppingCategoryOrder] = useState<Record<string, number>>({});
  
  const { restaurantLanguages } = useRestaurantLanguages(restaurantId);
  
  const availableLanguages = restaurantLanguages.map(rl => ({
    code: rl.language_code as SupportedLanguage,
    name: rl.language?.name || rl.language_code
  }));
  
  // Determine initial availability type based on initialValues
  const initialAvailabilityType = initialValues?.available_from && initialValues?.available_until
    ? "time_restricted"
    : "always";

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialValues?.name || "",
      name_fr: initialValues?.name_fr || "",
      name_en: initialValues?.name_en || "",
      name_tr: initialValues?.name_tr || "",
      name_de: initialValues?.name_de || "",
      name_es: initialValues?.name_es || "",
      name_it: initialValues?.name_it || "",
      name_nl: initialValues?.name_nl || "",
      name_pt: initialValues?.name_pt || "",
      name_ru: initialValues?.name_ru || "",
      name_ar: initialValues?.name_ar || "",
      name_zh: initialValues?.name_zh || "",
      description: initialValues?.description || "",
      description_fr: initialValues?.description_fr || "",
      description_en: initialValues?.description_en || "",
      description_tr: initialValues?.description_tr || "",
      description_de: initialValues?.description_de || "",
      description_es: initialValues?.description_es || "",
      description_it: initialValues?.description_it || "",
      description_nl: initialValues?.description_nl || "",
      description_pt: initialValues?.description_pt || "",
      description_ru: initialValues?.description_ru || "",
      description_ar: initialValues?.description_ar || "",
      description_zh: initialValues?.description_zh || "",
      price: initialValues?.price || "",
      promotion_price: initialValues?.promotion_price || "",
      image: initialValues?.image || "",
      tax_percentage: initialValues?.tax_percentage || "10",
      topping_categories: initialValues?.topping_categories || [],
      display_order: initialValues?.display_order || "0",
      available_from: initialValues?.available_from || "",
      available_until: initialValues?.available_until || "",
      availability_type: initialAvailabilityType,
    },
  });

  // Watch for availability type changes to conditionally show/hide time fields
  const availabilityType = form.watch("availability_type");

  // Reset times when switching to "always available"
  useEffect(() => {
    if (availabilityType === "always") {
      form.setValue("available_from", "");
      form.setValue("available_until", "");
    }
  }, [availabilityType, form]);

  useEffect(() => {
    const fetchToppingCategories = async () => {
      if (!restaurantId) return;
      
      try {
        const data = await getToppingCategoriesByRestaurantId(restaurantId);
        setToppingCategories(data);
        
        // Initialize order values if there are selected categories
        if (selectedToppingCategories.length > 0) {
          const orderMap: Record<string, number> = {};
          selectedToppingCategories.forEach((categoryId, index) => {
            orderMap[categoryId] = index;
          });
          setToppingCategoryOrder(orderMap);
        }
      } catch (error) {
        console.error("Error fetching topping categories:", error);
      }
    };

    fetchToppingCategories();
  }, [restaurantId, selectedToppingCategories]);

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
        
        // Remove from order tracking
        const updatedOrder = { ...toppingCategoryOrder };
        delete updatedOrder[categoryId];
        setToppingCategoryOrder(updatedOrder);
        
        return updated;
      } else {
        // Add to selected categories
        const updated = [...prev, categoryId];
        form.setValue("topping_categories", updated);
        
        // Add to order tracking with the next available position
        setToppingCategoryOrder(prev => ({
          ...prev,
          [categoryId]: Object.keys(prev).length
        }));
        
        return updated;
      }
    });
  };
  
  // Move a category up in the order
  const moveCategoryUp = (categoryId: string) => {
    const currentPosition = toppingCategoryOrder[categoryId];
    if (currentPosition <= 0) return; // Already at the top
    
    // Find the category that's one position above
    const categoryAboveId = Object.keys(toppingCategoryOrder).find(
      id => toppingCategoryOrder[id] === currentPosition - 1
    );
    
    if (categoryAboveId) {
      // Swap positions
      setToppingCategoryOrder(prev => ({
        ...prev,
        [categoryId]: currentPosition - 1,
        [categoryAboveId]: currentPosition
      }));
      
      // Update the form's topping_categories array to reflect the new order
      const orderedCategories = [...selectedToppingCategories].sort(
        (a, b) => toppingCategoryOrder[a] - toppingCategoryOrder[b]
      );
      form.setValue("topping_categories", orderedCategories);
    }
  };
  
  // Move a category down in the order
  const moveCategoryDown = (categoryId: string) => {
    const currentPosition = toppingCategoryOrder[categoryId];
    if (currentPosition >= selectedToppingCategories.length - 1) return; // Already at the bottom
    
    // Find the category that's one position below
    const categoryBelowId = Object.keys(toppingCategoryOrder).find(
      id => toppingCategoryOrder[id] === currentPosition + 1
    );
    
    if (categoryBelowId) {
      // Swap positions
      setToppingCategoryOrder(prev => ({
        ...prev,
        [categoryId]: currentPosition + 1,
        [categoryBelowId]: currentPosition
      }));
      
      // Update the form's topping_categories array to reflect the new order
      const orderedCategories = [...selectedToppingCategories].sort(
        (a, b) => toppingCategoryOrder[a] - toppingCategoryOrder[b]
      );
      form.setValue("topping_categories", orderedCategories);
    }
  };

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    // Sort the topping categories by their order before submitting
    const sortedToppingCategories = [...selectedToppingCategories].sort(
      (a, b) => toppingCategoryOrder[a] - toppingCategoryOrder[b]
    );
    
    // Only include time fields if time restricted
    const finalValues = {
      ...values,
      image: imageUrl,
      topping_categories: sortedToppingCategories,
      // Set time fields to null if always available
      available_from: values.availability_type === "always" ? "" : values.available_from,
      available_until: values.availability_type === "always" ? "" : values.available_until,
    };
    
    onSubmit(finalValues);
  };

  // Handle multi-language field changes
  const handleNameChange = (language: SupportedLanguage, value: string) => {
    form.setValue(`name_${language}`, value);
  };

  const handleDescriptionChange = (language: SupportedLanguage, value: string) => {
    form.setValue(`description_${language}`, value);
  };

  // Sort the categories by their assigned order for display
  const sortedSelectedCategories = [...selectedToppingCategories].sort(
    (a, b) => toppingCategoryOrder[a] - toppingCategoryOrder[b]
  );

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Multi-language name input */}
        <MultiLanguageInput
          label="Menu Item Name"
          placeholder="Menu item name"
          required={true}
          values={{
            fr: form.watch("name_fr"),
            en: form.watch("name_en"),
            tr: form.watch("name_tr"),
            de: form.watch("name_de"),
            es: form.watch("name_es"),
            it: form.watch("name_it"),
            nl: form.watch("name_nl"),
            pt: form.watch("name_pt"),
            ru: form.watch("name_ru"),
            ar: form.watch("name_ar"),
            zh: form.watch("name_zh")
          }}
          onChange={handleNameChange}
          error={form.formState.errors.name?.message}
          languages={availableLanguages}
        />

        {/* Multi-language description input */}
        <MultiLanguageInput
          label="Menu Item Description"
          placeholder="Menu item description"
          type="textarea"
          values={{
            fr: form.watch("description_fr"),
            en: form.watch("description_en"),
            tr: form.watch("description_tr"),
            de: form.watch("description_de"),
            es: form.watch("description_es"),
            it: form.watch("description_it"),
            nl: form.watch("description_nl"),
            pt: form.watch("description_pt"),
            ru: form.watch("description_ru"),
            ar: form.watch("description_ar"),
            zh: form.watch("description_zh")
          }}
          onChange={handleDescriptionChange}
          languages={availableLanguages}
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
          name="availability_type"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel>Availability</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  className="flex flex-col space-y-1"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="always" id="always" />
                    <Label htmlFor="always" className="flex items-center gap-2">
                      <Infinity className="h-4 w-4" /> Always available
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="time_restricted" id="time_restricted" />
                    <Label htmlFor="time_restricted" className="flex items-center gap-2">
                      <Clock className="h-4 w-4" /> Available during specific hours
                    </Label>
                  </div>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {availabilityType === "time_restricted" && (
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="available_from"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Clock className="h-4 w-4" /> Available From
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="time" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="available_until"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Clock className="h-4 w-4" /> Available Until
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="time" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

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

        {sortedSelectedCategories.length > 0 && (
          <div>
            <Label className="block mb-2">Selected Categories Order</Label>
            <div className="space-y-2 border rounded-md p-4">
              {sortedSelectedCategories.map((categoryId, index) => {
                const category = toppingCategories.find(c => c.id === categoryId);
                if (!category) return null;
                
                return (
                  <div key={categoryId} className="flex items-center justify-between bg-slate-50 p-2 rounded">
                    <span className="font-medium">{category.name}</span>
                    <div className="flex space-x-1">
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={() => moveCategoryUp(categoryId)}
                        disabled={index === 0}
                        className="h-8 w-8 p-0"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={() => moveCategoryDown(categoryId)}
                        disabled={index === sortedSelectedCategories.length - 1}
                        className="h-8 w-8 p-0"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
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
