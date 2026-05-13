import type { TimeFormat } from '@/lib/preferences/time-format';

/**
 * Format a stored 24h time string ("07:00", "18:30") for display.
 *
 * The 24h branch is identity. The 12h branch produces patterns like
 * "7:00 AM" or "6:30 PM". Malformed input is returned as-is so that
 * we never crash on stale or unexpected data.
 */
export function formatTime(time24: string, format: TimeFormat): string {
  if (format === '24h') return time24;

  const m = /^(\d{1,2}):(\d{2})$/.exec(time24);
  if (!m) return time24;

  const h = Number(m[1]);
  const mm = m[2];
  if (Number.isNaN(h) || h < 0 || h > 23) return time24;

  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${mm} ${period}`;
}

export function formatTimeRange(
  openTime24: string,
  closeTime24: string,
  format: TimeFormat,
): string {
  return `${formatTime(openTime24, format)} – ${formatTime(closeTime24, format)}`;
}
