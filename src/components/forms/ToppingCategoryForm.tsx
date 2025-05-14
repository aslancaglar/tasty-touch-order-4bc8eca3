
import { useState, useEffect } from "react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { Loader2, Check } from "lucide-react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Checkbox } from "@/components/ui/checkbox";
import ImageUpload from "@/components/ImageUpload";
import { supabase } from "@/integrations/supabase/client";
import { Topping } from "@/types/database-types";
import { toast } from "@/components/ui/use-toast";

const toppingCategorySchema = z.object({
  name: z.string().min(1, "Category name is required"),
  description: z.string().optional(),
  icon: z.string().optional(),
  min_selections: z.coerce.number().min(0, "Must be 0 or greater"),
  max_selections: z.coerce.number().min(0, "Must be 0 or greater"),
  allow_multiple_same_topping: z.boolean().default(false),
});

type ToppingCategoryFormValues = z.infer<typeof toppingCategorySchema>;

interface ToppingCategoryFormProps {
  onSubmit: (values: ToppingCategoryFormValues & {
    conditionToppingIds: string[];
  }) => void;
  initialValues?: Partial<ToppingCategoryFormValues> & {
    show_if_selection_id?: string[] | null;
  };
  isLoading?: boolean;
  restaurantId?: string;
}

const ToppingCategoryForm = ({
  onSubmit,
  initialValues,
  isLoading = false,
  restaurantId
}: ToppingCategoryFormProps) => {
  const [toppings, setToppings] = useState<Topping[]>([]);
  const [selectedToppings, setSelectedToppings] = useState<string[]>(Array.isArray(initialValues?.show_if_selection_id) ? initialValues.show_if_selection_id : []);
  const [loadingToppings, setLoadingToppings] = useState(false);

  // Debug logs
  console.log("ToppingCategoryForm initialValues:", initialValues);
  console.log("Initial selectedToppings:", selectedToppings);
  
  const form = useForm<ToppingCategoryFormValues>({
    resolver: zodResolver(toppingCategorySchema),
    defaultValues: {
      name: initialValues?.name || "",
      description: initialValues?.description || "",
      icon: initialValues?.icon || "",
      min_selections: initialValues?.min_selections ?? 0,
      max_selections: initialValues?.max_selections ?? 0,
      allow_multiple_same_topping: initialValues?.allow_multiple_same_topping ?? false,
    }
  });

  useEffect(() => {
    const fetchToppings = async () => {
      if (!restaurantId) return;
      setLoadingToppings(true);
      try {
        console.log("Fetching toppings for restaurant:", restaurantId);
        const {
          data: categories,
          error: categoriesError
        } = await supabase.from('topping_categories').select('id').eq('restaurant_id', restaurantId);
        if (categoriesError) {
          console.error('Error fetching topping categories:', categoriesError);
          setLoadingToppings(false);
          return;
        }
        console.log("Fetched categories:", categories);
        if (!categories || categories.length === 0) {
          console.log("No categories found");
          setLoadingToppings(false);
          return;
        }
        const categoryIds = categories.map(cat => cat.id);
        console.log("Fetching toppings for categories:", categoryIds);
        const {
          data,
          error
        } = await supabase.from('toppings').select('*').in('category_id', categoryIds);
        if (error) {
          console.error('Error fetching toppings:', error);
          toast({
            title: "Error",
            description: "Failed to load toppings",
            variant: "destructive"
          });
        } else {
          console.log("Fetched toppings:", data);
          setToppings(data || []);
        }
      } catch (error) {
        console.error('Error in fetchToppings:', error);
        toast({
          title: "Error",
          description: "An unexpected error occurred",
          variant: "destructive"
        });
      } finally {
        setLoadingToppings(false);
      }
    };
    fetchToppings();
  }, [restaurantId]);

  // Update selected toppings when initialValues change
  useEffect(() => {
    if (initialValues?.show_if_selection_id) {
      console.log("Updating selectedToppings from initialValues:", initialValues.show_if_selection_id);
      setSelectedToppings(Array.isArray(initialValues.show_if_selection_id) ? initialValues.show_if_selection_id : []);
    }
  }, [initialValues?.show_if_selection_id]);

  const handleSubmit = (values: ToppingCategoryFormValues) => {
    console.log("Submitting form with values:", values);
    console.log("Selected toppings:", selectedToppings);
    onSubmit({
      ...values,
      conditionToppingIds: selectedToppings
    });
  };

  const handleToppingToggle = (toppingId: string) => {
    setSelectedToppings(prev => {
      if (prev.includes(toppingId)) {
        return prev.filter(id => id !== toppingId);
      } else {
        return [...prev, toppingId];
      }
    });
  };

  return <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 px-0">
        <FormField control={form.control} name="name" render={({
        field
      }) => <FormItem>
              <FormLabel>Category Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Cheese, Vegetables, Sauces" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>} />
        
        <FormField control={form.control} name="description" render={({
        field
      }) => <FormItem>
              <FormLabel>Description (Optional)</FormLabel>
              <FormControl>
                <Textarea placeholder="Describe this topping category..." className="resize-none" {...field} value={field.value || ""} />
              </FormControl>
              <FormMessage />
            </FormItem>} />
        
        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="min_selections" render={({
          field
        }) => <FormItem>
                <FormLabel>Minimum Selections</FormLabel>
                <FormControl>
                  <Input type="number" min="0" placeholder="0" {...field} onChange={e => {
              field.onChange(e.target.valueAsNumber || 0);
            }} value={field.value || 0} />
                </FormControl>
                <FormMessage />
              </FormItem>} />
          
          <FormField control={form.control} name="max_selections" render={({
          field
        }) => <FormItem>
                <FormLabel>Maximum Selections</FormLabel>
                <FormControl>
                  <Input type="number" min="0" placeholder="0" {...field} onChange={e => {
              field.onChange(e.target.valueAsNumber || 0);
            }} value={field.value || 0} />
                </FormControl>
                <FormMessage />
              </FormItem>} />
        </div>
        
        <FormField
          control={form.control}
          name="allow_multiple_same_topping"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>
                  Allow multiple quantities of the same topping
                </FormLabel>
                <p className="text-sm text-gray-500">
                  When enabled, customers can add multiple quantities of the same topping
                </p>
              </div>
            </FormItem>
          )}
        />
        
        <div className="border rounded-lg p-4">
          <h3 className="text-lg font-medium mb-2">Conditions</h3>
          <p className="text-sm text-gray-500 mb-4">
            Show this category only if the user selects these toppings
          </p>
          
          {loadingToppings ? <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="ml-2">Loading toppings...</span>
            </div> : toppings.length === 0 ? <p className="text-gray-500 italic">No toppings available</p> : <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {toppings.map(topping => <div key={topping.id} className={`flex items-center space-x-2 p-2 border rounded-md cursor-pointer hover:bg-gray-50 
                    ${selectedToppings.includes(topping.id) ? 'border-primary bg-primary/5' : 'border-gray-200'}`} onClick={() => handleToppingToggle(topping.id)}>
                  <div className={`w-5 h-5 rounded-sm flex items-center justify-center 
                    ${selectedToppings.includes(topping.id) ? 'bg-primary text-white' : 'border border-gray-300'}`}>
                    {selectedToppings.includes(topping.id) && <Check className="h-3 w-3" />}
                  </div>
                  <span className="text-sm">{topping.name}</span>
                </div>)}
            </div>}
        </div>
        
        <Button type="submit" className="w-full bg-primary" disabled={isLoading}>
          {isLoading ? <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </> : "Save Category"}
        </Button>
      </form>
    </Form>;
};

export default ToppingCategoryForm;
