'use client';

import { CorrectionsView } from '@/components/attendance/corrections-view';

export default function DirectorCorrectionsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Corrections</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--kc-text-3)' }}>
          Review and manage staff correction requests
        </p>
      </div>

      <CorrectionsView />
    </div>
  );
}
