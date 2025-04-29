
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  Store,
  ChevronLeft,
  ChevronRight,
  LogOut
} from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Restaurant } from "@/types/database-types";

type SidebarItem = {
  title: string;
  icon: React.ElementType;
  href: string;
  showForAdmin?: boolean;
};

export function Sidebar() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(true);
  const { signOut, user, isAdmin, getOwnedRestaurants } = useAuth();
  const { toast } = useToast();
  const [ownedRestaurant, setOwnedRestaurant] = useState<Restaurant | null>(null);

  useEffect(() => {
    const loadOwnedRestaurant = async () => {
      if (!user || isAdmin) return;

      try {
        const restaurants = await getOwnedRestaurants();
        if (restaurants && restaurants.length > 0) {
          setOwnedRestaurant(restaurants[0]);
        }
      } catch (error) {
        console.error("Error fetching owned restaurant:", error);
      }
    };
    
    loadOwnedRestaurant();
  }, [user, isAdmin, getOwnedRestaurants]);

  const sidebarItems: SidebarItem[] = [
    {
      title: "Dashboard",
      icon: LayoutDashboard,
      href: "/",
      showForAdmin: true
    },
    {
      title: "Restaurants",
      icon: Store,
      href: "/restaurants",
      showForAdmin: true
    }
  ];

  // Add the owned restaurant link dynamically if the user is a restaurant owner
  const filteredItems = [...sidebarItems];

  if (ownedRestaurant && !isAdmin) {
    filteredItems.push({
      title: ownedRestaurant.name,
      icon: Store,
      href: `/restaurant/${ownedRestaurant.id}`,
    });
  }

  const adminItems = filteredItems.filter(item => {
    if (!item.showForAdmin) return true;
    return isAdmin && item.showForAdmin;
  });

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: "Logged out successfully",
        description: "You have been logged out of your account",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "There was a problem signing out",
        variant: "destructive",
      });
    }
  };

  return (
    <div className={cn(
      "flex flex-col h-screen bg-white border-r border-gray-200 transition-all duration-300",
      collapsed ? "w-16" : "w-64"
    )}>
      <div className="flex items-center justify-between p-4 border-b">
        {!collapsed && (
          <h1 className="text-xl font-bold text-kiosk-primary">
            TastyTouch
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
          {adminItems.map((item) => (
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
                <p className="text-sm font-medium truncate max-w-[120px]">{user?.email || "Admin User"}</p>
                <p className="text-xs text-gray-500">
                  {isAdmin ? "Admin" : ownedRestaurant ? "Restaurant Owner" : "User"}
                </p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center px-3 py-2 text-sm text-gray-600 hover:text-primary hover:bg-primary/5 rounded-lg"
            >
              <LogOut size={18} className="mr-2" />
              Sign Out
            </button>
          </div>
        ) : (
          <button
            onClick={handleSignOut}
            className="w-full flex justify-center p-2 text-gray-600 hover:text-primary hover:bg-primary/5 rounded-lg"
            title="Sign Out"
          >
            <LogOut size={20} />
          </button>
        )}
      </div>
    </div>
  );
}

export default Sidebar;
