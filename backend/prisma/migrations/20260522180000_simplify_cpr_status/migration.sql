-- PO QA #49: Simplify CPR to a 4-state model (mirror of BG #46).
--
-- Replaces the cprCertified boolean with a CprStatus enum that explicitly
-- carries the lifecycle phase. Auxiliary columns (cprCertificationDate,
-- cprCertificationProvider, cprNotes, cprVerifiedById) are RETAINED per
-- PO decision — CPR keeps the verifier + date + provider + notes
-- semantics for historical reporting, unlike BG which dropped them.
--
-- Data migration (mapping confirmed with PO):
--   cprCertified=false                            → PENDING, no expiry
--   cprCertified=true  AND cprExpiryDate IS NULL  → PENDING (incomplete)
--   cprCertified=true  AND cprExpiryDate > now    → ACTIVE
--   cprCertified=true  AND cprExpiryDate <= now   → EXPIRED
--
-- The CANCELLED state is not produced by the migration — it's a manual
-- admin action (e.g. cert revoked) and only reachable through the
-- /staff/:id/cpr endpoint going forward.
--
-- ────────────────────────────────────────────────────────────────────
-- Step 1: create the enum + add the new column. Default PENDING so any
--         legacy NULLs (shouldn't exist, but defensive) get a safe
--         resting state.
-- ────────────────────────────────────────────────────────────────────
CREATE TYPE "CprStatus" AS ENUM ('PENDING', 'ACTIVE', 'EXPIRED', 'CANCELLED');

ALTER TABLE "staff"
  ADD COLUMN "cpr_status" "CprStatus" NOT NULL DEFAULT 'PENDING';

-- ────────────────────────────────────────────────────────────────────
-- Step 2: backfill cpr_status from (cprCertified, cprExpiryDate).
--   Order matters: write the most specific predicates first so the
--   ACTIVE / EXPIRED branches override the PENDING default.
-- ────────────────────────────────────────────────────────────────────
UPDATE "staff"
  SET "cpr_status" = 'ACTIVE'
  WHERE "cpr_certified" = TRUE
    AND "cpr_expiry_date" IS NOT NULL
    AND "cpr_expiry_date" > NOW();

UPDATE "staff"
  SET "cpr_status" = 'EXPIRED'
  WHERE "cpr_certified" = TRUE
    AND "cpr_expiry_date" IS NOT NULL
    AND "cpr_expiry_date" <= NOW();

-- PENDING is the default; nothing to do for:
--   - cprCertified=false
--   - cprCertified=true with no expiry

-- ────────────────────────────────────────────────────────────────────
-- Step 3: drop the legacy boolean. cprCertified is now derivable from
--   cprStatus IN ('ACTIVE', 'EXPIRED') if any external code needs it.
-- ────────────────────────────────────────────────────────────────────
ALTER TABLE "staff" DROP COLUMN "cpr_certified";

-- ────────────────────────────────────────────────────────────────────
-- Step 4: index the new status column (mirrors background_check_status
--   index added in the earlier compliance migration). cpr_expiry_date
--   index from the original schema stays — still useful for sort/filter.
-- ────────────────────────────────────────────────────────────────────
CREATE INDEX "staff_cpr_status_idx" ON "staff"("cpr_status");
