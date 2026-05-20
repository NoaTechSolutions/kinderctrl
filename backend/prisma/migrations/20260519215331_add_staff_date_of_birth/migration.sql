-- Migration: add_staff_date_of_birth
--
-- Optional DOB on Staff (PO QA #3 CAMBIO 9). Director leaves blank at
-- create; staff fills later from their profile. Date-only column (no
-- time/timezone semantics), nullable.

-- AlterTable
ALTER TABLE "staff" ADD COLUMN "date_of_birth" DATE;
