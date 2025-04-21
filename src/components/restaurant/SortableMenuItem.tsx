
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, MoveVertical } from "lucide-react";
import { MenuItem } from "@/types/database-types";

interface SortableMenuItemProps {
  item: MenuItem;
  currencySymbol: string;
  onEdit: () => void;
  onDelete: () => void;
}

const SortableMenuItem = ({ item, currencySymbol, onEdit, onDelete }: SortableMenuItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center justify-between p-4 border rounded-lg bg-white"
    >
      <div className="flex items-center space-x-4">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-2 hover:bg-gray-100 rounded-md"
        >
          <MoveVertical className="h-4 w-4 text-gray-500" />
        </button>
        
        {item.image && (
          <img 
            src={item.image} 
            alt={item.name} 
            className="h-16 w-16 object-cover rounded-md"
          />
        )}
        <div>
          <h3 className="font-medium">{item.name}</h3>
          <p className="text-sm text-muted-foreground">{item.description}</p>
          <p className="text-sm font-medium mt-1">
            {currencySymbol}{parseFloat(item.price.toString()).toFixed(2)}
            {item.promotion_price && (
              <span className="ml-2 line-through text-muted-foreground">
                {currencySymbol}{parseFloat(item.promotion_price.toString()).toFixed(2)}
              </span>
            )}
          </p>
        </div>
      </div>
      <div className="flex space-x-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={onEdit}
        >
          <Edit className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onDelete}
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    </div>
  );
};

export default SortableMenuItem;
