'use client';

import { forwardRef, type ComponentPropsWithoutRef } from 'react';
import { Input } from './input';

/**
 * PO QA #55 — name input with auto-capitalization on blur.
 *
 * Default text inputs leave names in whatever case the user typed
 * ("john doe", "JOHN DOE", "joHN doE"). For name fields specifically
 * we want to normalize to title-case on blur so the staff list /
 * detail page render consistently regardless of how the data was
 * entered.
 *
 * Algorithm: lowercase the whole string, then upper-case the first
 * letter of every "word segment" — word being separated by space,
 * hyphen, or apostrophe. Covers:
 *   - "john doe" → "John Doe"
 *   - "MARY ANN" → "Mary Ann"
 *   - "mary-anne" → "Mary-Anne"
 *   - "o'brien" → "O'Brien"
 *
 * Unicode-aware (`\p{L}` + `u` flag) so Spanish accents survive:
 *   "JOSÉ"  → "José"
 *   "ñoño"  → "Ñoño"
 *
 * Edge cases NOT handled (left as-is to avoid over-engineering):
 *   - "McDonald" → becomes "Mcdonald". If we ever need it, a
 *     whitelist of prefixes (Mc, Mac, Van, De, etc.) would handle it,
 *     but most users will type these correctly the first time.
 *
 * Integration: drop-in `<Controller>` replacement for the bare Input.
 * The onBlur runs the capitalization THEN calls field.onBlur so RHF
 * sees the normalized value.
 */
export function capitalizeName(raw: string): string {
  if (!raw) return raw;
  return raw
    .toLowerCase()
    .replace(/(^|[\s'-])(\p{L})/gu, (_m, sep, ch: string) => sep + ch.toUpperCase());
}

interface NameInputProps
  extends Omit<
    ComponentPropsWithoutRef<typeof Input>,
    'onChange' | 'value' | 'onBlur'
  > {
  value?: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
}

export const NameInput = forwardRef<HTMLInputElement, NameInputProps>(
  function NameInput({ value = '', onChange, onBlur, ...rest }, ref) {
    return (
      <Input
        {...rest}
        ref={ref}
        type="text"
        value={value}
        onChange={(e) => {
          // Free-typing — no real-time filter. We let the user keep
          // whatever case they want while focused; normalization is
          // a blur-time concern only.
          onChange?.(e.target.value);
        }}
        onBlur={() => {
          if (value) {
            const normalized = capitalizeName(value);
            if (normalized !== value) {
              onChange?.(normalized);
            }
          }
          onBlur?.();
        }}
      />
    );
  },
);
