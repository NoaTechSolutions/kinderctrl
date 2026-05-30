import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  Max,
  Min,
} from 'class-validator';
import { PayFrequency } from '@prisma/client';

export class UpsertPayrollSettingsDto {
  @IsEnum(PayFrequency)
  frequency: PayFrequency;

  @IsBoolean()
  breakPaid: boolean;

  @IsNumber()
  @Min(1)
  @Max(24)
  overtimeDailyThreshold: number;

  @IsNumber()
  @Min(1)
  @Max(168)
  overtimeWeeklyThreshold: number;

  @IsNumber()
  @Min(1)
  @Max(5)
  overtimeRate: number;
}
