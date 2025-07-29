
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
import { MultiLanguageInput } from "./MultiLanguageInput";
import { SupportedLanguage } from "@/utils/language-utils";

// Define the form schema with validation
const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  name_fr: z.string().optional(),
  name_en: z.string().optional(),
  name_tr: z.string().optional(),
  description: z.string().optional(),
  description_fr: z.string().optional(),
  description_en: z.string().optional(),
  description_tr: z.string().optional(),
  icon: z.string().optional(),
  display_order: z.string().refine(
    (val) => !isNaN(Number(val)),
    { message: "Display order must be a number" }
  ),
});

interface CategoryFormProps {
  onSubmit: (values: z.infer<typeof formSchema>) => void;
  initialValues?: Partial<z.infer<typeof formSchema>>;
  isLoading?: boolean;
}

const CategoryForm = ({ onSubmit, initialValues, isLoading }: CategoryFormProps) => {
  const [iconUrl, setIconUrl] = useState<string | undefined>(initialValues?.icon || undefined);

  // Initialize the form with default values
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialValues?.name || "",
      name_fr: initialValues?.name_fr || "",
      name_en: initialValues?.name_en || "",
      name_tr: initialValues?.name_tr || "",
      description: initialValues?.description || "",
      description_fr: initialValues?.description_fr || "",
      description_en: initialValues?.description_en || "",
      description_tr: initialValues?.description_tr || "",
      icon: initialValues?.icon || "",
      display_order: initialValues?.display_order || "0",
    },
  });

  // Handle form submission
  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    onSubmit({
      ...values,
      icon: iconUrl,
    });
  };

  // Handle image upload
  const handleIconUpload = (url: string) => {
    setIconUrl(url);
    form.setValue("icon", url);
  };

  // Handle multi-language field changes
  const handleNameChange = (language: SupportedLanguage, value: string) => {
    form.setValue(`name_${language}`, value);
  };

  const handleDescriptionChange = (language: SupportedLanguage, value: string) => {
    form.setValue(`description_${language}`, value);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Multi-language name input */}
        <MultiLanguageInput
          label="Category Name"
          placeholder="Category name"
          required={true}
          values={{
            fr: form.watch("name_fr"),
            en: form.watch("name_en"),
            tr: form.watch("name_tr")
          }}
          onChange={handleNameChange}
          error={form.formState.errors.name?.message}
        />

        {/* Multi-language description input */}
        <MultiLanguageInput
          label="Category Description"
          placeholder="Category description"
          type="textarea"
          values={{
            fr: form.watch("description_fr"),
            en: form.watch("description_en"),
            tr: form.watch("description_tr")
          }}
          onChange={handleDescriptionChange}
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

export default CategoryForm;
