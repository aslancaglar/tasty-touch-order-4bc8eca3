
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

// Additional missing types needed by the application
export type Restaurant = {
  id: string;
  name: string;
  location: string | null;
  image_url: string | null;
  ui_language: string;
  currency: string;
  slug: string;
  created_at: string;
  updated_at: string;
};

export type MenuCategory = {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  image_url: string | null;
  restaurant_id: string;
  display_order: number;
  created_at: string;
  updated_at: string;
};

export type CartItem = {
  id: string;
  menuItem: MenuItem;
  quantity: number;
  options?: {
    optionId: string;
    choiceIds: string[];
  }[];
  toppings?: {
    categoryId: string;
    toppingIds: string[];
  }[];
  specialInstructions?: string;
  price: number;
};

export type MenuItemWithOptions = MenuItem & {
  options?: MenuItemOption[];
};

export type MenuItemOption = {
  id: string;
  name: string;
  required: boolean;
  multiple: boolean;
  menu_item_id: string;
  choices: OptionChoice[];
};

export type OptionChoice = {
  id: string;
  name: string;
  price: number | null;
  option_id: string;
};

export type Order = {
  id: string;
  status: OrderStatus;
  customer_name: string | null;
  restaurant_id: string;
  total: number;
  created_at: string;
  updated_at: string;
};

export type OrderItem = {
  id: string;
  order_id: string;
  menu_item_id: string;
  quantity: number;
  price: number;
  special_instructions: string | null;
};

export type OrderItemOption = {
  id: string;
  order_item_id: string;
  option_id: string;
  choice_id: string;
};

export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'delivered' | 'cancelled';

export type ToppingCategory = {
  id: string;
  name: string;
  description: string | null;
  restaurant_id: string;
  min_selections: number;
  max_selections: number;
  icon: string | null;
  display_order: number;
  show_if_selection_type: string[] | null;
  show_if_selection_id: string[] | null;
  created_at: string;
  updated_at: string;
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
