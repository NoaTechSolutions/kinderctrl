import { IsDateString, IsEnum, IsNumber, IsOptional } from 'class-validator';
import { PunchType, PunchSource } from '@prisma/client';

export class CreatePunchDto {
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

  @IsOptional()
  @IsEnum(PunchSource)
  source?: PunchSource;
}
