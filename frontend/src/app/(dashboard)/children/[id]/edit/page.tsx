'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Edit } from 'lucide-react';
import { useRequireRole } from '@/lib/hooks/use-require-role';
import { Button } from '@/components/ui/button';

// Placeholder — the edit form ships in Etapa 3. The backend PATCH endpoints
// (child / medical / parent links) are already live.
export default function EditChildPage() {
  const { ready, allowed } = useRequireRole(['DIRECTOR', 'SUPER_ADMIN']);
  const params = useParams<{ id: string }>();
  const id = params?.id;

  if (!ready || !allowed) return null;

  return (
    <div className="max-w-2xl space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href={id ? `/children/${id}` : '/children'}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back
        </Link>
      </Button>

      <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight">
        Edit Child
      </h1>

      <div
        className="flex flex-col items-center justify-center rounded-lg border py-16 text-center"
        style={{ borderColor: 'var(--kc-border)' }}
      >
        <div
          className="flex h-16 w-16 items-center justify-center rounded-full"
          style={{ background: 'var(--kc-surface-2)' }}
        >
          <Edit className="h-7 w-7" style={{ color: 'var(--kc-text-4)' }} />
        </div>
        <p className="mt-4 text-sm font-medium" style={{ color: 'var(--kc-text-2)' }}>
          The edit form is coming next (Etapa 3).
        </p>
        <p className="mt-1 text-xs" style={{ color: 'var(--kc-text-3)' }}>
          The backend update endpoints are already live.
        </p>
      </div>
    </div>
  );
}
