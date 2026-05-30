'use client';

// PO QA #51 — branded wrapper around sonner.
//
// Why wrap instead of using `toast` from sonner directly:
//   1. Custom icons (lucide) match the rest of the UI; sonner's defaults
//      are smaller and visually distinct.
//   2. Icon color pulled from KC brand tokens (--kc-success, --kc-error,
//      --kc-warning, --kc-info) so dark mode + theme changes stay in sync
//      with the rest of the design system.
//   3. Single export surface — call sites import from one place, the
//      sonner dependency can be swapped later without grep-and-replacing
//      every `toast.success(...)`.
//
// Usage is identical to sonner: `toast.success("Saved")`. Pass i18n keys
// from TOAST_KEYS to keep messages standardized — see messages.ts.

import { createElement, type ReactNode } from 'react';
import { toast as sonnerToast, type ExternalToast } from 'sonner';
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  XCircle,
} from 'lucide-react';

type ToastVariant = 'success' | 'error' | 'warning' | 'info';

// Brand color tokens — each toast variant gets the same hue as the
// corresponding compliance/alert state across the app.
const VARIANT_COLOR: Record<ToastVariant, string> = {
  success: 'var(--kc-success)',
  error: 'var(--kc-error)',
  warning: 'var(--kc-warning)',
  info: 'var(--kc-info, var(--kc-p-500))',
};

const VARIANT_ICON = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
} as const;

function brandedIcon(variant: ToastVariant): ReactNode {
  return createElement(VARIANT_ICON[variant], {
    className: 'h-5 w-5 flex-none',
    style: { color: VARIANT_COLOR[variant] },
    'aria-hidden': true,
  });
}

type ToastOpts = Omit<ExternalToast, 'icon'>;

function show(variant: ToastVariant, message: string, opts?: ToastOpts) {
  // sonner's variant methods (toast.success / toast.error / etc.) apply
  // its own "rich colors" treatment to the toast container. We replace
  // the default icon with the lucide one but keep sonner's container
  // styling — gives us branded icons on the brand-colored background
  // without re-implementing the entire toast UI.
  const fn = sonnerToast[variant];
  return fn(message, { icon: brandedIcon(variant), ...opts });
}

export const toast = {
  success: (message: string, opts?: ToastOpts) => show('success', message, opts),
  error: (message: string, opts?: ToastOpts) => show('error', message, opts),
  warning: (message: string, opts?: ToastOpts) => show('warning', message, opts),
  info: (message: string, opts?: ToastOpts) => show('info', message, opts),
  // Pass-through escape hatch for the rare case where the consumer needs
  // a plain (no-variant) sonner toast — promise toasts, custom JSX, etc.
  raw: sonnerToast,
};
