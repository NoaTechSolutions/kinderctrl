'use client';

import { useState } from 'react';
import { Clock, Edit, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useSetCenterHours } from '@/lib/hooks/use-centers';
import { useTranslation } from '@/lib/i18n';
import { ApiError } from '@/lib/api/client';
import type { CenterHours } from '@/lib/types/center';

interface HoursFormDialogProps {
  centerId: string;
  centerName: string;
  /**
   * If provided, the form pre-populates with these days. Closed days
   * (those absent from the array) are rendered as unchecked. Used by
   * the Edit Hours flow on the detail page when the center already has
   * hours configured.
   */
  initialHours?: CenterHours[];
  /**
   * 'primary' (default) = full-width primary button with Clock icon,
   * used in empty-state CTA for SETUP_PENDING centers.
   * 'edit' = ghost / small button with Edit icon, used inline in the
   * Operating Hours card header for ACTIVE centers.
   */
  triggerStyle?: 'primary' | 'edit';
}

interface DayHours {
  dayOfWeek: number;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
}

const DAY_KEYS = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
] as const;

const buildDefaults = (): DayHours[] =>
  DAY_KEYS.map((_, i) => ({
    dayOfWeek: i,
    isOpen: i >= 1 && i <= 5,
    openTime: '07:00',
    closeTime: '18:00',
  }));

const buildFromInitial = (initial?: CenterHours[]): DayHours[] => {
  if (!initial || initial.length === 0) return buildDefaults();
  const days: DayHours[] = DAY_KEYS.map((_, i) => ({
    dayOfWeek: i,
    isOpen: false,
    openTime: '07:00',
    closeTime: '18:00',
  }));
  for (const h of initial) {
    if (h.dayOfWeek >= 0 && h.dayOfWeek < 7) {
      days[h.dayOfWeek] = {
        dayOfWeek: h.dayOfWeek,
        isOpen: h.isOpen,
        openTime: h.openTime,
        closeTime: h.closeTime,
      };
    }
  }
  return days;
};

export function HoursFormDialog({
  centerId,
  centerName,
  initialHours,
  triggerStyle = 'primary',
}: HoursFormDialogProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [days, setDays] = useState<DayHours[]>(() =>
    buildFromInitial(initialHours),
  );
  const [validationError, setValidationError] = useState<string | null>(null);
  const mutation = useSetCenterHours();

  const updateDay = (idx: number, patch: Partial<DayHours>) => {
    setDays((prev) =>
      prev.map((d, i) => (i === idx ? { ...d, ...patch } : d)),
    );
    setValidationError(null);
  };

  const handleOpenChange = (next: boolean) => {
    if (next) {
      // Re-sync with current initialHours every time the dialog opens
      // (caller may have refetched hours since last interaction).
      setDays(buildFromInitial(initialHours));
    }
    setValidationError(null);
    mutation.reset();
    setOpen(next);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const openDays = days.filter((d) => d.isOpen);
    if (openDays.length === 0) {
      setValidationError(t('setup.errOneDayMin'));
      return;
    }
    for (const d of openDays) {
      if (d.openTime >= d.closeTime) {
        setValidationError(
          t('setup.errOpenBeforeClose').replace(
            '{day}',
            t(`setup.day_${DAY_KEYS[d.dayOfWeek]}`),
          ),
        );
        return;
      }
    }

    mutation.mutate(
      {
        id: centerId,
        hours: openDays.map((d) => ({
          dayOfWeek: d.dayOfWeek,
          openTime: d.openTime,
          closeTime: d.closeTime,
        })),
      },
      {
        onSuccess: () => {
          window.setTimeout(() => setOpen(false), 600);
        },
      },
    );
  };

  const isPending = mutation.isPending;
  const isSuccess = mutation.isSuccess;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {triggerStyle === 'edit' ? (
          <Button variant="ghost" size="sm">
            <Edit className="h-3.5 w-3.5" />
            {t('setup.editHoursTrigger')}
          </Button>
        ) : (
          <Button>
            <Clock className="h-4 w-4" />
            {t('setup.hoursTriggerButton')}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('setup.hoursFormTitle')}</DialogTitle>
          <DialogDescription>{centerName}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-xs" style={{ color: 'var(--kc-text-3)' }}>
            {t('setup.hoursFormHelp')}
          </p>

          <div className="space-y-2">
            {days.map((d, idx) => (
              <div
                key={d.dayOfWeek}
                className="flex flex-wrap items-center gap-3 rounded-md border p-3"
                style={{
                  borderColor:
                    'color-mix(in oklch, var(--kc-border), transparent 30%)',
                  background: d.isOpen
                    ? 'transparent'
                    : 'color-mix(in oklch, var(--kc-bg-2), transparent 50%)',
                }}
              >
                <div className="flex items-center gap-2 min-w-[140px]">
                  <Checkbox
                    id={`day-${d.dayOfWeek}`}
                    checked={d.isOpen}
                    onCheckedChange={(v) =>
                      updateDay(idx, { isOpen: v === true })
                    }
                    disabled={isPending || isSuccess}
                  />
                  <Label
                    htmlFor={`day-${d.dayOfWeek}`}
                    className="text-sm font-medium cursor-pointer"
                  >
                    {t(`setup.day_${DAY_KEYS[d.dayOfWeek]}`)}
                  </Label>
                </div>

                {d.isOpen ? (
                  <div className="flex items-center gap-2 flex-1 flex-wrap">
                    <Input
                      type="time"
                      value={d.openTime}
                      onChange={(e) =>
                        updateDay(idx, { openTime: e.target.value })
                      }
                      className="h-9 w-28 font-mono tabular-nums"
                      aria-label={`${DAY_KEYS[d.dayOfWeek]} open time`}
                      disabled={isPending || isSuccess}
                    />
                    <span style={{ color: 'var(--kc-text-3)' }}>–</span>
                    <Input
                      type="time"
                      value={d.closeTime}
                      onChange={(e) =>
                        updateDay(idx, { closeTime: e.target.value })
                      }
                      className="h-9 w-28 font-mono tabular-nums"
                      aria-label={`${DAY_KEYS[d.dayOfWeek]} close time`}
                      disabled={isPending || isSuccess}
                    />
                  </div>
                ) : (
                  <span
                    className="text-sm"
                    style={{ color: 'var(--kc-text-3)' }}
                  >
                    {t('setup.dayClosed')}
                  </span>
                )}
              </div>
            ))}
          </div>

          {validationError && (
            <div
              role="alert"
              className="rounded-md border p-3"
              style={{
                background: 'var(--kc-error-bg)',
                borderColor:
                  'color-mix(in oklch, var(--kc-error), transparent 70%)',
              }}
            >
              <p className="text-sm" style={{ color: 'var(--kc-error)' }}>
                {validationError}
              </p>
            </div>
          )}

          {mutation.error && !validationError && (
            <div
              role="alert"
              className="rounded-md border p-3"
              style={{
                background: 'var(--kc-error-bg)',
                borderColor:
                  'color-mix(in oklch, var(--kc-error), transparent 70%)',
              }}
            >
              <p className="text-sm" style={{ color: 'var(--kc-error)' }}>
                {mutation.error instanceof ApiError
                  ? mutation.error.message
                  : t('setup.hoursFormError')}
              </p>
            </div>
          )}

          <div className="flex gap-2 justify-end pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isPending}
            >
              {t('centers.cancel')}
            </Button>
            <Button type="submit" disabled={isPending || isSuccess}>
              {isSuccess ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  {t('setup.hoursFormSaved')}
                </>
              ) : isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('setup.hoursFormSaving')}
                </>
              ) : (
                t('setup.hoursFormSubmit')
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
