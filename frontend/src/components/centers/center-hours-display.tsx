'use client';

import { Calendar, Clock } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { HoursFormDialog } from '@/components/centers/hours-form';
import type { CenterHours } from '@/lib/types/center';

const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

interface CenterHoursDisplayProps {
  hours: CenterHours[] | undefined;
  /**
   * Optional: when set together with centerName, an empty hours card will
   * include a "Set Hours" trigger that opens HoursFormDialog. Used for the
   * onboarding flow where DIRECTOR needs to set hours to activate a center.
   */
  centerId?: string;
  centerName?: string;
}

export function CenterHoursDisplay({
  hours,
  centerId,
  centerName,
}: CenterHoursDisplayProps) {
  const sorted = (hours ?? []).slice().sort((a, b) => a.dayOfWeek - b.dayOfWeek);
  const showSetHoursTrigger =
    sorted.length === 0 && !!centerId && !!centerName;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Calendar className="h-4 w-4" aria-hidden />
          Operating hours
        </CardTitle>
      </CardHeader>
      <CardContent>
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center text-center py-4 gap-3">
            <Clock
              className="h-10 w-10"
              style={{ color: 'var(--kc-text-3)' }}
              aria-hidden
            />
            <p className="text-sm" style={{ color: 'var(--kc-text-3)' }}>
              No hours configured yet.
            </p>
            {showSetHoursTrigger && (
              <HoursFormDialog
                centerId={centerId!}
                centerName={centerName!}
              />
            )}
          </div>
        ) : (
          <ul className="space-y-1.5">
            {sorted.map((h) => (
              <li
                key={h.id}
                className="flex items-center justify-between text-sm"
              >
                <span style={{ color: 'var(--kc-text-2)' }}>
                  {DAY_NAMES[h.dayOfWeek] ?? `Day ${h.dayOfWeek}`}
                </span>
                <span className="font-mono tabular-nums">
                  {h.isOpen ? `${h.openTime} – ${h.closeTime}` : 'Closed'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
