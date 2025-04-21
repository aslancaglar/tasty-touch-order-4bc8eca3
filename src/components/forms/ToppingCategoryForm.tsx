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
import { useToast } from "@/hooks/use-toast";

const toppingCategorySchema = z.object({
  name: z.string().min(1, "Category name is required"),
  description: z.string().optional(),
  icon: z.string().optional(),
  min_selections: z.coerce.number().min(0, "Must be 0 or greater"),
  max_selections: z.coerce.number().min(0, "Must be 0 or greater"),
  show_if_selection_id: z.array(z.string()).optional(),
  show_if_selection_type: z.array(z.enum(["category", "topping", ""])).optional(),
});

type ToppingCategoryFormValues = z.infer<typeof toppingCategorySchema>;

interface ToppingCategoryFormProps {
  onSubmit: (values: any) => void;
  initialValues?: Partial<ToppingCategoryFormValues>;
  isLoading?: boolean;
  toppingCategories?: { id: string; name: string }[];
  toppingsByCategory?: Record<string, {id: string, name: string}[]>;
}

const ToppingCategoryForm = ({
  onSubmit,
  initialValues,
  isLoading = false,
  toppingCategories = [],
  toppingsByCategory = {},
}: ToppingCategoryFormProps) => {
  const { toast } = useToast();
  const [conditionalDisplayEnabled, setConditionalDisplayEnabled] = useState(
    !!(initialValues?.show_if_selection_id && initialValues?.show_if_selection_id.length)
  );
  
  const form = useForm<ToppingCategoryFormValues>({
    resolver: zodResolver(toppingCategorySchema),
    defaultValues: {
      name: initialValues?.name || "",
      description: initialValues?.description || "",
      icon: initialValues?.icon || "",
      min_selections: initialValues?.min_selections ?? 0,
      max_selections: initialValues?.max_selections ?? 0,
      show_if_selection_id: initialValues?.show_if_selection_id || [],
      show_if_selection_type: (initialValues?.show_if_selection_type || []).map(type => 
        type === "category" || type === "topping" || type === "" ? type : ""
      ) as ("category" | "topping" | "")[],
    },
  });

  const handleSubmit = (values: ToppingCategoryFormValues) => {
    if (!conditionalDisplayEnabled || !values.show_if_selection_id?.length) {
      values.show_if_selection_id = [];
      values.show_if_selection_type = [];
    }
    onSubmit(values);
  };

  const dropdownOptions = [
    ...toppingCategories.map(cat => ({
      type: "category" as const,
      id: cat.id,
      label: `Category: ${cat.name}`,
    })),
    ...Object.entries(toppingsByCategory).flatMap(([catId, tops]) =>
      tops.map(top => ({
        type: "topping" as const,
        id: top.id,
        label: `Topping: ${top.name} (in ${toppingCategories.find(tc => tc.id === catId)?.name || "category"})`
      }))
    )
  ];

  const fieldWatchIds = form.watch("show_if_selection_id") || [];
  const fieldWatchTypes = form.watch("show_if_selection_type") || [];

  const handleMultiSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedOptions = Array.from(e.target.selectedOptions).map(opt => opt.value);
    const ids: string[] = [];
    const types: ("category" | "topping")[] = [];
    selectedOptions.forEach(value => {
      const [type, id] = value.split("|");
      types.push(type as "category" | "topping");
      ids.push(id);
    });
    form.setValue("show_if_selection_type", types);
    form.setValue("show_if_selection_id", ids);
  };

  const selectedValuesSet = new Set(
    fieldWatchTypes && fieldWatchIds
      ? fieldWatchTypes.map((type, i) => `${type}|${fieldWatchIds[i]}`)
      : []
  );

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
        <FormItem>
          <div className="flex items-center space-x-2 mb-2">
            <input 
              type="checkbox" 
              id="enable-condition"
              checked={conditionalDisplayEnabled}
              onChange={(e) => setConditionalDisplayEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-indigo-600"
            />
            <FormLabel htmlFor="enable-condition" className="cursor-pointer">Enable conditional display</FormLabel>
          </div>
          {conditionalDisplayEnabled && (
            <>
              <FormLabel>Show this category IF user selected:</FormLabel>
              <FormControl>
                <select
                  multiple
                  className="w-full px-3 py-2 border rounded-md h-32"
                  onChange={handleMultiSelectChange}
                  value={dropdownOptions
                    .map(opt => `${opt.type}|${opt.id}`)
                    .filter(optVal => selectedValuesSet.has(optVal))
                  }
                >
                  <option value="" disabled>
                    (Hold Ctrl or Cmd to select multiple)
                  </option>
                  {dropdownOptions.map(opt => (
                    <option key={`${opt.type}|${opt.id}`} value={`${opt.type}|${opt.id}`}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </FormControl>
              <FormMessage />
              <div className="text-xs text-muted-foreground mt-1">
                This category will only be displayed if the user has selected <b>all</b> the specified other category/topping(s). Leave empty to always show.
              </div>
              <div className="text-xs text-yellow-500 font-medium mt-1">
                Note: This feature requires a database update and is currently stored locally only.
              </div>
            </>
          )}
        </FormItem>
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
