
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
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
import { SecureInput } from "@/components/ui/secure-input";
import { useSecureForm } from "@/hooks/useSecureForm";
import { validateAndSanitizeInput, validateNumericInput } from "@/utils/input-validation";

// Enhanced schema with security validation
const formSchema = z.object({
  name: z.string()
    .min(1, "Name is required")
    .max(255, "Name must not exceed 255 characters")
    .refine((val) => {
      try {
        validateAndSanitizeInput(val, 'name', true);
        return true;
      } catch {
        return false;
      }
    }, "Invalid characters detected in name"),
  description: z.string()
    .optional()
    .refine((val) => {
      if (!val) return true;
      try {
        validateAndSanitizeInput(val, 'description', false);
        return true;
      } catch {
        return false;
      }
    }, "Invalid characters detected in description"),
  icon: z.string().optional(),
  display_order: z.string()
    .refine((val) => {
      try {
        validateNumericInput(val, 0, undefined, false);
        return true;
      } catch {
        return false;
      }
    }, "Display order must be a valid positive number"),
  csrfToken: z.string().optional(),
});

interface SecureCategoryFormProps {
  onSubmit: (values: z.infer<typeof formSchema>) => Promise<void>;
  initialValues?: Partial<z.infer<typeof formSchema>>;
  isLoading?: boolean;
}

const SecureCategoryForm = ({ onSubmit, initialValues, isLoading }: SecureCategoryFormProps) => {
  const [iconUrl, setIconUrl] = useState<string | undefined>(initialValues?.icon || undefined);

  const { csrfToken, handleSubmit: secureHandleSubmit } = useSecureForm({
    schema: {
      name: { type: 'name', required: true },
      description: { type: 'description', required: false },
      display_order: { type: 'number', required: true, min: 0, allowDecimals: false },
    },
    onSubmit: async (validatedData) => {
      await onSubmit({
        ...validatedData,
        icon: iconUrl,
        csrfToken,
      });
    },
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialValues?.name || "",
      description: initialValues?.description || "",
      icon: initialValues?.icon || "",
      display_order: initialValues?.display_order || "0",
      csrfToken,
    },
  });

  const handleFormSubmit = (values: z.infer<typeof formSchema>) => {
    secureHandleSubmit({
      ...values,
      icon: iconUrl,
      csrfToken,
    });
  };

  const handleIconUpload = (url: string) => {
    // Validate URL before setting
    try {
      validateAndSanitizeInput(url, 'url');
      setIconUrl(url);
      form.setValue("icon", url);
    } catch (error) {
      console.error("Invalid image URL:", error);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        {/* CSRF Token */}
        <input type="hidden" name="csrfToken" value={csrfToken} />
        
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <SecureInput 
                  placeholder="Category name" 
                  validationType="name"
                  required
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
                  className="resize-none"
                  maxLength={5000}
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
                <SecureInput 
                  placeholder="Display order (e.g. 1, 2, 3)" 
                  type="number"
                  validationType="text"
                  required
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
          disabled={isLoading}
        >
          {isLoading ? (
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

export default SecureCategoryForm;
