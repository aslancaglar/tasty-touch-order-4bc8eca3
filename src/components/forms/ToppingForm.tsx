
import { useState } from "react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { Loader2 } from "lucide-react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const toppingSchema = z.object({
  name: z.string().min(1, "Nom du complément requis"),
  price: z.string().refine((val) => !isNaN(Number(val)) && Number(val) >= 0, {
    message: "Le prix doit être un nombre valide supérieur ou égal à 0",
  }),
});

type ToppingFormValues = z.infer<typeof toppingSchema>;

interface ToppingFormProps {
  onSubmit: (values: ToppingFormValues) => void;
  initialValues?: {
    name: string;
    price: string;
  };
  isLoading?: boolean;
}

const ToppingForm = ({ onSubmit, initialValues, isLoading = false }: ToppingFormProps) => {
  const form = useForm<ToppingFormValues>({
    resolver: zodResolver(toppingSchema),
    defaultValues: {
      name: initialValues?.name || "",
      price: initialValues?.price || "0",
    },
  });

  const handleSubmit = (values: ToppingFormValues) => {
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
              <FormLabel>Nom du complément</FormLabel>
              <FormControl>
                <Input placeholder="ex: Fromage Cheddar, Tomates" {...field} />
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
              <FormLabel>Prix (€)</FormLabel>
              <FormControl>
                <Input placeholder="0.75" {...field} />
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
