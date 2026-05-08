import { PartialType } from '@nestjs/mapped-types';
import { IsEnum, IsOptional } from 'class-validator';
import { CenterStatus } from '@prisma/client';
import { CreateCenterDto } from './create-center.dto';

export class UpdateCenterDto extends PartialType(CreateCenterDto) {
  @IsOptional()
  @IsEnum(CenterStatus)
  status?: CenterStatus;
}
