
// Types representing our Supabase database entities

export type Restaurant = {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
  location: string | null;
  created_at: string;
  updated_at: string;
};

export type MenuCategory = {
  id: string;
  name: string;
  restaurant_id: string;
  description: string | null;
  icon: string | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
};

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
};

export type MenuItemOption = {
  id: string;
  menu_item_id: string;
  name: string;
  required: boolean | null;
  multiple: boolean | null;
  created_at: string;
  updated_at: string;
};

export type OptionChoice = {
  id: string;
  option_id: string;
  name: string;
  price: number | null;
  created_at: string;
  updated_at: string;
};

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
  show_if_category_id?: string | null; // Add this property to match the schema
};

export type Topping = {
  id: string;
  name: string;
  price: number;
  category_id: string;
  tax_percentage: number | null;
  created_at: string;
  updated_at: string;
};

export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled';

export interface Order {
  id: string;
  restaurant_id: string;
  customer_id?: string;
  customer_name?: string;
  status: 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  created_at: string;
  total: number;
  order_type?: 'dine-in' | 'takeaway';
  table_number?: string;
}

export type OrderItem = {
  id: string;
  order_id: string;
  menu_item_id: string;
  quantity: number;
  price: number;
  special_instructions: string | null;
  created_at: string;
  updated_at: string;
};

export type OrderItemOption = {
  id: string;
  order_item_id: string;
  option_id: string;
  choice_id: string;
  created_at: string;
  updated_at: string;
};

export interface MenuItemWithOptions extends MenuItem {
  options?: {
    id: string;
    name: string;
    required: boolean | null;
    multiple: boolean | null;
    choices: {
      id: string;
      name: string;
      price: number | null;
    }[];
  }[];
  toppingCategories?: {
    id: string;
    name: string;
    min_selections: number;
    max_selections: number;
    required: boolean;
    toppings: {
      id: string;
      name: string;
      price: number;
      tax_percentage: number;
    }[];
  }[];
}

export interface CartItem {
  id: string;
  menuItem: MenuItemWithOptions;
  quantity: number;
  selectedOptions: {
    optionId: string;
    choiceIds: string[];
  }[];
  selectedToppings: {
    categoryId: string;
    toppingIds: string[];
  }[];
  specialInstructions?: string;
  itemPrice: number;
}
