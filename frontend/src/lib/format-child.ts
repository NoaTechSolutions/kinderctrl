import type { Child, ChildParentLink } from '@/lib/types/child';

type Translator = (key: string) => string;

/**
 * "3y 2m" / "5y" / "8 mo" from an ISO birth date. With a translator the unit
 * abbreviations localize (en: y/m/mo → es: a/m/m); without one it keeps the
 * English abbreviations (pre-i18n behavior, safe for non-React callers).
 */
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

/** "First Middle Last" (middle omitted when absent). */
export function childFullName(child: Child): string {
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
