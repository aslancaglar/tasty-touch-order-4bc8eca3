
import { MenuItemWithOptions as BaseMenuItemWithOptions, MenuItem } from "@/types/database-types";

export type ToppingCategory = {
  id: string;
  name: string;
  min_selections: number;
  max_selections: number;
  required: boolean;
  toppings: Topping[];
};

export type Topping = {
  id: string;
  name: string;
  price: number;
  tax_percentage: number;
};

export type MenuItemWithOptions = BaseMenuItemWithOptions & {
  toppingCategories?: ToppingCategory[];
};

export type SelectedOption = {
  optionId: string;
  choiceIds: string[];
};

export type SelectedTopping = {
  categoryId: string;
  toppingIds: string[];
};

export type CartItem = {
  id: string;
  menuItem: MenuItemWithOptions;
  quantity: number;
  selectedOptions: SelectedOption[];
  selectedToppings: SelectedTopping[];
  specialInstructions?: string;
};

export type KioskOrderType = 'takeaway' | 'dine-in';

export type OrderStep = 
  | 'welcome' 
  | 'orderType' 
  | 'menu' 
  | 'customizeItem' 
  | 'cart' 
  | 'confirmation';
