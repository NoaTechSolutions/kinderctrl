'use client';

import { useAuthStore } from '@/store/auth';
import { SchedulesView } from '@/components/attendance/schedules-view';

export default function SchedulesPage() {
  // Auth guard stays in the page; SchedulesView is unguarded so it can be embedded elsewhere.
  const user = useAuthStore((s) => s.user);
  if (!user) return null;

  return <SchedulesView />;
}
