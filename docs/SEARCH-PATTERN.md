# Search Pattern — server-side, debounced, reusable

This is the canonical pattern for any paginated table or list with a
free-text search input across the SaaS. New modules **must** follow it
instead of doing client-side `.filter()` on a paginated response (which
was the previous mistake: it only searched within the current page).

## Backend

### 1. DTO

Add a `search?: string` field to the query DTO:

```ts
// some-module/dto/find-all-x-query.dto.ts
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class FindAllXQueryDto {
  // … page / limit / status …

  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;
}
```

### 2. Service — use the shared helper

For top-level scalar fields, use `buildSearchWhere`:

```ts
// backend/src/common/utils/search.ts
import { buildSearchWhere } from '../../common/utils/search';

const searchWhere = buildSearchWhere(['name', 'city', 'state'], query.search);
if (searchWhere) {
  where = { ...where, ...searchWhere };
}
```

For nested paths (e.g. `user.email` via a relation), build the `OR`
inline — the helper only handles top-level scalars on purpose:

```ts
const term = query.search?.trim();
if (term) {
  fullWhere.OR = [
    { firstName: { contains: term, mode: Prisma.QueryMode.insensitive } },
    { lastName:  { contains: term, mode: Prisma.QueryMode.insensitive } },
    { user: { email: { contains: term, mode: Prisma.QueryMode.insensitive } } },
  ];
}
```

Rules:
- Always `mode: 'insensitive'` (Postgres `ILIKE`).
- Always `.trim()` the term before using.
- Never apply the search if the trimmed term is empty.
- Validate length at the DTO (`@MaxLength(200)`) so the predicate stays cheap.

## Frontend

### 1. Hook + component

The toolkit lives in two files; reuse them as-is:

- `lib/hooks/use-debounced-value.ts` → `useDebouncedValue(value, ms = 300)`.
- `components/ui/search-input.tsx` → `<SearchInput value onChange placeholder ariaLabel />`.
  Renders a Search icon left + a Clear (X) button right when non-empty.

### 2. Page wiring

```tsx
const [query, setQuery] = useState('');
const debouncedQuery = useDebouncedValue(query, 300);

const { data } = useThings({
  page,
  limit,
  ...(debouncedQuery.trim() && { search: debouncedQuery.trim() }),
});

// Resetting page = 1 when the search changes keeps users out of "page 5
// of an empty result set" when the predicate shrinks the list.
const onSearchChange = (next: string) => {
  setQuery(next);
  if (page > 1) setPage(1);
};

<SearchInput
  value={query}
  onChange={onSearchChange}
  placeholder="Search by name or email…"
  ariaLabel="Search things"
/>
```

### 3. Empty states

Distinguish three states so users can recover from each:

- No data at all (no filter, no search) → `<EmptyState />` (module-specific).
- Filter active but no rows → "Clear filter" button.
- Search active but no rows → "Clear search" button.

If both are active, show both clears.

## What this pattern does NOT cover (yet)

- Multi-select status / role filters (still client-side on `/staff` —
  follow-up to migrate via `?status=&role=`).
- Global Cmd+K command palette (a separate feature, would need its own
  cross-module index).
- Combobox / autocomplete pickers with built-in search (e.g.
  `staff/center-combobox`). Those stay client-side because the dataset
  is bounded (< ~50 items) and there's no pagination.

## Reference implementations

- `/centers` page → `frontend/src/app/(dashboard)/centers/page.tsx`
- `/staff` page → `frontend/src/app/(dashboard)/staff/page.tsx`
- `/children` module (backend) → `backend/src/modules/children/children.service.ts`
- Helper → `backend/src/common/utils/search.ts`
