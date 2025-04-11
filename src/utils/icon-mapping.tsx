
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
  Cheese, 
  Cherry, 
  Leaf,
  Utensils,
  UtensilsCrossed,
  Soup as Spoon
} from "lucide-react";

export const getIconComponent = (iconName: string): React.ReactNode => {
  switch (iconName.toLowerCase()) {
    case 'beef':
      return <Beef className="h-4 w-4" />;
    case 'coffee':
      return <Coffee className="h-4 w-4" />;
    case 'pizza':
      return <Pizza className="h-4 w-4" />;
    case 'sandwich':
      return <Sandwich className="h-4 w-4" />;
    case 'fish':
      return <Fish className="h-4 w-4" />;
    case 'ice-cream':
    case 'icecream':
      return <IceCream className="h-4 w-4" />;
    case 'soup':
      return <Soup className="h-4 w-4" />;
    case 'dessert':
      return <Dessert className="h-4 w-4" />;
    case 'salad':
      return <Salad className="h-4 w-4" />;
    case 'utensils':
      return <Utensils className="h-4 w-4" />;
    case 'utensils-crossed':
      return <UtensilsCrossed className="h-4 w-4" />;
    case 'cheese':
      return <Cheese className="h-4 w-4" />;
    case 'cherry':
      return <Cherry className="h-4 w-4" />;
    case 'leaf':
      return <Leaf className="h-4 w-4" />;
    case 'spoon':
      return <Spoon className="h-4 w-4" />;
    default:
      return <UtensilsCrossed className="h-4 w-4" />;
  }
};
