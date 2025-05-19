
import React from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X } from "lucide-react";
import ToppingCategoryForm from "@/components/forms/ToppingCategoryForm";

interface ToppingCategoryEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  onSubmit: (values: any) => void;
  initialValues?: any;
  isLoading?: boolean;
  restaurantId?: string;
}

const ToppingCategoryEditDialog = ({
  open,
  onOpenChange,
  title,
  description,
  onSubmit,
  initialValues,
  isLoading,
  restaurantId
}: ToppingCategoryEditDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 gap-0 overflow-hidden border-none shadow-lg">
        <div className="flex flex-col h-full max-h-[85vh]">
          {/* Header section with custom styling */}
          <div className="flex flex-col p-6 border-b">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
                {description && (
                  <p className="mt-1 text-sm text-gray-500">{description}</p>
                )}
              </div>
              <button
                onClick={() => onOpenChange(false)}
                className="rounded-full p-1 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-[#9b87f5]"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
          </div>

          {/* Content section with ScrollArea for smooth scrolling */}
          <ScrollArea className="flex-1 max-h-[calc(85vh-80px)]">
            <div className="p-6">
              <ToppingCategoryForm
                onSubmit={onSubmit}
                initialValues={initialValues}
                isLoading={isLoading}
                restaurantId={restaurantId}
              />
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ToppingCategoryEditDialog;
