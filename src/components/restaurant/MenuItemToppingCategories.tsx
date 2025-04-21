
import { useState, useEffect } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { ToppingCategory } from "@/types/database-types";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { getToppingCategoriesByRestaurantId, updateMenuItemToppingCategories } from "@/services/kiosk-service";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import SortableCategory from "./SortableCategory";

interface MenuItemToppingCategoriesProps {
  restaurantId: string;
  menuItemId: string;
  selectedCategories: string[];
  onSave: (categories: string[]) => void;
}

const MenuItemToppingCategories = ({ 
  restaurantId, 
  menuItemId,
  selectedCategories,
  onSave 
}: MenuItemToppingCategoriesProps) => {
  const [toppingCategories, setToppingCategories] = useState<ToppingCategory[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>(selectedCategories);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    const fetchToppingCategories = async () => {
      if (!restaurantId) return;
      try {
        setLoading(true);
        const data = await getToppingCategoriesByRestaurantId(restaurantId);
        setToppingCategories(data);
      } catch (error) {
        console.error("Error fetching topping categories:", error);
        toast({
          title: "Error",
          description: "Failed to load topping categories",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchToppingCategories();
  }, [restaurantId, toast]);

  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      setSelectedIds((items) => {
        const oldIndex = items.indexOf(active.id);
        const newIndex = items.indexOf(over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await updateMenuItemToppingCategories(menuItemId, selectedIds);
      onSave(selectedIds);
      toast({
        title: "Success",
        description: "Topping categories updated successfully",
      });
    } catch (error) {
      console.error("Error saving topping categories:", error);
      toast({
        title: "Error",
        description: "Failed to save topping categories",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-4">Select and Order Topping Categories</h3>
        <div className="space-y-4">
          {toppingCategories.map((category) => (
            <div key={category.id} className="flex items-center gap-2">
              <Checkbox
                checked={selectedIds.includes(category.id)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setSelectedIds([...selectedIds, category.id]);
                  } else {
                    setSelectedIds(selectedIds.filter(id => id !== category.id));
                  }
                }}
              />
              <span>{category.name}</span>
            </div>
          ))}
        </div>
      </div>

      {selectedIds.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-2">Drag to reorder selected categories:</h4>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <div className="space-y-2">
              <SortableContext
                items={selectedIds}
                strategy={verticalListSortingStrategy}
              >
                {selectedIds.map((id) => {
                  const category = toppingCategories.find(cat => cat.id === id);
                  if (!category) return null;
                  return (
                    <SortableCategory
                      key={id}
                      category={category}
                      isSelected={true}
                      onSelect={() => {}}
                      onEdit={() => {}}
                      onDelete={() => {
                        setSelectedIds(selectedIds.filter(catId => catId !== id));
                      }}
                    />
                  );
                })}
              </SortableContext>
            </div>
          </DndContext>
        </div>
      )}

      <Button 
        onClick={handleSave} 
        className="w-full bg-kiosk-primary" 
        disabled={saving}
      >
        {saving ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : (
          "Save Categories Order"
        )}
      </Button>
    </div>
  );
};

export default MenuItemToppingCategories;
