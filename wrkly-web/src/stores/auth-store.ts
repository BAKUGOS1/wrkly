import { create } from 'zustand';
import type { User } from '@/types';

interface AuthState {
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  setUser: (user: User) => void;
  logout: () => void;
}

// Safely read from localStorage (SSR-safe)
function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth-token');
}

function getStoredUser(): User | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('auth-user');
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  user: getStoredUser(),
  token: getStoredToken(),
  setAuth: (user, token) => {
    localStorage.setItem('auth-token', token);
    localStorage.setItem('auth-user', JSON.stringify(user));
    set({ user, token });
  },
  setUser: (user) => {
    localStorage.setItem('auth-user', JSON.stringify(user));
    set({ user });
  },
  logout: () => {
    localStorage.removeItem('auth-token');
    localStorage.removeItem('auth-user');
    set({ user: null, token: null });
  },
}));
