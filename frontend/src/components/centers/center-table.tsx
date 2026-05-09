'use client';

import Link from 'next/link';
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
import { StatusBadge } from './status-badge';
import type { Center } from '@/lib/types/center';

interface CenterTableProps {
  centers: Center[];
}

export function CenterTable({ centers }: CenterTableProps) {
  const { t } = useTranslation();

  return (
    <div
      className="rounded-lg border overflow-x-auto"
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
            <TableHead>Contact</TableHead>
            <TableHead className="text-right">
              {t('centers.capacity')}
            </TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[110px] text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {centers.map((center) => (
            <TableRow key={center.id}>
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
              <TableCell>
                <div className="text-sm">
                  <div className="font-mono">{center.phone}</div>
                  <div
                    className="truncate max-w-[200px]"
                    style={{ color: 'var(--kc-text-3)' }}
                    title={center.email}
                  >
                    {center.email}
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {center.capacity}
              </TableCell>
              <TableCell>
                <StatusBadge status={center.status} />
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <Button
                    asChild
                    variant="ghost"
                    size="icon"
                    aria-label={t('centers.view')}
                  >
                    <Link href={`/centers/${center.id}`}>
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
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
