'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { I18nProvider } from '@/lib/i18n';
import { ThemeProvider } from '@/lib/theme';
import { TimeFormatProvider } from '@/lib/preferences/time-format';
import { ConfirmProvider } from '@/lib/toast';
import { TooltipProvider } from '@/components/ui/tooltip';

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

  // Once React has committed, mark the body so the instant skeleton
  // (#kc-initial-skeleton in the root layout) cross-fades out and the real
  // React shell takes over. body has suppressHydrationWarning, so toggling
  // this class is safe.
  //
  // The double rAF waits two paint cycles so the real content is already
  // painted under the skeleton before it fades out.
  useEffect(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.body.classList.add('hydrated');
        const skeleton = document.getElementById('kc-initial-skeleton');
        if (skeleton) {
          skeleton.style.opacity = '0';
          skeleton.style.transition = 'opacity 0.3s ease';
          setTimeout(() => skeleton.remove(), 300);
        }
      });
    });
  }, []);

  // PO QA #51: ConfirmProvider mounts the single AlertDialog instance
  // used by useConfirm() across the app. Innermost so any consumer of
  // i18n/theme/time-format can still wrap its confirm copy correctly.
  // Toaster stays under the Confirm provider so toasts and confirms
  // coexist in the same DOM layer.
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TimeFormatProvider>
          <I18nProvider>
            {/* TooltipProvider sits above ConfirmProvider so tooltips
                inside confirm dialogs (e.g., a collapsed sidebar that
                survives a dialog open) resolve their delay timer in
                the same root state. */}
            <TooltipProvider>
              <ConfirmProvider>
                {children}
                <Toaster richColors position="top-right" closeButton />
              </ConfirmProvider>
            </TooltipProvider>
          </I18nProvider>
        </TimeFormatProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
