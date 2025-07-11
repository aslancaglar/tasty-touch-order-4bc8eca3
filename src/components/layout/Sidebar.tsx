
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  Store,
  Shield,
  ChevronLeft,
  ChevronRight,
  LogOut
} from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation, SupportedLanguage, DEFAULT_LANGUAGE } from "@/utils/language-utils";

type SidebarItem = {
  title: string;
  icon: React.ElementType;
  href: string;
  translationKey: string;
};

const createSidebarItems = (t: (key: string) => string): SidebarItem[] => [
  {
    title: t("sidebar.dashboard"),
    icon: LayoutDashboard,
    href: "/",
    translationKey: "sidebar.dashboard"
  },
  {
    title: t("sidebar.restaurants"),
    icon: Store,
    href: "/restaurants",
    translationKey: "sidebar.restaurants"
  },
  {
    title: "Security",
    icon: Shield,
    href: "/security",
    translationKey: "sidebar.security"
  },
];

interface SidebarProps {
  forceDefaultLanguage?: boolean;
}

export function Sidebar({ forceDefaultLanguage = false }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(true);
  const { signOut, user } = useAuth();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [language, setLanguage] = useState<SupportedLanguage>(DEFAULT_LANGUAGE);
  
  // If forceDefaultLanguage is true, use English, otherwise use the language from state
  const { t } = useTranslation(forceDefaultLanguage ? 'en' : language);
  
  // Generate sidebar items with translations
  const adminSidebarItems = createSidebarItems(t);

  // Check if we're in a restaurant management page and extract the ID
  useEffect(() => {
    const checkRestaurantLanguage = async () => {
      // Skip language detection from restaurant if we're forcing default language
      if (forceDefaultLanguage) {
        return;
      }
      
      const match = location.pathname.match(/\/owner\/restaurant\/([^/]+)/);
      if (match && match[1]) {
        const restaurantId = match[1];
        try {
          const { data, error } = await supabase
            .from('restaurants')
            .select('ui_language')
            .eq('id', restaurantId)
            .single();
          
          if (!error && data?.ui_language) {
            console.log("Setting sidebar language from restaurant:", data.ui_language);
            setLanguage(data.ui_language as SupportedLanguage);
          }
        } catch (error) {
          console.error("Error fetching restaurant language:", error);
        }
      } else {
        // If we're not in a restaurant page, try to get the language from the first owned restaurant
        if (user) {
          try {
            const { data: ownedRestaurants, error: ownedError } = await supabase
              .rpc('get_owned_restaurants');
              
            if (!ownedError && ownedRestaurants && ownedRestaurants.length > 0) {
              const firstRestaurant = ownedRestaurants[0];
              if (firstRestaurant.ui_language) {
                console.log("Setting sidebar language from first restaurant:", firstRestaurant.ui_language);
                setLanguage(firstRestaurant.ui_language as SupportedLanguage);
              }
            }
          } catch (error) {
            console.error("Error fetching owned restaurants:", error);
          }
        }
      }
    };
    
    checkRestaurantLanguage();
  }, [location.pathname, user, forceDefaultLanguage]);

  useEffect(() => {
    const checkUserProfile = async () => {
      if (!user) {
        setIsAdmin(false);
        setIsLoading(false);
        return;
      }
      
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', user.id)
          .single();
        
        if (error) {
          console.error("Error checking user profile:", error);
          setIsAdmin(false);
        } else {
          setIsAdmin(data?.is_admin || false);
        }
      } catch (error) {
        console.error("Exception checking user profile:", error);
        setIsAdmin(false);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkUserProfile();
  }, [user]);

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: "Logged out successfully",
        description: "You have been logged out of your account",
      });
      
      // Navigate to appropriate login page based on route
      const isOwnerRoute = location.pathname.startsWith('/owner');
      navigate(isOwnerRoute ? '/owner/login' : '/auth');
    } catch (error) {
      toast({
        title: "Error",
        description: "There was a problem signing out",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-screen bg-white border-r border-gray-200 w-16">
        <div className="flex-1 py-4 flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "flex flex-col h-screen bg-white border-r border-gray-200 transition-all duration-300",
      collapsed ? "w-16" : "w-64"
    )}>
      <div className="flex items-center justify-between p-4 border-b">
        {!collapsed && (
          <h1 className="text-xl font-bold text-kiosk-primary">
            Qimbo Kiosk
          </h1>
        )}
        <button 
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100"
        >
          {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>
      
      <nav className="flex-1 py-4 overflow-y-auto">
        <ul className="space-y-1 px-2">
          {isAdmin && adminSidebarItems.map((item) => (
            <li key={item.href}>
              <Link
                to={item.href}
                className={cn(
                  "flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  location.pathname === item.href
                    ? "bg-primary/10 text-primary" 
                    : "text-gray-600 hover:text-primary hover:bg-primary/5"
                )}
              >
                <item.icon size={20} className={cn(
                  "flex-shrink-0",
                  collapsed ? "mx-auto" : "mr-3"
                )} />
                {!collapsed && <span>{item.title}</span>}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      
      <div className="p-4 border-t border-gray-200">
        {!collapsed ? (
          <div className="flex flex-col space-y-4">
            <div className="flex items-center">
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                <span className="text-xs font-medium">
                  {user?.email?.charAt(0).toUpperCase() || "U"}
                </span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium truncate max-w-[120px]">{user?.email || "User"}</p>
                <p className="text-xs text-gray-500">{isAdmin ? t("sidebar.admin") : t("sidebar.owner")}</p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center px-3 py-2 text-sm text-gray-600 hover:text-primary hover:bg-primary/5 rounded-lg"
            >
              <LogOut size={18} className="mr-2" />
              {t("sidebar.signOut")}
            </button>
          </div>
        ) : (
          <button
            onClick={handleSignOut}
            className="w-full flex justify-center p-2 text-gray-600 hover:text-primary hover:bg-primary/5 rounded-lg"
            title={t("sidebar.signOut")}
          >
            <LogOut size={20} />
          </button>
        )}
      </div>
    </div>
  );
}

export default Sidebar;
