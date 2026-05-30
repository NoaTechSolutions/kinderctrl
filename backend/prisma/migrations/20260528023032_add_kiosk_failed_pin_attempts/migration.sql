-- AlterTable
ALTER TABLE "kiosk_settings" ADD COLUMN     "failed_pin_attempts" INTEGER NOT NULL DEFAULT 0;
