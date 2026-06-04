import { IsDateString, IsEnum, IsOptional, IsString, Length } from 'class-validator';
import { PayFrequency } from '@prisma/client';

export class CreatePayrollPeriodDto {
  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;
}

export class SetPeriodFrequencyDto {
  @IsEnum(PayFrequency)
  frequency: PayFrequency;
}

export class ManualAdjustDto {
  @IsString()
  staffId: string;

  @IsDateString()
  date: string;

  @IsOptional()
  @IsDateString()
  clockIn?: string;

  @IsOptional()
  @IsDateString()
  clockOut?: string;

  @IsString()
  @Length(1, 500)
  comment: string;
}
