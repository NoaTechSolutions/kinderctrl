# KinderCtrl — Architecture notes

Lightweight architecture reference. Lives next to the code, not in a wiki, so
it stays current with commits.

## Center ownership model — Model C (MVP)

### Backend

A DIRECTOR can own **N centers** (one-to-many `User -> Center` via
`Center.ownerId`). There is **no `@unique` constraint on `ownerId`**.

This shape is intentional and load-bearing for future requirements:

- Daycare chains (e.g., Bright Horizons, KinderCare) where one operations
  director is responsible for multiple physical locations.
- A future `PROVIDER` role that aggregates several DIRECTORs into a corporate
  parent.

A `SuperAdmin` user owns no centers directly but sees and manages all of them
(read/list/edit). DELETE is restricted to `SUPER_ADMIN` only (see
`centers.controller.ts`, `@Roles(UserRole.SUPER_ADMIN)` on the `@Delete` route).

The `SetupCompleteGuard` (global APP_GUARD in `CentersModule`) gates feature
modules (Children, Staff, Parents, Attendance, Billing, …) on whether the
DIRECTOR has at least one center with `status != SETUP_PENDING`. Setting
operating hours auto-flips a center from `SETUP_PENDING -> ACTIVE`, which is
what unlocks the rest of the system.

Endpoints that the guard whitelists (via `@SkipSetupCheck()`):

- All Centers CRUD routes — `GET`, `POST`, `PATCH`, `DELETE`, `POST hours`
- `/auth/me`, `/auth/logout` (logged-in users must always reach these)
- `@Public()` routes (the guard short-circuits on those)

### Frontend (MVP)

The UI is **simplified for the single-center experience**, even though the
backend supports N:

- Sidebar (and mobile nav) show **"Center"** singular for any DIRECTOR with
  one or more centers. Click goes directly to `/centers/{centers[0].id}`
  (the most recently created, ordered by `createdAt desc` on the backend).
- `/centers` list view is reachable by URL but not surfaced in the DIRECTOR
  sidebar. Useful for QA, future SUPER_ADMIN UI, or as a manual fallback for
  multi-center DIRECTORs.
- New DIRECTOR with zero centers is redirected from `/dashboard` directly to
  `/centers/new` (see `app/(dashboard)/layout.tsx`, BUG-001 fix). The layout
  renders a loading screen during the redirect window so the wrong page never
  paints.

### What's deliberately deferred

When a real multi-center DIRECTOR appears (chain or PROVIDER role), the
intended UX is a **Center Switcher** picker in the topbar. That's not in scope
for MVP. Until it lands:

- Multi-center DIRECTORs reach non-primary centers via the dashboard banner
  CTA or by typing the URL.
- `centers/[id]/page.tsx` keeps its `ArrowLeft -> /centers` link as the
  escape hatch for that case.

### Files of interest

- `backend/prisma/schema.prisma` — `Center.ownerId` (no `@unique`)
- `backend/src/modules/centers/guards/setup-complete.guard.ts`
- `backend/src/modules/centers/decorators/skip-setup-check.decorator.ts`
- `backend/src/modules/centers/centers.controller.ts` — `@Roles` policy
- `frontend/src/app/(dashboard)/layout.tsx` — auth gate + BUG-001 redirect
- `frontend/src/components/layout/sidebar.tsx` — adaptive "Center" / "Centers"
- `frontend/src/components/centers/setup-pending-banner.tsx`
- `frontend/src/components/centers/hours-form.tsx` — modal that unlocks ACTIVE
- `frontend/src/components/dashboard/setup-incomplete-banner.tsx`
