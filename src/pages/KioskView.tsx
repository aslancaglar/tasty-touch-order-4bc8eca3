import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createOrder, createOrderItems, createOrderItemOptions, createOrderItemToppings } from "@/services/kiosk-service";
import { Restaurant, MenuCategory, MenuItem, OrderType } from "@/types/database-types";
import WelcomePage from "@/components/kiosk/WelcomePage";
import OrderTypeSelection from "@/components/kiosk/OrderTypeSelection";
import KioskHeader from "@/components/kiosk/KioskHeader";
import ItemSelectionDialog from "@/components/kiosk/ItemSelectionDialog";
import { useInactivityTimer } from "@/hooks/useInactivityTimer";
import InactivityDialog from "@/components/kiosk/InactivityDialog";
import KioskMenu from "@/components/kiosk/KioskMenu";
import KioskCartSection from "@/components/kiosk/KioskCartSection";
import { useKioskState } from "@/hooks/useKioskState";
import { useKioskCart } from "@/hooks/useKioskCart";
import { useKioskItemSelection } from "@/hooks/useKioskItemSelection";
import { useKioskLoading } from "@/hooks/useKioskLoading";
import { getCurrencySymbol } from "@/services/kiosk-price-service";

const KioskView = () => {
  const { restaurantSlug } = useParams<{ restaurantSlug: string }>();
  const navigate = useNavigate();
  const [uiLanguage, setUiLanguage] = useState<"fr" | "en" | "tr">("fr");
  const cartRef = useRef<HTMLDivElement | null>(null);
  
  // Extract state management to custom hooks
  const {
    showWelcome,
    setShowWelcome,
    showOrderTypeSelection,
    setShowOrderTypeSelection,
    orderType,
    tableNumber,
    activeCategory,
    setActiveCategory,
    placingOrder,
    setPlacingOrder,
    orderPlaced,
    setOrderPlaced,
    resetToWelcome,
    handleStartOrder,
    handleOrderTypeSelected
  } = useKioskState();
  
  const {
    cart,
    isCartOpen,
    toggleCart,
    addItemToCart,
    updateCartItemQuantity,
    removeCartItem,
    clearCart,
    calculateCartTotal,
    calculateSubtotal,
    calculateTax,
    getFormattedOptions,
    getFormattedToppings
  } = useKioskCart({ t });
  
  const {
    selectedItem,
    setSelectedItem,
    loading: itemLoading,
    handleSelectItem
  } = useKioskItemSelection();
  
  const {
    loading,
    restaurant,
    categories,
    refreshTrigger,
    loadRestaurantAndMenu,
    handleRefreshMenu
  } = useKioskLoading({
    t,
    restaurantSlug,
    setActiveCategory,
    setUiLanguage
  });
  
  // Inactivity timer
  const {
    showDialog,
    handleContinue,
    handleCancel,
    fullReset
  } = useInactivityTimer(resetToWelcome);
  
  // Translations
  const translations = {
    fr: {
      restaurantNotFound: "Restaurant introuvable",
      sorryNotFound: "Désolé, nous n'avons pas pu trouver ce restaurant.",
      backToHome: "Retour à l'accueil",
      open: "Ouvert maintenant",
      dineIn: "Sur Place",
      table: "Table",
      takeaway: "À Emporter",
      menu: "Menu",
      addToCart: "Ajouter au panier",
      selectionsRequired: "Sélections requises",
      pleaseSelectRequired: "Veuillez faire toutes les sélections requises avant d'ajouter au panier",
      addedToCart: "Ajouté au panier",
      added: "ajouté à votre commande",
      quantity: "Quantité",
      multipleSelection: "Sélection multiple",
      selectUpTo: "Sélectionnez jusqu'à",
      maxSelectionsReached: "Nombre maximum de sélections atteint",
      maxSelectionsMessage: "Vous ne pouvez sélectionner que {max} éléments dans cette catégorie.",
      inactivityTitle: "Êtes-vous toujours là ?",
      inactivityMessage: "Voulez-vous continuer votre commande ?",
      yes: "Oui",
      no: "Non",
      refreshMenu: "Rafraîchir le menu",
      menuRefreshed: "Menu rafraîchi",
      menuRefreshSuccess: "Le menu a été rafraîchi avec succès"
    },
    en: {
      restaurantNotFound: "Restaurant not found",
      sorryNotFound: "Sorry, we couldn't find this restaurant.",
      backToHome: "Back to home",
      open: "Now open",
      dineIn: "Dine In",
      table: "Table",
      takeaway: "Takeaway",
      menu: "Menu",
      addToCart: "Add to cart",
      selectionsRequired: "Selections required",
      pleaseSelectRequired: "Please make all required selections before adding to cart",
      addedToCart: "Added to cart",
      added: "added to your order",
      quantity: "Quantity",
      multipleSelection: "Multiple selection",
      selectUpTo: "Select up to",
      maxSelectionsReached: "Maximum selections reached",
      maxSelectionsMessage: "You can only select {max} items in this category.",
      inactivityTitle: "Are you still there?",
      inactivityMessage: "Do you want to continue your order?",
      yes: "Yes",
      no: "No",
      refreshMenu: "Refresh menu",
      menuRefreshed: "Menu refreshed",
      menuRefreshSuccess: "Menu has been refreshed successfully"
    },
    tr: {
      restaurantNotFound: "Restoran bulunamadı",
      sorryNotFound: "Üzgünüz, bu restoranı bulamadık.",
      backToHome: "Ana sayfaya dön",
      open: "Şimdi açık",
      dineIn: "Yerinde Yeme",
      table: "Masa",
      takeaway: "Paket Servis",
      menu: "Menü",
      addToCart: "Sepete ekle",
      selectionsRequired: "Gerekli seçimler",
      pleaseSelectRequired: "Sepete eklemeden önce lütfen tüm gerekli seçimleri yapın",
      addedToCart: "Sepete eklendi",
      added: "siparişinize eklendi",
      quantity: "Miktar",
      multipleSelection: "Çoklu seçim",
      selectUpTo: "En fazla seçin",
      maxSelectionsReached: "Maksimum seçimlere ulaşıldı",
      maxSelectionsMessage: "Bu kategoride sadece {max} öğe seçebilirsiniz.",
      inactivityTitle: "Hala orada mısınız?",
      inactivityMessage: "Siparişinize devam etmek istiyor musunuz?",
      yes: "Evet",
      no: "Hayır",
      refreshMenu: "Menüyü yenile",
      menuRefreshed: "Menü yenilendi",
      menuRefreshSuccess: "Menü başarıyla yenilendi"
    }
  };
  
  const t = (key: keyof typeof translations.en) => {
    return translations[uiLanguage][key];
  };
  
  // Handle order placement
  const handlePlaceOrder = async () => {
    if (!restaurant || cart.length === 0) return;
    
    try {
      setPlacingOrder(true);
      
      const order = await createOrder({
        restaurant_id: restaurant.id,
        status: 'pending',
        total: calculateCartTotal(),
        customer_name: null
      });
      
      const orderItems = await createOrderItems(cart.map(item => ({
        order_id: order.id,
        menu_item_id: item.menuItem.id,
        quantity: item.quantity,
        price: item.itemPrice,
        special_instructions: item.specialInstructions || null
      })));
      
      const orderItemOptionsToCreate = [];
      const orderItemToppingsToCreate = [];
      
      for (let i = 0; i < cart.length; i++) {
        const cartItem = cart[i];
        const orderItem = orderItems[i];
        
        for (const selectedOption of cartItem.selectedOptions) {
          for (const choiceId of selectedOption.choiceIds) {
            orderItemOptionsToCreate.push({
              order_item_id: orderItem.id,
              option_id: selectedOption.optionId,
              choice_id: choiceId
            });
          }
        }
        
        for (const selectedCategory of cartItem.selectedToppings) {
          for (const toppingId of selectedCategory.toppingIds) {
            orderItemToppingsToCreate.push({
              order_item_id: orderItem.id,
              topping_id: toppingId
            });
          }
        }
      }
      
      if (orderItemOptionsToCreate.length > 0) {
        await createOrderItemOptions(orderItemOptionsToCreate);
      }
      
      if (orderItemToppingsToCreate.length > 0) {
        await createOrderItemToppings(orderItemToppingsToCreate);
      }
      
      setOrderPlaced(true);
      // Success toast
      
      setTimeout(() => {
        setOrderPlaced(false);
        clearCart();
        setPlacingOrder(false);
        setShowWelcome(true);
        if (categories.length > 0) {
          setActiveCategory(categories[0].id);
        }
      }, 3000);
    } catch (error) {
      console.error("Error placing order:", error);
      // Error toast
      setPlacingOrder(false);
    }
  };
  
  // Load restaurant and menu data
  useEffect(() => {
    loadRestaurantAndMenu();
  }, [loadRestaurantAndMenu]);
  
  // Reset inactivity timer when welcome screen is shown
  useEffect(() => {
    if (showWelcome) {
      fullReset();
    }
  }, [showWelcome, fullReset]);
  
  // Add no-select styling for kiosk
  useEffect(() => {
    // Add a style tag to prevent selection throughout the kiosk view
    const styleTag = document.createElement('style');
    styleTag.innerHTML = `
      .kiosk-view {
        user-select: none;
        -webkit-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
      }
      
      .kiosk-view * {
        user-select: none;
        -webkit-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
      }
      
      /* Only allow selection in the special instructions textarea */
      .kiosk-view textarea {
        user-select: text;
        -webkit-user-select: text;
        -moz-user-select: text;
        -ms-user-select: text;
      }
    `;
    document.head.appendChild(styleTag);

    // Clean up on unmount
    return () => {
      document.head.removeChild(styleTag);
    };
  }, []);

  // Loading state
  if (loading && !restaurant) {
    return (
      <div className="flex items-center justify-center h-screen kiosk-view">
        <Loader2 className="h-12 w-12 animate-spin text-purple-700" />
      </div>
    );
  }

  // Restaurant not found
  if (!restaurant) {
    return (
      <div className="flex items-center justify-center h-screen kiosk-view">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">{t("restaurantNotFound")}</h1>
          <p className="text-gray-500 mb-4">{t("sorryNotFound")}</p>
          <Button onClick={() => navigate('/')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("backToHome")}
          </Button>
        </div>
      </div>
    );
  }

  // Welcome page
  if (showWelcome) {
    return (
      <div className="kiosk-view">
        <WelcomePage
          restaurant={restaurant}
          onStart={() => {
            fullReset();
            handleStartOrder();
          }}
          uiLanguage={uiLanguage}
        />
      </div>
    );
  }

  // Order type selection
  if (showOrderTypeSelection) {
    return (
      <div className="kiosk-view">
        <div 
          className="fixed inset-0 bg-cover bg-center bg-black/50" 
          style={{
            backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.7)), url(${restaurant.image_url || 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?ixlib=rb-1.2.1&auto=format&fit=crop&w=1920&q=80'})`
          }} 
        />
        <OrderTypeSelection 
          isOpen={showOrderTypeSelection} 
          onClose={() => {
            setShowOrderTypeSelection(false);
            setShowWelcome(true);
          }} 
          onSelectOrderType={handleOrderTypeSelected} 
          uiLanguage={uiLanguage} 
        />
        <InactivityDialog 
          isOpen={showDialog} 
          onContinue={handleContinue} 
          onCancel={handleCancel} 
          t={t} 
        />
      </div>
    );
  }

  // Main kiosk view
  return (
    <div className="h-screen flex flex-col overflow-hidden kiosk-view">
      {/* Header */}
      <div className="h-[12vh] min-h-[120px] flex-shrink-0">
        <KioskHeader 
          restaurant={restaurant} 
          orderType={orderType} 
          tableNumber={tableNumber} 
          t={t} 
          onRefresh={handleRefreshMenu} 
        />
      </div>

      {/* Menu */}
      <KioskMenu 
        categories={categories}
        activeCategory={activeCategory}
        setActiveCategory={setActiveCategory}
        handleSelectItem={handleSelectItem}
        currencySymbol={getCurrencySymbol(restaurant.currency || "EUR")}
        t={t}
        restaurantId={restaurant.id}
        refreshTrigger={refreshTrigger}
      />

      {/* Cart */}
      <KioskCartSection 
        cart={cart}
        isCartOpen={isCartOpen}
        toggleCart={toggleCart}
        handleUpdateCartItemQuantity={updateCartItemQuantity}
        handleRemoveCartItem={removeCartItem}
        handlePlaceOrder={handlePlaceOrder}
        placingOrder={placingOrder}
        orderPlaced={orderPlaced}
        calculateSubtotal={calculateSubtotal}
        calculateTax={calculateTax}
        getFormattedOptions={getFormattedOptions}
        getFormattedToppings={getFormattedToppings}
        clearCart={clearCart}
        restaurant={restaurant}
        orderType={orderType}
        tableNumber={tableNumber}
        uiLanguage={uiLanguage}
        t={t}
        cartRef={cartRef}
        cartTotal={calculateCartTotal()}
      />

      {/* Item customization dialog */}
      {selectedItem && (
        <ItemSelectionDialog
          selectedItem={selectedItem}
          onClose={() => setSelectedItem(null)}
          onAddToCart={addItemToCart}
          t={t}
          currencySymbol={getCurrencySymbol(restaurant.currency || "EUR")}
        />
      )}

      {/* Inactivity dialog */}
      <InactivityDialog 
        isOpen={showDialog} 
        onContinue={handleContinue} 
        onCancel={handleCancel} 
        t={t} 
      />
    </div>
  );
};

export default KioskView;
