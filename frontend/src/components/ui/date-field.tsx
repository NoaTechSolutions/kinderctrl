'use client';

import * as React from 'react';
import { CalendarDays } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

/**
 * Date input with an always-visible, theme-aware calendar icon.
 *
 * Why this exists: globals.css sets `-webkit-appearance: none` on date inputs
 * (the mobile intrinsic-width fix, PO QA #61). That makes the native
 * `::-webkit-calendar-picker-indicator` ignore `color-scheme` and render a
 * dark glyph — invisible on dark backgrounds. So we hide the native glyph and
 * render our own Lucide icon, opening the picker programmatically via
 * `showPicker()` (Chromium 99+/FF 101+/Safari 16+).
 *
 * Drop-in for `<Input type="date" … />`: forwards `className` and every input
 * prop, forces `type="date"`, and MERGES refs so react-hook-form's
 * `{...register()}` keeps its ref while we keep ours for `showPicker()`.
 */
function DateField({ ref, className, ...props }: React.ComponentProps<'input'>) {
  const innerRef = React.useRef<HTMLInputElement>(null);

  const setRefs = (node: HTMLInputElement | null) => {
    innerRef.current = node;
    if (typeof ref === 'function') ref(node);
    else if (ref) (ref as React.RefObject<HTMLInputElement | null>).current = node;
  };

  return (
    <div className="relative">
      <Input
        ref={setRefs}
        className={cn('kc-date-field pr-9', className)}
        {...props}
        type="date"
      />
      <button
        type="button"
        aria-label="Open date picker"
        tabIndex={-1}
        onClick={() => innerRef.current?.showPicker?.()}
        className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center"
      >
        <CalendarDays className="h-4 w-4" style={{ color: 'var(--kc-text-3)' }} />
      </button>
    </div>
  );
}

export { DateField };
