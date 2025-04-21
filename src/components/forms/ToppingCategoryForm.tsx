
import { useState } from "react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { Loader2 } from "lucide-react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import ImageUpload from "@/components/ImageUpload";

// Add new Zod field for conditional category showing
const toppingCategorySchema = z.object({
  name: z.string().min(1, "Category name is required"),
  description: z.string().optional(),
  icon: z.string().optional(),
  min_selections: z.coerce.number().min(0, "Must be 0 or greater"),
  max_selections: z.coerce.number().min(0, "Must be 0 or greater"),
  show_if_category_id: z.string().optional(), // New field: conditionally show this category if this one is selected
});

type ToppingCategoryFormValues = z.infer<typeof toppingCategorySchema>;

// Accept toppingCategories for the dropdown
interface ToppingCategoryFormProps {
  onSubmit: (values: ToppingCategoryFormValues) => void;
  initialValues?: Partial<ToppingCategoryFormValues>;
  isLoading?: boolean;
  toppingCategories?: { id: string; name: string }[]; // for conditional logic dropdown
}

const ToppingCategoryForm = ({
  onSubmit,
  initialValues,
  isLoading = false,
  toppingCategories = [],
}: ToppingCategoryFormProps) => {
  const form = useForm<ToppingCategoryFormValues>({
    resolver: zodResolver(toppingCategorySchema),
    defaultValues: {
      name: initialValues?.name || "",
      description: initialValues?.description || "",
      icon: initialValues?.icon || "",
      min_selections: initialValues?.min_selections ?? 0,
      max_selections: initialValues?.max_selections ?? 0,
      show_if_category_id: initialValues?.show_if_category_id || "",
    },
  });

  const handleSubmit = (values: ToppingCategoryFormValues) => {
    onSubmit(values);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Cheese, Vegetables, Sauces" {...field} />
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
              <FormLabel>Description (Optional)</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Describe this topping category..." 
                  className="resize-none" 
                  {...field} 
                  value={field.value || ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="show_if_category_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Show this category IF user selected:</FormLabel>
              <FormControl>
                <select
                  className="w-full px-3 py-2 border rounded-md"
                  {...field}
                  value={field.value || ""}
                >
                  <option value="">(Always show this category)</option>
                  {toppingCategories
                    // Don't allow self referential option in edit!
                    .filter(cat =>
                      !initialValues?.name ||
                      cat.name !== initialValues.name
                    )
                    .map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                </select>
              </FormControl>
              <FormMessage />
              <div className="text-xs text-muted-foreground mt-1">
                This category will only be displayed to the user if they have selected the specified other toppings category. Leave blank to always show.
              </div>
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="min_selections"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Minimum Selections</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    min="0" 
                    placeholder="0" 
                    {...field}
                    onChange={(e) => {
                      field.onChange(e.target.valueAsNumber || 0);
                    }}
                    value={field.value || 0}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="max_selections"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Maximum Selections</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    min="0" 
                    placeholder="0" 
                    {...field}
                    onChange={(e) => {
                      field.onChange(e.target.valueAsNumber || 0);
                    }}
                    value={field.value || 0}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <Button type="submit" className="w-full bg-kiosk-primary" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Category"
          )}
        </Button>
      </form>
    </Form>
  );
};

export default ToppingCategoryForm;
