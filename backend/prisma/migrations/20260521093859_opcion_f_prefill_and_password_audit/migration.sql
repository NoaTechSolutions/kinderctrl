-- Migration: opcion_f_prefill_and_password_audit
--
-- PO QA #28 Opción F:
-- 1. StaffInvitationToken.prefillData — JSON column for Director-supplied
--    operational data (hireDate/employmentType/hourlyRate/position/DOB)
--    that gets merged into the Staff record on accept.
-- 2. password_admin_actions — audit trail of admin-triggered credential
--    actions (initially: RESET_TRIGGERED when an admin clicks "Send
--    Password Reset" on a staff detail page).

-- AlterTable
ALTER TABLE "staff_invitation_tokens"
  ADD COLUMN "prefill_data" JSONB;

-- CreateTable
CREATE TABLE "password_admin_actions" (
  "id"             UUID NOT NULL,
  "actor_user_id"  UUID NOT NULL,
  "target_user_id" UUID NOT NULL,
  "action"         TEXT NOT NULL,
  "ip_address"     TEXT,
  "created_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "password_admin_actions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "password_admin_actions_target_user_id_idx" ON "password_admin_actions"("target_user_id");
CREATE INDEX "password_admin_actions_actor_user_id_idx" ON "password_admin_actions"("actor_user_id");

-- AddForeignKey
ALTER TABLE "password_admin_actions"
  ADD CONSTRAINT "password_admin_actions_actor_user_id_fkey"
  FOREIGN KEY ("actor_user_id") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "password_admin_actions"
  ADD CONSTRAINT "password_admin_actions_target_user_id_fkey"
  FOREIGN KEY ("target_user_id") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
