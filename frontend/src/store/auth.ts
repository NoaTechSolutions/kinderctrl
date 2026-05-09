import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type UserRole = 'DIRECTOR' | 'STAFF' | 'PARENT' | 'SUPER_ADMIN';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  centerId: string | null;
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  hasHydrated: boolean;
  setTokens: (access: string, refresh: string, user: AuthUser) => void;
  setAccessToken: (access: string) => void;
  clearTokens: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      hasHydrated: false,
      setTokens: (access, refresh, user) =>
        set({ accessToken: access, refreshToken: refresh, user }),
      setAccessToken: (access) => set({ accessToken: access }),
      clearTokens: () =>
        set({ accessToken: null, refreshToken: null, user: null }),
      isAuthenticated: () => !!get().accessToken,
    }),
    {
      name: 'kc-auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        refreshToken: state.refreshToken,
        user: state.user,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.hasHydrated = true;
        }
      },
    },
  ),
);
