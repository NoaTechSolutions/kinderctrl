'use client';

import { forwardRef, type ComponentPropsWithoutRef } from 'react';
import { Input } from './input';
import { formatPhoneUS } from '@/lib/utils/phone';

/**
 * US phone input — thin wrapper over Input that live-formats keystrokes to the
 * canonical "(555) 123-4567" mask via the shared formatPhoneUS helper (the same
 * mask Staff / Centers / Profile use inline). Sibling of NameInput /
 * NumericInput. The form state holds the FORMATTED string; callers run
 * parsePhoneDigits() before submitting to the backend.
 */
interface PhoneInputProps
  extends Omit<
    ComponentPropsWithoutRef<typeof Input>,
    'type' | 'inputMode' | 'value' | 'onChange'
  > {
  value?: string;
  onChange?: (value: string) => void;
}

export const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(
  function PhoneInput({ value = '', onChange, ...rest }, ref) {
    return (
      <Input
        {...rest}
        ref={ref}
        type="tel"
        inputMode="tel"
        value={value}
        onChange={(e) => onChange?.(formatPhoneUS(e.target.value))}
      />
    );
  },
);
