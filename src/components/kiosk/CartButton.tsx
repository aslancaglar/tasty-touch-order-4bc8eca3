
import React from "react";
import { Button } from "@/components/ui/button";
import { ShoppingCart } from "lucide-react";

interface CartButtonProps {
  itemCount: number;
  total: number;
  onClick: () => void;
}

const CartButton: React.FC<CartButtonProps> = ({
  itemCount,
  total,
  onClick
}) => {
  if (itemCount === 0) return null;
  
  return (
    <div className="fixed bottom-4 right-4 z-40">
      <Button 
        onClick={onClick}
        className="bg-green-800 hover:bg-green-900 text-white rounded-full p-4 shadow-lg"
      >
        <ShoppingCart className="h-6 w-6 mr-2" />
        <span className="font-bold">{itemCount}</span>
        <span className="mx-2">|</span>
        <span className="font-bold">{total.toFixed(2)} €</span>
      </Button>
    </div>
  );
};

export default CartButton;
