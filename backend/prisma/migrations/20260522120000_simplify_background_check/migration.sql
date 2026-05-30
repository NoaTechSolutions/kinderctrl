-- PO QA #46: Simplify Background Check.
--
-- Replaces the 5-state BackgroundCheckStatus enum
-- (NOT_STARTED, PENDING, APPROVED, REJECTED, EXPIRED) and the auxiliary
-- columns (date, expiry_date, notes, verified_by_id) with a flat
-- 3-state enum (PENDING, COMPLETED, CANCELLED) plus a single boolean
-- `background_check_approved`. The status now models the *process phase*
-- and `approved` carries the *outcome* — only meaningful when status is
-- COMPLETED, NULL otherwise.
--
-- Data migration (mapping confirmed with PO):
--   NOT_STARTED → PENDING,   approved = NULL
--   PENDING     → PENDING,   approved = NULL
--   APPROVED    → COMPLETED, approved = TRUE
--   REJECTED    → COMPLETED, approved = FALSE
--   EXPIRED     → CANCELLED, approved = NULL  (expired → must re-run)
--
-- Auxiliary columns are dropped after the status column is migrated so
-- referential integrity (FK to users via background_check_verified_by_id)
-- stays valid until the very end of the script.
--
-- ────────────────────────────────────────────────────────────────────
-- Step 1: add the new boolean column (nullable; only set when status
--         lands on COMPLETED post-migration).
-- ────────────────────────────────────────────────────────────────────
ALTER TABLE "staff"
  ADD COLUMN "background_check_approved" BOOLEAN;

-- Capture the outcome of the legacy APPROVED / REJECTED rows BEFORE we
-- collapse them into the new COMPLETED status.
UPDATE "staff"
  SET "background_check_approved" = TRUE
  WHERE "background_check_status" = 'APPROVED';

UPDATE "staff"
  SET "background_check_approved" = FALSE
  WHERE "background_check_status" = 'REJECTED';

-- ────────────────────────────────────────────────────────────────────
-- Step 2: collapse the enum.
--   PostgreSQL doesn't support `DROP VALUE` on an enum directly. The
--   standard trick is: cast the column to TEXT, mutate the values,
--   drop the type, recreate it with the new value set, cast back.
--   Drop the column default first so the TEXT cast doesn't choke on
--   the enum-typed default expression.
-- ────────────────────────────────────────────────────────────────────
ALTER TABLE "staff"
  ALTER COLUMN "background_check_status" DROP DEFAULT;

ALTER TABLE "staff"
  ALTER COLUMN "background_check_status" TYPE TEXT;

UPDATE "staff"
  SET "background_check_status" = 'PENDING'
  WHERE "background_check_status" IN ('NOT_STARTED', 'PENDING');

UPDATE "staff"
  SET "background_check_status" = 'COMPLETED'
  WHERE "background_check_status" IN ('APPROVED', 'REJECTED');

UPDATE "staff"
  SET "background_check_status" = 'CANCELLED'
  WHERE "background_check_status" = 'EXPIRED';

DROP TYPE "BackgroundCheckStatus";

CREATE TYPE "BackgroundCheckStatus" AS ENUM (
  'PENDING',
  'COMPLETED',
  'CANCELLED'
);

ALTER TABLE "staff"
  ALTER COLUMN "background_check_status"
  TYPE "BackgroundCheckStatus"
  USING "background_check_status"::"BackgroundCheckStatus";

ALTER TABLE "staff"
  ALTER COLUMN "background_check_status" SET DEFAULT 'PENDING';

-- ────────────────────────────────────────────────────────────────────
-- Step 3: drop the auxiliary columns and the verifier FK / index.
--   The FK constraint must come down before the column. The expiry-date
--   index dies with the column it indexed, but explicit DROP keeps the
--   migration script self-documenting.
-- ────────────────────────────────────────────────────────────────────
ALTER TABLE "staff"
  DROP CONSTRAINT "staff_background_check_verified_by_id_fkey";

DROP INDEX "staff_background_check_expiry_date_idx";

ALTER TABLE "staff"
  DROP COLUMN "background_check_date",
  DROP COLUMN "background_check_expiry_date",
  DROP COLUMN "background_check_notes",
  DROP COLUMN "background_check_verified_by_id";
