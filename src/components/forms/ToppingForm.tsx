
import { useState } from "react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { Loader2 } from "lucide-react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { MultiLanguageInput } from "@/components/forms/MultiLanguageInput";
import { SupportedLanguage } from "@/utils/language-utils";
import { useRestaurantLanguages } from "@/hooks/useRestaurantLanguages";

const toppingSchema = z.object({
  name: z.string().min(1, "Nom du complément requis"),
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
  price: z.string().refine((val) => !isNaN(Number(val)) && Number(val) >= 0, {
    message: "Le prix doit être un nombre valide supérieur ou égal à 0",
  }),
  tax_percentage: z.string().refine((val) => !isNaN(Number(val)) && Number(val) >= 0 && Number(val) <= 100, {
    message: "La TVA doit être un pourcentage entre 0 et 100",
  }),
  display_order: z.string().refine((val) => !isNaN(Number(val)) && Number(val) >= 0, {
    message: "L'ordre d'affichage doit être un nombre valide supérieur ou égal à 0",
  }),
  in_stock: z.boolean().default(true),
});

export type ToppingFormValues = z.infer<typeof toppingSchema>;

interface ToppingFormProps {
  onSubmit: (values: ToppingFormValues) => void;
  initialValues?: {
    name: string;
    name_fr?: string;
    name_en?: string;
    name_tr?: string;
    name_de?: string;
    name_es?: string;
    name_it?: string;
    name_nl?: string;
    name_pt?: string;
    name_ru?: string;
    name_ar?: string;
    name_zh?: string;
    price: string;
    tax_percentage?: string;
    display_order?: string;
    in_stock?: boolean;
  };
  isLoading?: boolean;
  currency?: string;
  restaurantId?: string;
}

const ToppingForm = ({ onSubmit, initialValues, isLoading = false, currency = "EUR", restaurantId }: ToppingFormProps) => {
  const currencySymbol = currency === "EUR" ? "€" : 
                        currency === "USD" ? "$" : 
                        currency === "GBP" ? "£" : 
                        currency;
  
  const { restaurantLanguages } = useRestaurantLanguages(restaurantId);
  
  const availableLanguages = restaurantLanguages.map(rl => ({
    code: rl.language_code as SupportedLanguage,
    name: rl.language?.name || rl.language_code
  }));

  const [nameValues, setNameValues] = useState({
    fr: initialValues?.name_fr || initialValues?.name || "",
    en: initialValues?.name_en || "",
    tr: initialValues?.name_tr || "",
    de: initialValues?.name_de || "",
    es: initialValues?.name_es || "",
    it: initialValues?.name_it || "",
    nl: initialValues?.name_nl || "",
    pt: initialValues?.name_pt || "",
    ru: initialValues?.name_ru || "",
    ar: initialValues?.name_ar || "",
    zh: initialValues?.name_zh || ""
  });

  const form = useForm<ToppingFormValues>({
    resolver: zodResolver(toppingSchema),
    defaultValues: {
      name: initialValues?.name || "",
      name_fr: initialValues?.name_fr || initialValues?.name || "",
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
      price: initialValues?.price || "0",
      tax_percentage: initialValues?.tax_percentage || "10",
      display_order: initialValues?.display_order || "0",
      in_stock: initialValues?.in_stock !== undefined ? initialValues.in_stock : true,
    },
  });

  const handleNameChange = (language: SupportedLanguage, value: string) => {
    setNameValues(prev => ({ ...prev, [language]: value }));
    form.setValue(`name_${language}`, value);
    if (language === 'fr') {
      form.setValue('name', value);
    }
  };

  const handleSubmit = (values: ToppingFormValues) => {
    onSubmit(values);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <MultiLanguageInput
          label="Nom du complément"
          placeholder="ex: Fromage Cheddar, Tomates"
          values={nameValues}
          onChange={handleNameChange}
          required
          languages={availableLanguages}
        />
        
        <FormField
          control={form.control}
          name="price"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Prix TTC ({currencySymbol})</FormLabel>
              <FormControl>
                <Input placeholder="0.75" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="tax_percentage"
          render={({ field }) => (
            <FormItem>
              <FormLabel>TVA (%)</FormLabel>
              <FormControl>
                <Input placeholder="10" {...field} />
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
              <FormLabel>Ordre d'affichage</FormLabel>
              <FormControl>
                <Input placeholder="0" type="number" min="0" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <Button type="submit" className="w-full bg-kiosk-primary" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sauvegarde...
            </>
          ) : (
            "Enregistrer"
          )}
        </Button>
      </form>
    </Form>
  );
};

export default ToppingForm;
