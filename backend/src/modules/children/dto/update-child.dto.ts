import { OmitType, PartialType } from '@nestjs/mapped-types';
import { IsIn, IsOptional } from 'class-validator';
import { ChildStatus } from '@prisma/client';
import { CreateChildDto } from './create-child.dto';
import { CHILD_ENROLLMENT_STATUSES } from '../children.constants';

// Parents are managed through the dedicated /children/:id/parents endpoints,
// so they're omitted from the generic child PATCH. enrollmentStatus is added
// here (restricted to the spec values — never the dead GRADUATED tail).
export class UpdateChildDto extends PartialType(
  OmitType(CreateChildDto, ['parents'] as const),
) {
  @IsOptional()
  @IsIn(CHILD_ENROLLMENT_STATUSES)
  enrollmentStatus?: ChildStatus;
}
