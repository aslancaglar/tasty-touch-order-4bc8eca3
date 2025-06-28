
import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface AuthState {
  user: boolean;
  loading: boolean;
  isAdmin: boolean | null;
  adminCheckCompleted: boolean;
}

export const useAuthMonitor = (componentName: string) => {
  const { user, loading, isAdmin, adminCheckCompleted } = useAuth();
  const previousState = useRef<AuthState | null>(null);
  const renderCount = useRef(0);

  const currentState: AuthState = {
    user: !!user,
    loading,
    isAdmin,
    adminCheckCompleted
  };

  useEffect(() => {
    renderCount.current += 1;
    
    // Log state changes
    if (previousState.current) {
      const changes: string[] = [];
      
      if (previousState.current.user !== currentState.user) {
        changes.push(`user: ${previousState.current.user} → ${currentState.user}`);
      }
      if (previousState.current.loading !== currentState.loading) {
        changes.push(`loading: ${previousState.current.loading} → ${currentState.loading}`);
      }
      if (previousState.current.isAdmin !== currentState.isAdmin) {
        changes.push(`isAdmin: ${previousState.current.isAdmin} → ${currentState.isAdmin}`);
      }
      if (previousState.current.adminCheckCompleted !== currentState.adminCheckCompleted) {
        changes.push(`adminCheckCompleted: ${previousState.current.adminCheckCompleted} → ${currentState.adminCheckCompleted}`);
      }
      
      if (changes.length > 0) {
        console.log(`[${componentName}] Auth state changed (render #${renderCount.current}):`, changes.join(', '));
      }
    } else {
      console.log(`[${componentName}] Initial auth state (render #${renderCount.current}):`, currentState);
    }
    
    previousState.current = { ...currentState };
  }, [user, loading, isAdmin, adminCheckCompleted, componentName]);

  return {
    currentState,
    renderCount: renderCount.current
  };
};
