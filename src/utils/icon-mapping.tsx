
import { ReactNode } from "react";
import { Beef, Coffee, UtensilsCrossed, Wine, Pizza, Salad, Fish, Cake, Sandwich, EggFried, Apple, Soup, Popcorn, Coffee as CoffeeCup, Banana, ChefHat } from "lucide-react";

// Map string icon names to Lucide React components
export const getIconComponent = (iconName: string | null, size: number = 16): ReactNode => {
  if (!iconName) return <ChefHat size={size} />;

  const iconMap: Record<string, ReactNode> = {
    Beef: <Beef size={size} />,
    Coffee: <Coffee size={size} />,
    UtensilsCrossed: <UtensilsCrossed size={size} />,
    Wine: <Wine size={size} />,
    Pizza: <Pizza size={size} />,
    Salad: <Salad size={size} />,
    Fish: <Fish size={size} />,
    Cake: <Cake size={size} />,
    Sandwich: <Sandwich size={size} />,
    EggFried: <EggFried size={size} />,
    Apple: <Apple size={size} />,
    Soup: <Soup size={size} />,
    Popcorn: <Popcorn size={size} />,
    CoffeeCup: <CoffeeCup size={size} />,
    Banana: <Banana size={size} />
  };

  return iconMap[iconName] || <ChefHat size={size} />;
};
