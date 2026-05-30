-- AlterTable
ALTER TABLE "kiosk_settings" ADD COLUMN "pin_reset_token" TEXT,
ADD COLUMN "pin_reset_token_expiry" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "kiosk_settings_pin_reset_token_key" ON "kiosk_settings"("pin_reset_token");
