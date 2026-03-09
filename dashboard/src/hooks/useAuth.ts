import { useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../store/authStore';

export function useAuth() {
  const { setSession, setIsLoading } = useAuthStore();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setIsLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, [setSession, setIsLoading]);
}
