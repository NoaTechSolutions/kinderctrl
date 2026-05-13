'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

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

export function TimeFormatProvider({ children }: { children: ReactNode }) {
  const [timeFormat, setTimeFormatState] =
    useState<TimeFormat>(DEFAULT_FORMAT);

  // Hydrate once on client.
  useEffect(() => {
    setTimeFormatState(readStored());
  }, []);

  const setTimeFormat = useCallback((next: TimeFormat) => {
    setTimeFormatState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // localStorage unavailable
    }
  }, []);

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
