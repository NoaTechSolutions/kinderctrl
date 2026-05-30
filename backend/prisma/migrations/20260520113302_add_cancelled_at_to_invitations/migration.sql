-- Migration: add_cancelled_at_to_invitations
--
-- PO QA #13: distinguish CANCELLED (Director took back) from ACCEPTED
-- (invitee redeemed) on staff_invitation_tokens. Both invalidate the
-- token but the UX/audit treats them differently in the new invitations
-- table view.

-- AlterTable
ALTER TABLE "staff_invitation_tokens" ADD COLUMN     "cancelled_at" TIMESTAMP(3);
