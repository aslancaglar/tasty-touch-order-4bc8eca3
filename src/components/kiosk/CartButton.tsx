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
  return <div className="fixed bottom-4 right-4 z-40">
      
    </div>;
};
export default CartButton;