'use client';

import type { ReactNode } from 'react';
import {
  CalendarOff,
  CheckCircle2,
  ChevronDown,
  Clock,
  DoorOpen,
  Search,
  SlidersHorizontal,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { FilterChip } from '@/components/ui/filter-chip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';
import type { ChildEnrollmentStatus } from '@/lib/types/child';

// ── Filter model (shared with the list via props) ───────────────────────────
export type AttQuickFilter =
  | 'all'
  | 'PRESENT'
  | 'NOT_ARRIVED'
  | 'END_OF_SHIFT'
  | 'NOT_SCHEDULED';

export type AgeGroup = 'infant' | 'toddler' | 'preschool' | 'school';

export interface SecondaryFilters {
  statuses: ChildEnrollmentStatus[]; // server-side (passed to the query)
  hasAllergies: boolean; // client-side
  ageGroups: AgeGroup[]; // client-side
  hasInfantSleep: boolean; // client-side
}

export const EMPTY_SECONDARY: SecondaryFilters = {
  statuses: [],
  hasAllergies: false,
  ageGroups: [],
  hasInfantSleep: false,
};

export function secondaryActiveCount(s: SecondaryFilters): number {
  return (
    s.statuses.length +
    s.ageGroups.length +
    (s.hasAllergies ? 1 : 0) +
    (s.hasInfantSleep ? 1 : 0)
  );
}

// ── Static config ───────────────────────────────────────────────────────────
const CHIPS: ReadonlyArray<{
  value: AttQuickFilter;
  icon: LucideIcon;
  labelKey: string;
  color: string;
}> = [
  { value: 'all', icon: Users, labelKey: 'children.filterAll', color: 'var(--kc-p-600)' },
  { value: 'PRESENT', icon: CheckCircle2, labelKey: 'children.filterPresent', color: 'var(--kc-success)' },
  { value: 'NOT_ARRIVED', icon: Clock, labelKey: 'children.filterNotArrived', color: 'var(--kc-warning)' },
  { value: 'END_OF_SHIFT', icon: DoorOpen, labelKey: 'children.filterEndOfShift', color: 'var(--kc-error)' },
  { value: 'NOT_SCHEDULED', icon: CalendarOff, labelKey: 'children.filterNotScheduled', color: 'var(--kc-text-3)' },
];

const STATUSES: ReadonlyArray<{ value: ChildEnrollmentStatus; labelKey: string }> = [
  { value: 'ACTIVE', labelKey: 'children.statusActive' },
  { value: 'PENDING', labelKey: 'children.statusPending' },
  { value: 'INACTIVE', labelKey: 'children.statusInactive' },
  { value: 'WITHDRAWN', labelKey: 'children.statusWithdrawn' },
];

const AGE_GROUPS: ReadonlyArray<{ value: AgeGroup; labelKey: string }> = [
  { value: 'infant', labelKey: 'children.ageInfants' },
  { value: 'toddler', labelKey: 'children.ageToddlers' },
  { value: 'preschool', labelKey: 'children.agePreschool' },
  { value: 'school', labelKey: 'children.ageSchool' },
];

interface ChildrenFilterBarProps {
  query: string;
  onQueryChange: (v: string) => void;
  quick: AttQuickFilter;
  onQuickChange: (v: AttQuickFilter) => void;
  counts: Record<AttQuickFilter, number>;
  secondary: SecondaryFilters;
  onSecondaryChange: (next: SecondaryFilters) => void;
}

export function ChildrenFilterBar({
  query,
  onQueryChange,
  quick,
  onQuickChange,
  counts,
  secondary,
  onSecondaryChange,
}: ChildrenFilterBarProps) {
  const { t } = useTranslation();
  const activeCount = secondaryActiveCount(secondary);

  const toggleStatus = (value: ChildEnrollmentStatus) =>
    onSecondaryChange({
      ...secondary,
      statuses: secondary.statuses.includes(value)
        ? secondary.statuses.filter((s) => s !== value)
        : [...secondary.statuses, value],
    });

  const toggleAge = (value: AgeGroup) =>
    onSecondaryChange({
      ...secondary,
      ageGroups: secondary.ageGroups.includes(value)
        ? secondary.ageGroups.filter((a) => a !== value)
        : [...secondary.ageGroups, value],
    });

  return (
    <div
      className="rounded-lg border"
      style={{ borderColor: 'var(--kc-border)', background: 'var(--kc-surface)' }}
    >
      {/* Row 1 — search + Filters */}
      <div className="flex items-center gap-2 p-2">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2"
            style={{ color: 'var(--kc-text-3)' }}
            aria-hidden
          />
          <input
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder={t('children.searchPlaceholder')}
            aria-label={t('children.searchAria')}
            autoComplete="off"
            name="search"
            data-1p-ignore
            data-lpignore="true"
            className="h-8 w-full rounded-md border pl-8 pr-8 text-sm outline-none placeholder:text-[var(--kc-text-4)] focus-visible:ring-2 focus-visible:ring-[var(--kc-p-500)]"
            style={{
              background: 'var(--kc-surface-2)',
              borderColor: 'var(--kc-border)',
              color: 'var(--kc-text-1)',
            }}
          />
          {query && (
            <button
              type="button"
              onClick={() => onQueryChange('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center rounded-full p-0.5 transition-colors hover:bg-[var(--kc-surface)]"
              aria-label={t('children.searchClear')}
            >
              <X className="h-3.5 w-3.5" style={{ color: 'var(--kc-text-3)' }} />
            </button>
          )}
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-8 flex-none gap-1.5"
              aria-label={t('children.filtersButton')}
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span className="hidden md:inline">{t('children.filtersButton')}</span>
              {activeCount > 0 && (
                <span
                  className="inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-xs font-semibold text-white"
                  style={{ background: 'var(--kc-p-600)' }}
                >
                  {activeCount}
                </span>
              )}
              <ChevronDown className="hidden h-3.5 w-3.5 opacity-60 md:inline" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-72">
            <div className="space-y-4">
              <FilterSection label={t('children.filterStatus')}>
                <div className="grid grid-cols-2 gap-2">
                  {STATUSES.map((s) => (
                    <CheckRow
                      key={s.value}
                      label={t(s.labelKey)}
                      checked={secondary.statuses.includes(s.value)}
                      onCheckedChange={() => toggleStatus(s.value)}
                    />
                  ))}
                </div>
              </FilterSection>

              <FilterSection label={t('children.filterAgeGroup')}>
                <div className="grid grid-cols-2 gap-2">
                  {AGE_GROUPS.map((a) => (
                    <CheckRow
                      key={a.value}
                      label={t(a.labelKey)}
                      checked={secondary.ageGroups.includes(a.value)}
                      onCheckedChange={() => toggleAge(a.value)}
                    />
                  ))}
                </div>
              </FilterSection>

              <ToggleRow
                label={t('children.filterHasAllergies')}
                checked={secondary.hasAllergies}
                onCheckedChange={(v) =>
                  onSecondaryChange({ ...secondary, hasAllergies: v })
                }
              />
              <ToggleRow
                label={t('children.filterInfantSleep')}
                checked={secondary.hasInfantSleep}
                onCheckedChange={(v) =>
                  onSecondaryChange({ ...secondary, hasInfantSleep: v })
                }
              />

              {activeCount > 0 && (
                <button
                  type="button"
                  onClick={() => onSecondaryChange(EMPTY_SECONDARY)}
                  className="text-sm font-medium transition-colors hover:underline"
                  style={{ color: 'var(--kc-p-600)' }}
                >
                  {t('children.clearFilters')}
                </button>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Divider */}
      <div className="border-t" style={{ borderColor: 'var(--kc-border)' }} />

      {/* Row 2 — quick filter chips (scroll on mobile, hidden scrollbar) */}
      <div
        className="flex gap-2 overflow-x-auto p-2 [&::-webkit-scrollbar]:hidden"
        style={{ scrollbarWidth: 'none' }}
        role="group"
        aria-label={t('children.quickFiltersAria')}
      >
        {CHIPS.map((chip) => (
          <FilterChip
            key={chip.value}
            icon={chip.icon}
            label={t(chip.labelKey)}
            count={counts[chip.value]}
            color={chip.color}
            active={quick === chip.value}
            onClick={() => onQuickChange(chip.value)}
          />
        ))}
      </div>
    </div>
  );
}

// ── Small popover bits ──────────────────────────────────────────────────────
function FilterSection({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <p
        className="text-xs font-semibold uppercase tracking-wide"
        style={{ color: 'var(--kc-text-3)' }}
      >
        {label}
      </p>
      {children}
    </div>
  );
}

function CheckRow({
  label,
  checked,
  onCheckedChange,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: () => void;
}) {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-center gap-2 text-sm',
        'select-none',
      )}
      style={{ color: 'var(--kc-text-2)' }}
    >
      <Checkbox checked={checked} onCheckedChange={() => onCheckedChange()} />
      <span className="truncate">{label}</span>
    </label>
  );
}

function ToggleRow({
  label,
  checked,
  onCheckedChange,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <label
      className="flex cursor-pointer items-center justify-between gap-2 text-sm select-none"
      style={{ color: 'var(--kc-text-2)' }}
    >
      <span>{label}</span>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </label>
  );
}
