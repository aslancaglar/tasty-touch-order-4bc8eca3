export interface Restaurant {
  id: string;
  name: string;
  slug: string;
  description?: string;
  address?: string;
  phone_number?: string;
  website?: string;
  created_at: Date;
  updated_at: Date;
  image_url?: string;
  currency: string;
  ui_language: string;
}

export interface MenuCategory {
  id: string;
  name: string;
  description?: string;
  restaurant_id: string;
  created_at: Date;
  updated_at: Date;
  display_order?: number;
  items: MenuItem[];
}

export interface MenuItem {
  id: string;
  name: string;
  description?: string;
  image_url?: string;
  price: number;
  category_id: string;
  created_at: Date;
  updated_at: Date;
  options?: MenuOption[];
  tax_percentage?: number;
  display_order?: number;
}

export interface MenuOption {
  id: string;
  name: string;
  description?: string;
  menu_item_id: string;
  required: boolean;
  multiple: boolean;
  created_at: Date;
  updated_at: Date;
  choices: MenuChoice[];
}

export interface MenuChoice {
  id: string;
  name: string;
  description?: string;
  price?: number;
  option_id: string;
  created_at: Date;
  updated_at: Date;
}

export interface Order {
  id: string;
  restaurant_id: string;
  customer_name?: string;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  total: number;
  created_at: Date;
  updated_at: Date;
}

export interface OrderItem {
  id: string;
  order_id: string;
  menu_item_id: string;
  quantity: number;
  price: number;
  special_instructions?: string;
  created_at: Date;
  updated_at: Date;
}

export interface OrderItemOption {
  id: string;
  order_item_id: string;
  option_id: string;
  choice_id: string;
  created_at: Date;
  updated_at: Date;
}

export interface OrderItemTopping {
  id: string;
  order_item_id: string;
  topping_id: string;
  created_at: Date;
  updated_at: Date;
}

export interface CartItem {
  id: string;
  menuItem: MenuItemWithOptions;
  quantity: number;
  itemPrice: number;
  specialInstructions?: string;
  selectedOptions: {
    optionId: string;
    choiceIds: string[];
  }[];
  selectedToppings: {
    categoryId: string;
    toppingIds: string[];
    toppingQuantities?: {
      id: string;
      quantity: number;
    }[];
  }[];
}

export interface MenuItemWithOptions extends MenuItem {
  options?: MenuOption[];
  toppingCategories?: ToppingCategory[];
}

export type OrderType = 'take_out' | 'delivery' | 'dine_in';

export interface Topping {
  id: string;
  name: string;
  description?: string;
  price: number;
  category_id: string;
  created_at: Date;
  updated_at: Date;
  tax_percentage?: number;
  display_order?: number;
}

// Add allow_multiple_same_topping to ToppingCategory
export interface ToppingCategory {
  id: string;
  name: string;
  description?: string;
  min_selections: number;
  max_selections: number;
  restaurant_id: string;
  created_at: Date;
  updated_at: Date;
  toppings?: Topping[];
  required?: boolean;
  show_if_selection_id?: string[];
  show_if_selection_type?: string;
  display_order?: number;
  allow_multiple_same_topping?: boolean; // Add this line
}
