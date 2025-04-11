
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
  icon: string | null;
  created_at: string;
  updated_at: string;
};

export type MenuItem = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image: string | null;
  category_id: string;
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

export type OrderStatus = 'pending' | 'preparing' | 'completed' | 'cancelled';

export type Order = {
  id: string;
  restaurant_id: string;
  status: OrderStatus;
  total: number;
  customer_name: string | null;
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
