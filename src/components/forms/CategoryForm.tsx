
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
import { useRestaurantLanguages } from "@/hooks/useRestaurantLanguages";

// Define the form schema with validation
const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  name_fr: z.string().optional(),
  name_en: z.string().optional(),
  name_tr: z.string().optional(),
  name_de: z.string().optional(),
  name_es: z.string().optional(),
  name_it: z.string().optional(),
  name_nl: z.string().optional(),
  name_pt: z.string().optional(),
  name_ru: z.string().optional(),
  name_ar: z.string().optional(),
  name_zh: z.string().optional(),
  description: z.string().optional(),
  description_fr: z.string().optional(),
  description_en: z.string().optional(),
  description_tr: z.string().optional(),
  description_de: z.string().optional(),
  description_es: z.string().optional(),
  description_it: z.string().optional(),
  description_nl: z.string().optional(),
  description_pt: z.string().optional(),
  description_ru: z.string().optional(),
  description_ar: z.string().optional(),
  description_zh: z.string().optional(),
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
  restaurantId?: string;
}

const CategoryForm = ({ onSubmit, initialValues, isLoading, restaurantId }: CategoryFormProps) => {
  const [iconUrl, setIconUrl] = useState<string | undefined>(initialValues?.icon || undefined);
  const { restaurantLanguages } = useRestaurantLanguages(restaurantId);
  
  const availableLanguages = restaurantLanguages.map(rl => ({
    code: rl.language_code as SupportedLanguage,
    name: rl.language?.name || rl.language_code
  }));

  // Initialize the form with default values
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialValues?.name || "",
      name_fr: initialValues?.name_fr || "",
      name_en: initialValues?.name_en || "",
      name_tr: initialValues?.name_tr || "",
      name_de: initialValues?.name_de || "",
      name_es: initialValues?.name_es || "",
      name_it: initialValues?.name_it || "",
      name_nl: initialValues?.name_nl || "",
      name_pt: initialValues?.name_pt || "",
      name_ru: initialValues?.name_ru || "",
      name_ar: initialValues?.name_ar || "",
      name_zh: initialValues?.name_zh || "",
      description: initialValues?.description || "",
      description_fr: initialValues?.description_fr || "",
      description_en: initialValues?.description_en || "",
      description_tr: initialValues?.description_tr || "",
      description_de: initialValues?.description_de || "",
      description_es: initialValues?.description_es || "",
      description_it: initialValues?.description_it || "",
      description_nl: initialValues?.description_nl || "",
      description_pt: initialValues?.description_pt || "",
      description_ru: initialValues?.description_ru || "",
      description_ar: initialValues?.description_ar || "",
      description_zh: initialValues?.description_zh || "",
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
            tr: form.watch("name_tr"),
            de: form.watch("name_de"),
            es: form.watch("name_es"),
            it: form.watch("name_it"),
            nl: form.watch("name_nl"),
            pt: form.watch("name_pt"),
            ru: form.watch("name_ru"),
            ar: form.watch("name_ar"),
            zh: form.watch("name_zh")
          }}
          onChange={handleNameChange}
          error={form.formState.errors.name?.message}
          languages={availableLanguages}
        />

        {/* Multi-language description input */}
        <MultiLanguageInput
          label="Category Description"
          placeholder="Category description"
          type="textarea"
          values={{
            fr: form.watch("description_fr"),
            en: form.watch("description_en"),
            tr: form.watch("description_tr"),
            de: form.watch("description_de"),
            es: form.watch("description_es"),
            it: form.watch("description_it"),
            nl: form.watch("description_nl"),
            pt: form.watch("description_pt"),
            ru: form.watch("description_ru"),
            ar: form.watch("description_ar"),
            zh: form.watch("description_zh")
          }}
          onChange={handleDescriptionChange}
          languages={availableLanguages}
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
