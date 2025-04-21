import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import ImageUpload from "@/components/ImageUpload";
import { Loader2, GripVertical } from "lucide-react";
import { ToppingCategory } from "@/types/database-types";
import { getToppingCategoriesByRestaurantId } from "@/services/kiosk-service";
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SortableToppingCategoryProps {
  id: string;
  name: string;
  description?: string | null;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

const SortableToppingCategory = ({ id, name, description, checked, onChange }: SortableToppingCategoryProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 mb-2"
    >
      <div {...attributes} {...listeners} className="cursor-grab">
        <GripVertical className="h-5 w-5 text-gray-400" />
      </div>
      <FormControl>
        <Checkbox
          checked={checked}
          onCheckedChange={onChange}
        />
      </FormControl>
      <div className="space-y-1 leading-none">
        <FormLabel className="cursor-pointer">{name}</FormLabel>
        {description && (
          <p className="text-sm text-muted-foreground">
            {description}
          </p>
        )}
      </div>
    </div>
  );
};

const formSchema = z.object({
  name: z.string().min(2, {
    message: "Menu item name must be at least 2 characters.",
  }),
  description: z.string().optional(),
  price: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: "Price must be a valid number greater than 0",
  }),
  promotion_price: z.string().refine((val) => val === "" || (!isNaN(Number(val)) && Number(val) >= 0), {
    message: "Promotional price must be a valid number",
  }).optional(),
  image: z.string().optional(),
  topping_categories: z.array(z.string()).optional(),
  tax_percentage: z.string().refine((val) => 
    val === "" || (!isNaN(Number(val)) && Number(val) >= 0 && Number(val) <= 100),
    { message: "Enter a valid VAT rate (0-100%)" }
  ).optional(),
});

type MenuItemFormValues = z.infer<typeof formSchema>;

interface MenuItemFormProps {
  onSubmit: (values: MenuItemFormValues & { topping_categories_order?: string[] }) => void;
  initialValues?: {
    name: string;
    description?: string;
    price: string;
    promotion_price?: string;
    image?: string;
    topping_categories?: string[];
    tax_percentage?: string;
    topping_categories_order?: string[];
  };
  isLoading?: boolean;
  restaurantId?: string;
}

const MenuItemForm = ({ onSubmit, initialValues, isLoading = false, restaurantId }: MenuItemFormProps) => {
  const [imageUrl, setImageUrl] = useState<string>(initialValues?.image || "");
  const [toppingCategories, setToppingCategories] = useState<ToppingCategory[]>([]);
  const [loadingToppingCategories, setLoadingToppingCategories] = useState(false);
  const [selectedToppingCategories, setSelectedToppingCategories] = useState<string[]>(
    initialValues?.topping_categories || []
  );
  const [toppingCategoriesOrder, setToppingCategoriesOrder] = useState<string[]>(
    initialValues?.topping_categories_order || []
  );

  const form = useForm<MenuItemFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialValues?.name || "",
      description: initialValues?.description || "",
      price: initialValues?.price || "",
      promotion_price: initialValues?.promotion_price || "",
      image: initialValues?.image || "",
      topping_categories: initialValues?.topping_categories || [],
      tax_percentage: initialValues?.tax_percentage || "10",
    },
  });

  useEffect(() => {
    const fetchToppingCategories = async () => {
      if (!restaurantId) return;
      try {
        setLoadingToppingCategories(true);
        const data = await getToppingCategoriesByRestaurantId(restaurantId);
        setToppingCategories(data);
        setLoadingToppingCategories(false);
      } catch (error) {
        console.error("Error fetching topping categories:", error);
        setLoadingToppingCategories(false);
      }
    };

    fetchToppingCategories();
  }, [restaurantId]);

  useEffect(() => {
    if (toppingCategories.length > 0 && initialValues?.topping_categories) {
      if (initialValues.topping_categories_order && initialValues.topping_categories_order.length > 0) {
        setToppingCategoriesOrder(initialValues.topping_categories_order);
      } else {
        const newOrder = initialValues.topping_categories.slice();
        setToppingCategoriesOrder(newOrder);
      }
    }
  }, [toppingCategories, initialValues]);

  const handleImageChange = (url: string) => {
    setImageUrl(url);
    form.setValue("image", url);
  };

  const handleSubmit = (values: MenuItemFormValues) => {
    onSubmit({
      ...values,
      topping_categories_order: toppingCategoriesOrder
    });
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      setToppingCategoriesOrder((items) => {
        const oldIndex = items.indexOf(active.id.toString());
        const newIndex = items.indexOf(over.id.toString());
        
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleToppingCategoryChange = (categoryId: string, checked: boolean) => {
    if (checked) {
      setSelectedToppingCategories((prev) => [...prev, categoryId]);
      if (!toppingCategoriesOrder.includes(categoryId)) {
        setToppingCategoriesOrder((prev) => [...prev, categoryId]);
      }
      const currentValues = form.getValues().topping_categories || [];
      form.setValue("topping_categories", [...currentValues, categoryId]);
    } else {
      setSelectedToppingCategories((prev) => prev.filter(id => id !== categoryId));
      const currentValues = form.getValues().topping_categories || [];
      form.setValue("topping_categories", currentValues.filter(id => id !== categoryId));
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
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="Burger" {...field} />
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
                  placeholder="Delicious burger with fresh ingredients" 
                  className="resize-none" 
                  {...field} 
                  value={field.value || ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Price (€ VAT incl.)</FormLabel>
                <FormControl>
                  <Input placeholder="9.99" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="promotion_price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Promotional Price (€ VAT incl.)</FormLabel>
                <FormControl>
                  <Input placeholder="7.99" {...field} value={field.value || ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="tax_percentage"
          render={({ field }) => (
            <FormItem>
              <FormLabel>VAT (%)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step={0.01}
                  placeholder="10"
                  {...field}
                  value={field.value ?? "10"}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="image"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Image</FormLabel>
              <FormControl>
                <ImageUpload
                  value={imageUrl}
                  onChange={handleImageChange}
                  label="Upload menu item image"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {toppingCategories.length > 0 && (
          <FormField
            control={form.control}
            name="topping_categories"
            render={() => (
              <FormItem>
                <div className="mb-2">
                  <FormLabel>Topping Categories</FormLabel>
                  <p className="text-sm text-muted-foreground">
                    Select and arrange topping categories for this item
                  </p>
                </div>
                <div className="space-y-2">
                  {loadingToppingCategories ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    </div>
                  ) : (
                    <>
                      {toppingCategories
                        .filter(category => !selectedToppingCategories.includes(category.id))
                        .map((category) => (
                          <FormField
                            key={category.id}
                            control={form.control}
                            name="topping_categories"
                            render={({ field }) => (
                              <div className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 mb-2">
                                <FormControl>
                                  <Checkbox
                                    checked={false}
                                    onCheckedChange={(checked) => 
                                      handleToppingCategoryChange(category.id, !!checked)
                                    }
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel className="cursor-pointer">{category.name}</FormLabel>
                                  {category.description && (
                                    <p className="text-sm text-muted-foreground">
                                      {category.description}
                                    </p>
                                  )}
                                </div>
                              </div>
                            )}
                          />
                        ))}
                      
                      {selectedToppingCategories.length > 0 && (
                        <div className="mt-4">
                          <h4 className="text-sm font-medium mb-2">Selected Categories (drag to reorder)</h4>
                          <DndContext 
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                          >
                            <SortableContext
                              items={toppingCategoriesOrder.filter(id => selectedToppingCategories.includes(id))}
                              strategy={verticalListSortingStrategy}
                            >
                              {toppingCategoriesOrder
                                .filter(id => selectedToppingCategories.includes(id))
                                .map(categoryId => {
                                  const category = toppingCategories.find(c => c.id === categoryId);
                                  if (!category) return null;
                                  
                                  return (
                                    <SortableToppingCategory
                                      key={category.id}
                                      id={category.id}
                                      name={category.name}
                                      description={category.description}
                                      checked={true}
                                      onChange={(checked) => 
                                        handleToppingCategoryChange(category.id, checked)
                                      }
                                    />
                                  );
                                })}
                            </SortableContext>
                          </DndContext>
                        </div>
                      )}
                    </>
                  )}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <Button type="submit" className="w-full bg-kiosk-primary" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Menu Item"
          )}
        </Button>
      </form>
    </Form>
  );
};

export default MenuItemForm;
