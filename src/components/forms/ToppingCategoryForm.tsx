
import { useEffect } from "react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { Loader2 } from "lucide-react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import ImageUpload from "@/components/ImageUpload";

// Add show_if_category_id for conditional display
const toppingCategorySchema = z.object({
  name: z.string().min(1, "Category name is required"),
  description: z.string().optional(),
  icon: z.string().optional(),
  min_selections: z.coerce.number().min(0, "Must be 0 or greater"),
  max_selections: z.coerce.number().min(0, "Must be 0 or greater"),
  show_if_category_id: z.string().nullable().optional(), // <-- add
});
type ToppingCategoryFormValues = z.infer<typeof toppingCategorySchema>;

interface ToppingCategoryFormProps {
  onSubmit: (values: ToppingCategoryFormValues) => void;
  initialValues?: Partial<ToppingCategoryFormValues>;
  isLoading?: boolean;
  availableCategories?: Array<{ id: string; name: string }>;
  currentCategoryId?: string; // so we don't allow picking itself as dependency
}

const ToppingCategoryForm = ({
  onSubmit,
  initialValues,
  isLoading = false,
  availableCategories,
  currentCategoryId
}: ToppingCategoryFormProps) => {
  const form = useForm<ToppingCategoryFormValues>({
    resolver: zodResolver(toppingCategorySchema),
    defaultValues: {
      name: initialValues?.name || "",
      description: initialValues?.description || "",
      icon: initialValues?.icon || "",
      min_selections: initialValues?.min_selections ?? 0,
      max_selections: initialValues?.max_selections ?? 0,
      show_if_category_id:
        typeof initialValues?.show_if_category_id === "undefined"
          ? null
          : initialValues?.show_if_category_id || null,
    },
  });

  // Prevent selecting self as dependency
  const filteredCategories = (availableCategories || []).filter(
    (cat) => cat.id !== currentCategoryId
  );

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
                    onChange={e => field.onChange(e.target.valueAsNumber || 0)}
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
                    onChange={e => field.onChange(e.target.valueAsNumber || 0)}
                    value={field.value || 0}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* --- NEW FIELD: Show condition --- */}
        <FormField
          control={form.control}
          name="show_if_category_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Show this category if...</FormLabel>
              <FormControl>
                <select
                  className="w-full border px-3 py-2 rounded-md focus:outline-none"
                  value={field.value || ""}
                  onChange={e => {
                    const v = e.target.value;
                    field.onChange(v === "" ? null : v);
                  }}
                  disabled={!availableCategories || availableCategories.length === 0}
                >
                  <option value="">Always show this category</option>
                  {filteredCategories.map(cat => (
                    <option value={cat.id} key={cat.id}>
                      User has selected from {cat.name}
                    </option>
                  ))}
                </select>
              </FormControl>
              <FormMessage />
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
            "Save Category"
          )}
        </Button>
      </form>
    </Form>
  );
};

export default ToppingCategoryForm;
