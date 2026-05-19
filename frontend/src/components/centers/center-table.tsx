'use client';

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
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';
import { useAuthStore } from '@/store/auth';
import { StatusBadge } from './status-badge';
import { AdminActionsMenu } from './admin-actions-menu';
import { formatPhoneUS } from '@/lib/utils/phone';
import type { Center } from '@/lib/types/center';

interface CenterTableProps {
  centers: Center[];
}

export function CenterTable({ centers }: CenterTableProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

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
            <TableHead>{t('centers.name')}</TableHead>
            <TableHead>Location</TableHead>
            <TableHead className="hidden lg:table-cell">Contact</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[110px] text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {centers.map((center) => {
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
                    {isSuperAdmin ? (
                      <AdminActionsMenu center={center} showView showEdit />
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
