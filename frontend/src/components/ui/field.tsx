'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

// True only inside a detail card that's in edit mode (SectionFrame provides it).
// Drives the card-design field styling (purple uppercase label) WITHOUT touching
// the wizard / other forms, which render Field with no provider (defaults false).
export const FieldEditingContext = createContext(false);
export function FieldEditingProvider({
  editing,
  children,
}: {
  editing: boolean;
  children: ReactNode;
}) {
  return (
    <FieldEditingContext.Provider value={editing}>
      {children}
    </FieldEditingContext.Provider>
  );
}

// One labeled form field (card pattern). 10px uppercase label everywhere; purple
// (--kc-p-400) inside an editing card, muted with a purple icon elsewhere (the
// same label treatment as a read field, over a live input). See CARD-PATTERN.md.
export function Field({
  label,
  required,
  className,
  icon: Icon,
  children,
}: {
  label: string;
  required?: boolean;
  className?: string;
  icon?: LucideIcon;
  children: ReactNode;
}) {
  const editing = useContext(FieldEditingContext);
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label
        className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.05em]"
        style={{ color: editing ? 'var(--kc-p-400)' : 'var(--kc-text-3)' }}
      >
        {Icon && (
          <Icon
            className="h-3.5 w-3.5 flex-none"
            style={{ color: editing ? 'var(--kc-p-400)' : 'var(--kc-p-600)' }}
          />
        )}
        {label}
        {required && <span style={{ color: 'var(--kc-error)' }}> *</span>}
      </label>
      {children}
    </div>
  );
}
