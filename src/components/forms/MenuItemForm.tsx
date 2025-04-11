
import { useState } from "react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import ImageUpload from "@/components/ImageUpload";
import { Loader2 } from "lucide-react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { MenuCategory } from "@/types/database-types";

const menuItemSchema = z.object({
  name: z.string().min(1, "Item name is required"),
  description: z.string().optional(),
  price: z.coerce.number().min(0, "Price must be a positive number"),
  promotion_price: z.coerce.number().min(0, "Promotion price must be a positive number").nullable().optional(),
  image: z.string().optional(),
  category_id: z.string().min(1, "Category is required"),
});

type MenuItemFormValues = z.infer<typeof menuItemSchema>;

interface MenuItemFormProps {
  onSubmit: (values: MenuItemFormValues) => void;
  initialValues?: Partial<MenuItemFormValues>;
  isLoading?: boolean;
  categories: MenuCategory[];
}

const MenuItemForm = ({ onSubmit, initialValues, isLoading = false, categories }: MenuItemFormProps) => {
  const { toast } = useToast();
  
  const form = useForm<MenuItemFormValues>({
    resolver: zodResolver(menuItemSchema),
    defaultValues: {
      name: initialValues?.name || "",
      description: initialValues?.description || "",
      price: initialValues?.price || 0,
      promotion_price: initialValues?.promotion_price || null,
      image: initialValues?.image || "",
      category_id: initialValues?.category_id || "",
    },
  });

  const handleSubmit = (values: MenuItemFormValues) => {
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
              <FormLabel>Menu Item Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Classic Burger, Margherita Pizza" {...field} />
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
                  placeholder="Describe this menu item..." 
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
                <FormLabel>Price</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" min="0" {...field} />
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
                <FormLabel>Promotion Price (Optional)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step="0.01" 
                    min="0" 
                    placeholder="Leave empty for no promotion" 
                    {...field} 
                    value={field.value ?? ""} 
                    onChange={(e) => {
                      const value = e.target.value === "" ? null : Number(e.target.value);
                      field.onChange(value);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <FormField
          control={form.control}
          name="category_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="image"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Item Image</FormLabel>
              <FormControl>
                <ImageUpload
                  value={field.value || ""}
                  onChange={field.onChange}
                  label="Item Image"
                />
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
          ) : initialValues?.id ? (
            "Update Item"
          ) : (
            "Save Item"
          )}
        </Button>
      </form>
    </Form>
  );
};

export default MenuItemForm;
