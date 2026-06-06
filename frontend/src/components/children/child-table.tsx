'use client';

import { useRouter } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ChildStatusBadge } from './child-status-badge';
import {
  childFullName,
  formatAge,
  parentFullName,
  relationshipLabel,
  sortedParents,
} from '@/lib/format-child';
import { useTranslation } from '@/lib/i18n';
import type { Child } from '@/lib/types/child';

// Director/SA roster table (tablet+). Mirrors CenterTable: whole row is a link
// to the detail page, keyboard-activatable.
export function ChildTable({ children }: { children: Child[] }) {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <div
      className="rounded-lg border overflow-x-auto [&_th:first-child]:pl-4 [&_th:last-child]:pr-4 [&_td:first-child]:pl-4 [&_td:last-child]:pr-4"
      style={{ background: 'var(--kc-surface)', borderColor: 'var(--kc-border)' }}
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('children.colName')}</TableHead>
            <TableHead>{t('children.colAge')}</TableHead>
            <TableHead className="hidden md:table-cell">
              {t('children.colParents')}
            </TableHead>
            <TableHead>{t('children.colStatus')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {children.map((child) => {
            const parents = sortedParents(child);
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
                <TableCell className="hidden md:table-cell">
                  {parents.length === 0 ? (
                    <span style={{ color: 'var(--kc-text-3)' }}>—</span>
                  ) : (
                    <span className="text-sm" style={{ color: 'var(--kc-text-2)' }}>
                      {parentFullName(parents[0])}{' '}
                      <span style={{ color: 'var(--kc-text-3)' }}>
                        ({relationshipLabel(parents[0].relationship, t)})
                      </span>
                      {parents.length > 1 && (
                        <span style={{ color: 'var(--kc-text-3)' }}>
                          {' '}
                          +{parents.length - 1}
                        </span>
                      )}
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <ChildStatusBadge status={child.enrollmentStatus} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
