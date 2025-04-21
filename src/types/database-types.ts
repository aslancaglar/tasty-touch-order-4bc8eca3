
export type ToppingCategory = {
  id: string;
  name: string;
  restaurant_id: string;
  description: string | null;
  icon: string | null;
  min_selections: number | null;
  max_selections: number | null;
  created_at: string;
  updated_at: string;
  // New fields for conditional display (can be category or topping)
  show_if_selection_id?: string | null; // id of category or topping
  show_if_selection_type?: "category" | "topping" | null; // type of the selection
};
