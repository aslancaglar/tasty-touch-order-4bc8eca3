
import React, { createContext, useContext, useState } from 'react';
import { Restaurant } from '@/types/database-types';

interface RestaurantContextType {
  restaurant: Restaurant | null;
  setRestaurant: (restaurant: Restaurant | null) => void;
}

const RestaurantContext = createContext<RestaurantContextType>({
  restaurant: null,
  setRestaurant: () => {},
});

export const RestaurantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);

  return (
    <RestaurantContext.Provider value={{ restaurant, setRestaurant }}>
      {children}
    </RestaurantContext.Provider>
  );
};

export const useRestaurant = () => useContext(RestaurantContext);
