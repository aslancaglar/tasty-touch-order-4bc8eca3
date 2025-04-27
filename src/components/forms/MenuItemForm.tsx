import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import ImageUpload from "@/components/ImageUpload";
import { Loader2 } from "lucide-react";
import { ToppingCategory } from "@/types/database-types";
import { getToppingCategoriesByRestaurantId } from "@/services/kiosk-service";

const formSchema = z.object({
  name: z.string().min(2, {
    message: "Menu item name must be at least 2 characters.",
  }),
  description: z.string().optional(),
  price: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: "Price must be a valid number greater than 0",
  }),
  promotion_price: z.string().refine((val) => val === "" || (!isNaN(Number(val)) && Number(val) >= 0), {
    message: "Promotional price must be a valid number",
  }).optional(),
  image: z.string().optional(),
  topping_categories: z.array(z.string()).optional(),
  tax_percentage: z.string().refine((val) => 
    val === "" || (!isNaN(Number(val)) && Number(val) >= 0 && Number(val) <= 100),
    { message: "Enter a valid VAT rate (0-100%)" }
  ).optional(),
  in_stock: z.boolean().default(true),
});

type MenuItemFormValues = z.infer<typeof formSchema>;

interface MenuItemFormProps {
  onSubmit: (values: MenuItemFormValues) => void;
  initialValues?: {
    name: string;
    description?: string;
    price: string;
    promotion_price?: string;
    image?: string;
    topping_categories?: string[];
    tax_percentage?: string;
    in_stock?: boolean;
  };
  isLoading?: boolean;
  restaurantId?: string;
}

const MenuItemForm = ({ onSubmit, initialValues, isLoading = false, restaurantId }: MenuItemFormProps) => {
  const [imageUrl, setImageUrl] = useState<string>(initialValues?.image || "");
  const [toppingCategories, setToppingCategories] = useState<ToppingCategory[]>([]);
  const [loadingToppingCategories, setLoadingToppingCategories] = useState(false);

  const form = useForm<MenuItemFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialValues?.name || "",
      description: initialValues?.description || "",
      price: initialValues?.price || "",
      promotion_price: initialValues?.promotion_price || "",
      image: initialValues?.image || "",
      topping_categories: initialValues?.topping_categories || [],
      tax_percentage: initialValues?.tax_percentage || "10",
      in_stock: initialValues?.in_stock ?? true,
    },
  });

  useEffect(() => {
    const fetchToppingCategories = async () => {
      if (!restaurantId) return;
      try {
        setLoadingToppingCategories(true);
        const data = await getToppingCategoriesByRestaurantId(restaurantId);
        setToppingCategories(data);
        setLoadingToppingCategories(false);
      } catch (error) {
        console.error("Error fetching topping categories:", error);
        setLoadingToppingCategories(false);
      }
    };

    fetchToppingCategories();
  }, [restaurantId]);
  
  const handleImageChange = (url: string) => {
    setImageUrl(url);
    form.setValue("image", url);
  };

  const moveToppingCategory = (from: number, to: number) => {
    const current = form.getValues("topping_categories") || [];
    if (to < 0 || to >= current.length) return;
    const updated = [...current];
    const [removed] = updated.splice(from, 1);
    updated.splice(to, 0, removed);
    form.setValue("topping_categories", updated);
  };

  const handleSubmit = (values: MenuItemFormValues) => {
    console.log("Submitting form with values:", values);
    onSubmit(values);
  };

  const selectedToppingCategories = (form.watch("topping_categories") || []).map(
    (id: string) => toppingCategories.find((cat) => cat.id === id)
  ).filter(Boolean);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="Burger" {...field} />
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
                <Textarea 
                  placeholder="Delicious burger with fresh ingredients" 
                  className="resize-none" 
                  {...field} 
                  value={field.value || ""}
                />
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
                <FormLabel>Price (€ VAT incl.)</FormLabel>
                <FormControl>
                  <Input placeholder="9.99" {...field} />
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
                <FormLabel>Promotional Price (€ VAT incl.)</FormLabel>
                <FormControl>
                  <Input placeholder="7.99" {...field} value={field.value || ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="tax_percentage"
          render={({ field }) => (
            <FormItem>
              <FormLabel>VAT (%)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step={0.01}
                  placeholder="10"
                  {...field}
                  value={field.value ?? "10"}
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
                  onChange={handleImageChange}
                  label="Upload menu item image"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {toppingCategories.length > 0 && (
          <FormField
            control={form.control}
            name="topping_categories"
            render={({ field }) => (
              <FormItem>
                <div className="mb-2">
                  <FormLabel>Topping Categories</FormLabel>
                  <p className="text-sm text-muted-foreground">
                    Select and reorder which topping categories can be applied to this item. Drag to reorder.
                  </p>
                </div>
                <div className="space-y-2">
                  {toppingCategories.map((category) => {
                    const index = field.value?.indexOf(category.id) ?? -1;
                    return (
                      <div key={category.id} className="flex items-center gap-2">
                        <Checkbox
                          checked={field.value?.includes(category.id)}
                          onCheckedChange={(checked) => {
                            const currentValues = field.value || [];
                            if (checked) {
                              field.onChange([...currentValues, category.id]);
                            } else {
                              field.onChange(currentValues.filter((value) => value !== category.id));
                            }
                          }}
                        />
                        <span className="flex-1">
                          {category.name}
                          {category.description && (
                            <span className="text-xs text-muted-foreground ml-2">{category.description}</span>
                          )}
                        </span>
                        {field.value?.includes(category.id) && (
                          <>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="ml-1"
                              onClick={() =>
                                moveToppingCategory(index, index - 1)
                              }
                              disabled={index === 0}
                            >
                              ↑
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="ml-1"
                              onClick={() =>
                                moveToppingCategory(index, index + 1)
                              }
                              disabled={index === field.value.length - 1}
                            >
                              ↓
                            </Button>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
                {field.value && field.value.length > 1 && (
                  <div className="mt-3">
                    <div className="text-xs mb-1 font-medium text-muted-foreground">
                      Display Order:
                    </div>
                    <ol className="list-decimal list-inside text-sm">
                      {selectedToppingCategories.map((cat: ToppingCategory, i) =>
                        <li key={cat.id}>{cat.name}</li>
                      )}
                    </ol>
                  </div>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="in_stock"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>In Stock</FormLabel>
                <FormDescription>
                  Uncheck this if the item is currently unavailable. Out-of-stock items won't be shown in the kiosk.
                </FormDescription>
              </div>
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full bg-kiosk-primary" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Menu Item"
          )}
        </Button>
      </form>
    </Form>
  );
};

export default MenuItemForm;
