'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle,
  Clock,
  DollarSign,
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  Plus,
  Settings,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { CardWithHeader } from '@/components/ui/card-with-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuthStore } from '@/store/auth';
import {
  usePayrollSettings,
  useUpsertPayrollSettings,
  usePayrollPeriods,
  useCreatePayrollPeriod,
  useApprovePayrollPeriod,
  usePayrollReport,
  useCenterCorrections,
} from '@/lib/hooks/use-attendance';
import { getExportUrl } from '@/lib/api/attendance';

// ============================================ settings modal

function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: settings } = usePayrollSettings();
  const upsert = useUpsertPayrollSettings();

  const [freq, setFreq] = useState(settings?.frequency ?? 'WEEKLY');
  const [breakPaid, setBreakPaid] = useState(settings?.breakPaid ?? false);
  const [dailyOT, setDailyOT] = useState(settings?.overtimeDailyThreshold ?? 8);
  const [weeklyOT, setWeeklyOT] = useState(settings?.overtimeWeeklyThreshold ?? 40);
  const [otRate, setOtRate] = useState(settings?.overtimeRate ?? 1.5);
  const [synced, setSynced] = useState(false);

  if (settings && !synced) {
    setFreq(settings.frequency);
    setBreakPaid(settings.breakPaid);
    setDailyOT(settings.overtimeDailyThreshold);
    setWeeklyOT(settings.overtimeWeeklyThreshold);
    setOtRate(settings.overtimeRate);
    setSynced(true);
  }

  const handleSave = async () => {
    try {
      await upsert.mutateAsync({
        frequency: freq,
        breakPaid,
        overtimeDailyThreshold: dailyOT,
        overtimeWeeklyThreshold: weeklyOT,
        overtimeRate: otRate,
      });
      toast.success('Payroll settings saved');
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed');
    }
  };

  const inputCls = 'mt-1 w-full h-9 rounded-md border px-3 text-sm';
  const inputStyle = { borderColor: 'var(--kc-border)', background: 'var(--kc-bg)', color: 'var(--kc-text-1)' };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" style={{ color: 'var(--kc-p-600)' }} />
            Payroll Settings
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <label className="text-sm font-medium" style={{ color: 'var(--kc-text-1)' }}>Payment Frequency</label>
            <select value={freq} onChange={(e) => setFreq(e.target.value as typeof freq)} className={inputCls} style={inputStyle}>
              <option value="WEEKLY">Weekly</option>
              <option value="BIWEEKLY">Biweekly</option>
              <option value="MONTHLY">Monthly</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium" style={{ color: 'var(--kc-text-1)' }}>Break Paid</label>
            <select value={breakPaid ? 'yes' : 'no'} onChange={(e) => setBreakPaid(e.target.value === 'yes')} className={inputCls} style={inputStyle}>
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium" style={{ color: 'var(--kc-text-1)' }}>Daily OT After (h)</label>
              <input type="number" value={dailyOT} onChange={(e) => setDailyOT(Number(e.target.value))} min={1} max={24} className={inputCls} style={inputStyle} />
            </div>
            <div>
              <label className="text-sm font-medium" style={{ color: 'var(--kc-text-1)' }}>Weekly OT After (h)</label>
              <input type="number" value={weeklyOT} onChange={(e) => setWeeklyOT(Number(e.target.value))} min={1} max={168} className={inputCls} style={inputStyle} />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium" style={{ color: 'var(--kc-text-1)' }}>Overtime Rate</label>
            <div className="flex items-center gap-2">
              <input type="number" value={otRate} onChange={(e) => setOtRate(Number(e.target.value))} step={0.1} min={1} max={5} className={inputCls} style={inputStyle} />
              <span className="text-sm" style={{ color: 'var(--kc-text-3)' }}>x regular rate</span>
            </div>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleSave} disabled={upsert.isPending}>
            {upsert.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Settings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================ stat card

function StatCard({ icon: Icon, label, value, color, href }: {
  icon: typeof Users;
  label: string;
  value: string;
  color: string;
  href?: string;
}) {
  const content = (
    <Card className={href ? 'cursor-pointer transition-colors' : ''}>
      <CardContent className="pt-4">
        <div className="flex items-center gap-2 mb-1">
          <Icon className="h-4 w-4" style={{ color }} />
          <span className="text-xs font-medium" style={{ color: 'var(--kc-text-3)' }}>{label}</span>
        </div>
        <p className="text-2xl font-display font-semibold tabular-nums" style={{ color }}>{value}</p>
      </CardContent>
    </Card>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

// ============================================ export dropdown

function ExportDropdown({ periodId }: { periodId: string }) {
  const token = useAuthStore((s) => s.accessToken);
  const download = (format: 'xlsx' | 'pdf') => {
    window.open(`${getExportUrl(periodId, format)}?token=${token}`, '_blank');
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="mr-1.5 h-3.5 w-3.5" /> Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={() => download('xlsx')}>
          <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel (.xlsx)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => download('pdf')}>
          <FileText className="mr-2 h-4 w-4" /> PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ============================================ main page

export default function PayrollDashboard() {
  const user = useAuthStore((s) => s.user);
  const { data: periods, isLoading: periodsLoading } = usePayrollPeriods();
  const { data: corrections } = useCenterCorrections();
  const createPeriod = useCreatePayrollPeriod();
  const approvePeriod = useApprovePayrollPeriod();

  const [showSettings, setShowSettings] = useState(false);
  const [showNewPeriod, setShowNewPeriod] = useState(false);
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [newStart, setNewStart] = useState('');
  const [newEnd, setNewEnd] = useState('');

  if (!user) return null;

  const currentPeriod = periods?.find((p) => p.status === 'OPEN');
  const previousPeriods = periods?.filter((p) => p.status !== 'OPEN') ?? [];
  const pendingCorrections = corrections?.filter((c) => c.status === 'PENDING').length ?? 0;

  const handleCreatePeriod = async () => {
    if (!newStart || !newEnd) { toast.error('Select dates'); return; }
    try {
      await createPeriod.mutateAsync({ startDate: newStart, endDate: newEnd });
      toast.success('Period created');
      setShowNewPeriod(false);
      setNewStart('');
      setNewEnd('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed');
    }
  };

  const handleApprove = async () => {
    if (!currentPeriod) return;
    try {
      await approvePeriod.mutateAsync(currentPeriod.id);
      toast.success('Period approved and locked');
      setShowApproveConfirm(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Payroll</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--kc-text-3)' }}>
            Manage pay periods, review hours, and export reports
          </p>
        </div>
        <Button variant="outline" onClick={() => setShowSettings(true)}>
          <Settings className="mr-2 h-4 w-4" /> Settings
        </Button>
      </div>

      {/* Current Period */}
      {currentPeriod ? (
        <CurrentPeriodSection
          period={currentPeriod}
          pendingCorrections={pendingCorrections}
          onApprove={() => setShowApproveConfirm(true)}
        />
      ) : (
        <Card>
          <CardContent className="py-8 text-center">
            <DollarSign className="mx-auto h-10 w-10 mb-3" style={{ color: 'var(--kc-text-3)' }} />
            <p className="text-sm" style={{ color: 'var(--kc-text-2)' }}>No open pay period</p>
            <p className="text-xs mt-1" style={{ color: 'var(--kc-text-3)' }}>Create one to start tracking payroll</p>
          </CardContent>
        </Card>
      )}

      {/* Previous Periods */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Previous Periods</CardTitle>
          {!currentPeriod && (
            <Button size="sm" onClick={() => setShowNewPeriod(true)}>
              <Plus className="mr-1.5 h-3.5 w-3.5" /> New Period
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {periodsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded" />
              ))}
            </div>
          ) : !previousPeriods.length ? (
            <p className="text-sm text-center py-4" style={{ color: 'var(--kc-text-3)' }}>No previous periods</p>
          ) : (
            <div className="space-y-2">
              {previousPeriods.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between py-2 px-3 rounded-lg"
                  style={{ background: 'var(--kc-surface-2)' }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm" style={{ color: 'var(--kc-text-1)' }}>
                      {p.startDate.split('T')[0]} — {p.endDate.split('T')[0]}
                    </span>
                    <Badge style={{ background: 'color-mix(in oklch, var(--kc-p-100), transparent 30%)', color: 'var(--kc-p-700)' }}>
                      {p.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/reports/payroll/${p.id}`}>View</Link>
                    </Button>
                    <ExportDropdown periodId={p.id} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <SettingsModal open={showSettings} onClose={() => setShowSettings(false)} />

      <Dialog open={showNewPeriod} onOpenChange={setShowNewPeriod}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Pay Period</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div>
              <label className="text-sm font-medium" style={{ color: 'var(--kc-text-1)' }}>Start Date</label>
              <input type="date" value={newStart} onChange={(e) => setNewStart(e.target.value)}
                className="mt-1 w-full h-9 rounded-md border px-3 text-sm"
                style={{ borderColor: 'var(--kc-border)', background: 'var(--kc-bg)', color: 'var(--kc-text-1)' }} />
            </div>
            <div>
              <label className="text-sm font-medium" style={{ color: 'var(--kc-text-1)' }}>End Date</label>
              <input type="date" value={newEnd} onChange={(e) => setNewEnd(e.target.value)}
                className="mt-1 w-full h-9 rounded-md border px-3 text-sm"
                style={{ borderColor: 'var(--kc-border)', background: 'var(--kc-bg)', color: 'var(--kc-text-1)' }} />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={handleCreatePeriod} disabled={createPeriod.isPending}>
              {createPeriod.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Period
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showApproveConfirm} onOpenChange={setShowApproveConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Pay Period?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingCorrections > 0
                ? `There are ${pendingCorrections} pending correction(s). Approving will lock this period. Continue?`
                : 'This will lock the period. No further changes will be possible.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleApprove}>Approve Period</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ============================================ current period section

function CurrentPeriodSection({ period, pendingCorrections, onApprove }: {
  period: { id: string; startDate: string; endDate: string; status: string };
  pendingCorrections: number;
  onApprove: () => void;
}) {
  const { data: report, isLoading } = usePayrollReport(period.id);

  const totalStaff = report?.staff.length ?? 0;
  const totalHours = report ? report.totals.regularHours + report.totals.overtimeHours : 0;
  const totalPay = report?.totals.totalPay ?? 0;
  const otHours = report?.totals.overtimeHours ?? 0;

  const fmtHours = (h: number) => {
    const hrs = Math.floor(h);
    const mins = Math.round((h - hrs) * 60);
    return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
  };

  return (
    <CardWithHeader
      icon={CalendarDays}
      title="Current Period"
      action={
        <Badge style={{ background: 'var(--kc-warning-bg)', color: 'var(--kc-warning)' }}>OPEN</Badge>
      }
      contentClassName="space-y-4"
    >
      <p className="text-sm" style={{ color: 'var(--kc-text-2)' }}>
        {period.startDate.split('T')[0]} — {period.endDate.split('T')[0]}
      </p>
      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
              <StatCard icon={Users} label="Total Staff" value={String(totalStaff)} color="var(--kc-p-600)" />
              <StatCard icon={Clock} label="Total Hours" value={fmtHours(totalHours)} color="var(--kc-p-600)" />
              <StatCard icon={DollarSign} label="Total Pay" value={`$${totalPay.toFixed(2)}`} color="var(--kc-p-600)" />
              <StatCard icon={Clock} label="OT Hours" value={fmtHours(otHours)} color="var(--kc-warning)" />
              <StatCard
                icon={AlertTriangle}
                label="Pending Corrections"
                value={String(pendingCorrections)}
                color={pendingCorrections > 0 ? 'var(--kc-error)' : 'var(--kc-text-3)'}
                href="/attendance/corrections"
              />
            </div>
          <div className="flex gap-3">
            <Button asChild>
              <Link href={`/reports/payroll/${period.id}`}>View Full Report</Link>
            </Button>
            <Button variant="outline" onClick={onApprove}>
              <CheckCircle className="mr-2 h-4 w-4" /> Approve Period
            </Button>
          </div>
        </>
      )}
    </CardWithHeader>
  );
}
