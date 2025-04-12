
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { ToppingCategory } from "@/types/database-types";

type ToppingFormProps = {
  initialValues?: {
    name: string;
    price: number;
    tax_percentage: number;
    category_id: string;
  };
  categories: ToppingCategory[];
  onSubmit: (values: any) => void;
  isLoading: boolean;
};

const ToppingForm = ({
  initialValues = {
    name: "",
    price: 0,
    tax_percentage: 10,
    category_id: "",
  },
  categories,
  onSubmit,
  isLoading,
}: ToppingFormProps) => {
  const [values, setValues] = useState(initialValues);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setValues((prev) => ({ ...prev, [name]: parseFloat(value) || 0 }));
  };

  const handleCategoryChange = (categoryId: string) => {
    setValues((prev) => ({ ...prev, category_id: categoryId }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(values);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="category_id">Category *</Label>
        <Select
          value={values.category_id}
          onValueChange={handleCategoryChange}
          required
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">Topping Name *</Label>
        <Input
          id="name"
          name="name"
          value={values.name}
          onChange={handleChange}
          required
          placeholder="e.g., Ketchup, Cheddar Cheese, etc."
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="price">Price *</Label>
          <Input
            id="price"
            name="price"
            type="number"
            step="0.01"
            min="0"
            value={values.price}
            onChange={handleNumberChange}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tax_percentage">Tax Percentage</Label>
          <Input
            id="tax_percentage"
            name="tax_percentage"
            type="number"
            step="0.1"
            min="0"
            value={values.tax_percentage}
            onChange={handleNumberChange}
          />
          <p className="text-xs text-muted-foreground">
            Default is 10% if left empty
          </p>
        </div>
      </div>

      <div className="pt-4 flex justify-end space-x-2">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Topping"
          )}
        </Button>
      </div>
    </form>
  );
};

export default ToppingForm;
