
import { useState } from "react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { Loader2 } from "lucide-react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { SecureInput } from "@/components/ui/secure-input";
import { useSecureForm } from "@/hooks/useSecureForm";
import { validateAndSanitizeInput, validateNumericInput } from "@/utils/input-validation";

const toppingSchema = z.object({
  name: z.string()
    .min(1, "Nom du complément requis")
    .max(255, "Le nom ne doit pas dépasser 255 caractères")
    .refine((val) => {
      try {
        validateAndSanitizeInput(val, 'name', true);
        return true;
      } catch {
        return false;
      }
    }, "Caractères invalides détectés dans le nom"),
  price: z.string()
    .refine((val) => {
      try {
        validateNumericInput(val, 0, 999999, true);
        return true;
      } catch {
        return false;
      }
    }, "Le prix doit être un nombre valide supérieur ou égal à 0"),
  tax_percentage: z.string()
    .refine((val) => {
      try {
        validateNumericInput(val, 0, 100, true);
        return true;
      } catch {
        return false;
      }
    }, "La TVA doit être un pourcentage entre 0 et 100"),
  display_order: z.string()
    .refine((val) => {
      try {
        validateNumericInput(val, 0, undefined, false);
        return true;
      } catch {
        return false;
      }
    }, "L'ordre d'affichage doit être un nombre valide supérieur ou égal à 0"),
  in_stock: z.boolean().default(true),
});

export type ToppingFormValues = z.infer<typeof toppingSchema>;

interface ToppingFormProps {
  onSubmit: (values: ToppingFormValues) => void;
  initialValues?: {
    name: string;
    price: string;
    tax_percentage?: string;
    display_order?: string;
    in_stock?: boolean;
  };
  isLoading?: boolean;
  currency?: string;
}

const ToppingForm = ({ onSubmit, initialValues, isLoading = false, currency = "EUR" }: ToppingFormProps) => {
  const currencySymbol = currency === "EUR" ? "€" : 
                        currency === "USD" ? "$" : 
                        currency === "GBP" ? "£" : 
                        currency;

  const { csrfToken, handleSubmit: secureHandleSubmit } = useSecureForm({
    schema: {
      name: { type: 'name', required: true },
      price: { type: 'number', required: true, min: 0, max: 999999, allowDecimals: true },
      tax_percentage: { type: 'number', required: true, min: 0, max: 100, allowDecimals: true },
      display_order: { type: 'number', required: true, min: 0, allowDecimals: false },
    },
    onSubmit: async (validatedData) => {
      onSubmit({
        ...validatedData,
        in_stock: form.getValues('in_stock'),
      });
    },
  });

  const form = useForm<ToppingFormValues>({
    resolver: zodResolver(toppingSchema),
    defaultValues: {
      name: initialValues?.name || "",
      price: initialValues?.price || "0",
      tax_percentage: initialValues?.tax_percentage || "10",
      display_order: initialValues?.display_order || "0",
      in_stock: initialValues?.in_stock !== undefined ? initialValues.in_stock : true,
    },
  });

  const handleFormSubmit = (values: ToppingFormValues) => {
    secureHandleSubmit({
      ...values,
      csrfToken,
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
        {/* CSRF Token */}
        <input type="hidden" name="csrfToken" value={csrfToken} />
        
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nom du complément</FormLabel>
              <FormControl>
                <SecureInput 
                  placeholder="ex: Fromage Cheddar, Tomates" 
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
          name="price"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Prix TTC ({currencySymbol})</FormLabel>
              <FormControl>
                <SecureInput 
                  placeholder="0.75" 
                  type="number"
                  step="0.01"
                  min="0"
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
          name="tax_percentage"
          render={({ field }) => (
            <FormItem>
              <FormLabel>TVA (%)</FormLabel>
              <FormControl>
                <SecureInput 
                  placeholder="10" 
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
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
          name="display_order"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ordre d'affichage</FormLabel>
              <FormControl>
                <SecureInput 
                  placeholder="0" 
                  type="number" 
                  min="0"
                  validationType="text"
                  required
                  {...field} 
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
