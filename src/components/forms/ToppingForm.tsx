
import { useState } from "react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { Loader2 } from "lucide-react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const toppingSchema = z.object({
  name: z.string().min(1, "Topping name is required"),
  price: z.string().refine((val) => !isNaN(Number(val)) && Number(val) >= 0, {
    message: "Price must be a valid number greater than or equal to 0",
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
              <FormLabel>Topping Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Cheddar Cheese, Tomatoes" {...field} />
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
              <FormLabel>Price ($)</FormLabel>
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
              Saving...
            </>
          ) : (
            "Save"
          )}
        </Button>
      </form>
    </Form>
  );
};

export default ToppingForm;
