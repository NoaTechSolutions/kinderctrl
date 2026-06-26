'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { Briefcase, ChevronDown, Link2, Mail, Phone, Trash2, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NameInput } from '@/components/ui/name-input';
import { PhoneInput } from '@/components/ui/phone-input';
import { SearchInput } from '@/components/ui/search-input';
import { Checkbox } from '@/components/ui/checkbox';
import { DateField } from '@/components/ui/date-field';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';
import { AddressFields, Field } from '../child-form-fields';
import {
  RELATIONSHIPS,
  type ContactField,
  type ContactRow,
  type IllnessEntryState,
  type ParentRow,
} from './section-data';

// Thin Select wrapper for the fixed option lists.
export function PlainSelect({
  value,
  onValueChange,
  options,
}: {
  value: string;
  onValueChange: (v: string) => void;
  options: Array<{ value: string; labelKey: string }>;
}) {
  const { t } = useTranslation();
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder={t('children.selectPlaceholder')} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {t(o.labelKey)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// Uppercase section divider used inside tabs with sub-sections.
export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--kc-text-3)' }}>
      {children}
    </p>
  );
}

// Themed multi-line text input.
export function MedTextarea({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <textarea
      className="w-full min-h-[72px] rounded-md border px-3 py-2 text-sm"
      style={{ borderColor: 'var(--kc-border)', background: 'var(--kc-bg)', color: 'var(--kc-text-1)' }}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

// Checkbox + label row (the recurring pattern in these forms).
export function CheckboxRow({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--kc-text-2)' }}>
      <Checkbox checked={checked} onCheckedChange={(c) => onChange(c === true)} />
      {label}
    </label>
  );
}

// Tri-state Yes / No / Unanswered control for nullable-boolean intake fields
// (2D). value true = yes, false = no, null = unanswered.
export function TriStateField({
  value,
  onChange,
}: {
  value: boolean | null;
  onChange: (v: boolean | null) => void;
}) {
  const { t } = useTranslation();
  const opts: Array<{ v: boolean | null; label: string }> = [
    { v: true, label: t('children.yes') },
    { v: false, label: t('children.no') },
    { v: null, label: t('children.unanswered') },
  ];
  return (
    <div className="inline-flex overflow-hidden rounded-md border" style={{ borderColor: 'var(--kc-border)' }}>
      {opts.map((o, i) => {
        const selected = value === o.v;
        return (
          <button
            key={String(o.v)}
            type="button"
            onClick={() => onChange(o.v)}
            className={cn('px-3 py-1.5 text-sm transition-colors', i > 0 && 'border-l')}
            style={
              selected
                ? { background: 'var(--kc-p-600)', color: 'white', borderColor: 'var(--kc-border)' }
                : { color: 'var(--kc-text-2)', borderColor: 'var(--kc-border)' }
            }
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// Reads a tri-state value for display: Yes / No / em-dash.
export function triText(value: boolean | null, t: (k: string) => string): string {
  return value === null ? '—' : value ? t('children.yes') : t('children.no');
}

// One past-illness row: checkbox + label, with an optional date once checked.
export function PastIllnessRow({
  label,
  entry,
  onToggle,
  onDate,
  max,
  dateAria,
}: {
  label: string;
  entry: IllnessEntryState;
  onToggle: (checked: boolean) => void;
  onDate: (date: string) => void;
  max: string;
  dateAria: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-md border p-2.5" style={{ borderColor: 'var(--kc-border)' }}>
      <label className="flex flex-1 items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--kc-text-2)' }}>
        <Checkbox checked={entry.checked} onCheckedChange={(c) => onToggle(c === true)} />
        {label}
      </label>
      {entry.checked && (
        <div className="w-40 flex-none">
          <DateField
            value={entry.date}
            onChange={(e) => onDate(e.target.value)}
            max={max}
            aria-label={`${dateAria} ${label}`}
          />
        </div>
      )}
    </div>
  );
}

// One contact card. `fields` controls which inputs show (per contact group).
export function ContactCard({
  row,
  fields,
  onChange,
  onRemove,
}: {
  row: ContactRow;
  fields: ReadonlyArray<ContactField>;
  onChange: (patch: Partial<ContactRow>) => void;
  onRemove: () => void;
}) {
  const { t } = useTranslation();
  const has = (f: ContactField) => fields.includes(f);
  return (
    <div className="rounded-lg border p-4 space-y-4" style={{ borderColor: 'var(--kc-border)' }}>
      <div className="flex items-start gap-3">
        <Field icon={User} label={t('children.contactName')} required className="flex-1">
          <NameInput value={row.name} onChange={(v) => onChange({ name: v })} />
        </Field>
        <Button
          variant="ghost"
          size="icon"
          className="mt-6 h-7 w-7 flex-none"
          onClick={onRemove}
          aria-label={t('children.removeContactAria')}
        >
          <Trash2 className="h-3.5 w-3.5" style={{ color: 'var(--kc-error)' }} />
        </Button>
      </div>

      {(has('relationship') || has('phone') || has('homePhone') || has('workPhone')) && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {has('relationship') && (
            <Field icon={Link2} label={t('children.relationship')}>
              <Input value={row.relationship} onChange={(e) => onChange({ relationship: e.target.value })} />
            </Field>
          )}
          {has('phone') && (
            <Field icon={Phone} label={t('children.phone')}>
              <PhoneInput value={row.phone} onChange={(v) => onChange({ phone: v })} />
            </Field>
          )}
          {has('homePhone') && (
            <Field icon={Phone} label={t('children.homePhone')}>
              <PhoneInput value={row.homePhone} onChange={(v) => onChange({ homePhone: v })} />
            </Field>
          )}
          {has('workPhone') && (
            <Field icon={Briefcase} label={t('children.workPhone')}>
              <PhoneInput value={row.workPhone} onChange={(v) => onChange({ workPhone: v })} />
            </Field>
          )}
        </div>
      )}

      {has('address') && (
        <div className="rounded-lg p-4 space-y-4" style={{ background: 'var(--kc-surface-2)' }}>
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--kc-text-3)' }}>
            {t('children.contactAddress')}
          </p>
          <AddressFields value={row.address} onChange={(f, v) => onChange({ address: { ...row.address, [f]: v } })} />
        </div>
      )}
    </div>
  );
}

export function ParentEditCard({
  index,
  row,
  linkableParents,
  canRemove,
  onChange,
  onPrimary,
  onRemove,
}: {
  index: number;
  row: ParentRow;
  linkableParents: Array<{ id: string; name: string; email: string }>;
  canRemove: boolean;
  onChange: (patch: Partial<ParentRow>) => void;
  onPrimary: () => void;
  onRemove: () => void;
}) {
  const { t } = useTranslation();
  const [exSearch, setExSearch] = useState('');
  const selected = linkableParents.find((e) => e.id === row.parentId);
  const filtered = useMemo(() => {
    const q = exSearch.trim().toLowerCase();
    return (q ? linkableParents.filter((e) => `${e.name} ${e.email}`.toLowerCase().includes(q)) : linkableParents).slice(0, 6);
  }, [exSearch, linkableParents]);

  return (
    <div className="rounded-lg border p-4 space-y-4" style={{ borderColor: 'var(--kc-border)' }}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold" style={{ color: 'var(--kc-text-1)' }}>
          {t('children.parentWord')} {index + 1}
          {row.linked && (
            <span className="ml-2 text-xs font-normal" style={{ color: 'var(--kc-text-3)' }}>
              {row.displayName}
            </span>
          )}
        </span>
        {canRemove && (
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onRemove} aria-label={t('children.removeParentAria')}>
            <Trash2 className="h-3.5 w-3.5" style={{ color: 'var(--kc-error)' }} />
          </Button>
        )}
      </div>

      {row.linked ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field icon={User} label={t('children.firstName')}>
            <Input value={row.firstName} disabled />
          </Field>
          <Field icon={User} label={t('children.middleName')}>
            <Input value={row.middleName} disabled />
          </Field>
          <Field icon={User} label={t('children.lastName')}>
            <Input value={row.lastName} disabled />
          </Field>
          <Field icon={Mail} label={t('children.email')} className="sm:col-span-full">
            <Input value={row.displayEmail} disabled />
          </Field>
        </div>
      ) : (
        <>
          <div className="flex gap-2">
            <Button variant={row.mode === 'new' ? 'default' : 'outline'} size="sm" onClick={() => onChange({ mode: 'new' })}>
              {t('children.newParentBtn')}
            </Button>
            <Button
              variant={row.mode === 'existing' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onChange({ mode: 'existing' })}
              disabled={linkableParents.length === 0}
            >
              {t('children.linkExisting')}
            </Button>
          </div>

          {row.mode === 'existing' ? (
            <Field icon={User} label={t('children.existingParent')} required>
              {selected ? (
                <div className="flex items-center justify-between gap-3 rounded-md border p-2.5" style={{ borderColor: 'var(--kc-border)' }}>
                  <span className="min-w-0 text-sm">
                    <span className="font-medium" style={{ color: 'var(--kc-text-1)' }}>{selected.name}</span>
                    <span className="ml-1 break-all" style={{ color: 'var(--kc-text-3)' }}>· {selected.email}</span>
                  </span>
                  <Button variant="ghost" size="sm" onClick={() => onChange({ parentId: '' })}>{t('children.change')}</Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <SearchInput value={exSearch} onChange={setExSearch} placeholder={t('children.searchByNameOrEmail')} ariaLabel={t('children.searchExistingParentsAria')} />
                  <div className="rounded-md border divide-y" style={{ borderColor: 'var(--kc-border)' }}>
                    {filtered.length === 0 ? (
                      <p className="p-3 text-sm" style={{ color: 'var(--kc-text-3)' }}>{t('children.noMatchingParents')}</p>
                    ) : (
                      filtered.map((ep) => (
                        <button
                          key={ep.id}
                          type="button"
                          onClick={() => onChange({ parentId: ep.id })}
                          className="block w-full px-3 py-2 text-left text-sm transition-colors hover:bg-[var(--kc-surface-2)]"
                        >
                          <span className="font-medium" style={{ color: 'var(--kc-text-1)' }}>{ep.name}</span>
                          <span className="ml-1 break-all" style={{ color: 'var(--kc-text-3)' }}>· {ep.email}</span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </Field>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Field icon={User} label={t('children.firstName')} required>
                  <NameInput value={row.firstName} onChange={(v) => onChange({ firstName: v })} />
                </Field>
                <Field icon={User} label={t('children.middleName')}>
                  <NameInput value={row.middleName} onChange={(v) => onChange({ middleName: v })} />
                </Field>
                <Field icon={User} label={t('children.lastName')} required>
                  <NameInput value={row.lastName} onChange={(v) => onChange({ lastName: v })} />
                </Field>
                <Field icon={Mail} label={t('children.email')} required>
                  <Input type="email" value={row.email} onChange={(e) => onChange({ email: e.target.value })} />
                </Field>
                <Field icon={Phone} label={t('children.phone')}>
                  <PhoneInput value={row.phone} onChange={(v) => onChange({ phone: v })} />
                </Field>
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--kc-text-2)' }}>
                <Checkbox checked={row.isPrimary} onCheckedChange={() => onPrimary()} />
                {t('children.primaryContact')}
              </label>
            </>
          )}
        </>
      )}

      <Field icon={Link2} label={t('children.relationship')} required className="sm:max-w-xs">
        <PlainSelect value={row.relationship} onValueChange={(v) => onChange({ relationship: v })} options={RELATIONSHIPS} />
      </Field>

      <div className="flex flex-wrap gap-4">
        {(row.linked || row.mode === 'existing') && (
          <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--kc-text-2)' }}>
            <Checkbox checked={row.isPrimary} onCheckedChange={() => onPrimary()} />
            {t('children.primaryContact')}
          </label>
        )}
        <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--kc-text-2)' }}>
          <Checkbox checked={row.livesWithChild} onCheckedChange={(c) => onChange({ livesWithChild: c === true })} />
          {t('children.livesWithChild')}
        </label>
      </div>

      {!row.linked && row.mode === 'new' && (
        <>
          <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--kc-text-2)' }}>
            <Checkbox checked={row.sameAddressAsChild} onCheckedChange={(c) => onChange({ sameAddressAsChild: c === true })} />
            {t('children.sameAddressAsChild')}
          </label>
          {!row.sameAddressAsChild && (
            <div className="rounded-lg p-4" style={{ background: 'var(--kc-surface-2)' }}>
              <AddressFields value={row.home} onChange={(f, v) => onChange({ home: { ...row.home, [f]: v } })} />
            </div>
          )}
          <Collapsible open={row.showWork} onOpenChange={(o) => onChange({ showWork: o })}>
            <CollapsibleTrigger className="flex items-center gap-1.5 text-sm font-medium" style={{ color: 'var(--kc-p-600)' }}>
              <ChevronDown className={cn('h-4 w-4 transition-transform', row.showWork && 'rotate-180')} />
              {t('children.workDetailsOptional')}
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-3">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field icon={Briefcase} label={t('children.employer')}>
                  <NameInput value={row.workEmployer} onChange={(v) => onChange({ workEmployer: v })} />
                </Field>
                <Field icon={Briefcase} label={t('children.workPhone')}>
                  <PhoneInput value={row.workPhone} onChange={(v) => onChange({ workPhone: v })} />
                </Field>
              </div>
              <AddressFields value={row.work} onChange={(f, v) => onChange({ work: { ...row.work, [f]: v } })} />
            </CollapsibleContent>
          </Collapsible>
        </>
      )}
    </div>
  );
}
