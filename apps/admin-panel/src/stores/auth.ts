import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AdminInfo {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  admin: AdminInfo | null;
  isAuthenticated: boolean;

  setTokens: (token: string, refreshToken: string) => void;
  setAdmin: (admin: AdminInfo) => void;
  login: (token: string, refreshToken: string, admin: AdminInfo) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      refreshToken: null,
      admin: null,
      isAuthenticated: false,

      setTokens: (token, refreshToken) =>
        set({ token, refreshToken, isAuthenticated: true }),

      setAdmin: (admin) => set({ admin }),

      login: (token, refreshToken, admin) =>
        set({ token, refreshToken, admin, isAuthenticated: true }),

      logout: () =>
        set({
          token: null,
          refreshToken: null,
          admin: null,
          isAuthenticated: false,
        }),
    }),
    {
      name: "proxyforge-admin-auth",
      partialize: (state) => ({
        token: state.token,
        refreshToken: state.refreshToken,
        admin: state.admin,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
