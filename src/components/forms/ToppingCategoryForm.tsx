
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

const toppingCategorySchema = z.object({
  name: z.string().min(1, "Category name is required"),
  description: z.string().optional(),
  icon: z.string().optional(),
  min_selections: z.coerce.number().min(0, "Must be 0 or greater"),
  max_selections: z.coerce.number().min(0, "Must be 0 or greater"),
  show_if_selection_type: z.array(z.string()).optional(),
});

type ToppingCategoryFormValues = z.infer<typeof toppingCategorySchema>;

interface ToppingCategoryFormProps {
  onSubmit: (values: ToppingCategoryFormValues) => void;
  initialValues?: Partial<ToppingCategoryFormValues>;
  isLoading?: boolean;
}

// These represent the option values that will trigger showing specific topping categories
const AVAILABLE_SELECTIONS = [
  { value: "simple", label: "Simple" },
  { value: "menu", label: "Menu" },
  { value: "with fries", label: "With fries" },
];

const ToppingCategoryForm = ({ onSubmit, initialValues, isLoading = false }: ToppingCategoryFormProps) => {
  const { toast } = useToast();
  const form = useForm<ToppingCategoryFormValues>({
    resolver: zodResolver(toppingCategorySchema),
    defaultValues: {
      name: initialValues?.name || "",
      description: initialValues?.description || "",
      icon: initialValues?.icon || "",
      min_selections: initialValues?.min_selections ?? 0,
      max_selections: initialValues?.max_selections ?? 0,
      show_if_selection_type: initialValues?.show_if_selection_type ?? [],
    },
  });

  const handleSubmit = (values: ToppingCategoryFormValues) => {
    onSubmit(values);
    toast({
      title: "Category saved",
      description: "Your topping category has been saved successfully.",
    });
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
        
        {/* Selection conditions for when to show this category */}
        <FormField
          control={form.control}
          name="show_if_selection_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Show this category only when these options are selected
              </FormLabel>
              <FormControl>
                <div className="bg-white border rounded p-2 space-y-2">
                  <p className="text-xs text-muted-foreground mb-2">
                    Leave empty to always show this category. Select multiple options to display this category when any of them are selected.
                  </p>
                  {AVAILABLE_SELECTIONS.map((option) => (
                    <div key={option.value} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`option-${option.value}`}
                        checked={field.value?.includes(option.value)}
                        onCheckedChange={(checked) => {
                          const currentValues = field.value || [];
                          const newValues = checked 
                            ? [...currentValues, option.value]
                            : currentValues.filter(value => value !== option.value);
                          field.onChange(newValues);
                        }}
                      />
                      <label 
                        htmlFor={`option-${option.value}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {option.label}
                      </label>
                    </div>
                  ))}
                </div>
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
