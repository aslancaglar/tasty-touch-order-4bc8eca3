
import React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  min_selections: z.string()
    .transform((val) => (val === "" ? 0 : parseInt(val, 10)))
    .optional(),
  max_selections: z.string()
    .transform((val) => (val === "" ? null : parseInt(val, 10)))
    .optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface ToppingCategoryFormProps {
  onSubmit: (values: FormValues) => void;
  initialValues?: {
    name?: string;
    description?: string;
    min_selections?: number | null;
    max_selections?: number | null;
  };
  isLoading?: boolean;
}

const ToppingCategoryForm = ({
  onSubmit,
  initialValues,
  isLoading = false,
}: ToppingCategoryFormProps) => {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialValues?.name || "",
      description: initialValues?.description || "",
      min_selections: initialValues?.min_selections?.toString() || "0",
      max_selections: initialValues?.max_selections?.toString() || "",
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="Sauces, Cheeses, etc." {...field} />
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
                  placeholder="Brief description of this topping category..."
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="min_selections"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Minimum Selections</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    placeholder="0"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="max_selections"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Maximum Selections</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    placeholder="Leave empty for unlimited"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end pt-4">
          <Button type="submit" disabled={isLoading} className="bg-kiosk-primary">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default ToppingCategoryForm;
