
import { createContext, useContext, useEffect, useState } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AuthContextType = {
  session: Session | null;
  user: User | null;
  signOut: () => Promise<void>;
  loading: boolean;
  isAdmin: boolean;
  isRestaurantOwner: (restaurantId?: string) => Promise<boolean>;
  getOwnedRestaurants: () => Promise<any[]>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Set up auth state listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        setLoading(false);
        
        // Check admin status whenever auth state changes
        if (newSession?.user) {
          checkAdminStatus(newSession.user.id);
        } else {
          setIsAdmin(false);
        }
      }
    );

    // Then check for existing session
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      
      // Check admin status on initial load
      if (currentSession?.user) {
        checkAdminStatus(currentSession.user.id);
      }
      
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Check if the user is an admin
  const checkAdminStatus = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', userId)
        .single();
      
      if (error) throw error;
      setIsAdmin(data?.is_admin || false);
    } catch (error) {
      console.error("Error checking admin status:", error);
      setIsAdmin(false);
    }
  };

  // Check if the user is an owner of a specific restaurant
  const isRestaurantOwner = async (restaurantId?: string): Promise<boolean> => {
    if (!user) return false;
    
    try {
      if (restaurantId) {
        // Check ownership of a specific restaurant
        const { data, error } = await supabase.rpc(
          'is_restaurant_owner', 
          { restaurant_uuid: restaurantId }
        );
        
        if (error) throw error;
        return !!data;
      } else {
        // Check if user owns any restaurants
        const { data, error } = await supabase
          .from('restaurant_owners')
          .select('id')
          .eq('user_id', user.id)
          .limit(1);
          
        if (error) throw error;
        return (data && data.length > 0);
      }
    } catch (error) {
      console.error("Error checking restaurant ownership:", error);
      return false;
    }
  };

  // Get all restaurants owned by the current user
  const getOwnedRestaurants = async () => {
    if (!user) return [];
    
    try {
      const { data, error } = await supabase.rpc('get_owned_restaurants');
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error fetching owned restaurants:", error);
      return [];
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const value = {
    session,
    user,
    signOut,
    loading,
    isAdmin,
    isRestaurantOwner,
    getOwnedRestaurants,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
