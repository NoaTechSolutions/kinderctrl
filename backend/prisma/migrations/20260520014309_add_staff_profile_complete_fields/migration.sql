-- Migration: add_staff_profile_complete_fields
--
-- Opción C deferred profile flow. New columns for self-service profile
-- (address + emergency contact basics) plus profileComplete flag that
-- drives the "Complete your profile" banner on the dashboard.

-- AlterTable
ALTER TABLE "staff" ADD COLUMN     "address" VARCHAR(200),
ADD COLUMN     "emergency_contact_name" VARCHAR(100),
ADD COLUMN     "emergency_contact_phone" TEXT,
ADD COLUMN     "profile_complete" BOOLEAN NOT NULL DEFAULT false;
