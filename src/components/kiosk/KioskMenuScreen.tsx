
import { useState } from "react";
import { Restaurant, MenuCategory, MenuItem } from "@/types/database-types";
import { CartItem } from "@/types/kiosk-types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getIconComponent } from "@/utils/icon-mapping";
import { ChevronRight, Home, ShoppingCart } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type KioskMenuScreenProps = {
  restaurant: Restaurant;
  categories: MenuCategory[];
  cart: CartItem[];
  onSelectItem: (item: MenuItem) => void;
  onViewCart: () => void;
  onGoBack: () => void;
  calculateCartTotal: () => number;
};

export const KioskMenuScreen = ({ 
  restaurant, 
  categories, 
  cart, 
  onSelectItem, 
  onViewCart,
  onGoBack,
  calculateCartTotal,
}: KioskMenuScreenProps) => {
  const [activeCategory, setActiveCategory] = useState<string>(
    categories.length > 0 ? categories[0].id : ""
  );

  const totalItems = cart.reduce((total, item) => total + item.quantity, 0);
  const totalPrice = calculateCartTotal();
  
  // Get the items for the active category
  const activeItems = categories.find(c => c.id === activeCategory)?.items || [];

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="bg-red-600 text-white py-4 px-6 flex items-center justify-between">
        <button onClick={onGoBack} className="text-white">
          <Home className="h-6 w-6" />
        </button>
        <h1 className="text-xl font-bold uppercase">MENU</h1>
        <div className="w-6"></div> {/* For balance */}
      </header>
      
      <div className="flex flex-1 overflow-hidden">
        {/* Categories Sidebar */}
        <nav className="w-36 bg-yellow-400 flex flex-col overflow-y-auto">
          {categories.map(category => (
            <button
              key={category.id}
              className={`p-3 flex flex-col items-center text-center transition-colors ${
                activeCategory === category.id 
                  ? 'bg-yellow-500 text-red-900 font-medium' 
                  : 'hover:bg-yellow-300 text-red-800'
              }`}
              onClick={() => setActiveCategory(category.id)}
            >
              {getIconComponent(category.icon || 'coffee')}
              <span className="mt-1 text-xs uppercase">{category.name}</span>
            </button>
          ))}
        </nav>
        
        {/* Items Grid */}
        <main className="flex-1 p-6 bg-yellow-50 overflow-y-auto">
          <h2 className="text-xl font-bold text-red-900 mb-4 uppercase">
            {categories.find(c => c.id === activeCategory)?.name || "MENUS"}
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {activeItems.map(item => (
              <Card key={item.id} className="overflow-hidden hover:shadow-md">
                <div className="flex h-40 bg-gray-200">
                  <img 
                    src={item.image || 'https://via.placeholder.com/400x300'}
                    alt={item.name}
                    className="w-1/2 h-full object-cover"
                  />
                  <div className="w-1/2 p-4 flex flex-col justify-between">
                    <div>
                      <h3 className="font-bold text-lg text-red-900">{item.name}</h3>
                      {item.description && (
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">{item.description}</p>
                      )}
                    </div>
                    <p className="font-bold text-xl">{parseFloat(item.price.toString()).toFixed(2)} €</p>
                  </div>
                </div>
                <div className="p-3 bg-white">
                  <Button 
                    className="w-full bg-red-600 hover:bg-red-700"
                    onClick={() => onSelectItem(item)}
                  >
                    AJOUTER AU PANIER
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </main>
      </div>
      
      {/* Cart Footer */}
      {cart.length > 0 && (
        <footer className="bg-white border-t border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <ShoppingCart className="h-6 w-6 text-red-600 mr-2" />
              <span className="font-medium">VOTRE COMMANDE ({totalItems})</span>
            </div>
            <div className="flex items-center">
              <span className="font-bold text-lg mr-4">{totalPrice.toFixed(2)} €</span>
              <Button 
                onClick={onViewCart}
                className="bg-green-700 hover:bg-green-800"
              >
                VOIR MA COMMANDE
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
};
