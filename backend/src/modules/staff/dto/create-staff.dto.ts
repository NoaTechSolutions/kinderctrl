import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { StaffRole } from '@prisma/client';
import { EMERGENCY_CONTACT_RELATIONSHIPS } from '../staff.service';

// Schema stores employmentType as a plain string ("full_time" / "part_time").
// Whitelist values here so callers get a clear 400 instead of bad data.
const EMPLOYMENT_TYPES = ['full_time', 'part_time'] as const;

// Reused below for both emergency contacts. Mutable cast because
// class-validator's @IsIn() decorator expects readonly any[].
const EMERGENCY_PHONE_REGEX = /^\+?1?\d{10,14}$/;

export class CreateStaffDto {
  @IsString()
  @Length(2, 50)
  firstName: string;

  @IsString()
  @Length(2, 50)
  lastName: string;

  // Used for BOTH the Staff record and the linked User account. User.email
  // is @unique, so the service rejects duplicates upstream of Prisma.
  @IsEmail()
  email: string;

  @IsEnum(StaffRole)
  role: StaffRole;

  // PO QA #32: optional in the UI; service defaults to now() when omitted.
  @IsOptional()
  @IsDateString()
  hireDate?: string;

  // Optional. Director can leave blank at create; staff fills later from
  // their profile. ISO date string (yyyy-mm-dd); stored as DATE in DB.
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  // PO QA #32: optional in the UI; service defaults to 'full_time' when
  // omitted. The whitelist still rejects unexpected values.
  @IsOptional()
  @IsString()
  @IsIn(EMPLOYMENT_TYPES, {
    message: 'employmentType must be one of: full_time, part_time',
  })
  employmentType?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  hourlyRate?: number;

  // Optional US phone (digits, optional +1 prefix). Same regex as
  // CreateCenterDto.phone so behavior is consistent across modules.
  @IsOptional()
  @IsString()
  @Matches(/^\+?1?\d{10,14}$/, {
    message: 'Phone must be a valid US phone number',
  })
  phone?: string;

  // Free-text notes capped at 500 chars to keep payloads reasonable.
  @IsOptional()
  @IsString()
  @Length(0, 500)
  notes?: string;

  // Free-text job title — display + HR reporting only, NOT used for authz.
  // 50 chars matches schema.prisma VarChar(50). Per PO decision: free
  // text, no controlled vocabulary.
  @IsOptional()
  @IsString()
  @Length(0, 50)
  position?: string;

  // SUPER_ADMIN MUST provide this (which center to put the staff into).
  // DIRECTOR omits it (auto-derived from User.centerId), or passes one of
  // their owned centers for multi-center DIRECTORs (validated via
  // resolveCenterIdForUser in the service).
  @IsOptional()
  @IsUUID()
  centerId?: string;

  // PO QA #31 — address + emergency contacts collected on the SUPER_ADMIN
  // manual create form. All optional; staff can still complete via the
  // self-service /profile/complete flow later.
  @IsOptional()
  @IsString()
  @Length(0, 200)
  street?: string;

  @IsOptional()
  @IsString()
  @Length(0, 100)
  city?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{2}$/, {
    message: 'State must be 2 uppercase letters (e.g., CA, NY)',
  })
  state?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{5}(-\d{4})?$/, {
    message: 'Invalid ZIP code (e.g., 94102 or 94102-1234)',
  })
  zipCode?: string;

  @IsOptional()
  @IsString()
  @Length(0, 100)
  emergencyContactName?: string;

  @IsOptional()
  @IsString()
  @Matches(EMERGENCY_PHONE_REGEX, {
    message: 'Emergency contact phone must be a valid US phone number',
  })
  emergencyContactPhone?: string;

  @IsOptional()
  @IsIn(EMERGENCY_CONTACT_RELATIONSHIPS)
  emergencyContactRelationship?: string;

  // PO QA #31 — second emergency contact, same shape as the first.
  @IsOptional()
  @IsString()
  @Length(0, 100)
  emergencyContact2Name?: string;

  @IsOptional()
  @IsString()
  @Matches(EMERGENCY_PHONE_REGEX, {
    message: 'Emergency contact phone must be a valid US phone number',
  })
  emergencyContact2Phone?: string;

  @IsOptional()
  @IsIn(EMERGENCY_CONTACT_RELATIONSHIPS)
  emergencyContact2Relationship?: string;

  // UI shortcut: a Director creating a new hire can flip these to true
  // when the new hire already has compliance verified. PO QA #46: BG
  // shortcut now maps `true` → backgroundCheckStatus=COMPLETED +
  // backgroundCheckApproved=true (the legacy date / verifier columns
  // were dropped). CPR keeps its previous mapping (`true` →
  // cprCertified=true + cprCertificationDate=now + cprVerifiedById=actor).
  // For richer edits, use the dedicated PATCH /staff/:id/background-check
  // + /cpr endpoints.
  @IsOptional()
  @IsBoolean()
  backgroundCheckCompleted?: boolean;

  @IsOptional()
  @IsBoolean()
  cprCertified?: boolean;
}
