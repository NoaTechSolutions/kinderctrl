import type { TimeFormat } from '@/lib/preferences/time-format';

export function formatTime(iso: string | null, format: TimeFormat = '24h'): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: format === '12h',
  });
}
