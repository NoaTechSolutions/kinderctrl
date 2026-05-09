import {
  IsArray,
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
  medications?: any[];

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

  @IsString()
  @IsOptional()
  @MaxLength(200)
  insuranceProvider?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  insurancePolicy?: string;
}
