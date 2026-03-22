import { create } from 'zustand';
import type { User } from '@/types';

interface AuthState {
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: typeof window !== 'undefined' && localStorage ? localStorage.getItem('auth-token') : null,
  setAuth: (user, token) => {
    localStorage.setItem('auth-token', token);
    set({ user, token });
  },
  logout: () => {
    localStorage.removeItem('auth-token');
    set({ user: null, token: null });
  },
}));
