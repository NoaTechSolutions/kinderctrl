-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "attendance_approvals" (
    "id" UUID NOT NULL,
    "staff_id" UUID NOT NULL,
    "center_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "week_start" DATE NOT NULL,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "director_comment" TEXT,
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "attendance_approvals_center_id_week_start_idx" ON "attendance_approvals"("center_id", "week_start");

-- CreateIndex
CREATE INDEX "attendance_approvals_staff_id_week_start_idx" ON "attendance_approvals"("staff_id", "week_start");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_approvals_staff_id_center_id_date_key" ON "attendance_approvals"("staff_id", "center_id", "date");

-- AddForeignKey
ALTER TABLE "attendance_approvals" ADD CONSTRAINT "attendance_approvals_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_approvals" ADD CONSTRAINT "attendance_approvals_center_id_fkey" FOREIGN KEY ("center_id") REFERENCES "centers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
