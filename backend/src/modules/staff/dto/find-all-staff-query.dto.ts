import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

// Query params for GET /staff. Mirrors FindAllCentersDto so the pagination
// shape stays consistent across list endpoints. ValidationPipe (main.ts)
// coerces querystring values into numbers via `@Type(() => Number)` and
// rejects anything outside the range whitelists.
//
// No status filter here yet — staff list filters by role at the controller
// (SUPER_ADMIN/DIRECTOR see active staff; STAFF sees only their own row)
// and we don't surface a status filter in the UI. Add one here if the
// front ever needs to slice by ACTIVE/SUSPENDED/etc.
export class FindAllStaffQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  // Hard cap to keep a single request from pulling the whole table.
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  // Free-text search across firstName / lastName / user.email.
  // Case-insensitive `contains`, evaluated server-side in the service.
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  // SUPER_ADMIN only: scope the list to one center (used by the center
  // detail Staff tab). Ignored for DIRECTOR/STAFF — their list is already
  // scoped to their own center by role in the service.
  @IsOptional()
  @IsUUID()
  centerId?: string;
}
