import zipcodeToTimezone from 'zipcode-to-timezone';
import { VALID_TIMEZONES, type ValidTimezone } from '@/lib/types/center';

/**
 * Snap fine-grained IANA timezones that the library returns down to
 * the 6 timezones the form accepts. The mapping prefers the dominant
 * timezone for the state/region — users can always override the
 * suggestion if they fall in an edge-case county.
 */
const SNAP_MAP: Record<string, ValidTimezone> = {
  // Indiana — most counties are Eastern, the southwestern strip is Central
  'America/Indiana/Indianapolis': 'America/New_York',
  'America/Indiana/Marengo': 'America/New_York',
  'America/Indiana/Petersburg': 'America/New_York',
  'America/Indiana/Vevay': 'America/New_York',
  'America/Indiana/Vincennes': 'America/New_York',
  'America/Indiana/Winamac': 'America/New_York',
  'America/Indiana/Knox': 'America/Chicago',
  'America/Indiana/Tell_City': 'America/Chicago',
  // Kentucky
  'America/Kentucky/Louisville': 'America/New_York',
  'America/Kentucky/Monticello': 'America/New_York',
  // Michigan UP exception is Central, rest is Eastern
  'America/Detroit': 'America/New_York',
  'America/Menominee': 'America/Chicago',
  // North Dakota
  'America/North_Dakota/Center': 'America/Chicago',
  'America/North_Dakota/New_Salem': 'America/Chicago',
  'America/North_Dakota/Beulah': 'America/Chicago',
  // Idaho northern panhandle is Pacific, rest is Mountain
  'America/Boise': 'America/Denver',
  // Arizona is MST year-round; closest the form has is Mountain
  'America/Phoenix': 'America/Denver',
  // Alaska variants
  'America/Juneau': 'America/Anchorage',
  'America/Sitka': 'America/Anchorage',
  'America/Yakutat': 'America/Anchorage',
  'America/Nome': 'America/Anchorage',
  'America/Metlakatla': 'America/Anchorage',
  // Aleutian Islands — Hawaii-Aleutian time
  'America/Adak': 'Pacific/Honolulu',
};

/**
 * Resolve a US ZIP code to one of the form's allowed timezones, or null
 * if the ZIP is malformed / non-US / unknown. Library lookup is sync
 * (static table), so we run it on every ZIP change without debouncing.
 */
export function lookupTimezoneByZip(zip: string): ValidTimezone | null {
  if (!/^\d{5}$/.test(zip)) return null;
  let tz: string | null = null;
  try {
    tz = zipcodeToTimezone.lookup(zip);
  } catch {
    return null;
  }
  if (!tz) return null;
  if ((VALID_TIMEZONES as readonly string[]).includes(tz)) {
    return tz as ValidTimezone;
  }
  return SNAP_MAP[tz] ?? null;
}
