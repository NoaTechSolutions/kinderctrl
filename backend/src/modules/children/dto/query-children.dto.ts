import { IsArray, IsOptional, IsString, IsUUID } from 'class-validator';
import { Transform } from 'class-transformer';
import { ChildStatus } from '@prisma/client';

export class QueryChildrenDto {
  // ?enrollmentStatus=ACTIVE,PENDING or ?enrollmentStatus=all. Omitted →
  // service defaults to non-WITHDRAWN (the soft-delete tombstone is hidden).
  @IsOptional()
  @IsArray()
  @Transform(({ value }) => {
    if (value === 'all') return Object.values(ChildStatus);
    if (typeof value === 'string') return value.split(',');
    return value;
  })
  enrollmentStatus?: ChildStatus[];

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsUUID()
  classroomId?: string;
}
