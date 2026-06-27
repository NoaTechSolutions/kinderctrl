'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { SortableTableHead } from '@/components/ui/sortable-table-head';
import { useTranslation } from '@/lib/i18n';
import type { Staff, StaffRole, StaffStatus } from '@/lib/types/staff';
import type { UserRole } from '@/store/auth';
import { StaffStatusBadge } from './staff-status-badge';
import { StaffActionsMenu } from './staff-actions-menu';

interface StaffTableProps {
  staff: Staff[];
  // When provided and equal to SUPER_ADMIN, an extra "Center" column is
  // shown so cross-center listings stay legible. Other roles only ever see
  // their own center's staff, so the column would be redundant.
  userRole?: UserRole;
}

const ROLE_LABEL_KEY: Record<Staff['role'], string> = {
  TEACHER: 'staff.roleTeacher',
  ASSISTANT: 'staff.roleAssistant',
  ADMIN: 'staff.roleAdmin',
};

const EMPLOYMENT_LABEL_KEY: Record<string, string> = {
  full_time: 'staff.employmentFullTime',
  part_time: 'staff.employmentPartTime',
};

// Sort orders. role: Teacher→Assistant→Admin. status:
// Active→Invited→Suspended→Terminated.
type SortKey = 'name' | 'role' | 'status' | 'center';
const ROLE_ORDER: Record<StaffRole, number> = {
  TEACHER: 0,
  ASSISTANT: 1,
  ADMIN: 2,
};
const STATUS_ORDER: Record<StaffStatus, number> = {
  ACTIVE: 0,
  INVITED: 1,
  SUSPENDED: 2,
  TERMINATED: 3,
};

// Director/SA roster table (tablet+). Whole row links to the detail page,
// keyboard-activatable. Sortable columns (Name/Role/Status/Center) + an actions
// kebab; one sort active at a time, client-side over the passed rows.
export function StaffTable({ staff, userRole }: StaffTableProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const showCenter = userRole === 'SUPER_ADMIN';
  // PO QA #19 CAMBIO 1: Employment Type is operational data DIRECTORs use to
  // manage their own center; SUPER_ADMIN's cross-center view hides it.
  const showEmploymentType = userRole !== 'SUPER_ADMIN';

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
    if (!sort) return staff;
    const cmp = (a: Staff, b: Staff): number => {
      switch (sort.key) {
        case 'name':
          return `${a.firstName} ${a.lastName}`.localeCompare(
            `${b.firstName} ${b.lastName}`,
          );
        case 'role':
          return ROLE_ORDER[a.role] - ROLE_ORDER[b.role];
        case 'status':
          return STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
        case 'center':
          return (a.centerName ?? '').localeCompare(b.centerName ?? '');
      }
    };
    const arr = [...staff].sort(cmp);
    return sort.dir === 'asc' ? arr : arr.reverse();
  }, [staff, sort]);

  return (
    <div
      className="rounded-lg border overflow-x-auto [&_th:first-child]:pl-4 [&_th:last-child]:pr-4 [&_td:first-child]:pl-4 [&_td:last-child]:pr-4"
      style={{ background: 'var(--kc-surface)', borderColor: 'var(--kc-border)' }}
    >
      <Table>
        <TableHeader>
          <TableRow>
            <SortableTableHead
              label={t('staff.colName')}
              active={sort?.key === 'name'}
              dir={sort?.dir ?? 'asc'}
              onClick={() => toggleSort('name')}
            />
            <SortableTableHead
              label={t('staff.role')}
              active={sort?.key === 'role'}
              dir={sort?.dir ?? 'asc'}
              onClick={() => toggleSort('role')}
            />
            {showCenter && (
              <SortableTableHead
                className="hidden lg:table-cell"
                label={t('staff.center')}
                active={sort?.key === 'center'}
                dir={sort?.dir ?? 'asc'}
                onClick={() => toggleSort('center')}
              />
            )}
            {showEmploymentType && (
              <TableHead className="hidden lg:table-cell">
                {t('staff.employmentType')}
              </TableHead>
            )}
            <SortableTableHead
              label={t('staff.status')}
              active={sort?.key === 'status'}
              dir={sort?.dir ?? 'asc'}
              onClick={() => toggleSort('status')}
            />
            <TableHead className="hidden xl:table-cell">
              {t('staff.hireDate')}
            </TableHead>
            <TableHead className="w-[56px] text-center">
              {t('staff.colActions')}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((s) => {
            const detailHref = `/staff/${s.id}`;
            const navigate = () => router.push(detailHref);
            const fullName = `${s.firstName} ${s.lastName}`;
            const employmentKey = EMPLOYMENT_LABEL_KEY[s.employmentType];
            return (
              <TableRow
                key={s.id}
                role="link"
                tabIndex={0}
                aria-label={`${t('staff.view')}: ${fullName}`}
                className="cursor-pointer focus-visible:outline-none focus-visible:bg-muted/50"
                onClick={navigate}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    navigate();
                  }
                }}
              >
                <TableCell className="font-medium" title={`${s.email} — ${fullName}`}>
                  <span className="block max-w-[260px] truncate text-sm">
                    {fullName}
                  </span>
                  <span
                    className="block text-xs truncate max-w-[260px]"
                    style={{ color: 'var(--kc-text-3)' }}
                  >
                    {s.email}
                  </span>
                </TableCell>
                <TableCell>{t(ROLE_LABEL_KEY[s.role])}</TableCell>
                {showCenter && (
                  <TableCell
                    className="hidden lg:table-cell truncate max-w-[180px]"
                    title={s.centerName ?? ''}
                  >
                    {s.centerName ?? ''}
                  </TableCell>
                )}
                {showEmploymentType && (
                  <TableCell className="hidden lg:table-cell">
                    {employmentKey ? t(employmentKey) : s.employmentType}
                  </TableCell>
                )}
                <TableCell>
                  <StaffStatusBadge status={s.status} />
                </TableCell>
                <TableCell className="hidden xl:table-cell text-sm">
                  {new Date(s.hireDate).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-center">
                  <div
                    className="flex justify-center"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    <StaffActionsMenu staff={s} variant="table" />
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
