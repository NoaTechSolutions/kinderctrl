import { PartialType } from '@nestjs/mapped-types';
import { IsEnum, IsOptional } from 'class-validator';
import { ChildStatus } from '@prisma/client';
import { CreateChildDto } from './create-child.dto';

export class UpdateChildDto extends PartialType(CreateChildDto) {
  @IsEnum(ChildStatus)
  @IsOptional()
  status?: ChildStatus;
}
