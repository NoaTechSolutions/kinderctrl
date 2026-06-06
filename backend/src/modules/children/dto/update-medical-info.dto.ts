import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

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
}
