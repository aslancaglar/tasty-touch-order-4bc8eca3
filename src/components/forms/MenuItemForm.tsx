
import { useState } from "react";
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
import ImageUpload from "@/components/ImageUpload";
import { Loader2 } from "lucide-react";

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
  };
  isLoading?: boolean;
}

const MenuItemForm = ({ onSubmit, initialValues, isLoading = false }: MenuItemFormProps) => {
  const [imageUrl, setImageUrl] = useState<string>(initialValues?.image || "");

  const form = useForm<MenuItemFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialValues?.name || "",
      description: initialValues?.description || "",
      price: initialValues?.price || "",
      promotion_price: initialValues?.promotion_price || "",
      image: initialValues?.image || "",
    },
  });

  const handleImageChange = (url: string) => {
    setImageUrl(url);
    form.setValue("image", url);
  };

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
                <FormLabel>Price ($)</FormLabel>
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
                <FormLabel>Promotional Price ($)</FormLabel>
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
