'use client';

import { Calendar, Clock } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { HoursFormDialog } from '@/components/centers/hours-form';
import { useTimeFormat } from '@/lib/preferences/time-format';
import { formatTimeRange } from '@/lib/utils/time';
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
  const { timeFormat } = useTimeFormat();
  const sorted = (hours ?? []).slice().sort((a, b) => a.dayOfWeek - b.dayOfWeek);
  const hasHours = sorted.length > 0;
  const canManageHours =
    !!centerId && !!centerName && centerStatus !== 'CLOSED';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base min-w-0">
            <Calendar className="h-4 w-4 flex-none" aria-hidden />
            <span className="truncate">Operating hours</span>
          </CardTitle>
          {canManageHours && hasHours && (
            <div className="flex-none">
              <HoursFormDialog
                centerId={centerId!}
                centerName={centerName!}
                initialHours={hours}
                triggerStyle="icon"
              />
            </div>
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
          // Always render all seven days so closed/missing days surface
          // as "Closed" instead of silently disappearing — centers created
          // via the form only insert open days, so a Mon-Fri center had
          // no Sat/Sun rows at all (UX-014).
          <ul className="space-y-1.5 max-w-md mx-auto">
            {(() => {
              const byDay = new Map(sorted.map((h) => [h.dayOfWeek, h]));
              return [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => {
                const h = byDay.get(dayOfWeek);
                const isOpen = !!h?.isOpen;
                return (
                  <li
                    key={dayOfWeek}
                    className="grid grid-cols-[7rem_1fr] items-center gap-8 text-sm"
                  >
                    <span
                      className="font-medium"
                      style={{ color: 'var(--kc-text-2)' }}
                    >
                      {DAY_NAMES[dayOfWeek]}
                    </span>
                    {isOpen && h ? (
                      <span className="font-mono tabular-nums">
                        {formatTimeRange(h.openTime, h.closeTime, timeFormat)}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--kc-text-3)' }}>
                        Closed
                      </span>
                    )}
                  </li>
                );
              });
            })()}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
