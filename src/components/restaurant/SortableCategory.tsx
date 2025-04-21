
import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Edit, GripVertical, Trash2, Utensils } from 'lucide-react';
import { MenuCategory, ToppingCategory } from '@/types/database-types';

// Create a union type that can accept either MenuCategory or ToppingCategory
type CategoryType = 
  | MenuCategory 
  | (ToppingCategory & { image_url?: string | null });

interface Props {
  category: CategoryType;
  isSelected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const SortableCategory = ({ category, isSelected, onSelect, onEdit, onDelete }: Props) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: category.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Use icon from the category if available, otherwise use the image_url if it exists
  const iconSrc = category.icon || (('image_url' in category) ? category.image_url : null);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={`border rounded-lg p-4 cursor-pointer transition-all ${
        isSelected ? 'border-kiosk-primary bg-muted/50' : 'border-border hover:border-muted-foreground'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button {...listeners} className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </button>
          <div className="p-2 bg-primary/10 rounded-md w-10 h-10">
            {iconSrc ? (
              <img 
                src={iconSrc} 
                alt={category.name}
                className="w-full h-full object-cover rounded"
              />
            ) : (
              <div className="w-full h-full bg-muted rounded flex items-center justify-center">
                <Utensils className="h-4 w-4 text-muted-foreground" />
              </div>
            )}
          </div>
          <div>
            <h3 className="font-medium">{category.name}</h3>
            <p className="text-sm text-muted-foreground">{category.description || "No description"}</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SortableCategory;
