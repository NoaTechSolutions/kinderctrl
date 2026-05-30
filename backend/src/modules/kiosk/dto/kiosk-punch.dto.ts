import { IsDateString, IsEnum, IsNumber, IsOptional, IsUUID } from 'class-validator';
import { PunchType } from '@prisma/client';

export class KioskPunchDto {
  @IsUUID()
  staffId: string;

  @IsEnum(PunchType)
  type: PunchType;

  @IsDateString()
  deviceTimestamp: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;
}
