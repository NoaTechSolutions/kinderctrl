import { PartialType } from '@nestjs/mapped-types';
import { IsEnum, IsInt, IsNumber, IsOptional, Max, Min } from 'class-validator';
import { CenterStatus } from '@prisma/client';
import { CreateCenterDto } from './create-center.dto';

export class UpdateCenterDto extends PartialType(CreateCenterDto) {
  @IsOptional()
  @IsEnum(CenterStatus)
  status?: CenterStatus;

  // Geofence (staff attendance). Editable via the center Settings tab.
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100000)
  geoFenceRadiusMeters?: number;
}
