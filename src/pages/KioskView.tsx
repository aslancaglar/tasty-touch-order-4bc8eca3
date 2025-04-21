
  const handleToggleTopping = (categoryId: string, toppingId: string) => {
    setSelectedToppings(prev => {
      const categoryIndex = prev.findIndex(t => t.categoryId === categoryId);
      if (categoryIndex === -1) {
        return [...prev, {
          categoryId,
          toppingIds: [toppingId]
        }];
      }
      const category = prev[categoryIndex];
      let newToppingIds: string[];
      if (category.toppingIds.includes(toppingId)) {
        newToppingIds = category.toppingIds.filter(id => id !== toppingId);
      } else {
        if (selectedItem?.toppingCategories) {
          const toppingCategory = selectedItem.toppingCategories.find(c => c.id === categoryId);
          if (toppingCategory && toppingCategory.max_selections > 0) {
            if (category.toppingIds.length >= toppingCategory.max_selections) {
              toast({
                title: "Nombre maximum de sélections atteint",
                description: `Vous ne pouvez sélectionner que ${toppingCategory.max_selections} éléments dans cette catégorie.`
              });
              return prev;
            }
          }
        }
        newToppingIds = [...category.toppingIds, toppingId];
      }
      const newToppings = [...prev];
      newToppings[categoryIndex] = {
        ...category,
        toppingIds: newToppingIds
      };
      
      // Force a re-render to update conditional categories visibility
      setTimeout(() => {
        setSelectedToppings([...newToppings]);
      }, 10);
      
      return newToppings;
    });
  };
