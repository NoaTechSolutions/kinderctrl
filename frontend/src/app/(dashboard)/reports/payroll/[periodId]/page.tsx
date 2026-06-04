'use client';

import { use } from 'react';

import { useAuthStore } from '@/store/auth';
import { usePayrollReport } from '@/lib/hooks/use-attendance';
import { getExportUrl } from '@/lib/api/attendance';
import {
  PayrollReportView,
  ReportSkeleton,
} from '@/components/payroll/payroll-report-view';

export default function FullReportPage({
  params,
}: {
  params: Promise<{ periodId: string }>;
}) {
  const { periodId } = use(params);
  const { data: report, isLoading } = usePayrollReport(periodId);
  const token = useAuthStore((s) => s.accessToken);

  const download = (format: 'xlsx' | 'pdf') => {
    window.open(`${getExportUrl(periodId, format)}?token=${token}`, '_blank');
  };

  if (isLoading) return <ReportSkeleton />;
  if (!report) return null;

  const tone =
    report.period.status === 'APPROVED' || report.period.status === 'EXPORTED'
      ? 'approved'
      : 'open';

  return (
    <PayrollReportView
      report={report}
      subtitle={`${report.period.startDate} — ${report.period.endDate}`}
      statusLabel={report.period.status}
      statusTone={tone}
      onDownload={download}
    />
  );
}
