'use client';

import { useState } from 'react';
import {
  Loader2,
  Settings,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  usePayrollSettings,
  useUpsertPayrollSettings,
} from '@/lib/hooks/use-attendance';
import { PayrollReports } from '@/components/payroll/payroll-reports';
import { useRequireRole } from '@/lib/hooks/use-require-role';

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

// ============================================ main page

export default function PayrollPage() {
  // Defense-in-depth role gate (backend also enforces @Roles on every payroll
  // endpoint). STAFF/PARENT are bounced to /dashboard before any shell renders.
  const { ready, allowed } = useRequireRole(['DIRECTOR', 'SUPER_ADMIN']);
  const [showSettings, setShowSettings] = useState(false);

  if (!ready || !allowed) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Payroll</h1>
        </div>
        <Button variant="outline" onClick={() => setShowSettings(true)}>
          <Settings className="mr-2 h-4 w-4" /> Settings
        </Button>
      </div>

      <SettingsModal open={showSettings} onClose={() => setShowSettings(false)} />

      {/*
       * Full reporting UI: Overview tab (stats + charts + Custom Range Export +
       * Current Period + Previous Periods) + Team tab + Individual tab.
       * No centerId → scoped to the director's own center by the hook layer.
       */}
      <PayrollReports />
    </div>
  );
}
