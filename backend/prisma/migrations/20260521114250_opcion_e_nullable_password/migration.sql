-- Migration: opcion_e_nullable_password
--
-- PO QA #30 Opción E: SUPER_ADMIN can manually create a Staff + User
-- without setting a password. The staff receives a welcome email with
-- a tokenized link (reusing password_reset_tokens with 7d expiry) and
-- sets their own password via POST /auth/reset-password.

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "password" DROP NOT NULL;
