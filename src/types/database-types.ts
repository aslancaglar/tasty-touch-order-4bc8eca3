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
  show_if_selection_id?: string[] | null; 
  show_if_selection_type?: ("category" | "topping" | "")[] | null;
};

export type Topping = {
  id: string;
  name: string;
  category_id: string;
  price: number;
  tax_percentage?: number;
  created_at: string;
  updated_at: string;
};

export type Restaurant = {
  id: string;
  name: string;
  slug: string;
  image_url?: string | null;
  location?: string | null;
  created_at: string;
  updated_at: string;
};

export type MenuCategory = {
  id: string;
  name: string;
  restaurant_id: string;
  description?: string | null;
  image_url?: string | null;
  icon: string;
  created_at: string;
  updated_at: string;
};

export type MenuItem = {
  id: string;
  name: string;
  category_id: string;
  description?: string | null;
  price: number;
  promotion_price?: number | null;
  image?: string | null;
  tax_percentage?: number;
  created_at: string;
  updated_at: string;
  topping_categories?: string[];
};

export type MenuItemOption = {
  id: string;
  name: string;
  menu_item_id: string;
  multiple?: boolean;
  required?: boolean;
  created_at: string;
  updated_at: string;
  choices: OptionChoice[];
};

export type OptionChoice = {
  id: string;
  name: string;
  option_id: string;
  price?: number;
  created_at: string;
  updated_at: string;
};

export type CartItem = {
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
};

export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled';

export type Order = {
  id: string;
  restaurant_id: string;
  status: OrderStatus;
  customer_name?: string | null;
  total: number;
  created_at: string;
  updated_at: string;
  order_type?: string | null;
  table_number?: string | null;
};

export type OrderItem = {
  id: string;
  order_id: string;
  menu_item_id: string;
  quantity: number;
  price: number;
  special_instructions?: string | null;
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

export type MenuItemWithOptions = MenuItem & {
  options?: MenuItemOption[];
  toppingCategories?: Array<ToppingCategory & {
    toppings: Topping[];
    required?: boolean;
  }>;
};
