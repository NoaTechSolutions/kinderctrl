'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { getKioskResetInfo, confirmKioskResetPin } from '@/lib/api/kiosk';

const inputCls = 'h-11 rounded-md border px-4 text-base w-full text-center tabular-nums';

function KioskResetLoadingSkeleton() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 px-6">
      <Skeleton className="w-16 h-16 rounded-full" />
      <div className="flex flex-col items-center gap-2">
        <Skeleton className="h-7 w-48 rounded" />
        <Skeleton className="h-4 w-32 rounded" />
      </div>
      <div className="w-72 space-y-3">
        <Skeleton className="h-11 w-full rounded-md" />
        <Skeleton className="h-11 w-full rounded-md" />
        <Skeleton className="h-11 w-full rounded-md" />
      </div>
    </div>
  );
}
const inputStyle = { borderColor: 'var(--kc-border)', background: 'var(--kc-bg)', color: 'var(--kc-text-1)' } as const;

function ResetPinForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token') ?? '';

  const [loading, setLoading] = useState(true);
  const [valid, setValid] = useState(false);
  const [centerName, setCenterName] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    getKioskResetInfo(token)
      .then((info) => { setCenterName(info.centerName); setValid(true); })
      .catch(() => setValid(false))
      .finally(() => setLoading(false));
  }, [token]);

  const handleSubmit = async () => {
    if (newPin.length < 4 || newPin.length > 6) { setError('PIN must be 4-6 digits'); return; }
    if (newPin !== confirmPin) { setError('PINs do not match'); return; }
    setSubmitting(true);
    setError('');
    try {
      await confirmKioskResetPin({ token, newPin });
      toast.success('Kiosk PIN updated');
      router.replace('/kiosk-settings');
    } catch {
      setError('This reset link is invalid or has expired.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <KioskResetLoadingSkeleton />;
  }

  if (!valid) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 px-6 text-center">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold"
          style={{ background: 'var(--kc-p-600)', color: 'white' }}
        >
          K
        </div>
        <h1 className="text-xl font-bold" style={{ color: 'var(--kc-text-1)' }}>Reset Link Invalid</h1>
        <p className="text-sm max-w-sm" style={{ color: 'var(--kc-text-3)' }}>
          This PIN reset link is invalid or has expired. Request a new one from the kiosk or your dashboard.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 px-6">
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold"
        style={{ background: 'var(--kc-p-600)', color: 'white' }}
      >
        K
      </div>
      <div className="text-center">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--kc-text-1)' }}>Set New Kiosk PIN</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--kc-text-3)' }}>{centerName}</p>
      </div>

      <div className="w-72 space-y-3">
        <div>
          <label className="text-xs font-medium" style={{ color: 'var(--kc-text-3)' }}>New PIN (4-6 digits)</label>
          <div className="relative mt-1">
            <input
              type={showPin ? 'text' : 'password'}
              value={newPin}
              onChange={(e) => { setNewPin(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(''); }}
              maxLength={6}
              placeholder="••••"
              className={inputCls}
              style={inputStyle}
              autoFocus
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2"
              onClick={() => setShowPin(!showPin)}
            >
              {showPin ? <EyeOff className="h-4 w-4" style={{ color: 'var(--kc-text-3)' }} /> : <Eye className="h-4 w-4" style={{ color: 'var(--kc-text-3)' }} />}
            </button>
          </div>
        </div>
        <div>
          <label className="text-xs font-medium" style={{ color: 'var(--kc-text-3)' }}>Confirm PIN</label>
          <input
            type="password"
            value={confirmPin}
            onChange={(e) => { setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(''); }}
            maxLength={6}
            placeholder="••••"
            className={inputCls + ' mt-1'}
            style={inputStyle}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          />
        </div>
        {error && <p className="text-xs text-center" style={{ color: '#ef4444' }}>{error}</p>}
        <Button
          className="w-full h-11"
          onClick={handleSubmit}
          disabled={submitting || newPin.length < 4 || !confirmPin}
        >
          {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Set New PIN
        </Button>
      </div>
    </div>
  );
}

export default function KioskResetPage() {
  return (
    <Suspense fallback={<KioskResetLoadingSkeleton />}>
      <ResetPinForm />
    </Suspense>
  );
}
