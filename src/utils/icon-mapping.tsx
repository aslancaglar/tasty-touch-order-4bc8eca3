
import React from 'react';
import { 
  Beef, 
  Coffee, 
  Pizza, 
  Sandwich, 
  Fish, 
  IceCream, 
  Soup, 
  Dessert, 
  Salad, 
  Utensils,
  UtensilsCrossed,
  Cherry,
  Leaf,
  Apple
} from "lucide-react";

// Update the function to handle both number and object with size and className
export const getIconComponent = (
  iconName: string, 
  sizeProps: number | { size: number, className?: string } = 4
): React.ReactNode => {
  // Handle both number and object formats
  let size: number;
  let className: string = '';
  
  if (typeof sizeProps === 'number') {
    size = sizeProps;
    className = `h-${size} w-${size}`;
  } else {
    size = sizeProps.size;
    className = sizeProps.className || `h-${size} w-${size}`;
  }
  
  switch (iconName.toLowerCase()) {
    case 'beef':
      return <Beef className={className} />;
    case 'coffee':
      return <Coffee className={className} />;
    case 'pizza':
      return <Pizza className={className} />;
    case 'sandwich':
      return <Sandwich className={className} />;
    case 'fish':
      return <Fish className={className} />;
    case 'ice-cream':
    case 'icecream':
      return <IceCream className={className} />;
    case 'soup':
      return <Soup className={className} />;
    case 'dessert':
      return <Dessert className={className} />;
    case 'salad':
      return <Salad className={className} />;
    case 'utensils':
      return <Utensils className={className} />;
    case 'utensils-crossed':
      return <UtensilsCrossed className={className} />;
    case 'cheese':
      return <Apple className={className} />; // Replaced Cheese with Apple
    case 'cherry':
      return <Cherry className={className} />;
    case 'leaf':
      return <Leaf className={className} />;
    case 'spoon':
      return <Utensils className={className} />; // Replaced Spoon with Utensils
    default:
      return <UtensilsCrossed className={className} />;
  }
};
