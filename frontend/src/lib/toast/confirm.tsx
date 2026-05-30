'use client';

// PO QA #51 — Promise-based confirm dialog, replaces window.confirm().
//
// The native `window.confirm()` blocks the JS thread and renders the
// browser's default modal — no theming, no internationalization, no
// brand consistency. This wraps Radix AlertDialog in a Context so the
// imperative `await confirm({...})` API is available anywhere in the
// tree.
//
// Architecture:
//   - <ConfirmProvider> mounts once at the app root and owns one
//     AlertDialog instance. The dialog renders only when state.opts is
//     non-null; defaulting to null keeps the DOM clean.
//   - useConfirm() returns a function that, when called, enqueues the
//     options and returns a Promise that resolves true/false on user
//     action. The dialog renders the next paint and the Promise
//     resolves when the user clicks Confirm/Cancel or dismisses by
//     pressing Escape / clicking the backdrop.
//   - Only one dialog can be open at a time. Calling confirm() while
//     another dialog is open replaces the queued options — by design,
//     to avoid stacking modal layers that can deadlock UI focus.
//
// Usage:
//   const confirm = useConfirm();
//   const handleDelete = async () => {
//     const ok = await confirm({
//       title: 'Delete staff member?',
//       description: 'This action cannot be undone.',
//       variant: 'destructive',
//       confirmText: 'Delete',
//     });
//     if (!ok) return;
//     mutation.mutate(id);
//   };

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react';
import { AlertTriangle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

export interface ConfirmOptions {
  title: string;
  description?: string;
  // Visual + copy default: 'Cancel'. Override for "Stay on page" etc.
  cancelText?: string;
  // Visual + copy default: 'Confirm'. Override per action ('Delete',
  // 'Send', 'Discard').
  confirmText?: string;
  // - 'default': neutral confirm button (primary color)
  // - 'destructive': red confirm button + alert icon in the header
  // - 'warning': amber confirm button + alert icon (less alarming than
  //   destructive — used for "this rotates sessions" etc.)
  variant?: 'default' | 'destructive' | 'warning';
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

interface PendingConfirm {
  opts: ConfirmOptions;
  resolve: (value: boolean) => void;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null);

  const confirm = useCallback<ConfirmFn>((opts) => {
    return new Promise<boolean>((resolve) => {
      // If a previous dialog is somehow still open (e.g. caller fired
      // two confirms back-to-back), resolve the old one as cancelled
      // so the awaiting code paths don't hang.
      setPending((prev) => {
        prev?.resolve(false);
        return { opts, resolve };
      });
    });
  }, []);

  const respond = (value: boolean) => {
    pending?.resolve(value);
    setPending(null);
  };

  const variant = pending?.opts.variant ?? 'default';
  const isDestructive = variant === 'destructive';
  const isWarning = variant === 'warning';

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AlertDialog
        open={pending !== null}
        // onOpenChange fires with false for Escape / backdrop dismiss.
        // Treat that as Cancel so callers get a clean false.
        onOpenChange={(open) => {
          if (!open) respond(false);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="inline-flex items-center gap-2">
              {(isDestructive || isWarning) && (
                <AlertTriangle
                  className="h-5 w-5 flex-none"
                  style={{
                    color: isDestructive
                      ? 'var(--kc-error)'
                      : 'var(--kc-warning)',
                  }}
                  aria-hidden
                />
              )}
              <span>{pending?.opts.title}</span>
            </AlertDialogTitle>
            {pending?.opts.description && (
              <AlertDialogDescription>
                {pending.opts.description}
              </AlertDialogDescription>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => respond(false)}>
              {pending?.opts.cancelText ?? 'Cancel'}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => respond(true)}
              className={cn(
                // Destructive: red filled button so the user sees this
                // is the dangerous path.
                isDestructive &&
                  'bg-[var(--kc-error)] text-white hover:opacity-90 focus-visible:ring-[var(--kc-error)]',
                // Warning: amber filled.
                isWarning &&
                  'bg-[var(--kc-warning)] text-white hover:opacity-90 focus-visible:ring-[var(--kc-warning)]',
              )}
            >
              {pending?.opts.confirmText ?? 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error('useConfirm must be used inside <ConfirmProvider>');
  }
  return ctx;
}
