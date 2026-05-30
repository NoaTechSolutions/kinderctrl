-- Migration: split_staff_address_into_four_fields
--
-- PO QA #11: replace Staff.address (VarChar 200) with the 4-field pattern
-- Center already uses (street/city/state/zip). All nullable on Staff since
-- they're optional fields filled in via /profile/complete.
--
-- Data loss: existing Staff.address values are dropped. Acceptable —
-- the 6 dev-DB rows had test data only.

-- AlterTable
ALTER TABLE "staff" DROP COLUMN "address",
ADD COLUMN     "city" VARCHAR(100),
ADD COLUMN     "state" VARCHAR(2),
ADD COLUMN     "street" VARCHAR(200),
ADD COLUMN     "zip_code" VARCHAR(10);
