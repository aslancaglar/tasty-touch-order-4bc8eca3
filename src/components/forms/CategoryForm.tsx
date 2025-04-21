
import { useState } from "react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload } from "lucide-react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from "uuid";

const categorySchema = z.object({
  name: z.string().min(1, "Category name is required"),
  description: z.string().optional(),
  icon: z.string().optional(),
});

type CategoryFormValues = z.infer<typeof categorySchema>;

interface CategoryFormProps {
  onSubmit: (values: CategoryFormValues) => void;
  initialValues?: Partial<CategoryFormValues>;
  isLoading?: boolean;
}

const CategoryForm = ({ onSubmit, initialValues, isLoading = false }: CategoryFormProps) => {
  const { toast } = useToast();
  const [uploadingIcon, setUploadingIcon] = useState(false);
  
  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: initialValues?.name || "",
      description: initialValues?.description || "",
      icon: initialValues?.icon || "",
    },
  });

  const handleSubmit = (values: CategoryFormValues) => {
    onSubmit(values);
  };

  const handleIconUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploadingIcon(true);
      
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error("You must select an image to upload.");
      }

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${uuidv4()}.${fileExt}`;
      const filePath = `category-icons/${fileName}`;
      
      if (!file.type.startsWith('image/')) {
        throw new Error("File must be an image.");
      }
      
      if (file.size > 2 * 1024 * 1024) {
        throw new Error("File size must be less than 2MB.");
      }

      const { data, error } = await supabase.storage
        .from('restaurant-images')
        .upload(filePath, file);

      if (error) throw error;

      const { data: publicUrlData } = supabase.storage
        .from('restaurant-images')
        .getPublicUrl(filePath);

      form.setValue('icon', publicUrlData.publicUrl);
      
      toast({
        title: "Success",
        description: "Icon uploaded successfully",
      });
    } catch (error: any) {
      console.error("Error uploading icon:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to upload icon",
        variant: "destructive"
      });
    } finally {
      setUploadingIcon(false);
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Appetizers, Main Course, Desserts" {...field} />
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
                  placeholder="Describe this category..." 
                  className="resize-none" 
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
              <FormLabel>Category Icon</FormLabel>
              <div className="space-y-2">
                {field.value && (
                  <div className="relative w-12 h-12 rounded-lg overflow-hidden border">
                    <img
                      src={field.value}
                      alt="Category icon"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <Button 
                  type="button" 
                  variant="outline" 
                  disabled={uploadingIcon}
                  className="relative w-full"
                >
                  {uploadingIcon ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Icon
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleIconUpload}
                    disabled={uploadingIcon}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </Button>
              </div>
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
            "Save Category"
          )}
        </Button>
      </form>
    </Form>
  );
};

export default CategoryForm;

