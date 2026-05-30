import { Prisma } from '@prisma/client';

/**
 * Build a case-insensitive OR-search clause for Prisma WHERE.
 * Returns `undefined` when `term` is empty so callers can spread it
 * unconditionally without clobbering other filters.
 *
 *   buildSearchWhere(['name', 'city'], 'sun')
 *   →  { OR: [
 *        { name: { contains: 'sun', mode: 'insensitive' } },
 *        { city: { contains: 'sun', mode: 'insensitive' } },
 *      ] }
 *
 * Only handles top-level scalar fields. For nested paths (e.g.
 * `user.email` via a relation), construct the OR inline in the service.
 */
export function buildSearchWhere(
  fields: ReadonlyArray<string>,
  term: string | undefined | null,
):
  | {
      OR: Record<string, { contains: string; mode: Prisma.QueryMode }>[];
    }
  | undefined {
  const q = term?.trim();
  if (!q) return undefined;
  return {
    OR: fields.map((f) => ({
      [f]: { contains: q, mode: Prisma.QueryMode.insensitive },
    })),
  };
}
