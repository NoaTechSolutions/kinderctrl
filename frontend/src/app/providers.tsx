'use client';

import { useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { I18nProvider } from '@/lib/i18n';
import { ThemeProvider } from '@/lib/theme';
import { TimeFormatProvider } from '@/lib/preferences/time-format';

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TimeFormatProvider>
          <I18nProvider>
            {children}
            <Toaster richColors position="top-right" closeButton />
          </I18nProvider>
        </TimeFormatProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
