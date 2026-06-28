'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Activity,
  AlertTriangle,
  Clock,
  Eye,
  EyeOff,
  Loader2,
  Mail,
  Play,
  Settings,
  TabletSmartphone,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { ReadCard } from '@/components/ui/section-frame';
import { Button } from '@/components/ui/button';
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
  useKioskSettings,
  useKioskActivity,
  useSetupKiosk,
  useActivateKiosk,
  useResetKioskPin,
} from '@/lib/hooks/use-kiosk';
import { useKioskLaunch } from '@/lib/hooks/use-kiosk-launch';
import { CompactStatCard } from '@/components/ui/compact-stat-card';
import { useAuthStore } from '@/store/auth';
import { KioskSettingsSkeleton } from '@/components/skeletons/kiosk-skeleton';
import { getPendingCount } from '@/lib/kiosk/offline-store';

const TIMEOUT_OPTIONS = [1, 2, 3, 5, 10];

const PUNCH_TYPE_LABELS: Record<string, string> = {
  CLOCK_IN: 'Clock In',
  BREAK_IN: 'Break Start',
  BREAK_OUT: 'Break End',
  CLOCK_OUT: 'Clock Out',
};

const PUNCH_TYPE_COLORS: Record<string, string> = {
  CLOCK_IN: '#22c55e',
  BREAK_IN: '#f59e0b',
  BREAK_OUT: '#22c55e',
  CLOCK_OUT: '#3b82f6',
};

const inputCls = 'h-9 rounded-md border px-3 text-sm w-full';
const inputStyle = { borderColor: 'var(--kc-border)', background: 'var(--kc-bg)', color: 'var(--kc-text-1)' } as const;

export default function KioskSettingsPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { data: settings, isLoading: settingsLoading } = useKioskSettings();
  const { data: activity } = useKioskActivity();
  const setupMutation = useSetupKiosk();
  const activate = useActivateKiosk();
  const resetPinMutation = useResetKioskPin();
  // Shared launch flow (activate + token + spinner + "set up PIN first"
  // fallback) — same hook the dashboard uses, so they never drift.
  const { launching, launchKiosk } = useKioskLaunch();

  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  // PIN modal state
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [timeoutMin, setTimeoutMin] = useState(2);
  const [showNewPin, setShowNewPin] = useState(false);

  // Launch state
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  // Lock banner — surfaced after a kiosk lockout redirects back here.
  const [lockedBanner, setLockedBanner] = useState<string | null>(null);

  const isConfigured = !!settings?.id;
  const isEnabled = settings?.isEnabled ?? false;

  useEffect(() => {
    const locked = sessionStorage.getItem('kc-kiosk-locked');
    if (locked) {
      setLockedBanner(locked);
      sessionStorage.removeItem('kc-kiosk-locked');
    }
  }, []);

  useEffect(() => {
    if (settings?.timeoutMin) setTimeoutMin(settings.timeoutMin);
  }, [settings?.timeoutMin]);

  useEffect(() => {
    getPendingCount().then(setPendingSyncCount).catch(() => {});
    const interval = setInterval(() => {
      getPendingCount().then(setPendingSyncCount).catch(() => {});
    }, 10_000);
    return () => clearInterval(interval);
  }, []);

  const openPinModal = () => {
    setNewPin('');
    setConfirmPin('');
    setShowNewPin(false);
    if (settings?.timeoutMin) setTimeoutMin(settings.timeoutMin);
    setPinModalOpen(true);
  };

  const handleSavePin = async () => {
    if (newPin.length < 4 || newPin.length > 6) { toast.error('PIN must be 4-6 digits'); return; }
    if (newPin !== confirmPin) { toast.error('PINs do not match'); return; }
    try {
      await setupMutation.mutateAsync({ pin: newPin, timeoutMin });
      toast.success(isConfigured ? 'PIN updated' : 'Kiosk configured');
      setPinModalOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed');
    }
  };

  const handleResetPin = async () => {
    try {
      await resetPinMutation.mutateAsync();
      setResetConfirmOpen(false);
      setPinModalOpen(false);
      toast.success('PIN reset — kiosk deactivated. Set a new PIN.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed');
    }
  };

  // Launch the kiosk directly — no PIN required (PIN is only used to exit).
  const handleLaunch = async () => {
    try {
      const result = await activate.mutateAsync();
      sessionStorage.setItem('kc-kiosk-token', result.kioskSessionToken);
      sessionStorage.setItem('kc-kiosk-timeout', String(result.timeoutMin));
      router.push('/kiosk');
    } catch {
      toast.error('Could not launch kiosk');
    }
  };

  if (settingsLoading) {
    return <KioskSettingsSkeleton />;
  }

  const lastActivityStr = activity?.lastActivity
    ? new Date(activity.lastActivity).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    : '—';

  const statsCards = [
    { label: 'Punches Today', value: String(activity?.todayCount ?? 0), icon: Activity, color: 'var(--kc-p-600)' },
    { label: 'Pending Sync', value: pendingSyncCount > 0 ? `${pendingSyncCount} pending` : 'All synced', icon: AlertTriangle, color: pendingSyncCount > 0 ? '#f59e0b' : '#22c55e' },
    { label: 'Last Activity', value: lastActivityStr, icon: Clock, color: 'var(--kc-text-3)' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Kiosk</h1>
        </div>
        {/* PIN Settings — desktop only (lg+). Tablet/mobile use the row below. */}
        <Button variant="outline" size="sm" className="hidden lg:inline-flex" onClick={openPinModal}>
          <Settings className="mr-1.5 h-3.5 w-3.5" /> PIN Settings
        </Button>
      </div>

      {/* Launch + PIN Settings row under the title.
          - Phones (<sm): full-width 2-col grid.
          - Tablet (sm–lg): inline flex row, content-width buttons (proportional,
            not full-width). Verified at 768px / 1024px.
          - Desktop (lg+): hidden — header PIN button + Launch card take over.
          Launch reuses the shared useKioskLaunch flow; PIN Settings opens the
          existing config modal. */}
      <div className="grid grid-cols-2 gap-3 sm:flex lg:hidden">
        <Button onClick={launchKiosk} disabled={launching}>
          {launching ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Play className="mr-2 h-4 w-4 fill-current" />
          )}
          Launch Kiosk
        </Button>
        <Button variant="outline" onClick={openPinModal}>
          <Settings className="mr-2 h-4 w-4" /> PIN Settings
        </Button>
      </div>

      {/* Lockout warning banner */}
      {lockedBanner && (
        <div
          className="flex items-start gap-3 rounded-lg border p-4"
          style={{ background: '#f59e0b1A', borderColor: 'color-mix(in srgb, #f59e0b 40%, transparent)' }}
        >
          <AlertTriangle className="h-5 w-5 flex-none mt-0.5" style={{ color: '#f59e0b' }} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium" style={{ color: 'var(--kc-text-1)' }}>
              Kiosk was locked
            </p>
            <p className="text-sm mt-0.5" style={{ color: 'var(--kc-text-2)' }}>
              Too many incorrect PIN attempts. The kiosk has been disabled and a reset link was sent to{' '}
              <strong>{lockedBanner}</strong>. Set a new PIN to re-enable it.
            </p>
          </div>
          <button type="button" onClick={() => setLockedBanner(null)} className="text-xs flex-none" style={{ color: 'var(--kc-text-3)' }}>
            Dismiss
          </button>
        </div>
      )}

      {/* Empty state when no PIN configured */}
      {!isConfigured ? (
        <div className="flex flex-col items-center justify-center py-20">
          <TabletSmartphone className="h-12 w-12 mb-4" style={{ color: 'var(--kc-text-3)' }} />
          <h2 className="text-lg font-semibold" style={{ color: 'var(--kc-text-1)' }}>
            Kiosk Mode Not Configured
          </h2>
          <p className="text-sm mt-1 max-w-sm text-center" style={{ color: 'var(--kc-text-3)' }}>
            Set up a PIN to enable kiosk mode for your center. Staff will be able to clock in and out from a shared device.
          </p>
          <Button className="mt-6" onClick={openPinModal}>
            <Settings className="mr-2 h-4 w-4" /> Set up Kiosk PIN
          </Button>
        </div>
      ) : (
        <>
          {/* Stats Cards — phones: compact 3-in-a-row (shared CompactStatCard,
              h-20) so they fit even ~320px without stretching; desktop keeps
              the original horizontal cards unchanged. */}
          <div className="grid grid-cols-3 gap-2 sm:hidden">
            {statsCards.map((card) => (
              <CompactStatCard
                key={card.label}
                icon={card.icon}
                iconColor={card.color}
                label={card.label}
                value={card.value}
              />
            ))}
          </div>
          <div className="hidden gap-3 sm:grid sm:grid-cols-3">
            {statsCards.map((card) => {
              const Icon = card.icon;
              return (
                <Card key={card.label}>
                  <CardContent className="py-3 px-4 flex flex-col items-center gap-2 text-center">
                    <div className="p-2 rounded-lg" style={{ background: card.color + '1A' }}>
                      <Icon className="h-4 w-4" style={{ color: card.color }} />
                    </div>
                    <div className="w-full min-w-0">
                      <p className="text-[11px] font-medium uppercase tracking-wide" style={{ color: 'var(--kc-text-3)' }}>{card.label}</p>
                      <p className="text-sm font-semibold truncate" style={{ color: 'var(--kc-text-1)' }}>{card.value}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Launch Card — desktop only (lg+). Mobile + tablet use the 2-button
              row under the title; desktop (lg+) is unchanged. */}
          <div className="hidden lg:block">
            <ReadCard title="Kiosk">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: isEnabled ? '#22c55e' : 'var(--kc-text-3)' }} />
                    <span className="text-sm font-semibold" style={{ color: 'var(--kc-text-1)' }}>
                      {isEnabled ? 'Kiosk is active' : 'Kiosk is inactive'}
                    </span>
                  </div>
                  <p className="text-xs" style={{ color: 'var(--kc-text-3)' }}>
                    Launch the fullscreen kiosk. You&apos;ll need the PIN to exit.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleLaunch} disabled={activate.isPending} className="h-10">
                    {activate.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4 fill-current" />}
                    Launch Kiosk
                  </Button>
                </div>
              </div>
            </ReadCard>
          </div>

          {/* Recent Activity */}
          <ReadCard icon={Activity} title="Recent Activity">
            {!activity?.entries.length ? (
              <p className="text-sm py-4 text-center" style={{ color: 'var(--kc-text-3)' }}>No kiosk activity yet</p>
            ) : (
              <div className="space-y-1.5">
                {activity.entries.slice(0, 10).map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between py-1.5 px-2 rounded-md"
                    style={{ background: 'var(--kc-surface-2)' }}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-1.5 h-1.5 rounded-full flex-none" style={{ background: PUNCH_TYPE_COLORS[entry.type] ?? 'var(--kc-text-3)' }} />
                      <span className="text-sm truncate" style={{ color: 'var(--kc-text-1)' }}>{entry.staffName}</span>
                      <span className="text-xs flex-none" style={{ color: PUNCH_TYPE_COLORS[entry.type] ?? 'var(--kc-text-3)' }}>
                        {PUNCH_TYPE_LABELS[entry.type] ?? entry.type}
                      </span>
                    </div>
                    <span className="text-xs tabular-nums flex-none ml-3" style={{ color: 'var(--kc-text-3)' }}>
                      {new Date(entry.deviceTimestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </ReadCard>
        </>
      )}

      {/* PIN Settings Modal */}
      {pinModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div
            className="rounded-xl shadow-xl w-[400px] max-h-[90vh] overflow-y-auto"
            style={{ background: 'var(--kc-bg)', border: '1px solid var(--kc-border)' }}
          >
            <div className="p-5 border-b" style={{ borderColor: 'var(--kc-border)' }}>
              <h3 className="text-lg font-semibold" style={{ color: 'var(--kc-text-1)' }}>
                {isConfigured ? 'PIN Settings' : 'Set up Kiosk PIN'}
              </h3>
              <p className="text-xs mt-0.5" style={{ color: 'var(--kc-text-3)' }}>
                {isConfigured ? 'Change your kiosk PIN or reset it.' : 'Create a 4-6 digit PIN to secure the kiosk.'}
              </p>
            </div>

            <div className="p-5 space-y-4">
              {/* New PIN fields */}
              <div>
                <label className="text-xs font-medium" style={{ color: 'var(--kc-text-3)' }}>
                  {isConfigured ? 'New PIN' : 'PIN'} (4-6 digits)
                </label>
                <div className="relative mt-1">
                  <input
                    type={showNewPin ? 'text' : 'password'}
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    maxLength={6}
                    placeholder="••••"
                    className={inputCls}
                    style={inputStyle}
                    autoFocus
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2"
                    onClick={() => setShowNewPin(!showNewPin)}
                  >
                    {showNewPin ? <EyeOff className="h-4 w-4" style={{ color: 'var(--kc-text-3)' }} /> : <Eye className="h-4 w-4" style={{ color: 'var(--kc-text-3)' }} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium" style={{ color: 'var(--kc-text-3)' }}>Confirm PIN</label>
                <input
                  type="password"
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                  placeholder="••••"
                  className={inputCls + ' mt-1'}
                  style={inputStyle}
                />
              </div>

              {/* Timeout selector */}
              <div>
                <label className="text-xs font-medium" style={{ color: 'var(--kc-text-3)' }}>Inactivity Timeout</label>
                <div className="flex gap-1.5 mt-1.5">
                  {TIMEOUT_OPTIONS.map((t) => (
                    <button
                      key={t}
                      type="button"
                      className="flex-1 py-1.5 rounded-md text-xs font-medium transition-colors text-center"
                      style={{
                        border: timeoutMin === t ? '2px solid var(--kc-p-600)' : '1px solid var(--kc-border)',
                        background: timeoutMin === t ? 'color-mix(in srgb, var(--kc-p-600) 10%, transparent)' : 'var(--kc-bg)',
                        color: timeoutMin === t ? 'var(--kc-p-600)' : 'var(--kc-text-2)',
                        padding: timeoutMin === t ? '5px 0' : '6px 0',
                      }}
                      onClick={() => setTimeoutMin(t)}
                    >
                      {t} min
                    </button>
                  ))}
                </div>
              </div>

              {/* Save button */}
              <Button
                className="w-full"
                onClick={handleSavePin}
                disabled={setupMutation.isPending || newPin.length < 4 || !confirmPin}
              >
                {setupMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isConfigured ? 'Update PIN' : 'Save PIN'}
              </Button>

              {/* Forgot PIN section — only when configured */}
              {isConfigured && (
                <>
                  <div className="border-t pt-4 mt-4" style={{ borderColor: 'var(--kc-border)' }}>
                    <p className="text-xs font-medium" style={{ color: 'var(--kc-text-3)' }}>Forgot your PIN?</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2 w-full"
                      onClick={() => setResetConfirmOpen(true)}
                    >
                      <Mail className="mr-1.5 h-3.5 w-3.5" /> Send reset link to {user?.email ?? 'director'}
                    </Button>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="p-5 border-t flex justify-end" style={{ borderColor: 'var(--kc-border)' }}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPinModalOpen(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Reset PIN Confirmation Dialog */}
      <AlertDialog open={resetConfirmOpen} onOpenChange={setResetConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Kiosk PIN?</AlertDialogTitle>
            <AlertDialogDescription>
              This will disable the kiosk and send a reset link to <strong>{user?.email}</strong>.
              The kiosk will remain disabled until a new PIN is set.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleResetPin}>
              {resetPinMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Reset PIN
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
