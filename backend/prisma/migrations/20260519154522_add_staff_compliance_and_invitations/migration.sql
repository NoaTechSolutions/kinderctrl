-- Migration: add_staff_compliance_and_invitations
--
-- Drops staff.email (User.email becomes the single source of truth — spec D-2).
-- 1 orphan staff row (id=22fa57f6, "dup-test-..." test data) loses its email-only
-- reference; the row stays and the API responds with email='' via toResponseDto
-- fallback. Acceptable in dev DB.
--
-- Adds: position, Background Check (5 cols + FK verifier), CPR (6 cols + FK
-- verifier), supporting indexes, BackgroundCheckStatus enum, and the
-- staff_invitation_tokens table (mirror of password_reset_tokens shape).

-- CreateEnum
CREATE TYPE "BackgroundCheckStatus" AS ENUM ('NOT_STARTED', 'PENDING', 'APPROVED', 'REJECTED', 'EXPIRED');

-- AlterTable
ALTER TABLE "staff" DROP COLUMN "email",
ADD COLUMN     "background_check_date" DATE,
ADD COLUMN     "background_check_expiry_date" DATE,
ADD COLUMN     "background_check_notes" TEXT,
ADD COLUMN     "background_check_status" "BackgroundCheckStatus" NOT NULL DEFAULT 'NOT_STARTED',
ADD COLUMN     "background_check_verified_by_id" UUID,
ADD COLUMN     "cpr_certification_date" DATE,
ADD COLUMN     "cpr_certification_provider" VARCHAR(100),
ADD COLUMN     "cpr_certified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "cpr_expiry_date" DATE,
ADD COLUMN     "cpr_notes" TEXT,
ADD COLUMN     "cpr_verified_by_id" UUID,
ADD COLUMN     "position" VARCHAR(50);

-- CreateTable
CREATE TABLE "staff_invitation_tokens" (
    "id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "center_id" UUID NOT NULL,
    "role" "StaffRole" NOT NULL,
    "invited_by_id" UUID,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "staff_invitation_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "staff_invitation_tokens_token_key" ON "staff_invitation_tokens"("token");

-- CreateIndex
CREATE INDEX "staff_invitation_tokens_email_idx" ON "staff_invitation_tokens"("email");

-- CreateIndex
CREATE INDEX "staff_invitation_tokens_expires_at_idx" ON "staff_invitation_tokens"("expires_at");

-- CreateIndex
CREATE INDEX "staff_background_check_expiry_date_idx" ON "staff"("background_check_expiry_date");

-- CreateIndex
CREATE INDEX "staff_cpr_expiry_date_idx" ON "staff"("cpr_expiry_date");

-- CreateIndex
CREATE INDEX "staff_background_check_status_idx" ON "staff"("background_check_status");

-- AddForeignKey
ALTER TABLE "staff" ADD CONSTRAINT "staff_background_check_verified_by_id_fkey" FOREIGN KEY ("background_check_verified_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff" ADD CONSTRAINT "staff_cpr_verified_by_id_fkey" FOREIGN KEY ("cpr_verified_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_invitation_tokens" ADD CONSTRAINT "staff_invitation_tokens_center_id_fkey" FOREIGN KEY ("center_id") REFERENCES "centers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_invitation_tokens" ADD CONSTRAINT "staff_invitation_tokens_invited_by_id_fkey" FOREIGN KEY ("invited_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
