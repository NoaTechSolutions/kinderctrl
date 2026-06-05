'use client';

import { useAuthStore } from '@/store/auth';
import { WeeklyApprovalSection } from '@/components/attendance/weekly-approval-section';
import { TeamClockView } from '@/components/attendance/team-clock-view';

export default function TeamClockPage() {
  const user = useAuthStore((s) => s.user);

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Team Clock</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--kc-text-3)' }}>
          {new Date().toLocaleDateString([], {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </div>

      <TeamClockView />

      <WeeklyApprovalSection />
    </div>
  );
}
