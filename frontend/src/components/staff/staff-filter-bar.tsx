'use client';

import type { ReactNode } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  Clock,
  PauseCircle,
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
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';
import type { StaffRole } from '@/lib/types/staff';

// ── Filter model (shared with the list via props) ───────────────────────────
// Quick chips key on staff status (client-side, instant). The popover holds the
// secondary axes — Role (+ Center for SUPER_ADMIN). TERMINATED is excluded
// (the list endpoint strips it, so a chip for it would never match).
export type StatusQuickFilter = 'all' | 'ACTIVE' | 'INVITED' | 'SUSPENDED';

export interface StaffSecondaryFilters {
  roles: StaffRole[]; // client-side
  centerIds: string[]; // client-side (SUPER_ADMIN only)
}

export const EMPTY_SECONDARY: StaffSecondaryFilters = {
  roles: [],
  centerIds: [],
};

export function secondaryActiveCount(s: StaffSecondaryFilters): number {
  return s.roles.length + s.centerIds.length;
}

const CHIPS: ReadonlyArray<{
  value: StatusQuickFilter;
  icon: LucideIcon;
  labelKey: string;
  color: string;
}> = [
  { value: 'all', icon: Users, labelKey: 'staff.filterAll', color: 'var(--kc-p-600)' },
  { value: 'ACTIVE', icon: CheckCircle2, labelKey: 'staff.statusActive', color: 'var(--kc-success)' },
  { value: 'INVITED', icon: Clock, labelKey: 'staff.statusInvited', color: 'var(--kc-warning)' },
  { value: 'SUSPENDED', icon: PauseCircle, labelKey: 'staff.statusSuspended', color: 'var(--kc-error)' },
];

const ROLES: ReadonlyArray<{ value: StaffRole; labelKey: string }> = [
  { value: 'TEACHER', labelKey: 'staff.roleTeacher' },
  { value: 'ASSISTANT', labelKey: 'staff.roleAssistant' },
  { value: 'ADMIN', labelKey: 'staff.roleAdmin' },
];

interface StaffFilterBarProps {
  query: string;
  onQueryChange: (v: string) => void;
  quick: StatusQuickFilter;
  onQuickChange: (v: StatusQuickFilter) => void;
  counts: Record<StatusQuickFilter, number>;
  secondary: StaffSecondaryFilters;
  onSecondaryChange: (next: StaffSecondaryFilters) => void;
  // Center filter is SUPER_ADMIN-only; options are derived from the loaded
  // staff (distinct centers on the current page).
  showCenter?: boolean;
  centerOptions?: ReadonlyArray<{ id: string; name: string }>;
}

export function StaffFilterBar({
  query,
  onQueryChange,
  quick,
  onQuickChange,
  counts,
  secondary,
  onSecondaryChange,
  showCenter = false,
  centerOptions = [],
}: StaffFilterBarProps) {
  const { t } = useTranslation();
  const activeCount = secondaryActiveCount(secondary);

  const toggleRole = (value: StaffRole) =>
    onSecondaryChange({
      ...secondary,
      roles: secondary.roles.includes(value)
        ? secondary.roles.filter((r) => r !== value)
        : [...secondary.roles, value],
    });

  const toggleCenter = (value: string) =>
    onSecondaryChange({
      ...secondary,
      centerIds: secondary.centerIds.includes(value)
        ? secondary.centerIds.filter((c) => c !== value)
        : [...secondary.centerIds, value],
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
            placeholder={t('staff.searchPlaceholder')}
            aria-label={t('staff.searchAria')}
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
              aria-label={t('staff.searchClear')}
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
              aria-label={t('staff.filterButton')}
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span className="hidden md:inline">{t('staff.filterButton')}</span>
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
              <FilterSection label={t('staff.filterRole')}>
                <div className="grid grid-cols-2 gap-2">
                  {ROLES.map((r) => (
                    <CheckRow
                      key={r.value}
                      label={t(r.labelKey)}
                      checked={secondary.roles.includes(r.value)}
                      onCheckedChange={() => toggleRole(r.value)}
                    />
                  ))}
                </div>
              </FilterSection>

              {showCenter && centerOptions.length > 0 && (
                <FilterSection label={t('staff.center')}>
                  <div className="space-y-2">
                    {centerOptions.map((c) => (
                      <CheckRow
                        key={c.id}
                        label={c.name}
                        checked={secondary.centerIds.includes(c.id)}
                        onCheckedChange={() => toggleCenter(c.id)}
                      />
                    ))}
                  </div>
                </FilterSection>
              )}

              {activeCount > 0 && (
                <button
                  type="button"
                  onClick={() => onSecondaryChange(EMPTY_SECONDARY)}
                  className="text-sm font-medium transition-colors hover:underline"
                  style={{ color: 'var(--kc-p-600)' }}
                >
                  {t('staff.filterClear')}
                </button>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Divider */}
      <div className="border-t" style={{ borderColor: 'var(--kc-border)' }} />

      {/* Row 2 — quick status chips (scroll on mobile, hidden scrollbar) */}
      <div
        className="flex gap-2 overflow-x-auto p-2 [&::-webkit-scrollbar]:hidden"
        style={{ scrollbarWidth: 'none' }}
        role="group"
        aria-label={t('staff.quickFiltersAria')}
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

function FilterSection({ label, children }: { label: string; children: ReactNode }) {
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
      className={cn('flex cursor-pointer items-center gap-2 text-sm', 'select-none')}
      style={{ color: 'var(--kc-text-2)' }}
    >
      <Checkbox checked={checked} onCheckedChange={() => onCheckedChange()} />
      <span className="truncate">{label}</span>
    </label>
  );
}
