import { IsBoolean, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
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

  // Fase 2 (detail refactor) — the unified Child tab edits the primary
  // contact's phone from the child screen and syncs it here (writes the Parent
  // satellite, NOT the pivot). Optional so existing link-only PATCHes are
  // unaffected.
  @IsOptional()
  @IsString()
  @MaxLength(20)
  homePhone?: string;
}
