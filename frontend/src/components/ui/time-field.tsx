'use client';

import * as React from 'react';
import { Clock } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

/**
 * Time input ("HH:mm") with an always-visible, theme-aware clock icon.
 *
 * Same rationale as DateField: globals.css sets `-webkit-appearance: none` on
 * inputs, which makes the native `::-webkit-calendar-picker-indicator` ignore
 * `color-scheme` and render an invisible glyph on dark backgrounds. So we hide
 * the native glyph and render our own Lucide icon, opening the picker via
 * `showPicker()`. Drop-in for `<Input type="time" … />`.
 */
function TimeField({ ref, className, ...props }: React.ComponentProps<'input'>) {
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
        type="time"
      />
      <button
        type="button"
        aria-label="Open time picker"
        tabIndex={-1}
        onClick={() => innerRef.current?.showPicker?.()}
        className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center"
      >
        <Clock className="h-4 w-4" style={{ color: 'var(--kc-text-3)' }} />
      </button>
    </div>
  );
}

export { TimeField };
