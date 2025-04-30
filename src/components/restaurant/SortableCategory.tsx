
import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Edit, GripVertical, Trash2, Utensils } from 'lucide-react';
import { MenuCategory } from '@/types/database-types';

interface Props {
  category: MenuCategory;
  isSelected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isMobile?: boolean;
}

const SortableCategory = ({ category, isSelected, onSelect, onEdit, onDelete, isMobile }: Props) => {
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={`border rounded-lg p-3 sm:p-4 cursor-pointer transition-all ${
        isSelected ? 'border-kiosk-primary bg-muted/50' : 'border-border hover:border-muted-foreground'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 sm:space-x-3">
          <button {...listeners} className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </button>
          <div className="p-2 bg-primary/10 rounded-md w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center">
            {category.icon ? (
              <img 
                src={category.icon} 
                alt={category.name}
                className="w-full h-full object-cover rounded"
              />
            ) : (
              <div className="w-full h-full bg-muted rounded flex items-center justify-center">
                <Utensils className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
              </div>
            )}
          </div>
          <div className="overflow-hidden">
            <h3 className="font-medium text-sm sm:text-base truncate">{category.name}</h3>
            <p className="text-xs sm:text-sm text-muted-foreground truncate">
              {category.description || "No description"}
            </p>
          </div>
        </div>
        <div className="flex space-x-1 sm:space-x-2 ml-1">
          <Button
            variant="ghost"
            size={isMobile ? "xs" : "icon"}
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
          >
            <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
          </Button>
          <Button
            variant="ghost"
            size={isMobile ? "xs" : "icon"}
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 text-destructive" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SortableCategory;
