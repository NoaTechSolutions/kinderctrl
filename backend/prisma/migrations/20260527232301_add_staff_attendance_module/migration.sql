-- CreateEnum
CREATE TYPE "PunchType" AS ENUM ('CLOCK_IN', 'BREAK_IN', 'BREAK_OUT', 'CLOCK_OUT');

-- CreateEnum
CREATE TYPE "PunchSource" AS ENUM ('APP', 'KIOSK');

-- CreateEnum
CREATE TYPE "CorrectionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ScheduleStatus" AS ENUM ('DRAFT', 'APPROVED');

-- CreateEnum
CREATE TYPE "PayFrequency" AS ENUM ('WEEKLY', 'BIWEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "PeriodStatus" AS ENUM ('OPEN', 'APPROVED', 'EXPORTED');

-- AlterTable
ALTER TABLE "centers" ADD COLUMN     "geo_fence_radius_meters" INTEGER NOT NULL DEFAULT 100,
ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "staff_time_entries" (
    "id" UUID NOT NULL,
    "staff_id" UUID NOT NULL,
    "center_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "type" "PunchType" NOT NULL,
    "device_timestamp" TIMESTAMP(3) NOT NULL,
    "server_received_at" TIMESTAMP(3),
    "time_drift_detected" BOOLEAN NOT NULL DEFAULT false,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "within_geo_fence" BOOLEAN,
    "source" "PunchSource" NOT NULL DEFAULT 'APP',
    "is_correction" BOOLEAN NOT NULL DEFAULT false,
    "correction_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "staff_time_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "correction_requests" (
    "id" UUID NOT NULL,
    "staff_id" UUID NOT NULL,
    "center_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "status" "CorrectionStatus" NOT NULL DEFAULT 'PENDING',
    "original_clock_in" TIMESTAMP(3),
    "original_break_in" TIMESTAMP(3),
    "original_break_out" TIMESTAMP(3),
    "original_clock_out" TIMESTAMP(3),
    "requested_clock_in" TIMESTAMP(3),
    "requested_break_in" TIMESTAMP(3),
    "requested_break_out" TIMESTAMP(3),
    "requested_clock_out" TIMESTAMP(3),
    "staff_comment" TEXT NOT NULL,
    "director_comment" TEXT,
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "correction_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schedules" (
    "id" UUID NOT NULL,
    "staff_id" UUID NOT NULL,
    "center_id" UUID NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "status" "ScheduleStatus" NOT NULL DEFAULT 'DRAFT',
    "approved_by" UUID,
    "approved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schedule_days" (
    "id" UUID NOT NULL,
    "schedule_id" UUID NOT NULL,
    "day_of_week" INTEGER NOT NULL,
    "start_time" TEXT,
    "end_time" TEXT,
    "is_off" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "schedule_days_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_settings" (
    "id" UUID NOT NULL,
    "center_id" UUID NOT NULL,
    "frequency" "PayFrequency" NOT NULL DEFAULT 'WEEKLY',
    "break_paid" BOOLEAN NOT NULL DEFAULT false,
    "overtime_daily_threshold" INTEGER NOT NULL DEFAULT 8,
    "overtime_weekly_threshold" INTEGER NOT NULL DEFAULT 40,
    "overtime_rate" DOUBLE PRECISION NOT NULL DEFAULT 1.5,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payroll_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_periods" (
    "id" UUID NOT NULL,
    "center_id" UUID NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "status" "PeriodStatus" NOT NULL DEFAULT 'OPEN',
    "approved_by" UUID,
    "approved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payroll_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kiosk_settings" (
    "id" UUID NOT NULL,
    "center_id" UUID NOT NULL,
    "pin" TEXT NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT false,
    "timeout_min" INTEGER NOT NULL DEFAULT 2,
    "kiosk_session_token" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kiosk_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "staff_time_entries_staff_id_date_idx" ON "staff_time_entries"("staff_id", "date");

-- CreateIndex
CREATE INDEX "staff_time_entries_center_id_date_idx" ON "staff_time_entries"("center_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "staff_time_entries_staff_id_center_id_date_type_key" ON "staff_time_entries"("staff_id", "center_id", "date", "type");

-- CreateIndex
CREATE INDEX "correction_requests_staff_id_status_idx" ON "correction_requests"("staff_id", "status");

-- CreateIndex
CREATE INDEX "correction_requests_center_id_status_idx" ON "correction_requests"("center_id", "status");

-- CreateIndex
CREATE INDEX "schedules_staff_id_start_date_idx" ON "schedules"("staff_id", "start_date");

-- CreateIndex
CREATE INDEX "schedules_center_id_start_date_idx" ON "schedules"("center_id", "start_date");

-- CreateIndex
CREATE UNIQUE INDEX "schedules_staff_id_center_id_start_date_key" ON "schedules"("staff_id", "center_id", "start_date");

-- CreateIndex
CREATE UNIQUE INDEX "schedule_days_schedule_id_day_of_week_key" ON "schedule_days"("schedule_id", "day_of_week");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_settings_center_id_key" ON "payroll_settings"("center_id");

-- CreateIndex
CREATE INDEX "payroll_periods_center_id_start_date_idx" ON "payroll_periods"("center_id", "start_date");

-- CreateIndex
CREATE UNIQUE INDEX "kiosk_settings_center_id_key" ON "kiosk_settings"("center_id");

-- AddForeignKey
ALTER TABLE "staff_time_entries" ADD CONSTRAINT "staff_time_entries_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_time_entries" ADD CONSTRAINT "staff_time_entries_center_id_fkey" FOREIGN KEY ("center_id") REFERENCES "centers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_time_entries" ADD CONSTRAINT "staff_time_entries_correction_id_fkey" FOREIGN KEY ("correction_id") REFERENCES "correction_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "correction_requests" ADD CONSTRAINT "correction_requests_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "correction_requests" ADD CONSTRAINT "correction_requests_center_id_fkey" FOREIGN KEY ("center_id") REFERENCES "centers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_center_id_fkey" FOREIGN KEY ("center_id") REFERENCES "centers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_days" ADD CONSTRAINT "schedule_days_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_settings" ADD CONSTRAINT "payroll_settings_center_id_fkey" FOREIGN KEY ("center_id") REFERENCES "centers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_periods" ADD CONSTRAINT "payroll_periods_center_id_fkey" FOREIGN KEY ("center_id") REFERENCES "centers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kiosk_settings" ADD CONSTRAINT "kiosk_settings_center_id_fkey" FOREIGN KEY ("center_id") REFERENCES "centers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
