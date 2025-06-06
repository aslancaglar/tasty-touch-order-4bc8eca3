
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { validateMenuItemData, sanitizeInput, checkRateLimit } from "@/utils/security-validation";
import { MenuItem } from "@/types/database-types";

interface SecureMenuItemFormProps {
  item?: MenuItem;
  categoryId: string;
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
}

const SecureMenuItemForm: React.FC<SecureMenuItemFormProps> = ({
  item,
  categoryId,
  onSubmit,
  onCancel
}) => {
  const [formData, setFormData] = useState({
    name: item?.name || '',
    description: item?.description || '',
    price: item?.price || 0,
    promotion_price: item?.promotion_price || null,
    tax_percentage: item?.tax_percentage || 10,
    in_stock: item?.in_stock ?? true,
    display_order: item?.display_order || 0,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Rate limiting check
    if (!checkRateLimit('menu-item-form', 5, 60000)) {
      toast.error("Too many requests. Please wait a minute before trying again.");
      return;
    }
    
    // Sanitize text inputs
    const sanitizedData = {
      ...formData,
      name: sanitizeInput(formData.name),
      description: formData.description ? sanitizeInput(formData.description) : null,
      category_id: categoryId,
    };
    
    // Validate data
    if (!validateMenuItemData(sanitizedData)) {
      toast.error("Invalid data. Please check your inputs.");
      return;
    }
    
    // Additional validation
    if (!sanitizedData.name.trim()) {
      toast.error("Name is required.");
      return;
    }
    
    if (sanitizedData.name.length > 100) {
      toast.error("Name is too long (max 100 characters).");
      return;
    }
    
    if (sanitizedData.description && sanitizedData.description.length > 500) {
      toast.error("Description is too long (max 500 characters).");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      await onSubmit(sanitizedData);
      toast.success(item ? "Menu item updated successfully" : "Menu item created successfully");
    } catch (error) {
      console.error("Error submitting menu item:", error);
      toast.error("Failed to save menu item. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Name *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          maxLength={100}
          required
        />
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          maxLength={500}
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="price">Price *</Label>
          <Input
            id="price"
            type="number"
            step="0.01"
            min="0"
            max="9999.99"
            value={formData.price}
            onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
            required
          />
        </div>

        <div>
          <Label htmlFor="promotion_price">Promotion Price</Label>
          <Input
            id="promotion_price"
            type="number"
            step="0.01"
            min="0"
            max="9999.99"
            value={formData.promotion_price || ''}
            onChange={(e) => setFormData(prev => ({ 
              ...prev, 
              promotion_price: e.target.value ? parseFloat(e.target.value) : null 
            }))}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="tax_percentage">Tax Percentage (%)</Label>
          <Input
            id="tax_percentage"
            type="number"
            step="0.1"
            min="0"
            max="100"
            value={formData.tax_percentage || ''}
            onChange={(e) => setFormData(prev => ({ 
              ...prev, 
              tax_percentage: e.target.value ? parseFloat(e.target.value) : null 
            }))}
          />
        </div>

        <div>
          <Label htmlFor="display_order">Display Order</Label>
          <Input
            id="display_order"
            type="number"
            min="0"
            value={formData.display_order || 0}
            onChange={(e) => setFormData(prev => ({ 
              ...prev, 
              display_order: parseInt(e.target.value) || 0 
            }))}
          />
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="in_stock"
          checked={formData.in_stock}
          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, in_stock: checked }))}
        />
        <Label htmlFor="in_stock">In Stock</Label>
      </div>

      <div className="flex gap-2 pt-4">
        <Button 
          type="submit" 
          disabled={isSubmitting}
          className="flex-1"
        >
          {isSubmitting ? "Saving..." : (item ? "Update" : "Create")}
        </Button>
        <Button 
          type="button" 
          variant="outline" 
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
};

export default SecureMenuItemForm;
