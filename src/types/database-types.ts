
// Types representing our Supabase database entities

export type Restaurant = {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
  logo_url: string | null;
  location: string | null;
  created_at: string;
  updated_at: string;
  ui_language?: string;
  currency?: string; // NEW: ISO 4217 code, e.g. "EUR", "USD", ...
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
  display_order?: number | null; // Added display_order property
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
  in_stock: boolean;
  display_order?: number | null; // Added display_order property
  available_from?: string | null; // Added time availability property
  available_until?: string | null; // Added time availability property
  is_featured?: boolean; // Added is_featured property
};

export type MenuItemToppingCategory = {
  id: string;
  menu_item_id: string;
  topping_category_id: string;
  display_order: number;
  created_at: string;
  updated_at: string;
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
  show_if_selection_type?: string[] | null;
  show_if_selection_id?: string[] | null;
  display_order?: number | null; // Added display_order property
  allow_multiple_same_topping?: boolean; // Added property to allow multiple quantities
};

export type Topping = {
  id: string;
  name: string;
  price: number;
  category_id: string;
  tax_percentage: number | null;
  created_at: string;
  updated_at: string;
  in_stock: boolean; // Added this property to match the database schema
  display_order?: number | null; // Added display_order property
};

export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled';

// Add the missing OrderType type
export type OrderType = 'dine-in' | 'takeaway' | null;

export interface Order {
  id: string;
  restaurant_id: string;
  customer_id?: string;
  customer_name?: string;
  status: 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  created_at: string;
  total: number;
  order_type?: OrderType;
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
    display_order?: number | null; // Added display_order here
    toppings: {
      id: string;
      name: string;
      price: number;
      tax_percentage: number;
      display_order?: number | null; // Added display_order property
    }[];
    show_if_selection_id?: string[] | null;
    show_if_selection_type?: string[] | null;
    allow_multiple_same_topping?: boolean; // Added property for multiple quantities
  }[];
}

// Extended CartItem type to support topping quantities
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
    toppingQuantities?: { [toppingId: string]: number }; // Added map for topping quantities
  }[];
  specialInstructions?: string;
  itemPrice: number;
}
