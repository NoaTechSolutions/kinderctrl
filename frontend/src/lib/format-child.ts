import type { Child, ChildParentLink } from '@/lib/types/child';

type Translator = (key: string) => string;

/**
 * "3y 2m" / "5y" / "8 mo" from an ISO birth date. With a translator the unit
 * abbreviations localize (en: y/m/mo → es: a/m/m); without one it keeps the
 * English abbreviations (pre-i18n behavior, safe for non-React callers).
 */
/** Whole months since birth (>= 0). Used by the infant-only age gate (2D). */
export function ageInMonths(birthIso: string): number {
  const b = new Date(birthIso);
  const now = new Date();
  let months =
    (now.getFullYear() - b.getFullYear()) * 12 + (now.getMonth() - b.getMonth());
  if (now.getDate() < b.getDate()) months -= 1;
  return months < 0 ? 0 : months;
}

export function formatAge(birthIso: string, t?: Translator): string {
  const b = new Date(birthIso);
  const now = new Date();
  let months =
    (now.getFullYear() - b.getFullYear()) * 12 +
    (now.getMonth() - b.getMonth());
  if (now.getDate() < b.getDate()) months -= 1;
  if (months < 0) months = 0;
  const years = Math.floor(months / 12);
  const rem = months % 12;
  const y = t ? t('children.ageYearShort') : 'y';
  const m = t ? t('children.ageMonthShort') : 'm';
  const mo = t ? t('children.ageMonthsOnlyShort') : 'mo';
  if (years === 0) return `${rem} ${mo}`;
  if (rem === 0) return `${years}${y}`;
  return `${years}${y} ${rem}${m}`;
}

/**
 * Long age for the child card: "4 years old" / "1 year old" / "8 months old".
 * Falls back to the year/month unit words via the translator (es: "años" / "año"
 * / "meses" / "mes"). Under a year reads in months; from a year, in whole years.
 */
export function formatAgeLong(birthIso: string, t: Translator): string {
  const months = ageInMonths(birthIso);
  const years = Math.floor(months / 12);
  if (years >= 1) {
    return `${years} ${t(years === 1 ? 'children.ageYearOld' : 'children.ageYearsOld')}`;
  }
  return `${months} ${t(months === 1 ? 'children.ageMonthOld' : 'children.ageMonthsOld')}`;
}

/**
 * "8:14 a.m." from an ISO timestamp. Rendered in the viewer's local timezone
 * (the director and the center share one in practice); when the real children-
 * attendance module lands we can anchor this to the center tz if needed.
 */
export function formatClockTime(iso: string): string {
  const d = new Date(iso);
  let h = d.getHours();
  const m = d.getMinutes();
  const period = h < 12 ? 'a.m.' : 'p.m.';
  h %= 12;
  if (h === 0) h = 12;
  return `${h}:${String(m).padStart(2, '0')} ${period}`;
}

/**
 * "First Middle Last" (middle omitted when absent). Structural param so it
 * serves both the full Child (detail) and the lean ChildListItem (roster).
 */
export function childFullName(child: {
  firstName: string;
  middleName: string | null;
  lastName: string;
}): string {
  return [child.firstName, child.middleName, child.lastName]
    .filter(Boolean)
    .join(' ');
}

/** "First Last". */
export function parentFullName(link: ChildParentLink): string {
  return `${link.parent.firstName} ${link.parent.lastName}`.trim();
}

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

// "Mother" from "MOTHER". Free-text-with-whitelist: with a translator the known
// values (MOTHER/FATHER/GUARDIAN/OTHER) resolve to i18n labels; anything else
// falls back to title-case (matches the pre-i18n behavior).
export function relationshipLabel(relationship: string, t?: Translator): string {
  if (!relationship) return '';
  if (t) {
    const known: Record<string, string> = {
      MOTHER: 'children.relMother',
      FATHER: 'children.relFather',
      GUARDIAN: 'children.relGuardian',
      OTHER: 'children.relOther',
    };
    const key = known[relationship.toUpperCase()];
    if (key) return t(key);
  }
  return titleCase(relationship);
}

// "Male" from "MALE". Same contract as relationshipLabel — known values
// (MALE/FEMALE/OTHER) translate; free text falls back to title-case.
export function genderLabel(gender: string, t?: Translator): string {
  if (!gender) return '';
  if (t) {
    const known: Record<string, string> = {
      MALE: 'children.genderMale',
      FEMALE: 'children.genderFemale',
      OTHER: 'children.genderOther',
    };
    const key = known[gender.toUpperCase()];
    if (key) return t(key);
  }
  return titleCase(gender);
}

/** Primary parent first, then the rest. */
export function sortedParents(child: Child): ChildParentLink[] {
  return [...(child.childParents ?? [])].sort(
    (a, b) => Number(b.isPrimary) - Number(a.isPrimary),
  );
}
