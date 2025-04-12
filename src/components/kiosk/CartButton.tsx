
import React from "react";
import { Button } from "@/components/ui/button";
import { ShoppingCart } from "lucide-react";

interface CartButtonProps {
  itemCount: number;
  total: number;
  onClick: () => void;
}

const CartButton: React.FC<CartButtonProps> = ({ itemCount, total, onClick }) => {
  if (itemCount === 0) return null;
  
  return (
    <div className="fixed bottom-4 right-4 z-40">
      <Button 
        onClick={onClick}
        className="bg-kiosk-primary hover:bg-kiosk-primary/90 text-white rounded-full py-6 px-6 shadow-lg flex items-center gap-2"
      >
        <ShoppingCart className="h-5 w-5" />
        <span className="font-bold">{itemCount} {itemCount === 1 ? 'item' : 'items'}</span>
        <span className="px-2 py-1 bg-white text-kiosk-primary rounded-full font-bold">
          {total.toFixed(2)} €
        </span>
      </Button>
    </div>
  );
};

export default CartButton;
