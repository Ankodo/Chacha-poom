import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UserProfile {
  id: string;
  email: string;
  username: string;
}

interface Subscription {
  plan: string;
  status: "active" | "expired" | "trial";
  expiresAt: string;
  trafficUsed: number;
  trafficLimit: number;
  devicesUsed: number;
  devicesLimit: number;
  subLink: string;
}

interface AuthState {
  token: string | null;
  user: UserProfile | null;
  subscription: Subscription | null;
  isAuthenticated: boolean;

  setToken: (token: string) => void;
  setUser: (user: UserProfile) => void;
  setSubscription: (subscription: Subscription) => void;
  login: (token: string, user: UserProfile, subscription: Subscription) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      subscription: null,
      isAuthenticated: false,

      setToken: (token) => set({ token, isAuthenticated: true }),

      setUser: (user) => set({ user }),

      setSubscription: (subscription) => set({ subscription }),

      login: (token, user, subscription) =>
        set({ token, user, subscription, isAuthenticated: true }),

      logout: () =>
        set({
          token: null,
          user: null,
          subscription: null,
          isAuthenticated: false,
        }),
    }),
    {
      name: "proxyforge-client-auth",
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        subscription: state.subscription,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
