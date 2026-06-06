'use client';

import Link from 'next/link';
import { Baby, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

// `canCreate` shows the "+ New Child" CTA (Director/SA). Parents see the
// message without the action.
export function ChildrenEmptyState({ canCreate }: { canCreate?: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div
        className="flex h-20 w-20 items-center justify-center rounded-full"
        style={{ background: 'var(--kc-surface-2)' }}
      >
        <Baby className="h-10 w-10" style={{ color: 'var(--kc-text-4)' }} />
      </div>
      <h3 className="mt-4 font-display text-lg font-semibold">
        {canCreate ? 'No children yet' : 'No children'}
      </h3>
      <p className="mt-2 max-w-sm text-sm" style={{ color: 'var(--kc-text-3)' }}>
        {canCreate
          ? 'Add your first child to start managing enrollment, parents, and medical info.'
          : "You don't have any children linked to your account yet."}
      </p>
      {canCreate && (
        <Button asChild className="mt-6">
          <Link href="/children/new">
            <Plus className="mr-2 h-4 w-4" />
            New Child
          </Link>
        </Button>
      )}
    </div>
  );
}
