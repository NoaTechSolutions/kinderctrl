import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type UserRole = 'DIRECTOR' | 'STAFF' | 'PARENT' | 'SUPER_ADMIN';
export type StaffRole = 'TEACHER' | 'ASSISTANT' | 'ADMIN';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  centerId: string | null;
  // User's own name — used for DIRECTOR/SUPER_ADMIN topbar display. STAFF read
  // their name from the staff satellite below.
  firstName: string | null;
  lastName: string | null;
  // Populated when the user has a linked center. Null for DIRECTORs who
  // haven't completed setup, or SUPER_ADMINs without a primary center.
  center: { id: string; name: string } | null;
  // Populated when role === 'STAFF'. staff.role is the job title used by
  // the topbar — distinct from auth-level `role` (see UserRole vs StaffRole
  // in the data model). profileComplete drives the dashboard "complete
  // your profile" banner (PO QA #8 Opción C).
  staff: {
    id: string;
    firstName: string;
    lastName: string;
    role: StaffRole;
    profileComplete: boolean;
  } | null;
  // Populated when role === 'PARENT'.
  parent: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
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
