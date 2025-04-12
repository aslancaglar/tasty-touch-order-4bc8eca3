
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ToppingCategoryFormProps = {
  initialValues?: {
    name: string;
    description: string;
    icon: string;
    min_selections: number;
    max_selections: number;
  };
  onSubmit: (values: any) => void;
  isLoading: boolean;
};

const ToppingCategoryForm = ({
  initialValues = {
    name: "",
    description: "",
    icon: "",
    min_selections: 0,
    max_selections: 0
  },
  onSubmit,
  isLoading,
}: ToppingCategoryFormProps) => {
  const [values, setValues] = useState(initialValues);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setValues((prev) => ({ ...prev, [name]: parseInt(value) || 0 }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(values);
  };

  const handleIconSelect = (iconName: string) => {
    setValues((prev) => ({ ...prev, icon: iconName }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Category Name *</Label>
        <Input
          id="name"
          name="name"
          value={values.name}
          onChange={handleChange}
          required
          placeholder="e.g., Sauces, Toppings, etc."
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          value={values.description}
          onChange={handleChange}
          placeholder="Describe this category (optional)"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="min_selections">Minimum Selections</Label>
          <Input
            id="min_selections"
            name="min_selections"
            type="number"
            min="0"
            value={values.min_selections}
            onChange={handleNumberChange}
          />
          <p className="text-xs text-muted-foreground">
            Minimum number of items customers must select (0 = optional)
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="max_selections">Maximum Selections</Label>
          <Input
            id="max_selections"
            name="max_selections"
            type="number"
            min="0"
            value={values.max_selections}
            onChange={handleNumberChange}
          />
          <p className="text-xs text-muted-foreground">
            Maximum number of items customers can select (0 = unlimited)
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="icon">Icon</Label>
        <Select
          value={values.icon}
          onValueChange={handleIconSelect}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select an icon" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="apple">Apple</SelectItem>
            <SelectItem value="cherry">Cherry</SelectItem>
            <SelectItem value="leaf">Leaf</SelectItem>
            <SelectItem value="beef">Beef</SelectItem>
            <SelectItem value="pizza">Pizza</SelectItem>
            <SelectItem value="utensils">Utensils</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="pt-4 flex justify-end space-x-2">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Category"
          )}
        </Button>
      </div>
    </form>
  );
};

export default ToppingCategoryForm;
