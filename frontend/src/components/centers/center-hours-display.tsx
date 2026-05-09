'use client';

import { Calendar } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
}

export function CenterHoursDisplay({ hours }: CenterHoursDisplayProps) {
  const sorted = (hours ?? []).slice().sort((a, b) => a.dayOfWeek - b.dayOfWeek);

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
          <p className="text-sm" style={{ color: 'var(--kc-text-3)' }}>
            No hours configured yet.
          </p>
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
