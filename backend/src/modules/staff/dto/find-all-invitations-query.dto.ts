import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

// Reuses the InvitationStatus discriminator the service already computes.
const INVITATION_STATUSES = [
  'PENDING',
  'ACCEPTED',
  'EXPIRED',
  'CANCELLED',
] as const;
type InvitationStatusFilter = (typeof INVITATION_STATUSES)[number];

// Query params for GET /staff/invitations. Mirrors the centers/staff list
// DTO shape (page/limit with the same caps) so list endpoints stay
// structurally consistent. `status` is the lifecycle filter the UI uses
// for its tabs; `centerId` is the SUPER_ADMIN-only cross-center filter.
export class FindAllInvitationsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsEnum(INVITATION_STATUSES)
  status?: InvitationStatusFilter;

  @IsOptional()
  @IsUUID()
  centerId?: string;
}
