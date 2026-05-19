import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { CenterStatus } from '@prisma/client';

// Query params for GET /centers. ValidationPipe (main.ts) coerces strings
// from the querystring into numbers via `@Type(() => Number)` and rejects
// anything outside the role/range whitelists.
export class FindAllCentersDto {
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

  @IsOptional()
  @IsEnum(CenterStatus)
  status?: CenterStatus;
}
