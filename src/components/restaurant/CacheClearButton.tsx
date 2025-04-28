
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { clearRestaurantCache } from "@/utils/cache-utils";
import { useToast } from "@/hooks/use-toast";

interface CacheClearButtonProps {
  restaurantId: string;
}

const CacheClearButton: React.FC<CacheClearButtonProps> = ({ restaurantId }) => {
  const { toast } = useToast();

  const handleClearCache = () => {
    clearRestaurantCache(restaurantId);
    toast({
      title: "Cache Cleared",
      description: "Local cache has been cleared successfully.",
    });
  };

  return (
    <Button 
      variant="outline" 
      onClick={handleClearCache}
      className="text-red-500 hover:text-red-600"
    >
      <Trash2 className="h-4 w-4 mr-2" />
      Clear Local Cache
    </Button>
  );
};

export default CacheClearButton;
