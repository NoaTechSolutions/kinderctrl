import { IsBoolean, IsIn, IsOptional } from 'class-validator';
import { CHILD_PARENT_RELATIONSHIPS } from '../children.constants';

// Edits the ChildParent pivot metadata for an already-linked parent
// (PATCH /children/:id/parents/:parentId).
export class UpdateChildParentDto {
  @IsOptional()
  @IsIn(CHILD_PARENT_RELATIONSHIPS)
  relationship?: string;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @IsOptional()
  @IsBoolean()
  livesWithChild?: boolean;
}
