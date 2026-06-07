import {
  IsArray,
  IsBoolean,
  IsDate,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateMedicalInfoDto {
  @IsArray()
  @IsOptional()
  allergies?: string[];

  @IsArray()
  @IsOptional()
  medications?: unknown[];

  @IsArray()
  @IsOptional()
  medicalConditions?: string[];

  @IsString()
  @IsOptional()
  @MaxLength(200)
  doctorName?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  doctorPhone?: string;

  // Fase 1 — added per spec.
  @IsString()
  @IsOptional()
  @MaxLength(300)
  doctorAddress?: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  medicationAllergies?: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  medicalPlan?: string;

  @IsBoolean()
  @IsOptional()
  hasSpecialNeeds?: boolean;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  insuranceProvider?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  insurancePolicy?: string;

  // ── Fase 2 (2A) — extended medical history ────────────────────────────────

  @IsBoolean()
  @IsOptional()
  isUnderDoctorCare?: boolean;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  doctorLastExamDate?: Date;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  prescribedMedicationDetails?: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  medicationSideEffects?: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  dentistName?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  dentistPhone?: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  dentistAddressStreet?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  dentistAddressCity?: string;

  @IsString()
  @IsOptional()
  @MaxLength(2)
  dentistAddressState?: string;

  @IsString()
  @IsOptional()
  @MaxLength(10)
  dentistAddressZip?: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  dentalPlan?: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  specialDevices?: string;

  @IsBoolean()
  @IsOptional()
  frequentColds?: boolean;

  @IsInt()
  @Min(0)
  @Max(365)
  @IsOptional()
  frequentColdsCount?: number;

  // Checklist object keyed by CHILD_PAST_ILLNESSES, each value { checked, date? }.
  // Validated loosely as an object (mirrors how `medications` is kept flexible);
  // the structured shape is enforced by the frontend form.
  @IsObject()
  @IsOptional()
  pastIllnesses?: Record<string, unknown>;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  otherIllnesses?: string;
}
