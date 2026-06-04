'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

import { useAuthStore } from '@/store/auth';
import { usePayrollRangeReport } from '@/lib/hooks/use-attendance';
import { getRangeExportUrl } from '@/lib/api/attendance';
import {
  PayrollReportView,
  ReportSkeleton,
} from '@/components/payroll/payroll-report-view';

/**
 * Date-range payroll report — "View Full Report" links here so a whole month
 * (or the current month to-date) can be shown across all of its periods.
 * Range is passed via query: ?from=&to=&label=&tone=&centerId=
 */
function RangeReportContent() {
  const sp = useSearchParams();
  const from = sp.get('from') ?? '';
  const to = sp.get('to') ?? '';
  const label = sp.get('label') ?? `${from} — ${to}`;
  const tone = sp.get('tone') === 'open' ? 'open' : 'approved';
  const centerId = sp.get('centerId') ?? undefined;
  const token = useAuthStore((s) => s.accessToken);

  const { data: report, isLoading } = usePayrollRangeReport(from, to, centerId);

  const download = (format: 'xlsx' | 'pdf') => {
    window.open(`${getRangeExportUrl(from, to, format, centerId)}&token=${token}`, '_blank');
  };

  if (isLoading) return <ReportSkeleton />;
  if (!report) return null;

  return (
    <PayrollReportView
      report={report}
      subtitle={label}
      statusLabel={tone === 'open' ? 'TO DATE' : 'FULL MONTH'}
      statusTone={tone}
      onDownload={download}
      byDay
    />
  );
}

export default function RangeReportPage() {
  return (
    <Suspense fallback={<ReportSkeleton />}>
      <RangeReportContent />
    </Suspense>
  );
}
