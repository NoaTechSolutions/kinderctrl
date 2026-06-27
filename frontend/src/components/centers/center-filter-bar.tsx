'use client';

import {
  Ban,
  CheckCircle2,
  Clock,
  PauseCircle,
  Search,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import { FilterChip } from '@/components/ui/filter-chip';
import { useTranslation } from '@/lib/i18n';
import type { CenterStatus } from '@/lib/types/center';

// 'ALL' + the real center statuses. Server-side filter (URL ?status=), so the
// chips carry NO live count — an accurate per-status count would need a global
// aggregate the paginated list endpoint doesn't return.
export type StatusFilter = 'ALL' | CenterStatus;

const CHIPS: ReadonlyArray<{
  value: StatusFilter;
  icon: LucideIcon;
  labelKey: string;
  color: string;
}> = [
  { value: 'ALL', icon: Users, labelKey: 'centers.statusAll', color: 'var(--kc-p-600)' },
  { value: 'ACTIVE', icon: CheckCircle2, labelKey: 'centers.statusActive', color: 'var(--kc-success)' },
  { value: 'SETUP_PENDING', icon: Clock, labelKey: 'centers.statusSetupPending', color: 'var(--kc-warning)' },
  { value: 'SUSPENDED', icon: PauseCircle, labelKey: 'centers.statusSuspended', color: 'var(--kc-error)' },
  { value: 'CLOSED', icon: Ban, labelKey: 'centers.statusClosed', color: 'var(--kc-text-3)' },
];

interface CentersFilterBarProps {
  query: string;
  onQueryChange: (v: string) => void;
  status: StatusFilter;
  onStatusChange: (s: StatusFilter) => void;
}

// Unified search + status-chips bar (SEARCH-FILTER-PATTERN.md). Centers has no
// secondary filters, so there's no Filters popover — Row 1 is just the search.
export function CentersFilterBar({
  query,
  onQueryChange,
  status,
  onStatusChange,
}: CentersFilterBarProps) {
  const { t } = useTranslation();
  return (
    <div
      className="rounded-lg border"
      style={{ borderColor: 'var(--kc-border)', background: 'var(--kc-surface)' }}
    >
      {/* Row 1 — search */}
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
            placeholder={t('centers.searchPlaceholder')}
            aria-label={t('centers.searchAria')}
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
              aria-label={t('centers.clearSearch')}
            >
              <X className="h-3.5 w-3.5" style={{ color: 'var(--kc-text-3)' }} />
            </button>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="border-t" style={{ borderColor: 'var(--kc-border)' }} />

      {/* Row 2 — status chips (server-side, scroll on mobile) */}
      <div
        className="flex gap-2 overflow-x-auto p-2 [&::-webkit-scrollbar]:hidden"
        style={{ scrollbarWidth: 'none' }}
        role="group"
        aria-label={t('centers.filterAria')}
      >
        {CHIPS.map((chip) => (
          <FilterChip
            key={chip.value}
            icon={chip.icon}
            label={t(chip.labelKey)}
            color={chip.color}
            active={status === chip.value}
            onClick={() => onStatusChange(chip.value)}
          />
        ))}
      </div>
    </div>
  );
}
