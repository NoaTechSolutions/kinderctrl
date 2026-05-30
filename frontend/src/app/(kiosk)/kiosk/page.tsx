'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Baby,
  CalendarClock,
  Clock,
  Coffee,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  LogOut,
  Play,
  Square,
  Timer,
  Users,
  WifiOff,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
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
  getKioskStaff,
  kioskPunch,
  verifyKioskPin,
  requestKioskReset,
  KioskPinError,
  type KioskStaff,
  type KioskPunchResponse,
} from '@/lib/api/kiosk';
import {
  savePunchOffline,
  getPendingCount,
  cleanupOldPunches,
} from '@/lib/kiosk/offline-store';
import { syncPendingPunches } from '@/lib/kiosk/sync-engine';
import { KioskSkeleton } from '@/components/skeletons/kiosk-skeleton';

type Screen = 'home' | 'staff' | 'punch' | 'success' | 'exit' | 'locked';

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  NOT_IN: { label: 'Not In', bg: 'var(--kc-text-3)', color: 'white' },
  CLOCKED_IN: { label: 'Working', bg: '#22c55e', color: 'white' },
  ON_BREAK: { label: 'On Break', bg: '#f59e0b', color: 'white' },
  CLOCKED_OUT: { label: 'Done', bg: '#3b82f6', color: 'white' },
};

function getStaffStatus(s: KioskStaff): string {
  if (s.shiftStatus.clockedOut) return 'CLOCKED_OUT';
  if (s.shiftStatus.onBreak) return 'ON_BREAK';
  if (s.shiftStatus.clockedIn) return 'CLOCKED_IN';
  return 'NOT_IN';
}

const PUNCH_LABELS: Record<string, { label: string; icon: typeof Clock; color: string }> = {
  CLOCK_IN: { label: 'Clock In', icon: Play, color: '#22c55e' },
  BREAK_IN: { label: 'Start Break', icon: Coffee, color: '#f59e0b' },
  BREAK_OUT: { label: 'End Break', icon: Play, color: '#22c55e' },
  CLOCK_OUT: { label: 'Clock Out', icon: Square, color: '#3b82f6' },
};

function centerInitials(name: string): string {
  return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || 'KC';
}

function formatTime(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

function formatWorked(min: number): string {
  if (min <= 0) return '—';
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h === 0 ? `${m}m` : `${h}h ${m}m`;
}

export default function KioskPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [timeoutMin, setTimeoutMin] = useState(2);
  const [centerName, setCenterName] = useState('');
  const [staff, setStaff] = useState<KioskStaff[]>([]);
  const [loading, setLoading] = useState(true);
  const [screen, setScreen] = useState<Screen>('home');
  const [selectedStaff, setSelectedStaff] = useState<KioskStaff | null>(null);
  const [punching, setPunching] = useState(false);
  const [lastPunch, setLastPunch] = useState<KioskPunchResponse | null>(null);
  const [lastPunchType, setLastPunchType] = useState<string>('');
  const [savedOffline, setSavedOffline] = useState(false);
  const [exitPin, setExitPin] = useState('');
  const [showExitPin, setShowExitPin] = useState(false);
  const [exitError, setExitError] = useState('');
  const [lockEmail, setLockEmail] = useState<string | null>(null);
  const [directorEmail, setDirectorEmail] = useState<string | null>(null);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [resetSentEmail, setResetSentEmail] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const [online, setOnline] = useState(true);
  const [now, setNow] = useState(new Date());
  const [pendingCount, setPendingCount] = useState(0);
  const [syncToast, setSyncToast] = useState<string | null>(null);

  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoReturnTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Init: read token from sessionStorage ──
  useEffect(() => {
    const t = sessionStorage.getItem('kc-kiosk-token');
    const tm = sessionStorage.getItem('kc-kiosk-timeout');
    if (!t) { router.replace('/kiosk-settings'); return; }
    setToken(t);
    if (tm) setTimeoutMin(parseInt(tm, 10) || 2);
  }, [router]);

  // ── Clock tick ──
  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(tick);
  }, []);

  // ── Online/Offline detection ──
  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    setOnline(navigator.onLine);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => { window.removeEventListener('online', goOnline); window.removeEventListener('offline', goOffline); };
  }, []);

  // ── Refresh pending count ──
  const refreshPendingCount = useCallback(async () => {
    try { setPendingCount(await getPendingCount()); } catch { /* noop */ }
  }, []);

  useEffect(() => { refreshPendingCount(); }, [refreshPendingCount]);

  // ── Fetch staff list ──
  const fetchStaff = useCallback(async () => {
    if (!token) return;
    try {
      const data = await getKioskStaff(token);
      setStaff(data.staff);
      setCenterName(data.center.name);
      setDirectorEmail(data.center.directorEmail);
    } catch {
      // token might be invalid or offline
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchStaff(); }, [fetchStaff]);

  useEffect(() => {
    if (!token) return;
    const interval = setInterval(fetchStaff, 30_000);
    return () => clearInterval(interval);
  }, [token, fetchStaff]);

  // ── Sync on reconnect ──
  useEffect(() => {
    if (!online || !token) return;
    let cancelled = false;
    (async () => {
      const count = await getPendingCount();
      if (count === 0 || cancelled) return;
      const result = await syncPendingPunches(token);
      if (cancelled) return;
      if (result.synced > 0) {
        setSyncToast(`${result.synced} punch${result.synced > 1 ? 'es' : ''} synced successfully`);
        setTimeout(() => setSyncToast(null), 4000);
        fetchStaff();
      }
      refreshPendingCount();
    })();
    return () => { cancelled = true; };
  }, [online, token]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Cleanup old punches daily ──
  useEffect(() => {
    cleanupOldPunches();
    const interval = setInterval(cleanupOldPunches, 86_400_000);
    return () => clearInterval(interval);
  }, []);

  // ── Inactivity timeout → back to home ──
  const resetInactivity = useCallback(() => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    inactivityTimer.current = setTimeout(() => {
      setScreen((cur) => (cur === 'locked' ? cur : 'home'));
      setSelectedStaff(null);
    }, timeoutMin * 60_000);
  }, [timeoutMin]);

  useEffect(() => {
    const handler = () => resetInactivity();
    window.addEventListener('pointerdown', handler);
    window.addEventListener('pointermove', handler);
    resetInactivity();
    return () => {
      window.removeEventListener('pointerdown', handler);
      window.removeEventListener('pointermove', handler);
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    };
  }, [resetInactivity]);

  // ── Handlers ──

  const handleSelectStaff = (s: KioskStaff) => {
    setSelectedStaff(s);
    setScreen('punch');
    setLastPunch(null);
    setSavedOffline(false);
  };

  const scheduleAutoReturn = () => {
    autoReturnTimer.current = setTimeout(() => {
      setScreen('staff');
      setSelectedStaff(null);
    }, 3000);
  };

  const handlePunch = async (type: string) => {
    if (!token || !selectedStaff) return;
    setPunching(true);
    setLastPunchType(type);
    const timestamp = new Date().toISOString();

    if (!navigator.onLine) {
      await savePunchOffline({
        staffId: selectedStaff.id,
        staffName: `${selectedStaff.firstName} ${selectedStaff.lastName}`,
        type, deviceTimestamp: timestamp, centerId: '',
      });
      setSavedOffline(true);
      setScreen('success');
      refreshPendingCount();
      scheduleAutoReturn();
      setPunching(false);
      return;
    }

    try {
      const result = await kioskPunch(token, { staffId: selectedStaff.id, type, deviceTimestamp: timestamp });
      setLastPunch(result);
      setSavedOffline(false);
      setScreen('success');
      fetchStaff();
      scheduleAutoReturn();
    } catch {
      await savePunchOffline({
        staffId: selectedStaff.id,
        staffName: `${selectedStaff.firstName} ${selectedStaff.lastName}`,
        type, deviceTimestamp: timestamp, centerId: '',
      });
      setSavedOffline(true);
      setScreen('success');
      refreshPendingCount();
      scheduleAutoReturn();
    } finally {
      setPunching(false);
    }
  };

  const handleExit = () => {
    setScreen('exit');
    setExitPin('');
    setExitError('');
  };

  const handleExitConfirm = async () => {
    if (!token || exitPin.length < 4) return;
    try {
      await verifyKioskPin(token, exitPin);
      sessionStorage.removeItem('kc-kiosk-token');
      sessionStorage.removeItem('kc-kiosk-timeout');
      router.replace('/kiosk-settings');
    } catch (e) {
      if (e instanceof KioskPinError) {
        if (e.locked) {
          setLockEmail(e.email ?? null);
          sessionStorage.removeItem('kc-kiosk-token');
          sessionStorage.removeItem('kc-kiosk-timeout');
          setScreen('locked');
          return;
        }
        setExitError(
          e.attemptsRemaining != null
            ? `Incorrect PIN. ${e.attemptsRemaining} attempt${e.attemptsRemaining === 1 ? '' : 's'} remaining.`
            : 'Incorrect PIN.',
        );
      } else {
        setExitError('Connection error');
      }
    }
  };

  const handleLockedOk = () => {
    if (lockEmail) sessionStorage.setItem('kc-kiosk-locked', lockEmail);
    router.replace('/kiosk-settings');
  };

  // Exit "Forgot PIN" — emails the director a reset link + disables the kiosk.
  const handleRequestReset = async () => {
    if (!token) return;
    setResetting(true);
    try {
      const { email } = await requestKioskReset(token);
      setResetConfirmOpen(false);
      setResetSentEmail(email ?? directorEmail ?? null);
      // Kiosk is now disabled server-side; drop the dead session token.
      sessionStorage.removeItem('kc-kiosk-token');
      sessionStorage.removeItem('kc-kiosk-timeout');
    } catch {
      setResetConfirmOpen(false);
      toast.error('Could not send reset link');
    } finally {
      setResetting(false);
    }
  };

  const handleResetSentOk = () => {
    router.replace('/kiosk-settings');
  };

  const handleBackToStaff = () => {
    if (autoReturnTimer.current) clearTimeout(autoReturnTimer.current);
    setScreen('staff');
    setSelectedStaff(null);
  };

  // ── Render ──

  if (!token || loading) {
    return <KioskSkeleton />;
  }

  // Lock screen takes over the whole viewport.
  if (screen === 'locked') {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6 px-6 text-center">
        <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: '#ef444422' }}>
          <Lock className="h-10 w-10" style={{ color: '#ef4444' }} />
        </div>
        <div>
          <h2 className="text-2xl font-bold" style={{ color: 'var(--kc-text-1)' }}>Kiosk Locked</h2>
          <p className="text-sm mt-2 max-w-md" style={{ color: 'var(--kc-text-2)' }}>
            Too many incorrect PIN attempts. A reset link has been sent to{' '}
            <strong>{lockEmail ?? 'the director'}</strong>.
          </p>
          <p className="text-sm mt-1" style={{ color: 'var(--kc-text-3)' }}>
            Please check your email to set a new PIN.
          </p>
        </div>
        <Button onClick={handleLockedOk} className="min-w-[120px]">OK</Button>
      </div>
    );
  }

  // Reset-link-sent screen (from exit "Forgot PIN").
  if (resetSentEmail !== null) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6 px-6 text-center">
        <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: 'var(--kc-p-600)1A' }}>
          <Lock className="h-10 w-10" style={{ color: 'var(--kc-p-600)' }} />
        </div>
        <div>
          <h2 className="text-2xl font-bold" style={{ color: 'var(--kc-text-1)' }}>Reset Link Sent</h2>
          <p className="text-sm mt-2 max-w-md" style={{ color: 'var(--kc-text-2)' }}>
            A PIN reset link has been sent to <strong>{resetSentEmail ?? 'the director'}</strong>.
            The kiosk is now disabled.
          </p>
          <p className="text-sm mt-1" style={{ color: 'var(--kc-text-3)' }}>
            Check the email to set a new PIN (link expires in 1 hour).
          </p>
        </div>
        <Button onClick={handleResetSentOk} className="min-w-[120px]">OK</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full select-none">
      {/* Offline banner */}
      {!online && (
        <div className="flex items-center justify-center gap-2 py-2 px-4" style={{ background: '#f59e0b', color: 'white' }}>
          <WifiOff className="h-4 w-4" />
          <span className="text-sm font-medium">Offline Mode — punches will sync when connection is restored</span>
        </div>
      )}

      {/* Sync success toast */}
      {syncToast && (
        <div className="flex items-center justify-center gap-2 py-2 px-4" style={{ background: '#22c55e', color: 'white' }}>
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
          <span className="text-sm font-medium">{syncToast}</span>
        </div>
      )}

      {/* Header — center logo (initials) + name + live clock + Exit */}
      <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--kc-border)' }}>
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-base font-bold flex-none"
            style={{ background: 'var(--kc-p-600)', color: 'white' }}
          >
            {centerInitials(centerName)}
          </div>
          <div>
            <h1 className="text-lg font-bold leading-tight" style={{ color: 'var(--kc-text-1)' }}>
              {centerName || 'Kiosk'}
            </h1>
            <p className="text-xs tabular-nums" style={{ color: 'var(--kc-text-3)' }}>
              {now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              {' • '}
              {now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {pendingCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold" style={{ background: '#f59e0b22', color: '#f59e0b' }}>
              <Clock className="h-3.5 w-3.5" />
              {pendingCount} pending
            </div>
          )}
          <Button variant="outline" size="sm" onClick={handleExit}>
            <LogOut className="mr-1.5 h-3.5 w-3.5" /> Exit Kiosk
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* ── HOME: 2 big cards ── */}
        {screen === 'home' && (
          <div className="flex flex-col items-center justify-center h-full gap-8">
            <h2 className="text-xl font-semibold" style={{ color: 'var(--kc-text-2)' }}>
              What would you like to do?
            </h2>
            <div className="flex flex-wrap gap-6 justify-center">
              <button
                type="button"
                className="flex flex-col items-center justify-center gap-4 rounded-2xl border transition-shadow hover:shadow-xl active:scale-[0.98]"
                style={{ width: '220px', height: '220px', borderColor: 'var(--kc-border)' }}
                onClick={() => setScreen('staff')}
              >
                <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: 'var(--kc-p-600)1A' }}>
                  <Users className="h-10 w-10" style={{ color: 'var(--kc-p-600)' }} />
                </div>
                <span className="text-xl font-semibold" style={{ color: 'var(--kc-text-1)' }}>Staff</span>
                <span className="text-xs" style={{ color: 'var(--kc-text-3)' }}>Clock in / out</span>
              </button>

              <button
                type="button"
                className="flex flex-col items-center justify-center gap-4 rounded-2xl border transition-shadow hover:shadow-xl active:scale-[0.98]"
                style={{ width: '220px', height: '220px', borderColor: 'var(--kc-border)' }}
                onClick={() => toast.info('Coming soon!')}
              >
                <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: '#f59e0b1A' }}>
                  <Baby className="h-10 w-10" style={{ color: '#f59e0b' }} />
                </div>
                <span className="text-xl font-semibold" style={{ color: 'var(--kc-text-1)' }}>Children</span>
                <span className="text-xs" style={{ color: 'var(--kc-text-3)' }}>Check in / out</span>
              </button>
            </div>
          </div>
        )}

        {/* ── STAFF ATTENDANCE: rich grid ── */}
        {screen === 'staff' && (
          <div>
            <div className="flex items-center mb-4">
              <Button variant="ghost" size="sm" onClick={() => setScreen('home')}>
                <ArrowLeft className="mr-1 h-4 w-4" /> Back
              </Button>
              <h2 className="flex-1 text-center text-lg font-semibold" style={{ color: 'var(--kc-text-1)' }}>
                Mark Attendance
              </h2>
              <div className="w-[72px]" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {staff.map((s) => {
                const status = getStaffStatus(s);
                const cfg = STATUS_CONFIG[status];
                return (
                  <button
                    key={s.id}
                    type="button"
                    className="flex flex-col items-center gap-2 p-4 rounded-xl border transition-shadow hover:shadow-lg active:scale-[0.97]"
                    style={{ borderColor: 'var(--kc-border)', minHeight: '180px' }}
                    onClick={() => handleSelectStaff(s)}
                  >
                    <div
                      className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold"
                      style={{ background: cfg.bg + '22', color: cfg.bg }}
                    >
                      {s.firstName[0]}{s.lastName[0]}
                    </div>
                    <span className="text-sm font-semibold truncate max-w-full" style={{ color: 'var(--kc-text-1)' }}>
                      {s.firstName} {s.lastName}
                    </span>
                    <span className="text-[11px] capitalize" style={{ color: 'var(--kc-text-3)' }}>
                      {s.role?.toLowerCase()}
                    </span>
                    <span
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: cfg.bg, color: cfg.color }}
                    >
                      {cfg.label}
                    </span>
                    <div className="w-full pt-2 mt-1 border-t space-y-1" style={{ borderColor: 'var(--kc-border)' }}>
                      <div className="flex items-center justify-center gap-1 text-[11px]" style={{ color: 'var(--kc-text-3)' }}>
                        <CalendarClock className="h-3 w-3 flex-none" />
                        {s.scheduleToday
                          ? `${formatTime(s.scheduleToday.startTime)} – ${formatTime(s.scheduleToday.endTime)}`
                          : 'No schedule'}
                      </div>
                      <div className="flex items-center justify-center gap-1 text-[11px]" style={{ color: 'var(--kc-text-3)' }}>
                        <Timer className="h-3 w-3 flex-none" />
                        {formatWorked(s.workedMinutes)} worked
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── PUNCH: individual ── */}
        {screen === 'punch' && selectedStaff && (
          <div className="flex flex-col items-center justify-center h-full gap-6">
            <button
              type="button"
              className="text-sm flex items-center gap-1 self-start"
              style={{ color: 'var(--kc-text-3)' }}
              onClick={handleBackToStaff}
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold"
              style={{
                background: STATUS_CONFIG[getStaffStatus(selectedStaff)].bg + '22',
                color: STATUS_CONFIG[getStaffStatus(selectedStaff)].bg,
              }}
            >
              {selectedStaff.firstName[0]}{selectedStaff.lastName[0]}
            </div>
            <div className="text-center">
              <h2 className="text-2xl font-bold" style={{ color: 'var(--kc-text-1)' }}>
                {selectedStaff.firstName} {selectedStaff.lastName}
              </h2>
              <p className="text-sm mt-1" style={{ color: 'var(--kc-text-3)' }}>
                Status: {STATUS_CONFIG[getStaffStatus(selectedStaff)].label}
                {' • '}{formatWorked(selectedStaff.workedMinutes)} worked
              </p>
            </div>
            <div className="flex flex-wrap gap-3 justify-center">
              {selectedStaff.shiftStatus.nextActions.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--kc-text-3)' }}>Shift complete for today</p>
              ) : (
                selectedStaff.shiftStatus.nextActions.map((action) => {
                  const cfg = PUNCH_LABELS[action];
                  if (!cfg) return null;
                  const Icon = cfg.icon;
                  return (
                    <Button
                      key={action}
                      size="lg"
                      className="min-w-[160px] min-h-[56px] text-base"
                      style={{ background: cfg.color, color: 'white' }}
                      disabled={punching}
                      onClick={() => handlePunch(action)}
                    >
                      {punching ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Icon className="mr-2 h-5 w-5" />}
                      {cfg.label}
                    </Button>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ── SUCCESS ── */}
        {screen === 'success' && selectedStaff && (
          <div className="flex flex-col items-center justify-center h-full gap-6">
            {savedOffline ? (
              <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: '#f59e0b22' }}>
                <Zap className="h-10 w-10" style={{ color: '#f59e0b' }} />
              </div>
            ) : (
              <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: '#22c55e22' }}>
                <svg className="h-10 w-10" style={{ color: '#22c55e' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </div>
            )}
            <div className="text-center">
              <h2 className="text-2xl font-bold" style={{ color: 'var(--kc-text-1)' }}>
                {savedOffline ? 'Saved Offline' : (PUNCH_LABELS[lastPunch?.entry.type ?? lastPunchType]?.label ?? lastPunchType)}
              </h2>
              <p className="text-lg mt-1" style={{ color: 'var(--kc-text-2)' }}>
                {selectedStaff.firstName} {selectedStaff.lastName}
              </p>
              {savedOffline ? (
                <p className="text-sm mt-2" style={{ color: '#f59e0b' }}>Will sync when connection is restored</p>
              ) : lastPunch && (
                <p className="text-sm mt-2 tabular-nums" style={{ color: 'var(--kc-text-3)' }}>
                  {new Date(lastPunch.entry.deviceTimestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
            </div>
            <p className="text-xs" style={{ color: 'var(--kc-text-3)' }}>Returning to staff list...</p>
            <Button variant="outline" size="sm" onClick={handleBackToStaff}>Back now</Button>
          </div>
        )}

        {/* ── EXIT: PIN ── */}
        {screen === 'exit' && (
          <div className="flex flex-col items-center justify-center h-full gap-6">
            <LogOut className="h-12 w-12" style={{ color: 'var(--kc-text-3)' }} />
            <div className="text-center">
              <h2 className="text-xl font-bold" style={{ color: 'var(--kc-text-1)' }}>Exit Kiosk Mode</h2>
              <p className="text-sm mt-1" style={{ color: 'var(--kc-text-3)' }}>Enter the kiosk PIN to exit</p>
            </div>
            <div className="w-64">
              <div className="relative">
                <input
                  type={showExitPin ? 'text' : 'password'}
                  value={exitPin}
                  onChange={(e) => { setExitPin(e.target.value.replace(/\D/g, '').slice(0, 6)); setExitError(''); }}
                  maxLength={6}
                  placeholder="Enter PIN"
                  className="h-12 rounded-md border px-4 text-lg w-full text-center tabular-nums"
                  style={{ borderColor: exitError ? '#ef4444' : 'var(--kc-border)', background: 'var(--kc-bg)', color: 'var(--kc-text-1)' }}
                  onKeyDown={(e) => e.key === 'Enter' && handleExitConfirm()}
                  autoFocus
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  onClick={() => setShowExitPin(!showExitPin)}
                >
                  {showExitPin ? <EyeOff className="h-4 w-4" style={{ color: 'var(--kc-text-3)' }} /> : <Eye className="h-4 w-4" style={{ color: 'var(--kc-text-3)' }} />}
                </button>
              </div>
              {exitError && <p className="text-xs text-center mt-1" style={{ color: '#ef4444' }}>{exitError}</p>}
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setScreen('home')}>Cancel</Button>
              <Button onClick={handleExitConfirm} disabled={exitPin.length < 4}>Confirm Exit</Button>
            </div>
            <button
              type="button"
              className="text-xs underline mt-1"
              style={{ color: 'var(--kc-text-3)' }}
              onClick={() => setResetConfirmOpen(true)}
            >
              Forgot PIN? Send reset link
            </button>
          </div>
        )}
      </div>

      {/* Forgot PIN — confirm dialog */}
      <AlertDialog open={resetConfirmOpen} onOpenChange={setResetConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send PIN reset link?</AlertDialogTitle>
            <AlertDialogDescription>
              A reset link will be sent to <strong>{directorEmail ?? 'the center director'}</strong>.
              This will <strong>disable the kiosk</strong> until a new PIN is set.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resetting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleRequestReset(); }}
              disabled={resetting}
            >
              {resetting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send reset link
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
