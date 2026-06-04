import { IsUUID } from 'class-validator';

// PATCH /centers/:id/director (SUPER_ADMIN only). Transfers Director access
// of a center to another system user.
export class ChangeDirectorDto {
  @IsUUID()
  newDirectorUserId: string;
}
