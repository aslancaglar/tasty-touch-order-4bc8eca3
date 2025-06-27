
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
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
import { Loader2 } from "lucide-react";
import ImageUpload from "@/components/ImageUpload";
import { useSecureForm } from "@/hooks/useSecureForm";
import { SECURITY_CONFIG } from "@/config/security";

// Enhanced form schema with security validation
const formSchema = z.object({
  name: z.string()
    .min(SECURITY_CONFIG.BUSINESS_RULES.MIN_CATEGORY_NAME_LENGTH, "Name must be at least 2 characters")
    .max(SECURITY_CONFIG.INPUT.MAX_NAME_LENGTH, "Name is too long"),
  description: z.string()
    .max(SECURITY_CONFIG.INPUT.MAX_DESCRIPTION_LENGTH, "Description is too long")
    .optional(),
  icon: z.string().optional(),
  display_order: z.string().refine(
    (val) => {
      const num = Number(val);
      return !isNaN(num) && num >= SECURITY_CONFIG.INPUT.DISPLAY_ORDER_MIN && num <= SECURITY_CONFIG.INPUT.DISPLAY_ORDER_MAX;
    },
    { message: "Display order must be a valid number" }
  ),
});

interface CategoryFormProps {
  onSubmit: (values: z.infer<typeof formSchema>) => void;
  initialValues?: Partial<z.infer<typeof formSchema>>;
  isLoading?: boolean;
}

const CategoryForm = ({ onSubmit, initialValues, isLoading }: CategoryFormProps) => {
  const [iconUrl, setIconUrl] = useState<string | undefined>(initialValues?.icon || undefined);

  // Enhanced secure form with validation rules
  const { secureSubmit, isSubmitting } = useSecureForm({
    maxSubmissions: 10,
    requireAdmin: true,
    formType: 'category',
    validationRules: {
      name: ['required', 'name'],
      description: ['description'],
      display_order: ['required', 'display_order'],
    }
  });

  // Initialize the form with default values
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialValues?.name || "",
      description: initialValues?.description || "",
      icon: initialValues?.icon || "",
      display_order: initialValues?.display_order || "0",
    },
  });

  // Handle form submission with enhanced security
  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    await secureSubmit(
      { ...values, icon: iconUrl },
      async (sanitizedData) => {
        return onSubmit(sanitizedData);
      },
      'category_form'
    );
  };

  // Handle image upload
  const handleIconUpload = (url: string) => {
    setIconUrl(url);
    form.setValue("icon", url);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Category name" 
                  maxLength={SECURITY_CONFIG.INPUT.MAX_NAME_LENGTH}
                  {...field} 
                />
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
                  placeholder="Category description (optional)" 
                  maxLength={SECURITY_CONFIG.INPUT.MAX_DESCRIPTION_LENGTH}
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="display_order"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Display Order</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Display order (e.g. 1, 2, 3)" 
                  type="number" 
                  min={SECURITY_CONFIG.INPUT.DISPLAY_ORDER_MIN}
                  max={SECURITY_CONFIG.INPUT.DISPLAY_ORDER_MAX}
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="icon"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Icon</FormLabel>
              <FormControl>
                <ImageUpload
                  value={iconUrl}
                  onChange={handleIconUpload}
                  clearable={true}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button 
          type="submit" 
          className="w-full" 
          disabled={isLoading || isSubmitting}
        >
          {(isLoading || isSubmitting) ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>Save</>
          )}
        </Button>
      </form>
    </Form>
  );
};

export default CategoryForm;
