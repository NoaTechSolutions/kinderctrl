'use client';

import { FileEdit } from 'lucide-react';
import { useTimeFormat } from '@/lib/preferences/time-format';
import { formatTime } from '@/lib/format-time';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useMyCorrections } from '@/lib/hooks/use-attendance';
import type { CorrectionRequest } from '@/lib/api/attendance';

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  PENDING: { bg: 'var(--kc-warning-bg)', color: 'var(--kc-warning)' },
  APPROVED: { bg: 'color-mix(in oklch, var(--kc-p-100), transparent 30%)', color: 'var(--kc-p-700)' },
  REJECTED: { bg: 'var(--kc-error-bg)', color: 'var(--kc-error)' },
};

function CorrectionRow({ c, tf }: { c: CorrectionRequest; tf: '12h' | '24h' }) {
  const s = STATUS_STYLE[c.status];
  return (
    <Card>
      <CardContent className="pt-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium" style={{ color: 'var(--kc-text-1)' }}>
            {new Date(c.date).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
          </span>
          <Badge style={{ background: s.bg, color: s.color }}>{c.status}</Badge>
        </div>

        <div className="grid grid-cols-3 gap-1 text-xs" style={{ color: 'var(--kc-text-3)' }}>
          <span />
          <span className="font-medium">Original</span>
          <span className="font-medium">Requested</span>
        </div>
        {(['ClockIn', 'BreakIn', 'BreakOut', 'ClockOut'] as const).map((field) => {
          const orig = c[`original${field}` as keyof CorrectionRequest] as string | null;
          const req = c[`requested${field}` as keyof CorrectionRequest] as string | null;
          const changed = orig !== req;
          return (
            <div key={field} className="grid grid-cols-3 gap-1 text-sm">
              <span style={{ color: 'var(--kc-text-2)' }}>
                {field.replace(/([A-Z])/g, ' $1').trim()}
              </span>
              <span className="tabular-nums" style={{ color: 'var(--kc-text-3)' }}>
                {formatTime(orig, tf)}
              </span>
              <span
                className="tabular-nums font-medium"
                style={{ color: changed ? 'var(--kc-p-600)' : 'var(--kc-text-2)' }}
              >
                {formatTime(req, tf)}
              </span>
            </div>
          );
        })}

        <p className="text-sm" style={{ color: 'var(--kc-text-2)' }}>
          <span className="font-medium">You: </span>{c.staffComment}
        </p>
        {c.directorComment && (
          <p className="text-sm" style={{ color: 'var(--kc-text-2)' }}>
            <span className="font-medium">Director: </span>{c.directorComment}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default function MyCorrectionsPage() {
  const { data, isLoading } = useMyCorrections();
  const { timeFormat: tf } = useTimeFormat();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">My Corrections</h1>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-lg" />
          ))}
        </div>
      ) : !data?.length ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileEdit className="mx-auto h-10 w-10 mb-3" style={{ color: 'var(--kc-text-3)' }} />
            <p className="text-sm" style={{ color: 'var(--kc-text-2)' }}>No corrections submitted</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {data.map((c) => <CorrectionRow key={c.id} c={c} tf={tf} />)}
        </div>
      )}
    </div>
  );
}
