-- CreateEnum
CREATE TYPE "TimeFormat" AS ENUM ('TWELVE_HOUR', 'TWENTY_FOUR_HOUR');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "emergency_contact_name" VARCHAR(100),
ADD COLUMN     "emergency_contact_phone" VARCHAR(20),
ADD COLUMN     "emergency_contact_relationship" VARCHAR(20),
ADD COLUMN     "time_format" "TimeFormat" NOT NULL DEFAULT 'TWENTY_FOUR_HOUR';
