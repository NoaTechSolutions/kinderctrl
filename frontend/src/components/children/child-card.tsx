'use client';

import Link from 'next/link';
import { Baby } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { ChildStatusBadge } from './child-status-badge';
import {
  childFullName,
  formatAge,
  parentFullName,
  relationshipLabel,
  sortedParents,
} from '@/lib/format-child';
import type { Child } from '@/lib/types/child';

// Used on phones (Director roster) AND for the parent's read-only view. Both
// navigate to the detail page (parents can view their own child read-only).
export function ChildCard({ child }: { child: Child }) {
  const parents = sortedParents(child);

  return (
    <Link href={`/children/${child.id}`} className="block">
      <Card className="overflow-hidden py-3 transition-shadow hover:shadow-md">
        <CardContent className="flex items-start gap-3">
          <div
            className="flex h-10 w-10 flex-none items-center justify-center rounded-lg"
            style={{
              background: 'color-mix(in oklch, var(--kc-p-100), transparent 30%)',
              color: 'var(--kc-p-600)',
            }}
          >
            <Baby className="h-5 w-5" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h3
                className="truncate text-base font-semibold leading-tight"
                style={{ color: 'var(--kc-text-1)' }}
                title={childFullName(child)}
              >
                {childFullName(child)}
              </h3>
              <ChildStatusBadge
                status={child.enrollmentStatus}
                className="flex-none"
                hideIcon
              />
            </div>

            <p className="mt-0.5 text-sm tabular-nums" style={{ color: 'var(--kc-text-3)' }}>
              {formatAge(child.dateOfBirth)}
            </p>

            {parents.length > 0 && (
              <p className="mt-1.5 truncate text-sm" style={{ color: 'var(--kc-text-2)' }}>
                {parentFullName(parents[0])}{' '}
                <span style={{ color: 'var(--kc-text-3)' }}>
                  ({relationshipLabel(parents[0].relationship)})
                </span>
                {parents.length > 1 && (
                  <span style={{ color: 'var(--kc-text-3)' }}> +{parents.length - 1}</span>
                )}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
