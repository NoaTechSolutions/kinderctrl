'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CalendarOff,
  CheckCircle2,
  Clock,
  ClockArrowDown,
  DoorOpen,
  type LucideIcon,
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { SortableTableHead } from '@/components/ui/sortable-table-head';
import { ChildStatusBadge } from './child-status-badge';
import { ChildActionsMenu } from './child-actions-menu';
import { childFullName, formatAge, relationshipLabel } from '@/lib/format-child';
import { useTranslation } from '@/lib/i18n';
import type {
  ChildAttendanceStatus,
  ChildEnrollmentStatus,
  ChildListItem,
} from '@/lib/types/child';

// "Today" cell rendering (compact attendance status). Same semantics/colors as
// the card band + quick-filter chips.
const TODAY_CFG: Record<
  ChildAttendanceStatus,
  { labelKey: string; color: string; icon: LucideIcon }
> = {
  PRESENT: { labelKey: 'children.attPresent', color: 'var(--kc-success)', icon: CheckCircle2 },
  NOT_ARRIVED: { labelKey: 'children.attNotArrived', color: 'var(--kc-warning)', icon: Clock },
  NOT_SCHEDULED: { labelKey: 'children.attNotScheduled', color: 'var(--kc-text-3)', icon: CalendarOff },
  END_OF_SHIFT: { labelKey: 'children.attEndOfShift', color: 'var(--kc-error)', icon: DoorOpen },
  EARLY_DEPARTURE: {
    labelKey: 'children.attEarlyDeparture',
    color: 'color-mix(in oklch, var(--kc-warning), var(--kc-error))',
    icon: ClockArrowDown,
  },
};

// Sort orders. status: Active→Pending→Inactive→Withdrawn. today:
// Present→Not arrived→Not scheduled→End of shift (EARLY_DEPARTURE tail).
type SortKey = 'name' | 'age' | 'status' | 'today';
const STATUS_ORDER: Record<ChildEnrollmentStatus, number> = {
  ACTIVE: 0,
  PENDING: 1,
  INACTIVE: 2,
  WITHDRAWN: 3,
};
const TODAY_ORDER: Record<ChildAttendanceStatus, number> = {
  PRESENT: 0,
  NOT_ARRIVED: 1,
  NOT_SCHEDULED: 2,
  END_OF_SHIFT: 3,
  EARLY_DEPARTURE: 4,
};

// Director/SA roster table (tablet+). Whole row links to the detail page,
// keyboard-activatable. Sortable columns (Name/Age/Status/Today) + an actions
// kebab; one sort active at a time, client-side over the passed rows.
export function ChildTable({ children }: { children: ChildListItem[] }) {
  const router = useRouter();
  const { t } = useTranslation();
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' } | null>(
    null,
  );

  const toggleSort = (key: SortKey) =>
    setSort((prev) =>
      prev?.key === key
        ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: 'asc' },
    );

  const sorted = useMemo(() => {
    if (!sort) return children;
    const cmp = (a: ChildListItem, b: ChildListItem): number => {
      switch (sort.key) {
        case 'name':
          return childFullName(a).localeCompare(childFullName(b));
        case 'age':
          return a.dateOfBirth.localeCompare(b.dateOfBirth); // older first (asc)
        case 'status':
          return STATUS_ORDER[a.enrollmentStatus] - STATUS_ORDER[b.enrollmentStatus];
        case 'today':
          return (
            TODAY_ORDER[a.attendanceToday.status] -
            TODAY_ORDER[b.attendanceToday.status]
          );
      }
    };
    const arr = [...children].sort(cmp);
    return sort.dir === 'asc' ? arr : arr.reverse();
  }, [children, sort]);

  return (
    <div
      className="rounded-lg border overflow-x-auto [&_th:first-child]:pl-4 [&_th:last-child]:pr-4 [&_td:first-child]:pl-4 [&_td:last-child]:pr-4"
      style={{ background: 'var(--kc-surface)', borderColor: 'var(--kc-border)' }}
    >
      <Table>
        <TableHeader>
          <TableRow>
            <SortableTableHead
              label={t('children.colName')}
              active={sort?.key === 'name'}
              dir={sort?.dir ?? 'asc'}
              onClick={() => toggleSort('name')}
            />
            <SortableTableHead
              label={t('children.colAge')}
              active={sort?.key === 'age'}
              dir={sort?.dir ?? 'asc'}
              onClick={() => toggleSort('age')}
            />
            <TableHead className="hidden lg:table-cell">
              {t('children.colParents')}
            </TableHead>
            <SortableTableHead
              label={t('children.colStatus')}
              active={sort?.key === 'status'}
              dir={sort?.dir ?? 'asc'}
              onClick={() => toggleSort('status')}
            />
            <SortableTableHead
              label={t('children.colToday')}
              active={sort?.key === 'today'}
              dir={sort?.dir ?? 'asc'}
              onClick={() => toggleSort('today')}
            />
            <TableHead className="w-[56px] text-center">
              {t('children.colActions')}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((child) => {
            const primary = child.primaryParent;
            const today = TODAY_CFG[child.attendanceToday.status];
            const TodayIcon = today.icon;
            const href = `/children/${child.id}`;
            const navigate = () => router.push(href);
            return (
              <TableRow
                key={child.id}
                role="link"
                tabIndex={0}
                aria-label={`${t('children.viewAria')} ${childFullName(child)}`}
                className="cursor-pointer focus-visible:outline-none focus-visible:bg-muted/50"
                onClick={navigate}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    navigate();
                  }
                }}
              >
                <TableCell
                  className="font-medium"
                  style={{ color: 'var(--kc-text-1)' }}
                >
                  {childFullName(child)}
                </TableCell>
                <TableCell
                  className="tabular-nums"
                  style={{ color: 'var(--kc-text-2)' }}
                >
                  {formatAge(child.dateOfBirth, t)}
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  {!primary ? (
                    <span style={{ color: 'var(--kc-text-3)' }}>—</span>
                  ) : (
                    <span className="text-sm" style={{ color: 'var(--kc-text-2)' }}>
                      {primary.name}{' '}
                      <span style={{ color: 'var(--kc-text-3)' }}>
                        ({relationshipLabel(primary.relationship, t)})
                      </span>
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <ChildStatusBadge status={child.enrollmentStatus} />
                </TableCell>
                <TableCell>
                  <span
                    className="inline-flex items-center gap-1.5 text-sm font-medium"
                    style={{ color: today.color }}
                  >
                    <TodayIcon className="h-3.5 w-3.5 flex-none" aria-hidden />
                    {t(today.labelKey)}
                  </span>
                </TableCell>
                <TableCell className="text-center">
                  <div
                    className="flex justify-center"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    <ChildActionsMenu child={child} variant="table" />
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
