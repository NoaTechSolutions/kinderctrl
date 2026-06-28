# Editable Card Pattern (SAAS standard)

> **Every editable detail card uses these three primitives. Don't roll your own
> card/read/edit markup.** Reference implementation: the Children detail tabs
> (`components/children/detail/*`). Roll out module-by-module when you next touch
> one (Profile → Staff → Centers → …), not in one big sweep.

A card has a **read mode** and an inline **edit mode** (one card edits at a time;
the page keeps an unsaved-changes guard). The three primitives:

| Primitive | File | Role |
|-----------|------|------|
| `SectionFrame` / `ReadCard` | `ui/section-frame.tsx` | The card shell: header (icon + title + Edit pill / Editing badge + Cancel/Save) + body. Owns the read↔edit chrome. `ReadCard` is the read-only variant (optional `action` slot). |
| `ReadRow` (+ `ReadGrid`) | `ui/read-view.tsx` | One read field: `[icon] LABEL` + clean value text (no box). Optional `action?` slot — a right-aligned button/chevron (e.g. an inline "Change"); the value truncates when it's present. |
| `Field` | `ui/field.tsx` | One edit field: `[icon] LABEL` (purple in edit) + the input. (Re-exported from `children/child-form-fields` for back-compat.) |

The read↔edit lifecycle (seed / dirty / save / cancel) is `useSectionEditor`
(`ui/use-section-editor.ts`); group several cards in one tab with
`SectionGroup` (`ui/section-group.tsx`, aggregates their handles for the guard).
All primitives live under `components/ui/` — import from there in any module.

---

## Read mode

```
┌──────────────────────────────────────────────┐
│ (◔ icon) Card title                  [ Edit ] │  ← SectionFrame header
├──────────────────────────────────────────────┤
│ 👤 FIRST NAME        📞 PHONE                  │  ← ReadRow grid (ReadGrid)
│ Mia                  (555) 123-4567            │
│ 👤 MIDDLE NAME       🎂 DATE OF BIRTH          │
│                      Mar 3, 2021               │  ← empty field = blank value
└──────────────────────────────────────────────┘
```

- `ReadRow`: label row = semantic icon (`--kc-p-600`, 13–14px) + 10px uppercase
  muted label; value = 13px `--kc-text-1`, **no border / background / box**.
- Wrap rows in `<ReadGrid cols={2|3|4}>`.

## Edit mode (click Edit)

- Card border → `1.5px var(--kc-p-600)`; header bg → `var(--kc-p-50)`; icon →
  solid (`--kc-p-600` bg, white); title → `var(--kc-p-900)`; an **Editing** badge
  appears; Cancel (outline purple) + Save (solid `--kc-p-600` + check) replace Edit.
- `Field` labels turn purple (`--kc-p-400`); inputs get purple borders / focus
  (scoped CSS `.kc-section-editing` in globals.css — never leaks to the wizard or
  other forms, which render `Field` with no editing context).

`SectionFrame` provides the editing context (`FieldEditingProvider`) and the
`.kc-section-editing` class, so all of the above is automatic — sections just
pass `mode/dirty/saving/onEdit/onSave/onCancel` and render `ReadRow` (read) /
`Field` (edit).

---

## Rule: empty field = empty

A read field with no value renders **blank** — no `—`, `N/A`, `Not set`, or
italic placeholder. `ReadRow` enforces it (it also treats a lone `'—'`/`'–'`/
`'N/A'` value as empty, so callers passing one still render blank). Apply the
same in any custom read markup (`{value || ''}`, not `{value || '—'}`).

**Exception — keep the dash for:**
- **time-formatters** in timesheets/attendance (e.g. no clock-out → `—`): a blank
  cell reads as "missing data" worse than a dash.
- **stat-tiles / metrics** (e.g. a KPI with no value → `—`).

Those aren't form fields; the rule is for **read-mode field values** in
detail/profile cards.

---

## Semantic field icons (Lucide)

Pick the closest; reuse these for consistency across modules:

| Field | Icon | Field | Icon |
|-------|------|-------|------|
| Name / first / last | `User` | Email | `Mail` |
| Phone | `Phone` | Address / location | `MapPin` |
| Date / admission | `Calendar` | Birth date | `Cake` |
| Gender | `Users` | Status | `Tag` |
| Relationship | `Link2` | Employer / work | `Briefcase` |
| Doctor | `Stethoscope` / `User` | Dentist | `Smile` |
| Heart / care | `Heart` | Medication | `Pill` |
| Allergies | `AlertTriangle` | Insurance / plan | `ShieldCheck` |
| Notes / reason / text | `FileText` | Policy / number | `Hash` |
| Sleep / bedtime | `Moon` / `Bed` | Wake | `Sunrise` |
| Meals / diet | `Utensils` | Activity | `Activity` |

`Field` and `ReadRow` (and `EditableList`) take an optional `icon` prop. Pass the
**same icon** to a field's read (`ReadRow`) and edit (`Field`) so the two modes
match.

---

## When NOT to use this pattern

- **List cards** (roster cards, the children grid card) — those are their own
  thing; see `SEARCH-FILTER-PATTERN.md`.
- **Stat / KPI tiles** — `stat-tile.tsx` (big-number value + small uppercase
  label, no icon; optional `color` / `href` / `className`) is the standard tile;
  `compact-stat-card.tsx` is the dense icon+value variant for mobile stat rows.
- **Pure read dashboards** (e.g. the Overview tab) — use `ReadCard` + `ReadRow`
  without the edit chrome; they have no edit mode.

> `CardWithHeader` is the OLD card shell — it was replaced by `ReadCard`
> (circular purple icon + title) across the whole SAAS. Don't use it for new
> cards; reskin any remaining one to `ReadCard`.

## Rule for new cards

Any new **editable** card uses `SectionFrame` + `ReadRow` + `Field` (+
`useSectionEditor`). Read-only cards use `ReadCard`. Do **not** create a bespoke
card/edit layout — extend these primitives if something's missing.

> **Rollout status:** the card pattern is applied SAAS-wide across all 8 modules
> (Children / Profile / Staff / Centers / Settings / Attendance / Kiosk /
> Reports). New surfaces follow these primitives by default.
