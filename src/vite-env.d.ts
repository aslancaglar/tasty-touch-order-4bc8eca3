
/// <reference types="vite/client" />

// Define SelectedToppingCategory type for utility functions that need it
interface SelectedToppingCategory {
  categoryId: string;
  toppingIds: string[];
  toppingQuantities?: { [toppingId: string]: number };
}
