'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Edit, Eye } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { SortableTableHead } from '@/components/ui/sortable-table-head';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';
import { useAuthStore } from '@/store/auth';
import { StatusBadge } from './status-badge';
import { AdminCenterBadge } from './admin-center-badge';
import { AdminActionsMenu } from './admin-actions-menu';
import { formatPhoneUS } from '@/lib/utils/phone';
import type { Center, CenterStatus } from '@/lib/types/center';

interface CenterTableProps {
  centers: Center[];
}

// Sort order for the Status column. Active → Setup → Suspended → Closed.
type SortKey = 'name' | 'location' | 'status';
const STATUS_ORDER: Record<CenterStatus, number> = {
  ACTIVE: 0,
  SETUP_PENDING: 1,
  SUSPENDED: 2,
  CLOSED: 3,
};

export function CenterTable({ centers }: CenterTableProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

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
    if (!sort) return centers;
    const cmp = (a: Center, b: Center): number => {
      switch (sort.key) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'location':
          return `${a.city}, ${a.state}`.localeCompare(`${b.city}, ${b.state}`);
        case 'status':
          return STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
      }
    };
    const arr = [...centers].sort(cmp);
    return sort.dir === 'asc' ? arr : arr.reverse();
  }, [centers, sort]);

  return (
    <div
      className="rounded-lg border overflow-x-auto [&_th:first-child]:pl-4 [&_th:last-child]:pr-4 [&_td:first-child]:pl-4 [&_td:last-child]:pr-4"
      style={{
        background: 'var(--kc-surface)',
        borderColor: 'var(--kc-border)',
      }}
    >
      <Table>
        <TableHeader>
          <TableRow>
            <SortableTableHead
              label={t('centers.name')}
              active={sort?.key === 'name'}
              dir={sort?.dir ?? 'asc'}
              onClick={() => toggleSort('name')}
            />
            <SortableTableHead
              label="Location"
              active={sort?.key === 'location'}
              dir={sort?.dir ?? 'asc'}
              onClick={() => toggleSort('location')}
            />
            <TableHead className="hidden lg:table-cell">Contact</TableHead>
            <SortableTableHead
              label="Status"
              active={sort?.key === 'status'}
              dir={sort?.dir ?? 'asc'}
              onClick={() => toggleSort('status')}
            />
            <TableHead className="w-[110px] text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((center) => {
            const detailHref = `/centers/${center.id}`;
            const navigate = () => router.push(detailHref);
            return (
              <TableRow
                key={center.id}
                role="link"
                tabIndex={0}
                aria-label={`${t('centers.view')}: ${center.name}`}
                className="cursor-pointer focus-visible:outline-none focus-visible:bg-muted/50"
                onClick={navigate}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    navigate();
                  }
                }}
              >
                <TableCell className="font-medium" title={center.name}>
                  <span className="block max-w-[200px] truncate">
                    {center.name}
                  </span>
                  {center.isAdminCenter && (
                    <AdminCenterBadge className="mt-1" />
                  )}
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    <div>
                      {center.city}, {center.state}
                    </div>
                    <div style={{ color: 'var(--kc-text-3)' }}>
                      {center.zipCode}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  <div className="text-sm">
                    <div className="font-mono">{formatPhoneUS(center.phone)}</div>
                    <div
                      className="truncate max-w-[200px]"
                      style={{ color: 'var(--kc-text-3)' }}
                      title={center.email}
                    >
                      {center.email}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <StatusBadge status={center.status} />
                </TableCell>
                <TableCell className="text-right">
                  <div
                    className="flex justify-end gap-1"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    {isSuperAdmin && !center.isAdminCenter ? (
                      // Normal centers: full kebab (view, edit, status, delete).
                      <AdminActionsMenu center={center} showView showEdit />
                    ) : isSuperAdmin && center.isAdminCenter ? (
                      // Admin center is system-managed — view only, no mutations.
                      <Button
                        asChild
                        variant="ghost"
                        size="icon"
                        aria-label={t('centers.view')}
                      >
                        <Link href={detailHref}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                    ) : (
                      <>
                        <Button
                          asChild
                          variant="ghost"
                          size="icon"
                          aria-label={t('centers.view')}
                        >
                          <Link href={detailHref}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button
                          asChild
                          variant="ghost"
                          size="icon"
                          aria-label={t('centers.edit')}
                        >
                          <Link href={`/centers/${center.id}/edit`}>
                            <Edit className="h-4 w-4" />
                          </Link>
                        </Button>
                      </>
                    )}
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
