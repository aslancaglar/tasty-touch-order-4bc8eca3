
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

// Extend schema for advanced options (can be arrays)
const toppingCategorySchema = z.object({
  name: z.string().min(1, "Category name is required"),
  description: z.string().optional(),
  icon: z.string().optional(),
  min_selections: z.coerce.number().min(0, "Must be 0 or greater"),
  max_selections: z.coerce.number().min(0, "Must be 0 or greater"),
  show_if_selection_id: z.array(z.string()).optional(),
  show_if_selection_type: z.array(z.string()).optional(),
});

type ToppingCategoryFormValues = z.infer<typeof toppingCategorySchema>;

interface ToppingCategoryFormProps {
  onSubmit: (values: ToppingCategoryFormValues) => void;
  initialValues?: Partial<ToppingCategoryFormValues>;
  isLoading?: boolean;
  availableCategories?: { id: string; name: string }[];
  availableSelectionTypes?: string[];
}

const ToppingCategoryForm = ({
  onSubmit,
  initialValues,
  isLoading = false,
  availableCategories = [],
  availableSelectionTypes = [],
}: ToppingCategoryFormProps) => {
  const form = useForm<ToppingCategoryFormValues>({
    resolver: zodResolver(toppingCategorySchema),
    defaultValues: {
      name: initialValues?.name || "",
      description: initialValues?.description || "",
      icon: initialValues?.icon || "",
      min_selections: initialValues?.min_selections ?? 0,
      max_selections: initialValues?.max_selections ?? 0,
      show_if_selection_id: initialValues?.show_if_selection_id ?? [],
      show_if_selection_type: initialValues?.show_if_selection_type ?? [],
    },
  });

  const handleSubmit = (values: ToppingCategoryFormValues) => {
    onSubmit(values);
  };

  const [advancedOpen, setAdvancedOpen] = useState(false);

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

        {/* Advanced section for conditional visibility */}
        <div>
          <button
            type="button"
            className="text-sm text-primary underline mt-2"
            onClick={() => setAdvancedOpen((v) => !v)}
          >
            {advancedOpen ? "Hide Advanced Options" : "Show Advanced Options"}
          </button>
          {advancedOpen && (
            <div className="space-y-4 mt-3 border p-3 rounded-md bg-slate-50">
              {/* show_if_selection_id */}
              <FormField
                control={form.control}
                name="show_if_selection_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Only show this category if these categories selected
                    </FormLabel>
                    <FormControl>
                      <select
                        multiple
                        className="w-full border rounded p-2 min-h-[100px]"
                        value={field.value || []}
                        onChange={(e) => {
                          const options = Array.from(e.target.selectedOptions).map(opt => opt.value);
                          field.onChange(options);
                        }}
                      >
                        {availableCategories.map(option => (
                          <option key={option.id} value={option.id}>
                            {option.name}
                          </option>
                        ))}
                      </select>
                    </FormControl>
                    <p className="text-xs text-muted-foreground mt-1">
                      {availableCategories.length === 0 ? 
                        "No menu categories available" : 
                        "Hold CTRL/CMD to select multiple categories"}
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {/* show_if_selection_type */}
              <FormField
                control={form.control}
                name="show_if_selection_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Only show for order types
                    </FormLabel>
                    <FormControl>
                      <select
                        multiple
                        className="w-full border rounded p-2 min-h-[80px]"
                        value={field.value || []}
                        onChange={(e) => {
                          const options = Array.from(e.target.selectedOptions).map(opt => opt.value);
                          field.onChange(options);
                        }}
                      >
                        {availableSelectionTypes.map(type => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </FormControl>
                    <p className="text-xs text-muted-foreground mt-1">
                      {availableSelectionTypes.length === 0 ? 
                        "No order types available" : 
                        "Hold CTRL/CMD to select multiple types"}
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}
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
