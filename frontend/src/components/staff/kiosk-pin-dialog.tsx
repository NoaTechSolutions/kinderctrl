'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import {
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  ShieldCheck,
  Trash2,
  Unlock,
} from 'lucide-react';

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ReadCard } from '@/components/ui/section-frame';
import { ReadGrid, ReadRow } from '@/components/ui/read-view';
import {
  useSetStaffKioskPin,
  useRemoveStaffKioskPin,
  useUnlockStaffKioskPin,
} from '@/lib/hooks/use-staff';
import type { Staff } from '@/lib/types/staff';

type PinStatus = Pick<Staff, 'kioskPinSet' | 'kioskPinLocked'>;

const onlyDigits = (v: string) => v.replace(/\D/g, '').slice(0, 4);
const inputCls = 'h-10 w-full rounded-md border px-3 pr-10 text-center text-lg tracking-[0.5em] tabular-nums';
const inputStyle = { borderColor: 'var(--kc-border)', background: 'var(--kc-bg)', color: 'var(--kc-text-1)' };

/** Set / change a staff member's 4-digit kiosk PIN (PIN + Confirm). */
export function KioskPinDialog({
  staffId,
  staffName,
  isSet,
  open,
  onOpenChange,
}: {
  staffId: string;
  staffName: string;
  isSet: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const setPin = useSetStaffKioskPin();
  const [pin, setPin_] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [showPin, setShowPin] = useState(false);

  const reset = () => {
    setPin_('');
    setConfirm('');
    setError('');
  };

  const submit = async () => {
    if (!/^\d{4}$/.test(pin)) {
      setError('PIN must be exactly 4 digits');
      return;
    }
    if (pin !== confirm) {
      setError('PINs do not match');
      return;
    }
    try {
      await setPin.mutateAsync({ staffId, pin });
      toast.success(`Kiosk PIN ${isSet ? 'updated' : 'created'} for ${staffName}`);
      reset();
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save PIN');
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isSet ? 'Change' : 'Create'} Kiosk PIN — {staffName}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <label className="text-sm font-medium" style={{ color: 'var(--kc-text-1)' }}>
              PIN (4 digits)
            </label>
            <div className="relative mt-1">
              <input
                type={showPin ? 'text' : 'password'}
                inputMode="numeric"
                autoComplete="one-time-code"
                name="kiosk-pin"
                data-1p-ignore
                data-lpignore="true"
                value={pin}
                onChange={(e) => {
                  setPin_(onlyDigits(e.target.value));
                  setError('');
                }}
                className={inputCls}
                style={inputStyle}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPin((v) => !v)}
                aria-label={showPin ? 'Hide PIN' : 'Show PIN'}
                className="absolute right-2 top-1/2 -translate-y-1/2"
              >
                {showPin ? (
                  <EyeOff className="h-4 w-4" style={{ color: 'var(--kc-text-3)' }} />
                ) : (
                  <Eye className="h-4 w-4" style={{ color: 'var(--kc-text-3)' }} />
                )}
              </button>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium" style={{ color: 'var(--kc-text-1)' }}>
              Confirm PIN
            </label>
            <div className="relative mt-1">
              <input
                type={showPin ? 'text' : 'password'}
                inputMode="numeric"
                autoComplete="one-time-code"
                name="kiosk-pin-confirm"
                data-1p-ignore
                data-lpignore="true"
                value={confirm}
                onChange={(e) => {
                  setConfirm(onlyDigits(e.target.value));
                  setError('');
                }}
                onKeyDown={(e) => e.key === 'Enter' && submit()}
                className={inputCls}
                style={inputStyle}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPin((v) => !v)}
                aria-label={showPin ? 'Hide PIN' : 'Show PIN'}
                className="absolute right-2 top-1/2 -translate-y-1/2"
              >
                {showPin ? (
                  <EyeOff className="h-4 w-4" style={{ color: 'var(--kc-text-3)' }} />
                ) : (
                  <Eye className="h-4 w-4" style={{ color: 'var(--kc-text-3)' }} />
                )}
              </button>
            </div>
          </div>
          {error && (
            <p className="text-xs" style={{ color: 'var(--kc-error)' }}>
              {error}
            </p>
          )}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button
            onClick={submit}
            disabled={setPin.isPending || pin.length < 4 || confirm.length < 4}
          >
            {setPin.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSet ? 'Update PIN' : 'Create PIN'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Status pill: Configured (green) / Not set (muted) / Locked (red). */
export function KioskPinBadge({ staff }: { staff: PinStatus }) {
  if (staff.kioskPinLocked) {
    return (
      <Badge style={{ background: 'color-mix(in oklch, var(--kc-error), transparent 80%)', color: 'var(--kc-error)' }}>
        Locked
      </Badge>
    );
  }
  if (staff.kioskPinSet) {
    return (
      <Badge style={{ background: 'color-mix(in oklch, var(--kc-success), transparent 80%)', color: 'var(--kc-success)' }}>
        Configured
      </Badge>
    );
  }
  return (
    <Badge style={{ background: 'var(--kc-surface-2)', color: 'var(--kc-text-3)' }}>Not set</Badge>
  );
}

/** Full Kiosk PIN card for the staff detail page. */
export function KioskPinSection({ staff }: { staff: Staff }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const remove = useRemoveStaffKioskPin();
  const unlock = useUnlockStaffKioskPin();

  const handleRemove = async () => {
    try {
      await remove.mutateAsync(staff.id);
      toast.success('Kiosk PIN removed');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to remove PIN');
    }
  };
  const handleUnlock = async () => {
    try {
      await unlock.mutateAsync(staff.id);
      toast.success('Kiosk PIN unlocked');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to unlock PIN');
    }
  };

  // Status description text (kept hardcoded — the whole kiosk-pin module is
  // not i18n'd yet; that's separate tech debt, out of scope for this card
  // migration).
  const statusDescription = staff.kioskPinLocked
    ? 'Locked after 3 failed attempts'
    : staff.kioskPinSet
      ? '4-digit PIN for kiosk clock-in/out'
      : 'No PIN — staff can’t use the kiosk yet';

  return (
    <ReadCard icon={KeyRound} title="Kiosk PIN">
      <ReadGrid cols={2}>
        <ReadRow icon={ShieldCheck} label="Status" full>
          <span className="flex flex-wrap items-center gap-2">
            <KioskPinBadge staff={staff} />
            <span className="text-xs" style={{ color: 'var(--kc-text-3)' }}>
              {statusDescription}
            </span>
          </span>
        </ReadRow>
      </ReadGrid>

      {/* Actions sit below the status row (3 affordances don't fit the
          ReadRow action slot cleanly, and the description shouldn't truncate). */}
      <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
        {staff.kioskPinLocked && (
          <Button variant="outline" size="sm" onClick={handleUnlock} disabled={unlock.isPending}>
            {unlock.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Unlock className="mr-1.5 h-3.5 w-3.5" />}
            Unlock
          </Button>
        )}
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <KeyRound className="mr-1.5 h-3.5 w-3.5" />
          {staff.kioskPinSet ? 'Change PIN' : 'Create PIN'}
        </Button>
        {staff.kioskPinSet && (
          <Button variant="outline" size="sm" onClick={handleRemove} disabled={remove.isPending}>
            {remove.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Trash2 className="mr-1.5 h-3.5 w-3.5" />}
            Remove
          </Button>
        )}
      </div>

      <KioskPinDialog
        staffId={staff.id}
        staffName={`${staff.firstName} ${staff.lastName}`}
        isSet={staff.kioskPinSet}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </ReadCard>
  );
}

/** Compact trigger for list rows (table / center staff list): a button +
 *  the set/change dialog. Self-contained (owns its open state). */
export function KioskPinTrigger({ staff }: { staff: Staff }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <KeyRound className="mr-1.5 h-3.5 w-3.5" />
        {staff.kioskPinSet ? 'Manage PIN' : 'Set PIN'}
      </Button>
      <KioskPinDialog
        staffId={staff.id}
        staffName={`${staff.firstName} ${staff.lastName}`}
        isSet={staff.kioskPinSet}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}
