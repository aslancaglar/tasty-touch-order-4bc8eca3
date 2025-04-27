
// Add 'in_stock' to the existing MenuItem type
export type MenuItem = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  promotion_price: number | null;
  image: string | null;
  category_id: string;
  created_at: string;
  updated_at: string;
  topping_categories?: string[];
  tax_percentage?: number | null;
  in_stock: boolean; // Add this line
};
