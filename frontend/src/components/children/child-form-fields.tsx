'use client';

import { useState } from 'react';
import { MapPin, X, type LucideIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { NameInput } from '@/components/ui/name-input';
import { NumericInput } from '@/components/ui/numeric-input';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';
import { Field } from '@/components/ui/field';

// Field + its editing context were promoted to @/components/ui/field (the global
// card pattern). Re-exported here so existing children imports keep resolving
// alongside the children-specific AddressFields / EditableList below.
export { Field, FieldEditingContext, FieldEditingProvider } from '@/components/ui/field';

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
      <Field icon={MapPin} label={t('centers.street')}>
        <Input value={value.street} onChange={(e) => onChange('street', e.target.value)} placeholder="123 Main St" />
      </Field>
      <Field icon={MapPin} label={t('centers.city')}>
        <NameInput value={value.city} onChange={(v) => onChange('city', v)} placeholder="San Francisco" />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field icon={MapPin} label={t('centers.state')}>
          <Input
            value={value.state}
            onChange={(e) => onChange('state', e.target.value.toUpperCase())}
            maxLength={2}
            placeholder="CA"
          />
        </Field>
        <Field icon={MapPin} label={t('centers.zipCode')}>
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
