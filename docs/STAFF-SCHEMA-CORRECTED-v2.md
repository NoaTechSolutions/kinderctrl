# Staff Module — Schema & Implementation Spec v2

**Date:** 2026-05-20
**Project:** KinderCtrl SaaS
**Status:** Ready for implementation
**Supersedes:** `STAFF-SCHEMA-RELATIONS-REGISTRATION-FLOWS.md` and `STAFF-SCHEMA-ACTUALIZADO-Background-CPR.md` (both written against a generic template, not the actual KinderCtrl schema).
**Reviewed against:** `backend/prisma/schema.prisma`, `backend/src/modules/staff/*`, `backend/src/modules/auth/*`, `docs/ARCHITECTURE.md` (commit `f69d554`).

---

## 1. Scope

Add to the existing Staff module:

1. **Background Check compliance fields** (tracked, queryable, with verifier audit).
2. **CPR/First Aid certification fields** (tracked, queryable, with verifier audit + provider).
3. **Staff invitation flow** — replaces the current "temp password via `console.log`" placeholder (see `staff.service.ts:113` TODO).
4. **Per-center CPR requirement** toggle (`Center.requiresCprForStaff`).
5. **Automated compliance expiration alerts** (cron → in-app notification + email).

Out of scope (will be picked up later):
- UI design / mockups — frontend work has its own spec.
- Document upload (PDFs of background check letter, CPR card) — the existing generic `Document` model already supports `entityType=STAFF`. Wiring is left for a follow-up.
- Multi-state regulation engine — California rules are hard-enforced; other states will be added when needed.

---

## 2. Open Decisions — Resolved

### 2.1 `StaffRole` (3 values) vs `StaffPosition` (10 values)

**Decision: keep `StaffRole` (3). Add new optional `position: String?` (free text, max 50 chars) for the granular job title.**

Reasoning:
- `StaffRole` is the **authorization axis** — used by `RolesGuard`, by `assertCanAccess`, by UI affordance gates. 3 values map cleanly to permissions (TEACHER / ASSISTANT / ADMIN). Expanding it to 10 forces every permission check to grow a wider switch with no benefit.
- The proposed `StaffPosition` enum mixes job titles (`LEAD_TEACHER`, `ASSISTANT_TEACHER`) with categories (`FLOATER`, `SUBSTITUTE`) with departments (`KITCHEN`, `MAINTENANCE`). Locking those into an enum means schema migrations every time a center coins a new title.
- Free-text `position` lets each center describe the job however they want ("Pre-K Lead", "Toddler Floater", "Kitchen Asst") without code changes. It's not used for authorization, only for display + HR reporting.

### 2.2 `Staff.email` vs `User.email` — source of truth

**Decision: drop `Staff.email`. `User.email` is canonical. All reads JOIN to `User` and return `user.email`.**

Reasoning:
- Current schema has both. They are kept in sync by hand in `staff.service.ts` (and the service explicitly refuses to support email rotation because of the desync risk — see line 199-202).
- Two columns for one fact is a permanent footgun. The 1:1 relation `User.staffId @unique → Staff.id` already lets us reach `user.email` from `staff.user.email` in a single Prisma include.
- Migration: drop `staff.email`, add `user` include to `STAFF_SELECT`, update `toResponseDto` to read `staff.user?.email`.
- Edge case: invitation flow creates a Staff record BEFORE the User exists. Resolution: invitation **token** stores the email; on accept, User is created with that email + linked to Staff. Staff itself never needs its own email column.

If the PO disagrees and wants to keep `Staff.email` as a historical snapshot, that's a low-effort revert — but every endpoint that reads it becomes a place where it can drift.

### 2.3 `BackgroundCheckStatus.RENEWED` — drop it

**Decision: drop `RENEWED`. Renewal = transition to `APPROVED` with a new `backgroundCheckDate`.**

Five states (`NOT_STARTED, PENDING, APPROVED, REJECTED, EXPIRED`) cover the lifecycle without overlap. A `RENEWED` state is a sixth name for what `APPROVED` already means.

---

## 3. Schema Changes

### 3.1 `Staff` model — add compliance fields + drop email + add position

```prisma
model Staff {
  id       String @id @default(uuid()) @db.Uuid
  centerId String @map("center_id") @db.Uuid
  center   Center @relation(fields: [centerId], references: [id], onDelete: Cascade)

  firstName String    @map("first_name")
  lastName  String    @map("last_name")
  // email REMOVED — see decision 2.2. Read via staff.user.email.
  role      StaffRole

  // NEW — free-text job title. Display + reporting only, NOT used for authz.
  position  String?   @db.VarChar(50)

  hireDate       DateTime @map("hire_date")
  hourlyRate     Decimal? @map("hourly_rate") @db.Decimal(10, 2)
  employmentType String   @map("employment_type")

  phone String?
  notes String?

  status StaffStatus @default(INVITED)

  // ─── NEW: Background Check ──────────────────────────────────────
  backgroundCheckStatus       BackgroundCheckStatus @default(NOT_STARTED) @map("background_check_status")
  backgroundCheckDate         DateTime?             @map("background_check_date") @db.Date
  backgroundCheckExpiryDate   DateTime?             @map("background_check_expiry_date") @db.Date
  backgroundCheckVerifiedById String?               @map("background_check_verified_by_id") @db.Uuid
  backgroundCheckVerifiedBy   User?                 @relation("StaffBackgroundVerifier", fields: [backgroundCheckVerifiedById], references: [id], onDelete: SetNull)
  backgroundCheckNotes        String?               @map("background_check_notes")

  // ─── NEW: CPR / First Aid ───────────────────────────────────────
  cprCertified             Boolean   @default(false) @map("cpr_certified")
  cprCertificationDate     DateTime? @map("cpr_certification_date") @db.Date
  cprExpiryDate            DateTime? @map("cpr_expiry_date") @db.Date
  cprCertificationProvider String?   @map("cpr_certification_provider") @db.VarChar(100)
  cprVerifiedById          String?   @map("cpr_verified_by_id") @db.Uuid
  cprVerifiedBy            User?     @relation("StaffCprVerifier", fields: [cprVerifiedById], references: [id], onDelete: SetNull)
  cprNotes                 String?   @map("cpr_notes")

  // Relations
  user           User?
  classroomStaff ClassroomStaff[]

  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")
  activatedAt DateTime? @map("activated_at")

  @@index([backgroundCheckExpiryDate])
  @@index([cprExpiryDate])
  @@index([backgroundCheckStatus])
  @@map("staff")
}

enum BackgroundCheckStatus {
  NOT_STARTED
  PENDING
  APPROVED
  REJECTED
  EXPIRED
}
```

### 3.2 `Center` model — per-center CPR requirement

```prisma
model Center {
  // ... existing fields unchanged ...

  // NEW — toggle per-center whether CPR is required for staff to be ACTIVE.
  // Default false to avoid breaking existing centers.
  requiresCprForStaff Boolean @default(false) @map("requires_cpr_for_staff")

  // ... existing relations unchanged ...
}
```

### 3.3 `StaffInvitationToken` — new model

Mirrors `PasswordResetToken` exactly (the auth module's token pattern) so consistency is automatic — same lifecycle, same single-use semantics, same cascade.

```prisma
model StaffInvitationToken {
  id        String    @id @default(uuid()) @db.Uuid
  token     String    @unique
  email     String
  centerId  String    @map("center_id") @db.Uuid
  center    Center    @relation(fields: [centerId], references: [id], onDelete: Cascade)
  // The role to assign to the future User. Frozen at invite time.
  role      StaffRole

  // Who invited (DIRECTOR or SUPER_ADMIN). Audit trail; nullable so a
  // deleted inviter doesn't cascade-delete the invitation.
  invitedById String? @map("invited_by_id") @db.Uuid
  invitedBy   User?   @relation("StaffInvitationInviter", fields: [invitedById], references: [id], onDelete: SetNull)

  expiresAt DateTime  @map("expires_at")
  usedAt    DateTime? @map("used_at")
  createdAt DateTime  @default(now()) @map("created_at")

  @@index([email])
  @@index([expiresAt])
  @@map("staff_invitation_tokens")
}
```

### 3.4 `User` model — reverse relations

The User model gets three new back-relations for the new FKs above:

```prisma
model User {
  // ... existing fields unchanged ...

  // NEW reverse relations
  backgroundChecksVerified Staff[] @relation("StaffBackgroundVerifier")
  cprChecksVerified        Staff[] @relation("StaffCprVerifier")
  staffInvitationsSent     StaffInvitationToken[] @relation("StaffInvitationInviter")

  // ... existing relations unchanged ...
}
```

---

## 4. Relations & Cardinalities (after changes)

```
User (role=DIRECTOR or SUPER_ADMIN) ──owns──> Center (1:N via Center.ownerId)
Center ──has──> Staff (1:N via Staff.centerId)
Staff ──linked to──> User (1:1 via User.staffId @unique)
Staff ──teaches in──> Classroom (M:N via ClassroomStaff, ALREADY EXISTS)
User (verifier) ──verified──> Staff (1:N via backgroundCheckVerifiedById)
User (verifier) ──verified──> Staff (1:N via cprVerifiedById)
User (inviter) ──sent──> StaffInvitationToken (1:N via invitedById)
Center ──scope of──> StaffInvitationToken (1:N via centerId)
```

**Director derivation:** `staff.center.owner` (single Prisma `include`). No denormalized `directorId` on Staff — that field would be a second source of truth for what `Center.ownerId` already says.

---

## 5. Business Rules & Validations

### 5.1 Status transitions on Staff

```typescript
// Hard-enforced in StaffService.update() and StaffService.acceptInvitation()
if (next.status === StaffStatus.ACTIVE) {
  if (next.backgroundCheckStatus !== BackgroundCheckStatus.APPROVED) {
    throw new BadRequestException(
      'Cannot activate staff without an APPROVED background check',
    );
  }
  if (
    next.backgroundCheckExpiryDate &&
    next.backgroundCheckExpiryDate < new Date()
  ) {
    throw new BadRequestException(
      'Cannot activate staff with an expired background check',
    );
  }

  const center = await prisma.center.findUnique({
    where: { id: next.centerId },
    select: { requiresCprForStaff: true },
  });
  if (center?.requiresCprForStaff) {
    if (!next.cprCertified) {
      throw new BadRequestException(
        'This center requires CPR certification for active staff',
      );
    }
    if (next.cprExpiryDate && next.cprExpiryDate < new Date()) {
      throw new BadRequestException(
        'Cannot activate staff with an expired CPR certification',
      );
    }
  }
}
```

### 5.2 Verifier authorization

Only `DIRECTOR` (within their own center) or `SUPER_ADMIN` can mark `backgroundCheckStatus = APPROVED` or `cprCertified = true`. Staff cannot self-verify. Enforced in `assertCanModifyCompliance()` (new method, mirrors existing `assertCanAccess`).

### 5.3 Invitation token rules

- One **active** invitation per email at a time. Service-level check: before issuing a new token, soft-invalidate any existing unused unexpired token for that email.
- Token TTL: **7 days** (matches the doc's recommendation; longer than password reset's 1h because invitations are explicit, not security-driven).
- Single use: `usedAt` set atomically during `acceptInvitation`.
- Inviter must have authority over `centerId`:
  - `SUPER_ADMIN` → any center.
  - `DIRECTOR` → only centers where `center.ownerId === inviter.id` (use `where: { id: centerId, ownerId: inviter.id }` in Prisma — returns null if not allowed).

### 5.4 Email rotation

Still not supported (matches current code's deliberate omission). If an invited staff member needs a different email, the inviter revokes the invitation and issues a new one.

---

## 6. Invitation Flow

### 6.1 Sequence

```
1. Inviter (DIRECTOR or SUPER_ADMIN) submits:
   { email, centerId, role }

2. Backend POST /staff/invite:
   - validate inviter owns centerId (DIRECTOR) or is SUPER_ADMIN
   - check no existing User with that email
   - soft-invalidate any prior unused unexpired StaffInvitationToken for email
   - generate token = randomBytes(32).toString('hex')
   - insert StaffInvitationToken { token, email, centerId, role, invitedById, expiresAt = now+7d }
   - send email via EmailService.send() with link:
     ${FRONTEND_URL}/staff/accept-invitation?token={token}
   - return 202 Accepted (no payload — same posture as forgot-password)

3. Invitee clicks link → frontend page reads token from query string.
   Frontend calls GET /staff/invitation/:token to fetch the prefilled context:
   { email, centerName, inviterName, role, expiresAt }
   This is a PUBLIC endpoint that returns null/404 if token is invalid/expired/used.

4. Invitee fills the form (firstName, lastName, phone, position, hireDate,
   employmentType, hourlyRate?, emergencyContact?*, password) and submits.

   * Emergency contact deferred — not in v1 scope. Can be added in a follow-up
     migration without breaking anything.

5. Backend POST /staff/accept-invitation:
   - lookup token, verify not expired/used
   - in a single $transaction:
       a. create Staff with status = ACTIVE,
          backgroundCheckStatus = NOT_STARTED (will be approved later),
          cprCertified = false
       b. create User with email from token, hashed password from body,
          role = STAFF, status = ACTIVE, staffId pointing to (a)
       c. mark token usedAt = now()
   - return tokens (same shape as /auth/login) so the frontend can drop
     the invitee straight into the dashboard.

6. Director sees the new staff in their list as ACTIVE with
   backgroundCheckStatus = NOT_STARTED.
   They run the background check externally, then submit the result via
   PATCH /staff/:id/background-check.
```

### 6.2 Why the invitee starts as `ACTIVE` despite no background check

Current `StaffStatus.INVITED` means "invitation sent, registration not complete". Once the invitee accepts and creates their account, the registration IS complete. What's incomplete is the **compliance** (background check pending), which is tracked by `backgroundCheckStatus`, not `StaffStatus`.

This decouples two orthogonal facts: "has this person finished onboarding?" (`StaffStatus`) and "are they cleared to work with kids?" (`backgroundCheckStatus`).

Activation rule in §5.1 still applies: the invitee CAN'T be ACTIVE if the background check isn't APPROVED. **Resolution:** the invitee lands in `StaffStatus.INVITED` after accepting, and only flips to `ACTIVE` when the background check is approved. This keeps the existing semantics and avoids a new intermediate status.

Update to the spec above: step 5a creates Staff with `status = INVITED`. The Director's eventual `PATCH /staff/:id/background-check` with `{ status: APPROVED }` automatically transitions Staff to `ACTIVE` (service does this server-side when bg check becomes APPROVED, if all other conditions in §5.1 are met).

### 6.3 What happens to the existing manual-create endpoint?

`POST /staff` (current `staffService.create`) is kept for now. It generates a temp password and logs it (existing behavior) — **but** we add a deprecation comment in the controller pointing to `/staff/invite` as the canonical path. Manual create stays as a fallback for testing / migration scenarios and to avoid breaking the current UI. It can be removed in a follow-up once `/staff/invite` is wired into the UI everywhere.

---

## 7. Compliance Alerts (Cron + Notifications + Email)

### 7.1 Dependency

Add `@nestjs/schedule` to `backend/package.json`. Enables `@Cron` decorators.

### 7.2 Cron job

```typescript
// backend/src/modules/staff/jobs/compliance-alerts.job.ts
@Injectable()
export class ComplianceAlertsJob {
  // Daily at 06:00 server time. Picked because:
  // (a) it's after most overnight batch windows
  // (b) Directors are likely checking the app in the morning
  // (c) no overlap with peak login (drop-off window)
  @Cron('0 6 * * *', { name: 'staff-compliance-alerts' })
  async run() {
    const BG_WINDOW_DAYS = 30;
    const CPR_WINDOW_DAYS = 60;

    // Background checks expiring in ≤30 days OR already expired
    const expiringBg = await this.prisma.staff.findMany({
      where: {
        status: { not: StaffStatus.TERMINATED },
        backgroundCheckExpiryDate: {
          lte: addDays(new Date(), BG_WINDOW_DAYS),
        },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        backgroundCheckExpiryDate: true,
        center: { select: { id: true, name: true, ownerId: true } },
      },
    });

    // CPR expiring in ≤60 days OR already expired
    const expiringCpr = await this.prisma.staff.findMany({
      where: {
        status: { not: StaffStatus.TERMINATED },
        cprCertified: true,
        cprExpiryDate: { lte: addDays(new Date(), CPR_WINDOW_DAYS) },
      },
      select: { /* same shape */ },
    });

    // For each, create one Notification row (recipient = center.ownerId)
    // + send one email via EmailService.

    // Dedupe: track last alert sent per (staffId, type) so we don't spam
    // the Director every morning with the same expiration. Storage:
    // either a `lastComplianceAlertAt` column on Staff (cheap, 1 column)
    // or a join table StaffComplianceAlert (audit trail, more flexible).
    // Spec choice: add `lastComplianceAlertAt: DateTime?` on Staff — keeps
    // the schema small and "we already alerted recently" is the only
    // question we ever need to answer.
  }
}
```

Add to `Staff` model:
```prisma
lastComplianceAlertAt DateTime? @map("last_compliance_alert_at")
```

Cron skips any staff where `lastComplianceAlertAt > now() - 7 days` (we don't re-alert on the same staff more than weekly for the same condition).

### 7.3 Notification payload

Uses the existing `Notification` model. Type strings:
- `STAFF_BACKGROUND_CHECK_EXPIRING`
- `STAFF_BACKGROUND_CHECK_EXPIRED`
- `STAFF_CPR_EXPIRING`
- `STAFF_CPR_EXPIRED`

Channels JSON: `['email', 'in_app']`. Recipient: `center.ownerId` (the DIRECTOR).

### 7.4 Email template

New file: `backend/src/modules/email/templates/compliance-alert.template.ts`. Same shape as `password-reset.template.ts` — exports a function returning `{ subject, html, text }`. Subject example: `Background check expiring for {firstName} {lastName}`.

---

## 8. API Endpoints

All endpoints under `/staff`. Inherit `JwtAuthGuard + RolesGuard` from controller class (already in place). `@Public()` is explicit only on the two unauthenticated invitation endpoints.

| Method | Path | Roles | Body / Query | Returns | Errors |
|---|---|---|---|---|---|
| `POST` | `/staff/invite` | DIRECTOR, SUPER_ADMIN | `{ email, centerId, role }` | `202` no body | `403` if DIRECTOR doesn't own centerId · `409` if email already a User · `429` throttled |
| `GET` | `/staff/invitation/:token` | `@Public` | — | `{ email, centerName, inviterName, role, expiresAt }` or `404` | `404` invalid/expired/used |
| `POST` | `/staff/accept-invitation` | `@Public` | `{ token, firstName, lastName, phone, position?, hireDate, employmentType, hourlyRate?, password }` | `{ access_token, refresh_token, user }` (same shape as `/auth/login`) | `400` validation · `404` token gone · `409` race (User got created in parallel) |
| `POST` | `/staff` | DIRECTOR, SUPER_ADMIN | `CreateStaffDto` (existing) | `StaffResponseDto` | — *(deprecated, keep for now)* |
| `GET` | `/staff` | any authenticated | — | `StaffResponseDto[]` (compliance fields included) | — |
| `GET` | `/staff/:id` | any authenticated (scoped) | — | `StaffResponseDto` | `404` · `403` |
| `PATCH` | `/staff/:id` | DIRECTOR, SUPER_ADMIN | `UpdateStaffDto` (existing + `position?`) | `StaffResponseDto` | `403` if status transition violates §5.1 |
| `PATCH` | `/staff/:id/background-check` | DIRECTOR, SUPER_ADMIN | `{ status, date?, expiryDate?, notes? }` | `StaffResponseDto` | `403` (only DIRECTOR of that center or SUPER_ADMIN) |
| `PATCH` | `/staff/:id/cpr` | DIRECTOR, SUPER_ADMIN | `{ certified, certificationDate?, expiryDate?, provider?, notes? }` | `StaffResponseDto` | `403` |
| `DELETE` | `/staff/:id` | DIRECTOR, SUPER_ADMIN | — | `204` | `403` |
| `GET` | `/staff/compliance-summary` | DIRECTOR, SUPER_ADMIN | `?centerId=<uuid>` (required for SUPER_ADMIN, optional for DIRECTOR — defaults to their center) | `{ total, bgApproved, bgPending, bgExpired, cprValid, cprExpiring, cprMissing }` | — |

### 8.1 Rate limiting

`POST /staff/invite` and `POST /staff/accept-invitation` get explicit `@Throttle` decorators matching the auth-module conventions:
- `/staff/invite` — 20/hour per (IP, email) — generous enough for batch onboarding but kills script abuse. Uses the existing `EmailAwareThrottlerGuard` (BUG-029 fix).
- `/staff/accept-invitation` — 5/15min per (IP, token-email) — invitees with a fat-finger password get retries, attackers brute-forcing the token form get capped.

---

## 9. Migration Plan

### 9.1 Single Prisma migration

```bash
npx prisma migrate dev --name add_staff_compliance_invitations_and_position
```

Migration covers:
1. `ALTER TABLE staff DROP COLUMN email;` (after JOIN-based reads are deployed — see §9.2 for the safe order)
2. `ALTER TABLE staff ADD COLUMN position varchar(50);`
3. `ALTER TABLE staff ADD COLUMN background_check_status varchar(20) NOT NULL DEFAULT 'NOT_STARTED';`
4. `ALTER TABLE staff ADD COLUMN background_check_date date, background_check_expiry_date date, background_check_verified_by_id uuid REFERENCES users(id) ON DELETE SET NULL, background_check_notes text;`
5. `ALTER TABLE staff ADD COLUMN cpr_certified boolean NOT NULL DEFAULT false, cpr_certification_date date, cpr_expiry_date date, cpr_certification_provider varchar(100), cpr_verified_by_id uuid REFERENCES users(id) ON DELETE SET NULL, cpr_notes text;`
6. `ALTER TABLE staff ADD COLUMN last_compliance_alert_at timestamptz;`
7. `ALTER TABLE centers ADD COLUMN requires_cpr_for_staff boolean NOT NULL DEFAULT false;`
8. `CREATE TABLE staff_invitation_tokens (...);` (per §3.3)
9. `CREATE INDEX idx_staff_background_expiry ON staff(background_check_expiry_date);`
10. `CREATE INDEX idx_staff_cpr_expiry ON staff(cpr_expiry_date);`
11. `CREATE INDEX idx_staff_background_status ON staff(background_check_status);`
12. `CREATE INDEX idx_staff_invitation_tokens_email ON staff_invitation_tokens(email);`
13. `CREATE INDEX idx_staff_invitation_tokens_expires ON staff_invitation_tokens(expires_at);`
14. `CREATE TYPE "BackgroundCheckStatus" AS ENUM (...);` (Prisma generates this automatically).

### 9.2 Safe order with the `Staff.email` drop

Drop-column is technically a breaking change. Order to avoid downtime:

1. **Migration 1** (this spec, except step 1) — add all new columns + index + token table. Deploy. Old code still reads `staff.email`; new code uses `staff.user.email`. Both work.
2. **Code deploy** — `STAFF_SELECT` and `toResponseDto` now read from `staff.user.email`. All endpoints tested.
3. **Migration 2** (separate, deploy a few hours later) — `ALTER TABLE staff DROP COLUMN email;`.

If we're cool with a small risk window (we're pre-production), do everything in one migration. **Spec recommendation for now: one migration**, since there's no live multi-instance deployment. Note in the PR description.

### 9.3 Backfill

No backfill needed. All new columns have defaults (`NOT_STARTED`, `false`, `false`). Existing staff land in a clean "not started" compliance state, which is accurate.

---

## 10. Implementation Estimates

### 10.1 Backend (~7h)

| Task | Time |
|---|---|
| Prisma schema edit + migration | 0.5h |
| Drop `Staff.email`, JOIN reads (refactor `STAFF_SELECT` + `toResponseDto`) | 0.5h |
| `StaffInvitationToken` model wiring (Prisma client regen) | 0.25h |
| `POST /staff/invite` endpoint + service + email template | 1.5h |
| `GET /staff/invitation/:token` + `POST /staff/accept-invitation` (the atomic create) | 1.5h |
| `PATCH /staff/:id/background-check` + `/cpr` + activation rule (§5.1) | 1h |
| `GET /staff/compliance-summary` aggregation query | 0.5h |
| `ComplianceAlertsJob` cron + dedupe + email template | 1h |
| Throttle decorators + `EmailAwareThrottlerGuard` integration | 0.25h |

### 10.2 Frontend (~7h)

| Task | Time |
|---|---|
| Add compliance columns to staff table + badge component | 1h |
| Background-check edit panel (in staff detail) | 1h |
| CPR edit panel (in staff detail) | 1h |
| Invitation form (DIRECTOR + SUPER_ADMIN variant for center picker) | 1.5h |
| `/staff/accept-invitation` public page (with token preflight via GET endpoint) | 2h |
| Compliance summary dashboard widget | 0.5h |

### 10.3 Total

**~14h** (vs the 15–20h estimated in the planning doc — closer to the low end because we're reusing more existing infra than the original spec assumed: `Notification`, `EmailService`, `PasswordResetToken` pattern, `ClassroomStaff`, `Document` model are all in place).

Add **~2h buffer** for integration testing (curl flows + frontend e2e walkthrough). **Realistic ship target: ~16h of focused work, or 2 dev days.**

---

## 11. Test Plan (Manual, Backend)

Mirrors the BUG-029/031 test playbook:

1. **Invitation happy path** — DIRECTOR invites, receives `Sending invitation email` log, invitee accepts with form, lands as STAFF with INVITED status + NOT_STARTED bg check.
2. **Invitation by SUPER_ADMIN with explicit centerId** — must be allowed; same flow as #1.
3. **Invitation by DIRECTOR for a center they don't own** — must 403.
4. **Existing User email** — must 409.
5. **Expired token** — `GET /staff/invitation/:token` returns 404; `POST /staff/accept-invitation` returns 404.
6. **Reusing a used token** — second `acceptInvitation` returns 404 (the first call set `usedAt`).
7. **Activate without background check** — `PATCH /staff/:id` with `{ status: ACTIVE }` and bg status NOT_STARTED → 400.
8. **Center with `requiresCprForStaff = true`** + staff without CPR → cannot activate.
9. **Cron dry-run** — manually trigger `ComplianceAlertsJob.run()`, verify Notification rows inserted + `Sending compliance email` log.
10. **Throttler integration** — repeat `POST /staff/invite` for the same email from the same IP > 20 times in an hour → 429.

---

## 12. Files to Touch

### New files
- `backend/src/modules/staff/dto/invite-staff.dto.ts`
- `backend/src/modules/staff/dto/accept-invitation.dto.ts`
- `backend/src/modules/staff/dto/update-background-check.dto.ts`
- `backend/src/modules/staff/dto/update-cpr.dto.ts`
- `backend/src/modules/staff/dto/invitation-preview.dto.ts`
- `backend/src/modules/staff/jobs/compliance-alerts.job.ts`
- `backend/src/modules/email/templates/staff-invitation.template.ts`
- `backend/src/modules/email/templates/compliance-alert.template.ts`
- `frontend/src/app/staff/accept-invitation/page.tsx`
- `frontend/src/components/staff/compliance-badges.tsx`
- `frontend/src/components/staff/background-check-form.tsx`
- `frontend/src/components/staff/cpr-form.tsx`
- `frontend/src/components/staff/invitation-form.tsx`
- `frontend/src/components/staff/compliance-summary-widget.tsx`
- `frontend/src/lib/api/staff-invitation.ts`

### Edited files
- `backend/prisma/schema.prisma` (per §3)
- `backend/src/modules/staff/staff.service.ts` (drop email read, add invitation + compliance methods, drop temp-password log)
- `backend/src/modules/staff/staff.controller.ts` (new endpoints + throttle decorators)
- `backend/src/modules/staff/dto/create-staff.dto.ts` (drop email, add position)
- `backend/src/modules/staff/dto/update-staff.dto.ts` (add position)
- `backend/src/modules/staff/dto/staff-response.dto.ts` (compliance fields, position)
- `backend/src/modules/staff/staff.module.ts` (register job + email template imports)
- `backend/src/app.module.ts` (`ScheduleModule.forRoot()`)
- `frontend/src/components/staff/staff-table.tsx` (compliance column)
- `frontend/src/app/(dashboard)/staff/[id]/page.tsx` (compliance panels)
- `frontend/src/lib/i18n/translations.ts` (new keys)

---

## 13. Decision Log

| # | Decision | Why |
|---|---|---|
| D-1 | Keep `StaffRole(3)`, add free-text `position` | Authz axis stays simple; granular title goes to free text |
| D-2 | Drop `Staff.email`, JOIN to User | Single source of truth, removes sync footgun |
| D-3 | Drop `BackgroundCheckStatus.RENEWED` | Redundant with `APPROVED + new date` |
| D-4 | `StaffInvitationToken` mirrors `PasswordResetToken` shape | Consistency with existing auth-module pattern |
| D-5 | Invitation token stores `centerId`, not `directorId+daycareId` | Director derives from `center.owner`; Daycare doesn't exist |
| D-6 | Invitee lands at `StaffStatus.INVITED`, flips to ACTIVE on bg approval | Decouples onboarding completion from compliance |
| D-7 | One migration, not two | Pre-production; downtime risk acceptable |
| D-8 | Dedupe alerts via `lastComplianceAlertAt` column (no audit table) | Only question is "did we alert recently" — minimum schema |
| D-9 | Cron at 06:00 daily | Post-batch, pre-peak, Director sees on first login |
| D-10 | Keep manual-create endpoint, mark deprecated | Don't break the UI until invitation flow ships |

---

## 14. Open Questions (PO sign-off needed before code)

1. **Multi-state**: spec hard-enforces CA-style bg-check requirement globally. If a non-CA daycare onboards, do we want a `Center.requiresBackgroundCheckForStaff` toggle parallel to CPR? Adds 1 column, 5 lines of code.
2. **Invitation email subject + copy**: I'll draft from the existing `account-locked.template.ts` style. If the PO has specific copy, paste it before I write the template.
3. **Compliance alert recipients**: spec sends to `center.ownerId` (the DIRECTOR). Should staff also get notified about their own expiring compliance? If yes, second recipient + opt-out preference.
4. **Position whitelist**: spec keeps `position` as free text. If the PO wants a controlled vocabulary (dropdown of 10 options like the original spec proposed), we can add a `position_options: string[]` config per center. Defer unless asked.

---

**Status:** Ready for PO review. On approval, implementation order: §3 schema → §6 invitation flow → §7 cron → §8 remaining endpoints → §10.2 frontend.
