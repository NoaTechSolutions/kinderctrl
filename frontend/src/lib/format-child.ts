import type { Child, ChildParentLink } from '@/lib/types/child';

/** "3y 2m" / "5y" / "8 mo" from an ISO birth date. */
export function formatAge(birthIso: string): string {
  const b = new Date(birthIso);
  const now = new Date();
  let months =
    (now.getFullYear() - b.getFullYear()) * 12 +
    (now.getMonth() - b.getMonth());
  if (now.getDate() < b.getDate()) months -= 1;
  if (months < 0) months = 0;
  const years = Math.floor(months / 12);
  const rem = months % 12;
  if (years === 0) return `${rem} mo`;
  if (rem === 0) return `${years}y`;
  return `${years}y ${rem}m`;
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

// "Mother" from "MOTHER". Free-text-with-whitelist, so just title-case it.
export function relationshipLabel(relationship: string): string {
  if (!relationship) return '';
  return relationship.charAt(0).toUpperCase() + relationship.slice(1).toLowerCase();
}

/** Primary parent first, then the rest. */
export function sortedParents(child: Child): ChildParentLink[] {
  return [...(child.childParents ?? [])].sort(
    (a, b) => Number(b.isPrimary) - Number(a.isPrimary),
  );
}
