import { IsDateString, IsOptional, IsString, Length } from 'class-validator';

export class CreatePayrollPeriodDto {
  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;
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
