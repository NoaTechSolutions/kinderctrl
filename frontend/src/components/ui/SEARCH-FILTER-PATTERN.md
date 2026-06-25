# List Search & Filter Pattern

> **Apply this pattern to all new list views from here on.** Staff and Centers
> will migrate when next touched. The reference implementation lives in the
> Children module (`components/children/children-filter-bar.tsx` +
> `center-children-list.tsx`).

A unified, two-row block that sits **directly under the page header** (the
page's primary actions — view toggle, "New X" — stay in the header). It gives
every list the same search + quick-filter + advanced-filter affordances.

```
┌─────────────────────────────────────────────────────────┐
│  [🔍 Search…                              ]  [ Filters ▾]│  ← Row 1
├─────────────────────────────────────────────────────────┤  ← divider
│  (All 42) (Present 30) (Not arrived 8) (End of shift 4)  │  ← Row 2 (chips)
└─────────────────────────────────────────────────────────┘
```

- **Row 1** — a flex-1 search input + a `Filters` button that opens a popover of
  secondary (advanced) filters.
- **Divider** — `border-t` in `--kc-border`.
- **Row 2** — horizontally-scrollable **quick-filter chips** that filter the
  already-loaded data **client-side, instantly**. Each chip carries a semantic
  color + a live count.

The whole block is one bordered card (`--kc-border` / `--kc-surface`).

---

## Building blocks (reusable primitives)

| Primitive | File | Role |
|-----------|------|------|
| `FilterChip` | `ui/filter-chip.tsx` | A quick-filter pill: icon + label + count, with `active` (solid fill) / inactive (tint) states. |
| `Popover` | `ui/popover.tsx` | Container for the advanced-filters panel (Radix popover). |
| `Switch` | `ui/switch.tsx` | Boolean toggles inside the popover (e.g. "Has allergies"). |
| `Checkbox` | `ui/checkbox.tsx` | Multi-select groups inside the popover (e.g. Status, Age group). |

The **search input** in Row 1 is a compact 32px (`h-8`) field —
`--kc-surface-2` background, `--kc-border` border, `Search` icon left, clear `X`
right. (The older `ui/search-input.tsx` is the legacy 40px field; new lists use
the compact one shown in the example below.)

---

## State model

Split filters by **where they run**:

- **Server-side** — anything the list endpoint already supports (e.g. `status`,
  `search`). These go into the query and refetch. Required for values the list
  hides by default (Children hides `WITHDRAWN`, so status must be server-side).
- **Client-side** — everything else (booleans, derived buckets like age group).
  Filters the already-loaded array; no refetch.

```
search        → server (debounced)
quick chip    → client (instant)   // the attendance/status the chips key on
secondary {                         // the popover
  statuses    → server
  hasAllergies, ageGroups, …  → client
}
```

Counts shown on the chips are computed over the **secondary-filtered** set so
filters stay cumulative ("Present 8" means 8 *after* the popover filters apply).

---

## Chip colors — use SAAS tokens, never hex

`FilterChip` takes a single `color` (the semantic token). Inactive = a
`color-mix` tint of it; active = the solid color with white text. Map semantics
to tokens:

| Semantic | Token | Icon (lucide) |
|----------|-------|---------------|
| All / neutral-primary | `var(--kc-p-600)` (purple ramp) | `Users` |
| Success / present | `var(--kc-success)` | `CheckCircle2` |
| Warning / pending-ish | `var(--kc-warning)` | `Clock` |
| Danger / end / error | `var(--kc-error)` | `DoorOpen` |
| Muted / not-scheduled | `var(--kc-text-3)` | `CalendarOff` |
| Info | `var(--kc-info)` | — |

Need an "in-between" shade with no token (e.g. orange)? Use
`color-mix(in oklch, var(--kc-warning), var(--kc-error))` — still token-based,
still dark-mode-correct.

---

## Responsive

- **Row 1**: the `Filters` button shows its label + chevron on `md+`, collapses
  to icon-only on mobile (`<md`). The search stays flex-1 at all sizes.
- **Row 2**: chips never wrap — the row is `overflow-x-auto` with the scrollbar
  hidden (`[&::-webkit-scrollbar]:hidden` + `scrollbarWidth:'none'`), so on
  mobile they scroll horizontally as one compact line.
- **Popover**: a `w-72` panel; `align="end"` so it hangs off the right edge.

---

## Usage example (copy for a new module)

```tsx
// 1. Define your filter model (mirror children-filter-bar.tsx).
type Quick = 'all' | 'ACTIVE' | 'PENDING';
const [query, setQuery] = useState('');
const search = useDebouncedValue(query, 300).trim();
const [quick, setQuick] = useState<Quick>('all');

// 2. Server filters → the query; client filters → useMemo over the data.
const { data: rows } = useThings({ search: search || undefined });
const counts = useMemo(() => countByBucket(rows ?? []), [rows]);
const displayed = useMemo(
  () => (quick === 'all' ? rows ?? [] : (rows ?? []).filter((r) => r.bucket === quick)),
  [rows, quick],
);

// 3. Render the bar above the list. Build a <ThingsFilterBar> per module that
//    composes <FilterChip>, <Popover>, <Switch>, <Checkbox> — see
//    children-filter-bar.tsx as the reference. Then render `displayed`.
<ThingsFilterBar
  query={query} onQueryChange={setQuery}
  quick={quick} onQuickChange={setQuick}
  counts={counts}
  secondary={secondary} onSecondaryChange={setSecondary}
/>
```

Keep the **bar component module-local** (it knows that module's filter
semantics); reuse the **primitives** (`FilterChip`, `Popover`, `Switch`) and
this layout. Don't hand-roll chips or re-pick colors — pull from the table above.

### Empty states

Distinguish *no records at all* (show the module's empty state with its create
CTA) from *filtered-to-nothing* (show a "no match" line). The reference computes
`noChildrenAtAll = rows.length === 0 && !hasSearch && !anyFilterActive`.

---

# Table patterns

> **Every new list table includes column sort + an actions kebab by default.**
> Reference: `components/children/child-table.tsx`. Staff/Centers migrate when
> next touched.

## Sortable columns

Use **`ui/sortable-table-head.tsx`** (`SortableTableHead`) for any sortable
column. Non-sortable columns stay plain `<TableHead>` (e.g. a contact column,
the Actions column).

- **Icon** (the SAAS standard — don't substitute):
  - idle → `ArrowUpDown` in `--kc-text-4` (muted)
  - active asc → `ArrowUp` in `--kc-p-600` (purple) + header text purple
  - active desc → `ArrowDown` in `--kc-p-600`
- **State**: one sort active at a time, client-side, in the table component:
  ```tsx
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' } | null>(null);
  const toggleSort = (key) =>
    setSort((p) => (p?.key === key ? { key, dir: p.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));
  ```
  First click = `asc` (the column's natural order), second toggles to `desc`.
- **"Natural" (asc) order** per column type: text → `localeCompare`; date →
  ISO-string compare (earliest first); enum-like (status / attendance) → a fixed
  `ORDER` map, e.g. `{ ACTIVE:0, PENDING:1, INACTIVE:2, WITHDRAWN:3 }`.
- Sort the rows the table receives (already search/filtered upstream) — don't
  refetch.

## Actions column + kebab

- The **last column is always `Actions`** — header `w-[56px] text-center`, plain
  (not sortable).
- Use **`ChildActionsMenu`** as the template (`components/children/child-actions-menu.tsx`):
  a `DropdownMenu` (shadcn/Radix) behind a square kebab trigger.
  - Kebab trigger: `MoreVertical`, **26px** in tables / **28px** on cards,
    `rounded-md`, `1px` border `--kc-border`, `--kc-surface` background.
  - Menu items: icon + label; destructive items use `variant="destructive"`
    (red) and sit under a `DropdownMenuSeparator`.
- **Role-gate client-side, backend always enforces.** Hide actions a role can't
  perform; render *nothing* for view-only roles (the row/card already links to
  the detail). The children kebab: View profile · Edit · Check in · ⎯ ·
  Withdraw (manager-only).
- **Stop propagation**: the kebab lives inside a clickable row/card. Wrap it so
  its clicks don't trigger navigation:
  ```tsx
  // table row (onClick navigate):
  <div onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>…</div>
  // card (a <Link>):
  <span onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>…</span>
  ```
