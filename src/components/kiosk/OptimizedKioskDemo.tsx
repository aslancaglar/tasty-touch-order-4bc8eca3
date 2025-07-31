import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import OptimizedItemCustomizationDialog from './OptimizedItemCustomizationDialog';
import { useOptimizedKiosk } from '@/hooks/useOptimizedKiosk';
import { Loader2, Zap, Clock, Database } from 'lucide-react';

interface OptimizedKioskDemoProps {
  restaurantId: string;
  menuItemId?: string;
  onItemSelect?: (itemId: string) => void;
}

/**
 * Demo component showing the optimized kiosk performance
 */
const OptimizedKioskDemo: React.FC<OptimizedKioskDemoProps> = ({
  restaurantId,
  menuItemId,
  onItemSelect
}) => {
  const [selectedItemId, setSelectedItemId] = useState<string | null>(menuItemId || null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState<{
    optionId: string;
    choiceIds: string[];
  }[]>([]);
  const [selectedToppings, setSelectedToppings] = useState<{
    categoryId: string;
    toppingIds: string[];
    toppingQuantities?: { [toppingId: string]: number };
  }[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [specialInstructions, setSpecialInstructions] = useState('');

  // Use the optimized kiosk hook
  const { isPreloading, preloadError, isReady, refreshCache, clearCache } = useOptimizedKiosk({
    restaurantId,
    isAdmin: false
  });

  // Mock translation function
  const t = useCallback((key: string) => {
    const translations: { [key: string]: string } = {
      addToCart: 'Add to Cart',
      selectUpTo: 'Select up to',
      multipleSelection: 'Multiple selection allowed'
    };
    return translations[key] || key;
  }, []);

  const handleItemClick = useCallback((itemId: string) => {
    setSelectedItemId(itemId);
    setIsDialogOpen(true);
    onItemSelect?.(itemId);
  }, [onItemSelect]);

  const handleToggleChoice = useCallback((optionId: string, choiceId: string, multiple: boolean) => {
    setSelectedOptions(prev => {
      const existing = prev.find(o => o.optionId === optionId);
      if (!existing) {
        return [...prev, { optionId, choiceIds: [choiceId] }];
      }

      if (multiple) {
        const choiceExists = existing.choiceIds.includes(choiceId);
        const newChoiceIds = choiceExists
          ? existing.choiceIds.filter(id => id !== choiceId)
          : [...existing.choiceIds, choiceId];
        
        return prev.map(o => 
          o.optionId === optionId 
            ? { ...o, choiceIds: newChoiceIds }
            : o
        );
      } else {
        return prev.map(o => 
          o.optionId === optionId 
            ? { ...o, choiceIds: [choiceId] }
            : o
        );
      }
    });
  }, []);

  const handleToggleTopping = useCallback((categoryId: string, toppingId: string, quantity?: number) => {
    setSelectedToppings(prev => {
      const existing = prev.find(t => t.categoryId === categoryId);
      
      if (!existing) {
        const newTopping = {
          categoryId,
          toppingIds: [toppingId],
          toppingQuantities: quantity !== undefined ? { [toppingId]: quantity } : undefined
        };
        return [...prev, newTopping];
      }

      if (quantity === 0) {
        // Remove topping
        const newToppingIds = existing.toppingIds.filter(id => id !== toppingId);
        const newQuantities = { ...existing.toppingQuantities };
        delete newQuantities[toppingId];

        return prev.map(t => 
          t.categoryId === categoryId
            ? { 
                ...t, 
                toppingIds: newToppingIds,
                toppingQuantities: newQuantities
              }
            : t
        );
      }

      if (quantity !== undefined) {
        // Update quantity
        const toppingExists = existing.toppingIds.includes(toppingId);
        const newToppingIds = toppingExists 
          ? existing.toppingIds 
          : [...existing.toppingIds, toppingId];
        
        const newQuantities = {
          ...existing.toppingQuantities,
          [toppingId]: quantity
        };

        return prev.map(t => 
          t.categoryId === categoryId
            ? { 
                ...t, 
                toppingIds: newToppingIds,
                toppingQuantities: newQuantities
              }
            : t
        );
      }

      // Toggle topping
      const toppingExists = existing.toppingIds.includes(toppingId);
      const newToppingIds = toppingExists
        ? existing.toppingIds.filter(id => id !== toppingId)
        : [...existing.toppingIds, toppingId];

      return prev.map(t => 
        t.categoryId === categoryId
          ? { ...t, toppingIds: newToppingIds }
          : t
      );
    });
  }, []);

  const handleAddToCart = useCallback(() => {
    console.log('Adding to cart:', {
      itemId: selectedItemId,
      quantity,
      selectedOptions,
      selectedToppings,
      specialInstructions
    });
    setIsDialogOpen(false);
    // Reset selections
    setSelectedOptions([]);
    setSelectedToppings([]);
    setQuantity(1);
    setSpecialInstructions('');
  }, [selectedItemId, quantity, selectedOptions, selectedToppings, specialInstructions]);

  const shouldShowToppingCategory = useCallback(() => true, []);

  return (
    <div className="space-y-6">
      {/* Performance Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Optimized Kiosk Performance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant={isReady ? "default" : "secondary"} className="flex items-center gap-1">
              <Database className="h-3 w-3" />
              Cache: {isReady ? "Ready" : "Loading"}
            </Badge>
            <Badge variant={isPreloading ? "secondary" : "outline"} className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {isPreloading ? "Preloading..." : "Optimized"}
            </Badge>
            {preloadError && (
              <Badge variant="destructive">
                Error: {preloadError}
              </Badge>
            )}
          </div>

          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={refreshCache}
              disabled={isPreloading}
            >
              {isPreloading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Refresh Cache
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={clearCache}
            >
              Clear Cache
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Demo Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Test Optimized Dialog</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Menu Item ID:</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={selectedItemId || ''}
                onChange={(e) => setSelectedItemId(e.target.value)}
                placeholder="Enter menu item ID"
                className="flex-1 px-3 py-2 border rounded-md"
              />
              <Button 
                onClick={() => selectedItemId && handleItemClick(selectedItemId)}
                disabled={!selectedItemId || !isReady}
              >
                Open Dialog
              </Button>
            </div>
          </div>

          {!isReady && (
            <div className="text-sm text-muted-foreground">
              Cache is still loading. Dialog will be slower until cache is ready.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Optimized Dialog */}
      <OptimizedItemCustomizationDialog
        menuItemId={selectedItemId}
        restaurantId={restaurantId}
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onAddToCart={handleAddToCart}
        selectedOptions={selectedOptions}
        selectedToppings={selectedToppings}
        onToggleChoice={handleToggleChoice}
        onToggleTopping={handleToggleTopping}
        quantity={quantity}
        onQuantityChange={setQuantity}
        specialInstructions={specialInstructions}
        onSpecialInstructionsChange={setSpecialInstructions}
        shouldShowToppingCategory={shouldShowToppingCategory}
        t={t}
        currencySymbol="€"
      />
    </div>
  );
};

export default OptimizedKioskDemo;