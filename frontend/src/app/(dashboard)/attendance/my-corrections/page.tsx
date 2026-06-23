'use client';

import { FileEdit } from 'lucide-react';
import { useTimeFormat } from '@/lib/preferences/time-format';
import { formatTime } from '@/lib/format-time';
import { useTranslation } from '@/lib/i18n';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useMyCorrections } from '@/lib/hooks/use-attendance';
import type { CorrectionRequest } from '@/lib/api/attendance';

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  PENDING: { bg: 'var(--kc-warning-bg)', color: 'var(--kc-warning)' },
  APPROVED: { bg: 'color-mix(in oklch, var(--kc-p-100), transparent 30%)', color: 'var(--kc-p-700)' },
  REJECTED: { bg: 'var(--kc-error-bg)', color: 'var(--kc-error)' },
};

// Punch fields, paired with their i18n key suffix. The data columns are
// `original${key}` / `requested${key}` (e.g. originalClockIn); the label
// comes from attendance.myCorrections.fields.${i18n}.
const FIELDS = [
  { key: 'ClockIn', i18n: 'clockIn' },
  { key: 'BreakIn', i18n: 'breakIn' },
  { key: 'BreakOut', i18n: 'breakOut' },
  { key: 'ClockOut', i18n: 'clockOut' },
] as const;

function CorrectionRow({ c, tf }: { c: CorrectionRequest; tf: '12h' | '24h' }) {
  const { t } = useTranslation();
  const s = STATUS_STYLE[c.status];
  return (
    <Card>
      <CardContent className="pt-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium" style={{ color: 'var(--kc-text-1)' }}>
            {new Date(c.date).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
          </span>
          <Badge style={{ background: s.bg, color: s.color }}>
            {t(`attendance.myCorrections.status.${c.status}`)}
          </Badge>
        </div>

        {/* Punch times. Mobile (<sm): field label on its own line, then the
            Original / Requested values as two roomy columns with inline
            mini-headers. sm+: a single header row with the three values
            inline and right-aligned (the table reads top-down). */}
        <div className="space-y-2">
          <div
            className="hidden gap-x-3 text-xs font-medium sm:grid sm:grid-cols-[1fr_auto_auto]"
            style={{ color: 'var(--kc-text-3)' }}
          >
            <span />
            <span className="text-right">{t('attendance.myCorrections.original')}</span>
            <span className="text-right">{t('attendance.myCorrections.requested')}</span>
          </div>

          {FIELDS.map((f) => {
            const orig = c[`original${f.key}` as keyof CorrectionRequest] as string | null;
            const req = c[`requested${f.key}` as keyof CorrectionRequest] as string | null;
            const changed = orig !== req;
            return (
              <div
                key={f.key}
                className="grid grid-cols-2 items-baseline gap-x-3 gap-y-1 sm:grid-cols-[1fr_auto_auto]"
              >
                <span
                  className="col-span-2 text-xs font-medium sm:col-span-1 sm:text-sm"
                  style={{ color: 'var(--kc-text-2)' }}
                >
                  {t(`attendance.myCorrections.fields.${f.i18n}`)}
                </span>
                <span
                  className="flex flex-col tabular-nums text-sm sm:block sm:text-right"
                  style={{ color: 'var(--kc-text-3)' }}
                >
                  <span className="text-[10px] font-medium uppercase tracking-wide sm:hidden">
                    {t('attendance.myCorrections.original')}
                  </span>
                  {formatTime(orig, tf)}
                </span>
                <span
                  className="flex flex-col tabular-nums text-sm font-medium sm:block sm:text-right"
                  style={{ color: changed ? 'var(--kc-p-600)' : 'var(--kc-text-2)' }}
                >
                  <span
                    className="text-[10px] font-medium uppercase tracking-wide sm:hidden"
                    style={{ color: 'var(--kc-text-3)' }}
                  >
                    {t('attendance.myCorrections.requested')}
                  </span>
                  {formatTime(req, tf)}
                </span>
              </div>
            );
          })}
        </div>

        <p className="text-sm" style={{ color: 'var(--kc-text-2)' }}>
          <span className="font-medium">{t('attendance.myCorrections.you')} </span>
          {c.staffComment}
        </p>
        {c.directorComment && (
          <p className="text-sm" style={{ color: 'var(--kc-text-2)' }}>
            <span className="font-medium">{t('attendance.myCorrections.director')} </span>
            {c.directorComment}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default function MyCorrectionsPage() {
  const { data, isLoading } = useMyCorrections();
  const { timeFormat: tf } = useTimeFormat();
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">
          {t('attendance.myCorrections.title')}
        </h1>
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
            <p className="text-sm" style={{ color: 'var(--kc-text-2)' }}>
              {t('attendance.myCorrections.empty')}
            </p>
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
