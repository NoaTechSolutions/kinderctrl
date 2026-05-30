'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { getMyProfile, updateMyPreferences } from '@/lib/api/auth';
import { useAuthStore } from '@/store/auth';

export type TimeFormat = '24h' | '12h';

interface TimeFormatContextValue {
  timeFormat: TimeFormat;
  setTimeFormat: (next: TimeFormat) => void;
}

const TimeFormatContext = createContext<TimeFormatContextValue | null>(null);
const STORAGE_KEY = 'kc-time-format';
const DEFAULT_FORMAT: TimeFormat = '24h';

function readStored(): TimeFormat {
  if (typeof window === 'undefined') return DEFAULT_FORMAT;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === '24h' || stored === '12h') return stored;
  } catch {
    // localStorage unavailable
  }
  return DEFAULT_FORMAT;
}

// Profile v2 — TimeFormatProvider now syncs with the server.
//   1. On mount: read localStorage (immediate first paint).
//   2. When authenticated: fetch /auth/me/profile once and adopt the
//      server's value as authoritative (overrides localStorage so a
//      preference set on another device wins).
//   3. On setTimeFormat: write localStorage AND fire-and-forget
//      PATCH /auth/me/preferences. The local update is optimistic — a
//      failed network call doesn't roll back the UI, the user keeps
//      what they picked and tries again next time.
//
// Theme + language stay client-only per Israel's spec.
export function TimeFormatProvider({ children }: { children: ReactNode }) {
  const [timeFormat, setTimeFormatState] =
    useState<TimeFormat>(DEFAULT_FORMAT);
  const accessToken = useAuthStore((s) => s.accessToken);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const isAuthenticated = !!accessToken;

  // First paint: localStorage value (offline-friendly + matches v1).
  useEffect(() => {
    setTimeFormatState(readStored());
  }, []);

  // Once auth state is known and the user is signed in, pull the
  // server's preference. Runs on every login transition (token flips
  // from null → set). If the server value differs from local, we adopt
  // it AND mirror it back to localStorage so the next reload starts on
  // the correct value before the network resolves.
  useEffect(() => {
    if (!hasHydrated) return;
    if (!isAuthenticated) return;
    let cancelled = false;
    void getMyProfile()
      .then((profile) => {
        if (cancelled) return;
        if (profile.timeFormat !== readStored()) {
          setTimeFormatState(profile.timeFormat);
          try {
            window.localStorage.setItem(STORAGE_KEY, profile.timeFormat);
          } catch {
            // localStorage unavailable — server value still wins for
            // this session, just won't persist across reloads.
          }
        } else {
          // localStorage already matched — still adopt to make sure
          // state and storage agree.
          setTimeFormatState(profile.timeFormat);
        }
      })
      .catch(() => {
        // Network/auth hiccup — keep the localStorage value. The next
        // mount tries again. We intentionally don't throw or toast;
        // the user can still pick a value from the dropdowns.
      });
    return () => {
      cancelled = true;
    };
  }, [hasHydrated, isAuthenticated]);

  const setTimeFormat = useCallback(
    (next: TimeFormat) => {
      setTimeFormatState(next);
      try {
        window.localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // localStorage unavailable
      }
      if (isAuthenticated) {
        // Fire-and-forget; we don't await because the dropdown UX
        // shouldn't block on a network roundtrip. Errors are swallowed
        // — the user's local pick is authoritative; if the server save
        // failed, the next mount will hydrate the OLD server value and
        // the user can correct.
        void updateMyPreferences({ timeFormat: next }).catch(() => {});
      }
    },
    [isAuthenticated],
  );

  return (
    <TimeFormatContext.Provider value={{ timeFormat, setTimeFormat }}>
      {children}
    </TimeFormatContext.Provider>
  );
}

export function useTimeFormat() {
  const ctx = useContext(TimeFormatContext);
  if (!ctx) {
    throw new Error(
      'useTimeFormat must be used inside a TimeFormatProvider',
    );
  }
  return ctx;
}
