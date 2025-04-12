
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
  Apple,
  TouchIcon
} from "lucide-react";

type IconProps = {
  size?: number;
  className?: string;
};

export const getIconComponent = (iconName: string, props: IconProps = {}): React.ReactNode => {
  const { size = 16, className = "" } = props;
  
  switch (iconName.toLowerCase()) {
    case 'beef':
      return <Beef className={`h-${size/4} w-${size/4} ${className}`} />;
    case 'coffee':
      return <Coffee className={`h-${size/4} w-${size/4} ${className}`} />;
    case 'pizza':
      return <Pizza className={`h-${size/4} w-${size/4} ${className}`} />;
    case 'sandwich':
      return <Sandwich className={`h-${size/4} w-${size/4} ${className}`} />;
    case 'fish':
      return <Fish className={`h-${size/4} w-${size/4} ${className}`} />;
    case 'ice-cream':
    case 'icecream':
      return <IceCream className={`h-${size/4} w-${size/4} ${className}`} />;
    case 'soup':
      return <Soup className={`h-${size/4} w-${size/4} ${className}`} />;
    case 'dessert':
      return <Dessert className={`h-${size/4} w-${size/4} ${className}`} />;
    case 'salad':
      return <Salad className={`h-${size/4} w-${size/4} ${className}`} />;
    case 'utensils':
      return <Utensils className={`h-${size/4} w-${size/4} ${className}`} />;
    case 'utensils-crossed':
      return <UtensilsCrossed className={`h-${size/4} w-${size/4} ${className}`} />;
    case 'cheese':
      return <Apple className={`h-${size/4} w-${size/4} ${className}`} />; // Replaced Cheese with Apple
    case 'cherry':
      return <Cherry className={`h-${size/4} w-${size/4} ${className}`} />;
    case 'leaf':
      return <Leaf className={`h-${size/4} w-${size/4} ${className}`} />;
    case 'spoon':
      return <Utensils className={`h-${size/4} w-${size/4} ${className}`} />; // Replaced Spoon with Utensils
    case 'touch':
      return <TouchIcon className={`h-${size/4} w-${size/4} ${className}`} />;
    default:
      return <UtensilsCrossed className={`h-${size/4} w-${size/4} ${className}`} />;
  }
};

export const TouchToOrderIcon = () => {
  return <UtensilsCrossed className="h-6 w-6" />;
};
