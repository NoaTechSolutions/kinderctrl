-- Migration: emergency_contact_relationship_and_secondary
--
-- PO QA #31: Staff records pick up emergency-contact relationship plus a
-- second emergency contact. Relationship stored as a short VARCHAR with
-- whitelisted values enforced at the DTO boundary (no Prisma enum so we
-- can add options without a future migration).

-- AlterTable
ALTER TABLE "staff"
  ADD COLUMN "emergency_contact_relationship"   VARCHAR(20),
  ADD COLUMN "emergency_contact_2_name"          VARCHAR(100),
  ADD COLUMN "emergency_contact_2_phone"         TEXT,
  ADD COLUMN "emergency_contact_2_relationship" VARCHAR(20);
