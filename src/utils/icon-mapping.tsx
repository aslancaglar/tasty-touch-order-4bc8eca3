
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

export const getIconComponent = (iconName: string, size: number = 4): React.ReactNode => {
  const iconSize = `h-${size} w-${size}`;
  
  switch (iconName.toLowerCase()) {
    case 'beef':
      return <Beef className={iconSize} />;
    case 'coffee':
      return <Coffee className={iconSize} />;
    case 'pizza':
      return <Pizza className={iconSize} />;
    case 'sandwich':
      return <Sandwich className={iconSize} />;
    case 'fish':
      return <Fish className={iconSize} />;
    case 'ice-cream':
    case 'icecream':
      return <IceCream className={iconSize} />;
    case 'soup':
      return <Soup className={iconSize} />;
    case 'dessert':
      return <Dessert className={iconSize} />;
    case 'salad':
      return <Salad className={iconSize} />;
    case 'utensils':
      return <Utensils className={iconSize} />;
    case 'utensils-crossed':
      return <UtensilsCrossed className={iconSize} />;
    case 'cheese':
      return <Apple className={iconSize} />; // Replaced Cheese with Apple
    case 'cherry':
      return <Cherry className={iconSize} />;
    case 'leaf':
      return <Leaf className={iconSize} />;
    case 'spoon':
      return <Utensils className={iconSize} />; // Replaced Spoon with Utensils
    default:
      return <UtensilsCrossed className={iconSize} />;
  }
};
