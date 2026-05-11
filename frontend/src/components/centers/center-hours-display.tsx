'use client';

import { Calendar, Clock } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { HoursFormDialog } from '@/components/centers/hours-form';
import type { CenterHours, CenterStatus } from '@/lib/types/center';

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
   * When centerId + centerName are provided AND the center is not CLOSED,
   * the card surfaces a trigger to set/edit operating hours:
   *  - empty state -> primary "Set Hours" button in the empty placeholder
   *  - has hours    -> ghost "Edit Hours" button in the card header
   * Passing them is safe at any time; the component picks the right
   * variant based on whether hours exist.
   */
  centerId?: string;
  centerName?: string;
  centerStatus?: CenterStatus;
}

export function CenterHoursDisplay({
  hours,
  centerId,
  centerName,
  centerStatus,
}: CenterHoursDisplayProps) {
  const sorted = (hours ?? []).slice().sort((a, b) => a.dayOfWeek - b.dayOfWeek);
  const hasHours = sorted.length > 0;
  const canManageHours =
    !!centerId && !!centerName && centerStatus !== 'CLOSED';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-4 w-4" aria-hidden />
            Operating hours
          </CardTitle>
          {canManageHours && hasHours && (
            <HoursFormDialog
              centerId={centerId!}
              centerName={centerName!}
              initialHours={hours}
              triggerStyle="edit"
            />
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!hasHours ? (
          <div className="flex flex-col items-center text-center py-4 gap-3">
            <Clock
              className="h-10 w-10"
              style={{ color: 'var(--kc-text-3)' }}
              aria-hidden
            />
            <p className="text-sm" style={{ color: 'var(--kc-text-3)' }}>
              No hours configured yet.
            </p>
            {canManageHours && (
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
