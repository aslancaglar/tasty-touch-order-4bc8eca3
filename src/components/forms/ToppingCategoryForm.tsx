
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
  show_if_selection_id: z.string().optional(),
  show_if_selection_type: z.enum(["category", "topping", ""]).optional(),
});

type ToppingCategoryFormValues = z.infer<typeof toppingCategorySchema>;

interface ToppingCategoryFormProps {
  onSubmit: (values: any) => void;
  initialValues?: Partial<z.infer<typeof toppingCategorySchema>>;
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
    !!initialValues?.show_if_selection_id
  );
  
  const form = useForm<z.infer<typeof toppingCategorySchema>>({
    resolver: zodResolver(toppingCategorySchema),
    defaultValues: {
      name: initialValues?.name || "",
      description: initialValues?.description || "",
      icon: initialValues?.icon || "",
      min_selections: initialValues?.min_selections ?? 0,
      max_selections: initialValues?.max_selections ?? 0,
      show_if_selection_id: initialValues?.show_if_selection_id || "",
      show_if_selection_type: initialValues?.show_if_selection_type || "",
    },
  });

  const handleSubmit = (values: z.infer<typeof toppingCategorySchema>) => {
    if (!conditionalDisplayEnabled || !values.show_if_selection_id) {
      values.show_if_selection_id = "";
      values.show_if_selection_type = "";
    }
    onSubmit(values);
  };

  const dropdownOptions = [
    { type: "category", id: "", label: "(Always show this category)" },
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

  const fieldWatch = form.watch(["show_if_selection_type", "show_if_selection_id"]);

  const handleConditionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (!value) {
      form.setValue("show_if_selection_id", "");
      form.setValue("show_if_selection_type", "");
      return;
    }
    const [type, id] = value.split("|");
    form.setValue("show_if_selection_type", type as "category" | "topping");
    form.setValue("show_if_selection_id", id);
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
                  className="w-full px-3 py-2 border rounded-md"
                  onChange={handleConditionChange}
                  value={form.getValues("show_if_selection_id") && form.getValues("show_if_selection_type")
                    ? `${form.getValues("show_if_selection_type")}|${form.getValues("show_if_selection_id")}`
                    : ""}
                >
                  {dropdownOptions.map(opt => (
                    <option key={(opt.type === "category" && !opt.id) ? "default" : `${opt.type}|${opt.id}`} value={opt.id ? `${opt.type}|${opt.id}` : ""}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </FormControl>
              <FormMessage />
              <div className="text-xs text-muted-foreground mt-1">
                This category will only be displayed if the user has selected the specified other toppings category or specific topping. Leave blank to always show.
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
