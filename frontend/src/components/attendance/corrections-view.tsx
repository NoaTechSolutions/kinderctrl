'use client';

import { useState } from 'react';
import { CheckCircle, Loader2, XCircle, FileEdit } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useCenterCorrections,
  useApproveCorrection,
  useRejectCorrection,
} from '@/lib/hooks/use-attendance';
import type { CorrectionRequest } from '@/lib/api/attendance';

function fmtTime(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  PENDING: { bg: 'var(--kc-warning-bg)', color: 'var(--kc-warning)' },
  APPROVED: { bg: 'color-mix(in oklch, var(--kc-p-100), transparent 30%)', color: 'var(--kc-p-700)' },
  REJECTED: { bg: 'var(--kc-error-bg)', color: 'var(--kc-error)' },
};

function CorrectionCard({ c }: { c: CorrectionRequest }) {
  const approve = useApproveCorrection();
  const reject = useRejectCorrection();
  const [rejectComment, setRejectComment] = useState('');
  const [showReject, setShowReject] = useState(false);

  const s = STATUS_STYLE[c.status];
  const isPending = c.status === 'PENDING';

  const handleApprove = async () => {
    try {
      await approve.mutateAsync({ id: c.id, directorComment: 'Approved' });
      toast.success('Correction approved');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed');
    }
  };

  const handleReject = async () => {
    if (!rejectComment.trim()) {
      toast.error('Comment is required when rejecting');
      return;
    }
    try {
      await reject.mutateAsync({ id: c.id, directorComment: rejectComment });
      toast.success('Correction rejected');
      setShowReject(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed');
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-medium">
          {c.staff?.firstName} {c.staff?.lastName}
        </CardTitle>
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: 'var(--kc-text-3)' }}>
            {new Date(c.date).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
          </span>
          <Badge style={{ background: s.bg, color: s.color }}>{c.status}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-3 gap-1 text-xs font-medium" style={{ color: 'var(--kc-text-3)' }}>
          <span />
          <span>Original</span>
          <span>Requested</span>
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
                {fmtTime(orig)}
              </span>
              <span
                className="tabular-nums font-medium"
                style={{ color: changed ? 'var(--kc-p-600)' : 'var(--kc-text-2)' }}
              >
                {fmtTime(req)}
              </span>
            </div>
          );
        })}

        <p className="text-sm" style={{ color: 'var(--kc-text-2)' }}>
          <span className="font-medium">Staff comment: </span>{c.staffComment}
        </p>

        {isPending && (
          <div className="flex flex-wrap gap-2 pt-2">
            <Button size="sm" onClick={handleApprove} disabled={approve.isPending}>
              {approve.isPending ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
              )}
              Approve
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => setShowReject(!showReject)}
            >
              <XCircle className="mr-1.5 h-3.5 w-3.5" />
              Reject
            </Button>
          </div>
        )}

        {showReject && (
          <div className="space-y-2 pt-1">
            <textarea
              value={rejectComment}
              onChange={(e) => setRejectComment(e.target.value)}
              placeholder="Reason for rejection (required)..."
              rows={2}
              className="w-full rounded-md border px-3 py-2 text-sm"
              style={{
                borderColor: 'var(--kc-border)',
                background: 'var(--kc-bg)',
                color: 'var(--kc-text-1)',
              }}
            />
            <Button size="sm" variant="destructive" onClick={handleReject} disabled={reject.isPending}>
              {reject.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Confirm Reject
            </Button>
          </div>
        )}

        {c.directorComment && (
          <p className="text-sm" style={{ color: 'var(--kc-text-2)' }}>
            <span className="font-medium">Director: </span>{c.directorComment}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function CorrectionsView({ centerId }: { centerId?: string }) {
  const { data, isLoading } = useCenterCorrections(centerId);

  const pending = data?.filter((c) => c.status === 'PENDING') ?? [];
  const resolved = data?.filter((c) => c.status !== 'PENDING') ?? [];

  return (
    <div className="space-y-6">
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-lg" />
          ))}
        </div>
      ) : !data?.length ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileEdit className="mx-auto h-10 w-10 mb-3" style={{ color: 'var(--kc-text-3)' }} />
            <p className="text-sm" style={{ color: 'var(--kc-text-2)' }}>No correction requests</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {pending.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-medium" style={{ color: 'var(--kc-warning)' }}>
                Pending ({pending.length})
              </h2>
              {pending.map((c) => <CorrectionCard key={c.id} c={c} />)}
            </div>
          )}
          {resolved.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-medium" style={{ color: 'var(--kc-text-3)' }}>
                Resolved ({resolved.length})
              </h2>
              {resolved.map((c) => <CorrectionCard key={c.id} c={c} />)}
            </div>
          )}
        </>
      )}
    </div>
  );
}
