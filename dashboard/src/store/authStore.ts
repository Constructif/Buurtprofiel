import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';

interface AuthStore {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  setSession: (session: Session | null) => void;
  setIsLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  session: null,
  user: null,
  isLoading: true,
  setSession: (session) => set({
    session,
    user: session?.user ?? null,
  }),
  setIsLoading: (isLoading) => set({ isLoading }),
}));
