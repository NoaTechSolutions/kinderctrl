-- Migration: add_resend_tracking_to_invitations
--
-- PO QA #14 AJUSTE 3: per-invitation resend rate limit (3/hour sliding
-- window). resend now UPDATES the same row instead of rotating — these
-- two columns track the throttle state per invitation.

-- AlterTable
ALTER TABLE "staff_invitation_tokens"
  ADD COLUMN "last_resend_at" TIMESTAMP(3),
  ADD COLUMN "resend_count" INTEGER NOT NULL DEFAULT 0;
