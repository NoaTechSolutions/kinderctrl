# KinderCtrl — Table Pattern

> Source of truth: `frontend/src/components/staff/staff-table.tsx` (table
> markup) and `frontend/src/app/(dashboard)/centers/page.tsx` (pagination +
> mobile cards orchestration). This doc is a brief, copy-paste-friendly
> recap. When the reference diverges from this doc, the reference wins —
> fix the doc, not the code.

## Wrapper

Every data table lives inside this wrapper:

```tsx
<div
  className="rounded-lg border overflow-x-auto
             [&_th:first-child]:pl-4 [&_th:last-child]:pr-4
             [&_td:first-child]:pl-4 [&_td:last-child]:pr-4"
  style={{
    background: 'var(--kc-surface)',
    borderColor: 'var(--kc-border)',
  }}
>
  <Table>…</Table>
</div>
```

Why the inline paddings: the shadcn `<Table>` cell padding is `p-2`,
so without these extra left/right paddings on the first and last cells
the content runs into the border. Don't reach for `border-r` between
columns — modern data tables (this codebase included) rely on row
dividers and spacing only.

## Header

```tsx
<TableHeader>
  <TableRow>
    <TableHead>{t('namespace.colSomething')}</TableHead>
    {showOptional && <TableHead>{t('namespace.colOptional')}</TableHead>}
    <TableHead className="hidden lg:table-cell">{t('namespace.colWide')}</TableHead>
    <TableHead className="w-[80px] text-right">{t('namespace.colActions')}</TableHead>
  </TableRow>
</TableHeader>
```

- Every column has a header label — including the actions column.
  Use `t('staff.colActions')` (or your namespace's equivalent).
- Action column is `w-[80px] text-right`.
- Wide-but-not-critical columns hide on smaller breakpoints with
  `hidden lg:table-cell` / `hidden xl:table-cell`.

## Rows

- Whole-row navigation: set `role="link" tabIndex={0}` + `onClick` +
  `onKeyDown` for Enter/Space. See `staff-table.tsx:115`.
- Inside the actions cell wrap the dropdown in
  `<div onClick={e => e.stopPropagation()} onKeyDown={e => e.stopPropagation()}>`
  so opening the menu doesn't trigger the row navigation.
- For text overflow use `truncate max-w-[Npx]` on the cell content, not
  on the cell itself.

## States

- **Loading**: a stack of `<Skeleton className="h-12 w-full" />`s above
  the table. Keep the count rough (3–4 is plenty).
- **Empty filter result**: centered text inside a bordered panel using
  `var(--kc-surface)` / `var(--kc-border)`. See
  `invitations-table.tsx` for the canonical version.
- **Error**: `role="alert"` panel using `var(--kc-error-bg)` /
  `var(--kc-error)`.

## Mobile cards (default expectation)

**Any data-list table renders cards on `<md` and the table on `>=md`**.
The wrapper's `overflow-x-auto` is the fallback for the very rare list
that genuinely can't be card-ified, but cards are the default.

```tsx
<div className="hidden md:block">
  <SomeTable …/>
</div>
<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:hidden">
  {data.map(row => <SomeCard key={row.id} … />)}
</div>
```

Live references:
- `centers-page.tsx` + `center-table.tsx` + `center-card.tsx`
- `staff-page.tsx` + `staff-table.tsx` + `staff-card.tsx`
- `invitations-table.tsx` (single component renders BOTH branches when
  the cards are simple enough not to warrant a standalone component)

Card rules of thumb:
- Header has the row's primary identifier (name, email) — truncate it.
- One `Row` per secondary field (label / value pair).
- Actions go INSIDE the collapsed body, not in the header — buttons
  belong with the row they act on, not with the row's identity.
- Use `min-w-0` aggressively on cell containers — long unbreakable
  strings will otherwise blow out the viewport (see PO QA #18/#21).

**Collapsible cards** (default for any list with >2 secondary fields):
wrap each `<Card>` in `<Collapsible>` with parent-managed open state
(typically `Set<string>` so multiple rows can be open at once). Header
becomes the `<CollapsibleTrigger>` (always visible); body lives in
`<CollapsibleContent>`. Reference: `staff-card.tsx` (single-card local
state) and `invitations-table.tsx` (parent-managed Set). Add a
`<ChevronDown class="rotate-180-when-open">` indicator so users know
it's interactive.

## Filter row

Use both `<FilterTabs>` and `<FilterDropdown>` from `components/ui` —
SAME `FilterTab[]` data shape, different render. Tabs at `>=md`, dropdown
at `<md`. The tabs strip overflows horizontally on narrow viewports (5+
options at 320px), and a dropdown saves space without losing options:

```tsx
<div className="hidden md:block">
  <FilterTabs tabs={statusTabs} value={filter} onChange={handleChange} />
</div>
<div className="md:hidden flex justify-end">
  <FilterDropdown options={statusTabs} value={filter} onChange={handleChange} />
</div>
```

## Pagination

**All paginated list endpoints return `{ data, pagination }`** with
`pagination = { page, limit, total, totalPages }`. `totalPages` floors
at 1 so the UI's "Page X of Y" never reads "of 0".

Per-viewport page sizes:
- `MOBILE_LIMIT = 10`
- `DESKTOP_LIMIT = 15`
- Boundary: `useMediaQuery('(min-width: 1024px)')` (NOT the md cards
  breakpoint at 768px — they're intentionally different)

Page is URL state via `useSearchParams` so back-button + refresh +
shareable links all stay consistent. Reset to page 1 when any filter
changes (otherwise page N from the old filter indexes nothing).

Backend DTO must include `@Min(1)` on page + `@Max(100)` on limit:

```ts
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class FindAllXxxQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  limit?: number;
}
```

Render `<Pagination>` once at the bottom of the list — it renders
nothing when `totalPages <= 1` so callers don't need a guard.

## Checklist before merging a new table

Table-only:
- [ ] Wrapper has the standard paddings + border + `overflow-x-auto`.
- [ ] Actions column header is present and uses `w-[80px] text-right`.
- [ ] Empty / loading / error states implemented.
- [ ] No vertical column borders (`border-r` on `<TableHead>`).
- [ ] Cell content overflow uses `truncate` + `max-w-[Npx]`.
- [ ] If row-clickable, dropdown clicks `stopPropagation`.

Pagination + mobile (mandatory for any data-list):
- [ ] Backend endpoint returns `{ data, pagination }`.
- [ ] DTO uses `@Min(1)` + `@Max(100)` on the page / limit fields.
- [ ] Frontend reads page from URL via `useSearchParams`.
- [ ] Page resets to 1 when filters change.
- [ ] `useMediaQuery('(min-width: 1024px)')` selects between
      `MOBILE_LIMIT=10` and `DESKTOP_LIMIT=15`.
- [ ] Mobile card branch (`md:hidden`) renders the same fields with a
      labeled-row layout, sharing the table's handlers.
- [ ] Cards are `<Collapsible>` when they have >2 secondary fields.
- [ ] Filter row: `FilterTabs` at `>=md`, `FilterDropdown` at `<md`.
- [ ] `<Pagination>` rendered at the bottom (it self-hides on 1 page).
- [ ] "All-empty" check uses `pagination.total === 0`, NOT
      `currentPageData.length === 0` (otherwise page 2 of an emptied
      list falsely shows the empty state).

## Live examples

- `centers-page.tsx` + `center-table.tsx` + `center-card.tsx` — canonical
  reference: full pagination, status filter, mobile cards, URL state.
- `staff-page.tsx` + `staff-table.tsx` + `staff-card.tsx` — same pattern.
- `invitations-table.tsx` — self-contained: table + cards + pagination
  + status filter + per-row countdown timer all in one component (used
  by both `/staff/invite` and `/admin/invitations`).
