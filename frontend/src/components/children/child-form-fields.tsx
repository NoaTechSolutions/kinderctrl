'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';
import { X, type LucideIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { NameInput } from '@/components/ui/name-input';
import { NumericInput } from '@/components/ui/numeric-input';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';
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

// Shared form primitives for the Children create wizard AND the edit form, so
// the two stay byte-identical. AddressFields is the global SAAS address layout
// (Street full / City full / State + ZIP row, City auto-capitalizes).

export interface Addr {
  street: string;
  city: string;
  state: string;
  zip: string;
}
export const emptyAddr = (): Addr => ({ street: '', city: '', state: '', zip: '' });

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
  // Semantic icon shown next to the label (card design). Optional — the wizard
  // and other forms pass none.
  icon?: LucideIcon;
  children: ReactNode;
}) {
  const editing = useContext(FieldEditingContext);
  // Inside an editing detail card: purple uppercase label (the card design).
  // Everywhere else (wizard, other forms): the classic 14px medium label.
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label
        className={cn(
          'flex items-center gap-1.5',
          editing
            ? 'text-[10px] font-semibold uppercase tracking-[0.05em]'
            : 'text-sm font-medium',
        )}
        style={{ color: editing ? 'var(--kc-p-400)' : 'var(--kc-text-1)' }}
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

export function AddressFields({
  value,
  onChange,
}: {
  value: Addr;
  onChange: (field: keyof Addr, v: string) => void;
}) {
  // Address labels are shared SAAS copy — reuse the centers namespace keys.
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      <Field label={t('centers.street')}>
        <Input value={value.street} onChange={(e) => onChange('street', e.target.value)} placeholder="123 Main St" />
      </Field>
      <Field label={t('centers.city')}>
        <NameInput value={value.city} onChange={(v) => onChange('city', v)} placeholder="San Francisco" />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label={t('centers.state')}>
          <Input
            value={value.state}
            onChange={(e) => onChange('state', e.target.value.toUpperCase())}
            maxLength={2}
            placeholder="CA"
          />
        </Field>
        <Field label={t('centers.zipCode')}>
          <NumericInput value={value.zip} onChange={(v) => onChange('zip', v)} maxLength={5} placeholder="94102" />
        </Field>
      </div>
    </div>
  );
}

// Input + "Add" → growing list of removable chips (allergies, medications, …).
export function EditableList({
  label,
  items,
  onChange,
  placeholder,
  icon,
}: {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
  icon?: LucideIcon;
}) {
  const { t } = useTranslation();
  const [buf, setBuf] = useState('');
  const add = () => {
    const v = buf.trim();
    if (v && !items.includes(v)) onChange([...items, v]);
    setBuf('');
  };
  return (
    <Field label={label} icon={icon}>
      <div className="flex gap-2">
        <Input
          value={buf}
          onChange={(e) => setBuf(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder}
        />
        <Button type="button" variant="outline" onClick={add} className="flex-none">
          {t('children.add')}
        </Button>
      </div>
      {items.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {items.map((it, i) => (
            <span
              key={`${it}-${i}`}
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs"
              style={{ background: 'var(--kc-surface-2)', color: 'var(--kc-text-2)' }}
            >
              {it}
              <button type="button" onClick={() => onChange(items.filter((_, idx) => idx !== i))} aria-label={`${t('children.removeAria')} ${it}`}>
                <X className="h-3 w-3" style={{ color: 'var(--kc-text-3)' }} />
              </button>
            </span>
          ))}
        </div>
      )}
    </Field>
  );
}

export const splitName = (full: string): { firstName: string; lastName: string } => {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  return { firstName: parts[0] ?? '', lastName: parts.slice(1).join(' ') };
};
