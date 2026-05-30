'use client';

import { forwardRef, type ComponentPropsWithoutRef } from 'react';
import { Input } from './input';

/**
 * PO QA #50 — controlled numeric-only input.
 *
 * The native `<input type="number">` has too many sharp edges (locale-
 * dependent decimal separators, browser spinner buttons, weird scroll
 * behavior, no way to forbid `-` or `e` reliably across browsers). This
 * wrapper renders a `type="text"` Input and filters keystrokes through
 * `sanitizeNumeric` on every change so non-digits never enter the form
 * state in the first place. Real-time blocking, not post-submit cleanup.
 *
 * Configuration:
 *   - allowDecimal: permits a single `.` somewhere in the string
 *   - allowNegative: permits a single leading `-`
 *
 * `inputMode` is set so mobile keyboards open the numeric keypad
 * (`decimal` includes a `.`, `numeric` doesn't).
 *
 * Integrates with react-hook-form via `<Controller>` — pass `field.value`
 * and `field.onChange` straight through. The form state keeps the raw
 * string; numeric coercion (e.g. zod `preprocess` or `setValueAs`) is the
 * caller's responsibility because semantics vary by field (some are
 * digits-only ID-like strings, others are real numbers).
 */
interface NumericInputProps
  extends Omit<
    ComponentPropsWithoutRef<typeof Input>,
    'type' | 'onChange' | 'value' | 'inputMode'
  > {
  value?: string;
  onChange?: (value: string) => void;
  allowDecimal?: boolean;
  allowNegative?: boolean;
}

function sanitizeNumeric(
  raw: string,
  allowDecimal: boolean,
  allowNegative: boolean,
): string {
  let out = '';
  let hasDecimal = false;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (ch >= '0' && ch <= '9') {
      out += ch;
    } else if (ch === '-' && allowNegative && i === 0 && out.length === 0) {
      // Only valid as the first character, and only once.
      out += ch;
    } else if (ch === '.' && allowDecimal && !hasDecimal) {
      out += ch;
      hasDecimal = true;
    }
    // Everything else is dropped silently — no error UX needed, the
    // user just sees their disallowed keystroke fail to appear.
  }
  return out;
}

export const NumericInput = forwardRef<HTMLInputElement, NumericInputProps>(
  function NumericInput(
    {
      value = '',
      onChange,
      allowDecimal = false,
      allowNegative = false,
      ...rest
    },
    ref,
  ) {
    return (
      <Input
        {...rest}
        ref={ref}
        type="text"
        inputMode={allowDecimal ? 'decimal' : 'numeric'}
        value={value}
        onChange={(e) => {
          const sanitized = sanitizeNumeric(
            e.target.value,
            allowDecimal,
            allowNegative,
          );
          onChange?.(sanitized);
        }}
      />
    );
  },
);
